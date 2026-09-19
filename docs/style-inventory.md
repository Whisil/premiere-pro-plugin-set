# MoneyMoves visual system

This inventory is derived from the eleven channel frames in `docs/references`. It is the acceptance baseline for effects, maps, generated titles, and graphics—not a requirement to reproduce any one frame literally.

## Core character

- Editorial collage: rigid rectangular image panels, asymmetric grids, hard crops, and occasional oversized type crossing the frame.
- Two useful modes: grainy high-contrast monochrome and aggressively saturated electric color.
- Texture is structural: halftone screens, CRT/scan-line texture, analog grain, bloom, chromatic offsets, and edge distortion should remain visible at delivery resolution.
- Type is direct and very large. Headlines are usually uppercase, tightly composed, and allowed to obscure source imagery.
- Motion should feel decisive: hard reveals, fast camera pushes, throttled cuts, and short overshoot—not slow decorative drift.

## Typography roles

| Role              | Font             | Use                                                   |
| ----------------- | ---------------- | ----------------------------------------------------- |
| Primary display   | Peace Sans       | Large figures, claims, country names, chart headlines |
| Editorial display | BBH Bartle       | Distorted/editorial alternates and title cards        |
| Data/utility      | LT Superior Mono | Labels, figures, maps, ASCII, UI-like annotations     |
| Pixel accent      | Press Start 2P   | Short retro-computing accents only                    |

The supplied font files are development references. A redistributable release needs license files or proof of redistribution rights for every bundled font.

## Color roles

- Hot red `#FF2448`: default display type and highlighted data.
- Deep cobalt `#0B0B70`: default saturated ground and shadow color.
- Warm cream `#FFF6D8`: readable type and monochrome paper.
- Signal mint `#39E39D`: currency symbols, positive values, and small accents.
- Signal yellow `#FFCC28`: secondary type and emphasis.
- Electric magenta `#F229D4`: RGB misregistration, bloom, and alternate series.
- Ink `#080808`: monochrome background and hard outlines.

## Effect acceptance targets

- Halftone/Dither: dots remain visibly graphic at 4K; custom palettes preserve the red/cobalt/cream hierarchy.
- RGB Shift/Chromatic Aberration: offsets read on high-contrast edges without destroying central type legibility.
- CRT: scan structure is visible, corners are imperfect, and bloom does not flatten the blacks.
- Maps: highlighted geography uses hot red or mint, labels use display type with cyan/magenta edge separation, and unselected land remains subordinate.
- ASCII: LT Superior Mono is the default; reveal and scramble motion should finish cleanly and deterministically.
- Charts: oversized headline/value first, minimal grid furniture, hard rectangular geometry, and no generic corporate gradients.

## Reference grouping

- `2026-09-17` frames: monochrome collage, hard black gutters, grain, extreme contrast, surveillance/industrial mood.
- `16.48.35`–`16.49.07`: oversized numeric/title typography, red/mint accents, halftone and chromatic distortion.
- `16.49.18`–`16.49.30`: three-panel image comparison, background texture, composited location/context changes.
- `16.49.44`–`16.50.01`: saturated cobalt scenes, cream/red typography, international-market collage and title hierarchy.
