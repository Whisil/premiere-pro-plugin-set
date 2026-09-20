# MoneyMoves Premiere Toolkit

A macOS/Apple-Silicon toolkit for Adobe Premiere Pro 25.6.4. Its primary
interface is one UXP workflow panel that can be docked in Premiere or floated
onto another display. The repository also contains native-effect reference
kernels and test harnesses, a local map/ASCII renderer, and a frozen MOGRT
prototype.

## Current status

The repository foundation and first vertical slices are implemented. RGB Shift
now builds as an arm64 Adobe plugin with software and Premiere GPU entry
points, packages with PiPL metadata, signs successfully, and installs per user.
The panel-first Phase 0 work adds contextual Home, Effects, Generate, and
Diagnostics workflows. Frame Gate now has a signed CPU/Metal bundle and a
complete panel surface. Premiere 25.6.4 host rendering and undo validation
remain active local gates; see [Development setup](docs/development-setup.md).

## Commands

```sh
pnpm install
pnpm check
pnpm build
pnpm package:panel
cargo run -p shaderbench -- --help
```

Run the renderer with `pnpm dev:renderer` and the panel build with `pnpm dev:panel`.

## Install the panel without developer tools

Run `pnpm package:panel`, then double-click the generated
`artifacts/releases/MoneyMoves-Toolkit-<version>.ccx`. Creative Cloud Desktop
will show the installation confirmation. Quit and reopen Premiere, then choose
**Window → UXP Plugins → MoneyMoves Toolkit**. The installed panel does not
require UXP Developer Tool; that tool is only used for debugging source builds.

## Components

- `apps/panel`: Premiere UXP panel (Manifest v5, Premiere 25.6 minimum).
- `services/render-service`: authenticated localhost renderer for maps and ASCII titles.
- `packages/contracts`: versioned schemas and shared MoneyMoves design tokens.
- `native/core`: deterministic CPU reference implementations used by tests and shaderbench.
- `native/shaderbench`: headless PNG harness for rapid effect iteration.
- `native/plugins/rgb-shift`: first loadable CPU/Metal Adobe effect bundle.
- `native/plugins/frame-gate`: reversible CPU/Metal frame-throttle effect bundle.
- `native/plugins/halftone`: palette-aware CPU/Metal print-pattern effect bundle.
- `native/plugins/dot-matrix`: palette-aware CPU/Metal luminance-dot effect bundle.
- `native/plugins/eight-bit`: CPU/Metal pixelation and OKLab quantization effect bundle.
- `mogrts`: After Effects authoring scripts and generated-template documentation.

The implementation roadmap is tracked in [Roadmap](docs/roadmap.md), with decisions in [Architecture](docs/architecture.md) and the visual direction captured in the [style inventory](docs/style-inventory.md).

Direct runtime licensing and release obligations are recorded in [Third-party notices](THIRD_PARTY_NOTICES.md).
