# Phase 0 validation results

Target host: Premiere Pro 25.6.4 on Apple Silicon macOS.

Environment audit on 2026-09-19:

- Xcode 16.4 selected: pass.
- UXP Developer Tool 2.3.0 installed: pass.
- `just` 1.58.0 installed: pass.
- Premiere Pro 25.6.4 and After Effects 25.6.4 installed: pass.
- Premiere Pro C++ SDK 26.0 found: build-header source; host validation remains Premiere Pro 25.6.4.
- After Effects SDK headers found under `/Users/davidgajdamaka/Developer/AdobeSDKs/AfterEffectsSDK`: pass.
- After Effects 25.6.4 manual authoring test: pass. `build-vertical-bar.jsx` created `MoneyMoves-Vertical-Bar-v1.aep` (1.1 MB) and `MoneyMoves Vertical Bar v1.mogrt` (132 KB) on 2026-09-19. The command-line `-r` route remains unproven, but is no longer a blocker for authoring.
- Premiere manual MOGRT test: user confirmed the vertical-bar prototype works. Charts are now frozen and this is not an active Phase 0 gate.

| Active gate                    | Status  | Evidence                                                                               |
| ------------------------------ | ------- | -------------------------------------------------------------------------------------- |
| UXP batch effect transaction   | pending | Unit test proves 20 actions share one transaction; host undo remains                   |
| RGB Shift Metal + CPU fallback | pending | Bundle builds, signs, installs, and exports both entry points; host comparison remains |
| ProRes 4444 alpha round trip   | pending | Verified ten-frame input artifact exists; Premiere/AME round trip remains              |

## Production installation evidence

### Panel 0.15.1 installation — 2026-09-23

- Installed the verified standalone `MoneyMoves-Toolkit-0.15.1.ccx` through
  `Install MoneyMoves Toolkit.command` while Premiere and UXP Developer Tool
  were fully closed. Creative Cloud Desktop and UXP Developer Tool were not
  used for installation.
- The only MoneyMoves system UXP directory is
  `/Library/Application Support/Adobe/UXP/Plugins/External/com.moneymoves.premiere-toolkit_0.15.1`.
  Its `index.html` matches the packaged build, and Adobe's system registry
  points to that directory with `status: enabled` and version `0.15.1`.
- The previous 0.14.0 panel and its UXP storage were preserved under
  `artifacts/install-backups/moneymoves-panel-20260923T000622Z`.
- A fresh Premiere Pro 25.6.4 launch created
  `UXPLogs_2026-09-23_02-07-29_915629.log`; it records the MoneyMoves ID as
  enabled and `Number of plugins added from system's pluginsInfo: 1`. No
  MoneyMoves initialization error appears in that log.
- This proves production installation and discovery. Visual layout, native
  match-name discovery, Apply/Remove, one-step Undo, and render behavior remain
  **pending interaction in the opened panel**.

### Panel 0.14.0 visual failure and replacement build — 2026-09-22

- User screenshots from Premiere Pro 25.6.4 showed that typing `ASCII`
  changed the search count from 12 to 1, while the effect list and inspector
  remained blank. This is a failed host UI check, not a successful search or
  effect-application check.
- [Adobe's Premiere UXP CSS guidance](https://developer.adobe.com/premiere-pro/uxp/resources/recipes/css-styling/)
  excludes Grid layout. Panel 0.14.1
  replaces the Grid-based workspace with Flexbox and corrects the selected
  inspector after filtering. Panel 0.14.2 additionally shows a native effect
  as missing when Premiere's filter factory does not report its match name;
  the registry alone no longer enables Apply.
- `MoneyMoves-Toolkit-0.14.2.ccx` has passed TypeScript checks, panel tests,
  formatting, package integrity, and checksum verification. Host visual and
  effect-application results remain **pending** until the running Premiere
  session is closed and this build is installed and reopened.
- Panel 0.15.0 supersedes 0.14.2 as the next installation candidate and adds
  a Diagnostics view for inspecting native match names and host status inside
  Premiere. No visual or apply/remove result is inferred from this source
  change; the replacement build still requires a closed-host installation.
- The standalone `MoneyMoves-Toolkit-0.15.0.ccx` archive passed TypeScript,
  30 panel tests, formatting, ZIP integrity, and SHA-256 verification
  (`8683bf127b5ab8c9cfef7c4d339b89b5f201331f67178dfd1e8c15cbdae37337`).
- The installed RGB Shift PiPL embeds `com.moneymoves.rgb-shift`.
  [Adobe's VideoFilterFactory documentation](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videofilterfactory)
  shows `AE.`/`PR.`-prefixed host match names.
  Panel 0.15.1 normalizes these forms for discovery and uses the exact host
  name when creating a component. This is an API-compatibility fix based on
  documented naming; the actual returned name and apply outcome are still
  **pending Premiere-host observation**.
- `MoneyMoves-Toolkit-0.15.1.ccx` passed TypeScript, 34 panel tests,
  formatting, ZIP integrity, and SHA-256 verification
  (`86b9977cc649e7dee34cedd797ca7b40469d83b3300d7b62105763b8ac221e43`).

### Panel 0.14.0 installation — 2026-09-21

- Built after commits `9ee2213` and `c079bb2` using the standalone offline
  installer, with Premiere Pro fully closed.
- Verified release: `MoneyMoves-Toolkit-0.14.0.ccx`, SHA-256
  `4f42769e50a52a28528b493e908f9390ca647b007c5f1d44b4ef3ca72770349d`.
- The only MoneyMoves system UXP directory is
  `/Library/Application Support/Adobe/UXP/Plugins/External/com.moneymoves.premiere-toolkit_0.14.0`.
  Its `index.html` matches the verified build and its manifest hash matches
  the CCX manifest.
- Premiere's UXP registry points to that directory with `status: enabled`.
  A fresh Premiere Pro 25.6.4 launch recorded the MoneyMoves ID as enabled
  and one system plug-in added in
  `UXPLogs_2026-09-21_21-43-56_320186.log`.
- This establishes installation and discovery only. Panel opening, live
  apply/remove, one-step Undo, rendering, and keyframe behavior on this build
  remain **pending host interaction**; do not infer them from unit tests.

### Panel 0.12.2 startup — 2026-09-21

Validated on 2026-09-21 against Premiere Pro 25.6.4:

- Panel release: `MoneyMoves-Toolkit-0.12.2.ccx`, commit `6bb02a3` plus
  scaled-icon fix `41bb0d8`.
- Adobe production install:
  `/Library/Application Support/Adobe/UXP/Plugins/External/com.moneymoves.premiere-toolkit_0.12.2`.
- The installed directory matched the verified CCX contents exactly.
- The system registry used
  `$systemPlugins/External/com.moneymoves.premiere-toolkit_0.12.2` and marked
  the plug-in enabled.
- Premiere's `UXPLogs_2026-09-21_20-05-41_973143.log` recorded the MoneyMoves
  ID and `Number of plugins added from system's pluginsInfo: 1`, with no
  MoneyMoves initialization, script, or icon error.
- Fresh external-plugin storage was created at 20:05:42 and updated at
  20:07:06. Its persisted values included the Effects view, MoneyMoves Core
  palette, and RGB Shift selection, proving that panel code executed and saved
  state during the host session.
- Premiere's native `Plugin Loading.log` discovered all 12 installed
  MoneyMoves bundles. Cached bundles reported successful registry loads; the
  newly installed ASCII, CRT, and Progressive Blur bundles were recognized by
  both Adobe loaders. No MoneyMoves load failure was present.
- All installed MoneyMoves executables passed strict ad-hoc signature checks
  and were arm64 Mach-O binaries.
- The authenticated localhost renderer returned `status: ok` after the host
  session.

This passes production installation and panel-startup validation without UXP
Developer Tool. It does not substitute for the pending host undo, GPU/software
image comparison, visual acceptance, performance, or AME round-trip gates.

## Automated feasibility evidence

### Native host adapter

- Initial implementation commit: `fb4a608`; runtime metadata/16-bit correction: `0596150`.
- Command: `just native-rgb-install`.
- Build target: `aarch64-apple-darwin`.
- Build artifact: `target/debug/MoneyMoves RGB Shift.plugin`.
- Installed artifact: `/Users/davidgajdamaka/Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore/MoneyMoves RGB Shift.plugin`.
- Installed executable SHA-256: `ab7293d107419be0388513a4d24c5156c5250b9ac1286ecbacc33457c1c993c6`.
- Ad-hoc signature verification: pass.
- Mach-O architecture: arm64.
- Exported host symbols: `_EffectMain` and `_xGPUFilterEntry`.
- PiPL match name: `com.moneymoves.rgb-shift`.

This proves packaging and registration shape, not that Premiere loaded or rendered the effect.

### UXP transaction behavior

- Test commit: `8424032`.
- `apps/panel/src/premiere.test.ts` applies RGB Shift to 20 mock video clips with 20 append actions inside exactly one named `executeTransaction` call.
- The paired removal test removes 20 instances inside exactly one named transaction.

This proves transaction construction, not Premiere's host undo behavior or the two-second timing target.

### Panel-first workflow

- The panel now persists its selected workspace, effect, and palette; it can be
  docked or floated by Premiere.
- Effects are checked against Premiere's discovered `com.moneymoves.*` match
  names before their controls are enabled.
- The adapter unit tests cover 20-clip apply/remove transactions, mixed values,
  batch parameter updates, and selection-event cleanup.
- The remaining manual host gate must confirm that Diagnostics discovers the
  installed bundle and that the new Effects workflow produces one native Undo.

### ProRes alpha input artifact

- Generator commit: `30aff15`.
- Command: `pnpm validate:alpha-spike`.
- Artifact: `artifacts/validation/phase-0-alpha.mov` (ignored by Git and reproducible).
- SHA-256 from the 2026-09-19 run: `e782af18715feb1f3bf8769b17ed547a46e9a3e5d6334e5cd709b6d340a6cd1f`.
- FFprobe: ProRes 4444 (`ap4h`), 1920×1080, 30 fps, ten decoded frames, alpha-capable `yuva444p12le`, BT.709 matrix metadata.

Follow [the Phase 0 host runbook](phase-0-host-runbook.md) to complete the three active gates. Record exact project, artifact, elapsed time, renderer, export settings, date, and reviewer before changing any status to `pass`.

Do not replace `pending` with `pass` without the date, exact build commit, test project, output location, timing, and reviewer.
