# Changelog

## 0.4.0 - Unreleased

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
