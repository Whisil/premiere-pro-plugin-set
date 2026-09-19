# MoneyMoves Premiere Toolkit

A macOS/Apple-Silicon toolkit for Adobe Premiere Pro 25.6.4. The repository contains a UXP workflow panel, native-effect reference kernels and test harness, a local map/ASCII renderer, and a frozen MOGRT prototype.

## Current status

The repository foundation and first vertical slices are implemented. Xcode 16.4, UXP Developer Tool 2.3, and both required Adobe SDKs are available on the target machine. The next active gate is the loadable RGB Shift host adapter; see [Development setup](docs/development-setup.md).

## Commands

```sh
pnpm install
pnpm check
pnpm build
cargo run -p shaderbench -- --help
```

Run the renderer with `pnpm dev:renderer` and the panel build with `pnpm dev:panel`.

## Components

- `apps/panel`: Premiere UXP panel (Manifest v5, Premiere 25.6 minimum).
- `services/render-service`: authenticated localhost renderer for maps and ASCII titles.
- `packages/contracts`: versioned schemas and shared MoneyMoves design tokens.
- `native/core`: deterministic CPU reference implementations used by tests and shaderbench.
- `native/shaderbench`: headless PNG harness for rapid effect iteration.
- `mogrts`: After Effects authoring scripts and generated-template documentation.

The implementation roadmap is tracked in [Roadmap](docs/roadmap.md), with decisions in [Architecture](docs/architecture.md) and the visual direction captured in the [style inventory](docs/style-inventory.md).

Direct runtime licensing and release obligations are recorded in [Third-party notices](THIRD_PARTY_NOTICES.md).
