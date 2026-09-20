# Production roadmap

Status values are `done`, `in progress`, `blocked`, `queued`, and `deferred`. A phase is complete only when its exit gate is recorded with evidence.

| Phase                       | Status      | Exit gate                                                     |
| --------------------------- | ----------- | ------------------------------------------------------------- |
| 0. Research and feasibility | in progress | Three active Adobe-host spikes pass with recorded evidence    |
| 1. Repository foundation    | done        | CI is green; local setup is reproducible                      |
| 2. Frame Gate               | in progress | Signed bundle loads; exact-frame and one-undo tests pass      |
| 3. Palette effects          | in progress | Six effects pass golden and Premiere lifecycle tests          |
| 4. Multi-pass effects       | queued      | Four effects meet preview/export budgets                      |
| 5. ASCII workflows          | queued      | Real-time effect and generated title workflows pass           |
| 6. Maps                     | queued      | Deterministic 4K alpha clip renders/imports under 90 s        |
| 7. Charts                   | deferred    | Resume only after an explicit product decision                |
| 8. Advanced effects         | queued      | LinoCut, Voxel, and Blob Tracking approved independently      |
| 9. Release hardening        | queued      | Soak edit passes; signed local release and recovery docs ship |

## Panel-first product rule

MoneyMoves is one persistent Premiere UXP panel, not a collection of separate
utilities. Editors can dock, float, resize, and place the panel on a second
display while it remains connected to the active Premiere project. Every
editor-facing feature is complete only when it has a usable panel workflow:
apply/remove, controls, presets where applicable, errors, and diagnostics.

The panel is organized into **Home**, **Effects**, **Generate**, and
**Diagnostics** views. Native Effect Controls remains an interoperability and
advanced-curve fallback, but normal MoneyMoves work must not require it.
Build, signing, installation, and automated-test commands remain developer
tooling outside Premiere.

## Current implementation

- Shared schemas, tokens, effect IDs, and Frame Gate presets.
- Manifest v5 React panel with batch effect transactions, renderer jobs, import, palettes, diagnostics, and MOGRT insertion adapter.
- Authenticated map/ASCII renderer with cancellation and transparent ProRes output.
- Deterministic Frame Gate and RGB Shift CPU references, OKLab utilities, Slang kernel sources, and shaderbench.
- After Effects vertical-bar authoring script and local renderer lifecycle assets.
- Channel-reference style inventory, production typography roles, and reference-derived palettes.
- CPU/Slang reference implementations for Halftone, Dot Matrix, and Dither.
- Loadable arm64 RGB Shift bundle with AE-style software and Premiere Metal entry points, PiPL packaging, ad-hoc signing, and per-user installation.
- Panel-driven arm64 Frame Gate bundle with clip-local timing metadata, CPU/Metal paths, hidden-frame alpha output, and four presets.
- Production RGB Shift edge modes/presets and a panel-driven Halftone CPU/Metal bundle with named palettes and custom colors.
- Panel-driven Dot Matrix CPU/Metal bundle with branded/custom palettes and luminance-sized dots.
- Panel-driven 8-bit CPU/Metal bundle with pixel blocks, OKLab quantization, and 2–8 custom colors.
- Panel-driven Dither CPU/Metal bundle with Bayer and deterministic blue-noise modes plus 2–8 colors.
- Panel-driven Chromatic Aberration CPU/Metal bundle with radial separation, optical-center controls, and edge modes.
- Panel-driven Barrel Blur CPU/Metal bundle with barrel/pincushion distortion and 4/8/16-sample quality modes.
- Standalone CCX release packaging for normal installation without UXP Developer Tool.
- Reproducible ten-frame ProRes 4444 alpha feasibility artifact.

## Phase 0 gates

Do not call a gate complete from a unit test alone. Record Premiere version, SDK version, renderer, source project, output artifact, timing, and pass/fail in `docs/validation/phase-0-results.md`.

1. Load the panel through UXP Developer Tool 2.2+ and prove apply/remove across 20 selected clips is one undo step.
2. Build, ad-hoc sign, and load RGB Shift through both the Premiere GPU entry point and CPU fallback.
3. Render ten alpha frames to ProRes 4444, import, composite, export through AME, and compare alpha.

The working vertical-bar MOGRT is retained as a frozen prototype, but charts are deferred and are not a Phase 0 exit gate.

## Definition of done for an effect

- A complete panel surface exposes its availability, apply/remove actions,
  parameter controls, presets, palettes, keyframes where supported, and clear
  selection/host errors.
- Parameter contract, bounds, defaults, labels, keyframing, and migration behavior are documented.
- CPU and GPU implementations pass defaults/extremes, alpha, gradient, skin, noise, and palette goldens.
- Save/reopen, copy/paste, nest, trim, speed-change, disable/remove, preview resolution, and AME export pass.
- Performance is recorded on the target M3 Pro; failures are visible in panel diagnostics.
- A visual acceptance frame is approved before merging.

## Release sequence

Work vertically. Complete the panel-first Phase 0 foundation before Frame Gate,
then deliver palette effects, multi-pass effects, ASCII, and maps in that
order. Each vertical slice includes its native/renderer work and its finished
panel workflow. Maps use the local renderer and never require After Effects.
The vertical-bar MOGRT and generic insertion action remain frozen until charts
are explicitly resumed. Advanced effects remain separate milestones because
their tracking/geometry work has distinct failure modes.
