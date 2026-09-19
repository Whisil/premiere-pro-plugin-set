# MoneyMoves MOGRT authoring

The first production gate is a vertical-bar template. Generate it by running `scripts/build-vertical-bar.jsx` from After Effects 24.3. The script creates an AEP source and exports a MOGRT; no hand-authored project is required. The first successful manual authoring run was completed with After Effects 25.6.4 on 2026-09-19.

The exposed-property names are a public interface. Do not rename them after a template release. Generated binaries are release artifacts and are not committed by default.

Generated `.aep` and `.mogrt` files are ignored by Git, including the local `MoneyMoves MOGRTs/` folder at the repository root. Keep release-ready binaries there or under `artifacts/`; commit only their scripts, checksums, and release metadata.

Planned families after the vertical-bar real-edit approval are horizontal/ranked bar, line/area, donut/breakdown, comparison/KPI, and timeline/process. Each will be generated from a separate script while sharing the same property vocabulary and palettes.
