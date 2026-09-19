# Answer

MoneyMoves Premiere Toolkit — Build Plan
Agent-facing specification. Read the whole document before writing code.

0. Environment (resolved — treat as fixed constraints)
#	Answer
0.1	macOS only. No Windows target.
0.2	Premiere 25.6.4. UXP is supported and official on this version.
0.3	After Effects installed and licensed. MOGRT authoring path is available.
0.4	30 fps timeline. Still read the frame rate from the sequence at runtime; never hardcode.
0.5	Apple Silicon. Premiere is locked to Metal on this hardware and the setting cannot be changed.
0.6	Lift. Cuts leave gaps. Nothing downstream shifts.
What this removes from the build
No CUDA. No OpenCL. No universal binary. Metal is the only GPU backend. Configure prgpu for the Metal target only and build for aarch64-apple-darwin. Any CUDA code the agent writes is dead weight, and any conditional backend logic is complexity with no user.
The CPU fallback path is optional. Metal is guaranteed present on this hardware. Keep the fallback only if it comes free with prgpu; do not spend time on it.
No ripple math in the Pattern Cutter. Lift means gaps stay open and sync downstream is untouched. This removes the hardest correctness problem from M1.
Code signing friction mostly disappears. Locally compiled plugins never receive the com.apple.quarantine attribute, so Gatekeeper won't block them. Signing only becomes relevant if these are ever distributed to another machine. Assume local-only until stated otherwise.
ProRes 4444 is the settled map output format. Native on macOS, alpha-capable, hardware-encoded on M-series Pro/Max chips and fast in software elsewhere. No format bake-off needed.
Charts are MOGRTs. The §5 fallback is dead. Delete it from consideration.
1. Architecture: four delivery mechanisms, one repo
The single biggest mistake available here is building one monolithic panel that does everything. Premiere already has four native surfaces for the four kinds of thing being built. Use each one for what it's for, and the "everything in one place" goal is satisfied by Premiere's own UI rather than by a custom app that reimplements it.

Need	Delivery mechanism	Why
13 visual effects	Native GPU effect plugins (AE SDK + Premiere GPU extensions, written in Rust)	Appear in the Effects panel. Drag onto a clip. Real-time scrubbing. Native keyframes. Native apply/unapply via the clip's fx toggle. Zero render round-trip.
Throttle/stutter cuts	UXP panel	Pure timeline manipulation. No pixels involved.
Charts & infographics	MOGRT library (Essential Graphics / Properties panel)	Drag-and-drop from a folder, type values in place, live preview, no render step. This is literally the feature Adobe built for this.
Map clips	Headless renderer → file → auto-import	Bespoke geometry and camera paths per video. Not an effect, not a template.
The UXP panel is a hub for the things that have no native home, not a wrapper around everything.

1.1 Why not a web renderer for the effects
Rendering effects through a browser-based pipeline (Remotion, Motion Canvas, Puppeteer frame capture, any of them) forces a round-trip for every parameter change: adjust strength → re-render → re-import → look at it → adjust again. That's the exact Motion Pro workflow this project exists to kill. Rebuilding it in a different language is not progress.

Native GPU effects give real-time scrubbing, Premiere's own keyframe UI, effect stacking, and instant on/off. The cost is that they're compiled plugins instead of TypeScript. As of 2026 that cost is much lower than it used to be. See §2.

1.2 Why a renderer is still correct for maps
A map clip isn't a filter over existing footage. It's generated content with per-video geography, camera paths, and labels. There's no parameter set small enough to expose in an Effect Controls panel. Render it, import it, done. And because the effect plugins are native, the map can be rendered completely flat and unstyled, then have Halftone or Dither or ASCII stacked on it inside Premiere. The map renderer needs zero aesthetic sophistication. This is a major scope reduction, and the agent must not undo it by building styling into the map tool.

2. Effects: stack, and why
2.1 Toolchain
Do not write raw C++ against the Adobe SDK. A modern Rust toolchain exists and is purpose-built for this exact job:

Crate / repo	Role
after-effects (virtualritz)	Safe Rust bindings to the AE and Premiere SDKs. Macros generate the plugin boilerplate and the PiPL resource. No Xcode or MSVC project files to hand-maintain. Shipped in production by Gyroflow and ntsc-rs.
prgpu (Exaecut)	GPU compute runtime. Author kernels once in Slang; the build script emits Metal .metallib, CUDA PTX, and a Rust/rayon CPU fallback. Configure for Metal only (see §0). The cross-backend machinery is a non-feature here.
vekl	Slang kernel library: pixel I/O across 8/16/32-bit and RGBA/BGRA/VUYA layouts, texture sampling, mip chains, coordinate transforms, noise, separable Gaussian blur, blend modes.
create-video-effect (Exaecut)	CLI scaffold for a prgpu/vekl effect. Use it to generate each effect crate.
This combination means each effect is roughly: one .slang file with the actual algorithm, one Rust file declaring parameters, and a build.rs one-liner. That is the entire reason the native path is viable for a solo developer.

Reference implementations to read before writing anything:

ntsc-rs — a shipping Rust AE/Pr effect emulating NTSC and VHS artifacts. Closest prior art to CRT, RGB Shift, and Chromatic Aberration.
Gyroflow's plugin — zero-copy GPU rendering pattern.
Adobe's SDK_Invert_ProcAmp and Vignette samples — canonical GPU effect structure.
2.2 Two non-obvious SDK facts the agent will get wrong
Premiere lacks the AEGP suites and uses software rendering for a standard AE plugin, even one that declares GPU support. Premiere has a separate GPU entry point. In the Rust bindings that's premiere::define_gpu_filter!. If the agent implements only the AE smart-render path, every effect will run on CPU in Premiere and playback will crawl. This must be implemented from the first effect, not retrofitted.
You cannot build a Premiere-only video filter. The base engine is the AE SDK. Both SDKs are required. The AE SDK headers must be downloaded from Adobe and the AESDK_ROOT / PRSDK_ROOT environment variables set.
2.3 Effect inventory and difficulty
Group A is "same code, different math" and should be batched. Group C needs design work, not just engineering.

Group A — pure per-pixel fragment math. Batch these.

Effect	Notes
Halftone	Screen-space dot grid, luminance → dot radius. Angle + cell size + shape params.
Dot Matrix	Halftone's sibling. Fixed-radius dots, palette-quantised. Share a Slang module with Halftone.
RGB Shift	Per-channel UV offset. ~20 lines. Build this first as the pipeline smoke test.
Chromatic Aberration	RGB Shift with radial rather than uniform offset, plus edge falloff.
8-bit	Pixelate (nearest-neighbour downsample) + palette quantise.
Dither	Ordered Bayer matrix (4×4/8×8) in screen space, plus Floyd-Steinberg as an option. Palette-driven.
Posterize / Edge Detect	Not on the original list. Nearly free once the above exist, and both fit the aesthetic. Build if time permits.
Group B — multi-tap or multi-pass. Same architecture, more care.

Effect	Notes
Barrel Blur	Radial/zoom blur with barrel distortion. Use prgpu's mip-chain support so cost stays flat regardless of blur radius.
Progressive Blur	Gradient-masked separable blur. Mask direction, start/end position, and strength all exposed as keyframable params. Mip chain again.
Bloom	Three passes: luminance threshold → blur → additive composite. Needs intermediate buffers.
CRT	Scanlines + barrel + vignette + phosphor mask + optional noise. Composite of things already built. Read ntsc-rs first.
ASCII	Per-pixel, but needs a monospace glyph atlas embedded as a plugin resource. Cell size → luminance → glyph index → sample atlas. Charset, cell size, and colour mode as params.
Group C — real design risk. Do not estimate these alongside Group A.

Effect	Risk
LinoCut	No standard implementation. Flow-field-driven directional hatching, line weight from luminance. Expect several iterations on look, not on code.
Voxel	Implement as a screen-space raymarcher treating source luminance as a height field, rendering cubes with faked lighting. Do not attempt real 3D scene reconstruction.
Blob Tracking	The only genuine outlier. True tracking needs frame-to-frame state, which Premiere's effect model makes hostile. Ship v1 as stateless bright/contrast-region detection per frame with the CCTV-style boxes, labels, and connecting lines drawn from per-frame detections. Visually this is ~90% of the effect for fast-cut content. Defer temporal tracking to v2, or move it to the offline renderer where state is trivial.
2.4 Palette system
Adobe's parameter types are limited: sliders, colour pickers, checkboxes, dropdowns, points, angles. There is no native "palette swatch grid" widget without going into arbitrary-data parameters and custom Effect Controls drawing, which is a disproportionate amount of work.

Implement it this way instead:

A shared palette.slang module plus a shared Rust parameter group, reused by every palette-aware effect (Dither, 8-bit, ASCII, Dot Matrix, Halftone).
palettes.json at the repo root defines named palettes as ordered colour lists. A build.rs step compiles it into the plugin binary.
The effect exposes: a Palette dropdown populated from that JSON, a Colour Count slider, and 8 colour swatch params.
Choosing a named palette writes its colours into the 8 swatches. Editing any swatch flips the dropdown to "Custom".
Quantisation is nearest-colour in Oklab, not sRGB. sRGB nearest-match produces visibly wrong colour choices on gradients.
One JSON file, one rebuild, every effect gets the new palette. Add the MoneyMoves brand palette as the default entry.

2.5 The development loop (highest-leverage item in this document)
Build this in Milestone 2, before writing the second effect. Without it, every shader iteration costs a full Premiere relaunch.

shaderbench CLI. A small Rust binary in the workspace that loads a PNG or a short clip, runs any Slang kernel from the effects workspace with a parameter set from a TOML file, and writes result PNGs. Iteration drops from minutes to under a second, and it runs headless so the agent can use it unsupervised.
Golden-image tests. Each effect ships tests/golden/<effect>_<paramset>.png. CI renders and compares with a perceptual diff (not exact bytes; GPU rounding varies). This is what lets the agent verify its own shader work instead of asking a human to look at every build.
Hot reload. cargo watch → rebuild → copy to the plugin directory. Premiere still needs a restart to reload a plugin, so shaderbench carries the iteration loop and Premiere is only for final confirmation.
3. UXP panel
Premiere 25.6 made UXP the official extensibility platform and superseded CEP. Build UXP. Do not touch CEP, and do not let CEP or ExtendScript documentation near the agent's context; the APIs are unrelated and the old docs will actively mislead.

Grounding requirement: vendor these into docs/ and instruct the agent to consult them rather than recalling API shapes. UXP for Premiere is recent enough that a model working from memory will invent plausible methods that do not exist.

AdobeDocs/uxp-premiere-pro-samples — especially the premiere-api reference panel, which exercises projects, sequences, markers, metadata, effects, transitions, keyframes, import/export, and the encoder.
@adobe/premierepro type definitions, plus @adobe/cc-ext-uxp-types.
The API reference at developer.adobe.com/premiere-pro/uxp.
Also note: UXP calls are async and non-blocking, unlike ExtendScript. Property getters and setters stay synchronous.

Requires UXP Developer Tool 2.2+, and Developer Mode enabled in Premiere settings.

3.1 Pattern Cutter (build first — see §6)
Generalise the throttle transition rather than hardcoding it. The tool takes a pattern and applies it.

Data model:

Pattern {
  name: string
  head: { length: number, mask: boolean[] }   // mask[i] = keep frame i
  tail: { length: number, mask: boolean[] }
  affectAudio: boolean                         // default false
}
Current pattern: head.length = 5, mask = [true, false, true, false, true], mirrored on the tail. At 30 fps that's a 167 ms strobe on each end.

Behaviour:

Lift only. Cut at each frame boundary in the pattern, then delete the masked-out frames without closing the gap. Nothing after the clip moves. Do not implement ripple/extract; it was ruled out.
Gaps reveal whatever sits on the track below, or black on the lowest video track. The tool must behave identically either way. Test on both a bare V1 clip and a V2-over-V1 stack.
Operate on selected video clips only. Audio must come out byte-identical.
Apply to N selected clips in one action.
Read the sequence frame rate at runtime. The pattern is expressed in frames, so a 5-frame head means something different at 24 fps; never assume 30.
Top technical risk in M1. Premiere links audio and video track items, and a razor cut on a linked clip normally cuts both. The agent must establish early whether the UXP API can cut and delete a video track item while leaving its linked audio untouched, or whether the tool needs to unlink first and relink after. Resolve this with a five-line spike against the premiere-api sample panel before building the pattern editor UI. If the API can't do it cleanly, the whole tool design changes.

A small pattern editor in the panel: a row of toggleable frame squares, plus a length control. Saved patterns persist to disk.
Ship 4 presets: Strobe In (his current), Strobe Out, Strobe Both, Hard Stutter.
Acceptance: applying to 10 selected clips on a 30-minute timeline finishes in under two seconds and leaves every audio waveform byte-identical.

3.2 Preset Stacks
One click applies a named stack of effects with saved parameter values to the selected clips. "MoneyMoves Grit" = Dither + Chromatic Aberration + a specific palette, all at once. Stacks are JSON on disk, which means they're editable and version-controllable.

Removing a stack removes exactly the effects it added, leaving anything applied manually alone.

3.3 Map Generator front-end
A form in the panel. Country or region, camera path, duration, outline on/off, fill colour, label on/off. Submits a job to the local render service (§4), polls for completion, then imports the finished file and places it on the timeline above the playhead.

The panel must not block while rendering. Show a job queue with progress.

3.4 ASCII text utility
Text input plus a figlet font dropdown, rendering ASCII banner text (the figlet npm package covers this; there is no need to reverse-engineer a hosted tool). Inserts the result as a monospace graphic on the timeline. Roughly an afternoon of work, and it's the cheapest item on this entire list.

3.5 UI
Adobe Spectrum Web Components. The panel should look like part of Premiere, not like a web app embedded in it. Resist the urge to build a custom design system.
Dense and keyboard-driven. Every action gets a shortcut. For fast-cut editing, a panel that requires mouse travel is slower than the manual workflow it replaces.
A single scrolling panel with collapsible sections beats tabs. Tabs hide state.
Never a modal for a frequent action.
4. Map renderer
Stack: Node + d3-geo + node-canvas + ffmpeg. No browser.

Justification: d3-geo handles projection, interpolation, and path generation. node-canvas rasterises. ffmpeg encodes. All three are deterministic, headless, fast, and have no Chromium or WebGPU dependency. A browser-based renderer adds a large dependency and a class of flakiness for zero benefit here, because all the visual styling happens later as Premiere effects stacked on the output (§1.2).

Data: world-atlas TopoJSON (Natural Earth derived) for country borders, plus topojson-client for feature extraction.

Camera: interpolate the projection's center, rotate, and scale across frames with an easing function. A "fly to country X" move is start state → country centroid, easing on both position and zoom. That's a dozen lines, not a module.

Output format: ProRes 4444, settled. -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le. Alpha is required so the map composites over footage. Still render a ten-frame test file and confirm the alpha survives import into Premiere before building the rest of the renderer, but expect it to work.

Interface: a local HTTP service. POST /render with a job spec, GET /jobs/:id for status, file path on completion. The UXP panel is a client. Keep the renderer independently runnable from a CLI so it can be tested and debugged without Premiere in the loop.

5. Charts and infographics
Recommended: a MOGRT library.

Premiere supports data-driven Motion Graphics templates natively, including CSV and TSV sources for bar charts and line graphs, with the parameters exposed in the Properties/Essential Graphics panel. Unmapped fields render as text inputs, hot-text sliders for numbers, and colour swatches. Drag from the Graphics Templates panel to the timeline, type your numbers, adjust colours and fonts in place. That is the drag-and-drop-plus-type-your-own-data requirement, already built, with live preview and no render step.

Authoring: After Effects, using the Essential Graphics panel, exported as .mogrt. Premiere does not need AE installed to use the result.

The variable-item-count problem: MOGRTs can't spawn layers dynamically. Standard workaround: build each chart with a fixed maximum (8 bars, 8 line segments, 8 rows), expose a single "Count" slider, and drive per-item visibility with expressions off that slider. From the editing side it behaves like a dynamic count.

Library v1: Bar (vertical + horizontal), Line, Area, Big Stat / KPI card, Comparison split, Ranked list. Each in 2 styles. That's 12 exports. Build one end-to-end and use it in a real video before making the other eleven.

Agent task before designing around this: verify in the UXP samples whether the API can insert a MOGRT and set its component parameters programmatically. If it can, the panel gains a chart form. If it can't, MOGRTs stay a pure drag-and-drop workflow, which is still fine.

6. Milestones
Sequenced by risk and by time-to-first-value, not by the order the features were requested.

M0 — Environment setup. AE SDK and Premiere SDK headers, AESDK_ROOT / PRSDK_ROOT, Rust toolchain with aarch64-apple-darwin, Slang compiler, Xcode command line tools, UXP Developer Tool 2.2+, Developer Mode enabled in Premiere settings. Vendor all reference docs into docs/. Plugin install path on macOS: /Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore/.

M1 — Pattern Cutter, shipped and in daily use. Start with the audio-linking spike in §3.1 before any UI work. No rendering, no GPU, no shaders. This is the fastest real time-saving in the whole plan and it proves the UXP toolchain works. Do not let it queue behind the effects work.

M2 — One effect end-to-end, plus shaderbench and golden tests. RGB Shift. Real-time in Premiere with the GPU entry point wired up, scrubbable, keyframable. Every architectural risk in the effects half of this project lives in this milestone: GPU entry point, pixel formats, parameter plumbing, plugin install path, code signing. Solve it once on the simplest possible shader.

M3 — Group A effects. Halftone, Dot Matrix, 8-bit, Dither, Chromatic Aberration. Plus the palette system, since three of these need it.

M4 — Group B effects. Barrel Blur, Progressive Blur, Bloom, CRT, ASCII.

M5 — Preset Stacks and the ASCII text utility. Small panel work, high daily value once the effect library exists.

M6 — Map renderer plus panel front-end.

M7 — Chart MOGRTs. One chart, used in a real video, before the rest.

M8 — Group C. LinoCut, Voxel, Blob Tracking. Open-ended by nature. Treat as ongoing rather than as a milestone with a deadline.

Every milestone ends with the tool used in an actual MoneyMoves video. A milestone that ships without being used isn't done, it's just written.

7. Repo layout
moneymoves-toolkit/
  effects/                  # Rust workspace, one crate per effect
    _shared/
      palette.slang
      params.rs             # shared param groups incl. palette
    rgb-shift/
      shaders/rgb_shift.slang
      src/lib.rs
      build.rs
      tests/golden/
    halftone/  dither/  ascii/  crt/  ...
  shaderbench/              # CLI harness: PNG in, PNG out
  panel/                    # UXP plugin
    src/
      pattern-cutter/
      preset-stacks/
      map-form/
      ascii-text/
    manifest.json
  render-service/           # Node: maps (and charts, if fallback)
    src/map/
  mogrts/                   # AE projects + exported .mogrt files
  palettes.json             # single source of truth for all palettes
  presets/                  # pattern + effect-stack JSON
  docs/                     # vendored SDK and UXP reference material
8. Instructions for the coding agent
Never write Adobe SDK or UXP code from memory. Both APIs changed recently. Read docs/ and the vendored type definitions first. If a method can't be found in the vendored reference, assume it doesn't exist.
CEP and ExtendScript documentation is poison. It looks relevant and is not. Do not cite it, do not adapt code from it.
Implement premiere::define_gpu_filter! from the first effect. See §2.2.
One effect at a time, fully, including a golden test. Do not scaffold thirteen crates and fill them in later.
Verify alpha import before building the map renderer. Render a ten-frame ProRes 4444 test file, import it into Premiere, confirm the alpha survives.
Never touch audio in the Pattern Cutter without an explicit flag. Write a regression test that asserts audio track items are unmodified. Run the §3.1 spike first.
Write no CUDA, no OpenCL, no Windows code paths, no Intel slices. §0 is fixed. Cross-platform abstraction here is pure cost.
Flag scope creep back to the human. This toolkit exists to make videos faster. If a task starts looking like a product, say so.
9. Known friction, stated up front
Premiere restarts. Reloading a compiled effect plugin requires an app restart. This is why shaderbench exists.
Code signing is deferred, not solved. Locally built plugins load fine. The moment one gets zipped, emailed, or downloaded, Gatekeeper quarantines it and it silently fails to appear in the Effects panel. If distribution ever happens, budget for signing and notarisation then.
Linked audio in the Pattern Cutter. See the risk callout in §3.1. This is the one thing in M1 that could force a redesign.
MOGRT authoring means opening After Effects. There's no way around it and no fallback now. Don't build a .mogrt generator; the format is a zip of an AE project and generating it programmatically is brittle.
Group C has no deadline. LinoCut and Voxel are design problems wearing engineering clothes.