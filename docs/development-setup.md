# Development setup

## Required machine state

- Apple Silicon Mac running the target Premiere Pro 25.6.4.
- Xcode 16.2 or newer selected with `xcode-select`.
- UXP Developer Tool 2.2 or newer.
- Adobe After Effects/Premiere SDK headers accepted and stored outside this repository.
- `just` 1.58.0 for native bundle build and packaging recipes.
- Node 24.11.1, pnpm 11.24.0, Rust 1.96, and FFmpeg with `prores_ks`.
- After Effects 25.6.4 only when maintaining the frozen MOGRT prototype.

The 2026-09-19 follow-up audit found Xcode 16.4, UXP Developer Tool 2.3, the After Effects SDK, and the Premiere Pro C++ SDK 26.0 installed. The build uses the Premiere 26 headers but targets and validates only the v1 GPU interfaces available in Premiere Pro 25.6.4. Native video effects require both SDKs because Premiere's GPU extension supplements an After Effects effect entry point and CPU fallback.

## Bootstrap

```sh
pnpm install
pnpm build
pnpm test
cargo run -p shaderbench -- --help
```

Start the renderer with `pnpm dev:renderer`. Its first start creates a token at `~/Library/Application Support/MoneyMoves/renderer-token`. Copy that value into the panel Diagnostics field. Development mode uses `development-token` explicitly.

For a normal installed build, run `pnpm package:panel`, then double-click
`artifacts/releases/MoneyMoves-Toolkit-<version>.ccx` and confirm the install in
Creative Cloud Desktop. Quit and reopen Premiere, then open **Window → UXP
Plugins → MoneyMoves Toolkit**. This installed build does not depend on UXP
Developer Tool.

For source debugging only, build the panel with `pnpm build:panel`, add
`apps/panel/dist/manifest.json` to UXP Developer Tool, and load it in Premiere.
The panel can be dragged onto another monitor or docked into the Premiere
workspace. Use Developer Tool's reload action after rebuilding.

The Vite build emits a single classic IIFE script for UXP. Do not point UDT at
the source tree or a browser-development URL; Premiere's UXP runtime expects
the built plain script bundle.

The panel's **Home**, **Effects**, **Generate**, and **Diagnostics** views are
the normal editor workflow. Diagnostics must list the native bundle before an
effect is enabled; use Effects to apply, remove, adjust, and keyframe a
MoneyMoves effect on the selected video clips. Browser preview is useful for
layout but cannot exercise Premiere APIs.

## Renderer LaunchAgent

After a production build, run `scripts/install-renderer.sh`. It installs a per-user LaunchAgent and prints the token location. Run `scripts/uninstall-renderer.sh` to unload it; generated media and the bearer token are deliberately retained.

## Native effects

Set the SDK roots to the installed licensed SDKs. Never commit them:

```sh
export AESDK_ROOT="/Users/davidgajdamaka/Developer/AdobeSDKs/AfterEffectsSDK"
export PRSDK_ROOT="/Users/davidgajdamaka/Desktop/code/premiere-editor-tools/Premiere Pro 26.0 C++ SDK"
```

`prgpu-build` 0.2.0 downloads its pinned Slang 2026.8 SDK under `target/.slang-sdk/`; a global `slangc` installation is not required. Development bundles install under:

```text
~/Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore/
```

Every `.plugin` bundle must be ad-hoc signed on macOS 15:

```sh
codesign --force --deep --sign - path/to/MoneyMoves.plugin
codesign --verify --deep --strict path/to/MoneyMoves.plugin
```

The checked-in recipes validate the toolchain, build only for Apple Silicon, package the PiPL resources, sign the bundle, and install it per user:

```sh
just native-validate
just native-rgb-build
just native-rgb-install
just native-frame-install
just native-halftone-install
just native-dot-matrix-install
just native-eight-bit-install
just native-dither-install
just native-chromatic-install
just native-barrel-blur-install
just native-bloom-install
```

`prgpu-build` 0.2.0 has a crates.io include-path defect for its bundled `vekl` shaders. The RGB Shift build script resolves the `vekl` copy belonging to the exact pinned `prgpu` crate. Set `PRGPU_VEKL_ROOT` only when using a vendored Cargo registry.

## Frozen MOGRT prototype

The working vertical-bar generator remains in `mogrts/scripts/build-vertical-bar.jsx`, but chart development is deferred. Maps and ASCII titles do not use After Effects.
