# MoneyMoves MOGRT authoring

The first production gate is a vertical-bar template. Generate it by running `scripts/build-vertical-bar.jsx` from After Effects 24.3. The script creates an AEP source and exports a MOGRT; no hand-authored project is required.

The exposed-property names are a public interface. Do not rename them after a template release. Generated binaries are release artifacts and are not committed by default.

Planned families after the vertical-bar real-edit approval are horizontal/ranked bar, line/area, donut/breakdown, comparison/KPI, and timeline/process. Each will be generated from a separate script while sharing the same property vocabulary and palettes.
