# Changelog

## 0.14.2 - Unreleased

- Show the effect library without pretending that registered effects are
  installed. Missing native bundles are clearly labeled, and Apply is disabled
  until Premiere reports the corresponding match name.
- Distinguish checking, missing, and detection-error states so installation
  problems are visible in the panel.
- Replace the distorted native selection pill with a plain status badge and a
  separate refresh control. Keep TypeScript's generated files out of `src`.

## 0.14.1 - Unreleased

- Replace unsupported CSS Grid layouts with responsive Flexbox so navigation,
  effect results, the inspector, and generation fields render in Premiere UXP.
- Remove unsupported font shorthand and use compact action-button styling in
  the effect browser.
- Make a filtered search result the visible effect in the inspector, and reject
  future panel packages containing CSS Grid.

## 0.14.0 - Unreleased

- Add compact animation and keyframe controls to every supported effect
  parameter in the focused Effects inspector.
- Support animation enable/disable, add/remove at the playhead, previous/next
  navigation, keyframe counts, and Linear/Hold/Bezier interpolation.
- Position new keyframes at the active sequence playhead and enable animation
  in the same undo transaction when the first keyframe is created.

## 0.13.0 - Unreleased

- Recognize selected Premiere video-clip host proxies through their documented
  media type instead of relying on JavaScript `instanceof` identity.
- Create all effect mutation actions inside Premiere's required locked,
  undoable transaction scope so Apply, Remove, presets, parameters, and
  keyframes can execute in the production host.
- Replace the oversized card list with a searchable compact effect library and
  a focused inspector, explicit Apply/Remove actions, selection refresh, and a
  responsive docked/floating layout.
- Add regression coverage for host-proxy selection and invalid out-of-scope
  Premiere action creation.

## 0.12.2 - Unreleased

- Restore Adobe's `$systemPlugins` registry token in the offline installer so
  Premiere can initialize the production panel from its system UXP folder.
- Add a registry regression test that replaces only MoneyMoves while
  preserving unrelated installed plug-ins.

## 0.12.1 - Unreleased

- Ship explicit `@1x` panel and plugin-list icons so Premiere does not report a
  missing scaled icon when loading the production UXP package.
- Reject panel packages that omit any required 1× or 2× icon asset.

## 0.12.0 - Unreleased

- Add a double-click offline installer that packages, verifies, backs up, and
  installs the panel without Creative Cloud Desktop or UXP Developer Tool.
- Add a real-time panel-driven ASCII video effect with Standard, Block, Dot,
  Binary, Shade, and Braille families; source/mono/palette color modes; custom
  colors; CPU fallback; and Metal rendering.
- Restore the panel Generate workspace for static or animated FIGlet ASCII
  titles, shared palettes, active-sequence output matching, render progress,
  cancellation, and automatic Premiere import.
- Add Money Terminal, Source Glyphs, and Binary Signal presets plus
  shaderbench and signed Apple-Silicon bundle/install support.

## 0.11.0 - Unreleased

- Add panel-driven CRT with curvature, scanlines, phosphor triads, RGB
  convergence, deterministic timeline-locked noise/flicker, vignette, glow,
  and CPU/Metal render paths.
- Add Clean Monitor, Money CRT, and Broken Signal presets plus shaderbench and
  signed Apple-Silicon bundle/install support.

## 0.10.0 - Unreleased

- Add panel-driven Progressive Blur with a keyframable directional gradient,
  start/end range, feather, inversion, 4/8/16-sample quality modes, and CPU
  and Metal render paths.
- Add the Progressive Blur reference renderer to shaderbench and a signed
  Apple-Silicon bundle/install recipe.

## 0.9.2 - Unreleased

- Replace the four-tab panel with a clip-driven apply / remove / slider
  surface for installed MoneyMoves effects.
- Render the panel into Premiere's `create`/`show` root instead of a homemade
  `uxp-panel`, and keep only the Toolkit panel in the UXP Plugins menu.
- Add a recoverable `pnpm reinstall:panel` path that verifies the current
  `.ccx`, backs up existing copies and storage, and installs without Creative
  Cloud Desktop.

## 0.9.1 - Unreleased

- Fix the production panel bootstrap by loading the classic UXP bundle after
  the `#root` element and waiting for DOM readiness before mounting React.
- Reject packaged panels whose script executes before the root element.

## 0.9.0 - Unreleased

- Add the panel-driven Bloom CPU/Metal effect with threshold, soft knee,
  quality-controlled glow radius, intensity, tint, and keyframable mix.

## 0.8.0 - 2026-09-20

- Add the panel-driven Barrel Blur CPU/Metal effect with barrel/pincushion
  distortion, radial edge blur, optical-center controls, and quality modes.

## 0.7.0 - 2026-09-20

- Add the panel-driven Chromatic Aberration CPU/Metal effect with radial lens
  separation, adjustable optical center, falloff, edge modes, and presets.

## 0.6.0 - 2026-09-20

- Add the panel-driven Dither CPU/Metal effect with Bayer 2×2/4×4/8×8 and
  deterministic blue-noise modes, OKLab palettes, custom colors, and presets.

## 0.5.0 - 2026-09-20

- Add the panel-driven 8-bit CPU/Metal effect with pixel blocks, OKLab
  quantization, named palettes, 2–8 custom colors, and presets.

## 0.4.0 - 2026-09-20

- Add the panel-driven Dot Matrix CPU/Metal effect with branded palettes,
  custom colors, luminance-sized dots, and named presets.

## 0.3.0 - 2026-09-20

- Add the panel-driven Halftone CPU/Metal effect with branded palettes, custom
  colors, three dot shapes, keyframable controls, and named presets.
- Harden RGB Shift with Clamp/Mirror/Wrap edge behavior and three presets.
- Normalize Premiere color values between panel hex controls and native Adobe
  color parameters.

## 0.2.0 - 2026-09-20

- Add the panel-driven Frame Gate native effect with CPU/Metal rendering,
  clip-local head/tail timing, reversible presets, and batch undo support.
- Add reproducible standalone CCX packaging so normal panel use does not
  require UXP Developer Tool.

## 0.1.0 - 2026-09-20

- Establish the pnpm/Cargo monorepo, shared contracts, UXP panel, local renderer, native reference kernels, MOGRT authoring scaffold, CI, and developer documentation.
- Add active-sequence output detection to the panel and expand host diagnostics.
- Establish the reference-derived MoneyMoves palettes and typography across the panel, renderer, and first MOGRT.
- Add deterministic Halftone, Dot Matrix, and Dither CPU reference kernels and Slang implementations.
- Record the installed Adobe SDK toolchain, keep the working vertical-bar MOGRT frozen, and defer further chart development.
- Add the pinned RGB Shift Adobe host adapter, Slang CPU/Metal pipeline, Apple-Silicon bundle packaging, toolchain validation, and ad-hoc signing/install recipes.
