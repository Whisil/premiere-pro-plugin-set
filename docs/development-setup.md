# Development setup

## Required machine state

- Apple Silicon Mac running the target Premiere Pro 25.6.4.
- Xcode 16.2 or newer selected with `xcode-select`.
- UXP Developer Tool 2.2 or newer.
- Adobe After Effects/Premiere SDK headers accepted and stored outside this repository.
- Node 24.11.1, pnpm 11.24.0, Rust 1.96, and FFmpeg with `prores_ks`.
- After Effects 24.3 for MOGRT authoring only.

The initial environment audit found Xcode 16.0 selected, no UXP Developer Tool, no `just`, and no Adobe SDK headers. Those are Phase 0 blockers for Adobe-host validation, not for the headless workspace.

## Bootstrap

```sh
pnpm install
pnpm build
pnpm test
cargo run -p shaderbench -- --help
```

Start the renderer with `pnpm dev:renderer`. Its first start creates a token at `~/Library/Application Support/MoneyMoves/renderer-token`. Copy that value into the panel Diagnostics field. Development mode uses `development-token` explicitly.

Build the panel with `pnpm build:panel`, then add `apps/panel/dist/manifest.json` to UXP Developer Tool and load it in Premiere. Browser preview is useful for layout but cannot exercise Premiere APIs.

## Renderer LaunchAgent

After a production build, run `scripts/install-renderer.sh`. It installs a per-user LaunchAgent and prints the token location. Run `scripts/uninstall-renderer.sh` to unload it; generated media and the bearer token are deliberately retained.

## Native effects

Set `ADOBE_AE_SDK_ROOT` and `ADOBE_PREMIERE_SDK_ROOT` to licensed SDK locations when the native adapter exists. Never commit those SDKs. Development bundles install under:

```text
~/Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore/
```

Every `.plugin` bundle must be ad-hoc signed on macOS 15:

```sh
codesign --force --deep --sign - path/to/MoneyMoves.plugin
codesign --verify --deep --strict path/to/MoneyMoves.plugin
```

## MOGRT authoring

Open After Effects, choose File > Scripts > Run Script File, and select `mogrts/scripts/build-vertical-bar.jsx`. Set `MONEYMOVES_MOGRT_OUTPUT` before launching After Effects to override the output folder. Normal Premiere editing does not require After Effects.
