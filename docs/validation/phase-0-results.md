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

### ProRes alpha input artifact

- Generator commit: `30aff15`.
- Command: `pnpm validate:alpha-spike`.
- Artifact: `artifacts/validation/phase-0-alpha.mov` (ignored by Git and reproducible).
- SHA-256 from the 2026-09-19 run: `e782af18715feb1f3bf8769b17ed547a46e9a3e5d6334e5cd709b6d340a6cd1f`.
- FFprobe: ProRes 4444 (`ap4h`), 1920×1080, 30 fps, ten decoded frames, alpha-capable `yuva444p12le`, BT.709 matrix metadata.

Follow [the Phase 0 host runbook](phase-0-host-runbook.md) to complete the three active gates. Record exact project, artifact, elapsed time, renderer, export settings, date, and reviewer before changing any status to `pass`.

Do not replace `pending` with `pass` without the date, exact build commit, test project, output location, timing, and reviewer.
