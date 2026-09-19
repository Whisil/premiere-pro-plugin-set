# Phase 0 Premiere host runbook

Use Premiere Pro 25.6.4 on the target M3 Pro. Keep the validation project and exported evidence outside Git when files are large. Add paths and results to `phase-0-results.md`.

## 1. Confirm the native bundle loads

1. Quit Premiere before replacing a native bundle.
2. Run `just native-rgb-install` from the repository root.
3. Start Premiere 25.6.4 and open a test project.
4. Confirm **MoneyMoves RGB Shift** appears under the **MoneyMoves** video-effects category.
5. Build the panel with `pnpm build:panel`, load `apps/panel/dist/manifest.json` in UXP Developer Tool, and open the MoneyMoves Toolkit panel.
6. Refresh Diagnostics. It must report at least `1/15` native effects and must not report the browser-preview fallback.

If the effect is absent, preserve Premiere's `Plugin Loading.log`, the installed bundle, and the output of `codesign --verify --deep --strict` before rebuilding.

## 2. Prove one-undo batch application

1. Create or open a sequence containing at least 20 video clips.
2. Select exactly 20 video clip items.
3. Start a stopwatch and use **Effects → RGB Shift → Apply** in the panel.
4. Stop timing after Premiere completes the transaction. The target is under two seconds.
5. Confirm all 20 selected clips contain one MoneyMoves RGB Shift instance.
6. Invoke Undo once. All 20 instances must disappear together.
7. Apply again, then use the panel's **Remove** action. One Undo must restore all 20 instances together.

Record clip count, elapsed time, undo result, project path, and reviewer. The automated unit test is supporting evidence only.

## 3. Compare Metal and software rendering

1. Apply RGB Shift to a high-contrast clip containing saturated red, green, blue, fine edges, and alpha if available.
2. Use Amount `12`, Direction `0°`, channel offsets `1/0/-1`, and Mix `100%`.
3. Render/export a reference frame with Mercury Playback Engine GPU Acceleration (Metal).
4. Switch the project renderer to its software-only mode when Premiere exposes that option and render/export the same frame. If the host does not expose software-only mode on this machine, record that fact and force the AE-style software path using the documented Adobe debug mechanism before passing the gate.
5. Confirm both paths preserve source alpha and are visually equivalent within the golden-image tolerance. Record paths, renderer names, render times, and comparison output.

Also save/reopen the project and confirm the match name and all six parameter values survive unchanged.

## 4. Round-trip ten alpha frames

1. Run `pnpm validate:alpha-spike`.
2. Import `artifacts/validation/phase-0-alpha.mov` into Premiere.
3. Place it above a solid red clip and then above a checkerboard. Transparent areas must reveal the lower layer without a black fringe.
4. Export the ten-frame range through Adobe Media Encoder as ProRes 4444 with alpha.
5. Re-import the AME result and repeat both composites.
6. Use `ffprobe` to record codec, profile, pixel format, dimensions, frame rate, and decoded frame count for the input and AME output.

Record the AME preset, input/output paths and checksums, observed alpha result, elapsed export time, date, and reviewer.
