# Phase 0 validation results

Target host: Premiere Pro 25.6.4 on Apple Silicon macOS.

Environment audit on 2026-09-19:

- Xcode 16.4 selected: pass.
- UXP Developer Tool 2.3.0 installed: pass.
- Premiere Pro 25.6.4 and After Effects 25.6.4 installed: pass.
- Premiere Pro C++ SDK 26.0 found: build-header source; host validation remains Premiere Pro 25.6.4.
- After Effects SDK headers found under `/Users/davidgajdamaka/Developer/AdobeSDKs/AfterEffectsSDK`: pass.
- After Effects 25.6.4 manual authoring test: pass. `build-vertical-bar.jsx` created `MoneyMoves-Vertical-Bar-v1.aep` (1.1 MB) and `MoneyMoves Vertical Bar v1.mogrt` (132 KB) on 2026-09-19. The command-line `-r` route remains unproven, but is no longer a blocker for authoring.
- Premiere manual MOGRT test: user confirmed the vertical-bar prototype works. Charts are now frozen and this is not an active Phase 0 gate.

| Active gate                    | Status  | Evidence                                                        |
| ------------------------------ | ------- | --------------------------------------------------------------- |
| UXP batch effect transaction   | pending | UDT is installed; requires a signed native bundle and host test |
| RGB Shift Metal + CPU fallback | pending | Both SDKs and Xcode are ready; native adapter remains           |
| ProRes 4444 alpha round trip   | pending | Renderer is implemented; Premiere/AME host test remains         |

Do not replace `pending` with `pass` without the date, exact build commit, test project, output location, timing, and reviewer.
