# Adobe host acceptance checklist

Record evidence in `docs/validation/phase-0-results.md`; include a project archive and exported reference frames outside Git when media is large.

## Phase 0 feasibility

- Follow `docs/validation/phase-0-host-runbook.md` for RGB Shift batch undo, Metal/software parity, and the ten-frame ProRes alpha round trip.

## Panel and Frame Gate

- Select 20 video clips with linked audio and apply Throttle Both.
- Confirm one Undo removes every applied instance.
- Confirm audio track items, links, source media, and clip boundaries are unchanged.
- At 23.976, 25, 29.97, 30, and 60 fps, verify local frames 2 and 4 are transparent at both ends.
- Test clips 1–9 frames long and confirm head/tail regions truncate symmetrically without overlap.

## Native render lifecycle

- Metal and CPU paths match within the declared perceptual tolerance.
- 8-, 16-, and 32-bit host paths preserve alpha where supplied.
- Test save/reopen, duplicate, nested sequence, trim, reverse, speed change, disable, remove, and AME export.
- Record 4K full/half-resolution preview and export timings on the M3 Pro.

## Generated media

- Render the same map job twice and compare decoded frames.
- Test small islands, multiple countries, and an antimeridian selection.
- Stop/restart the renderer during a job and verify a useful panel error.
- Composite ten ProRes 4444 frames over solid red and checkerboard, then round-trip through AME.

## Deferred MOGRT checks

These checks are retained for Phase 7 and are not part of the active release sequence.

- Insert at the playhead on a sequence with locked and unlocked video tracks.
- Confirm every exposed property survives save/reopen and duration changes.
- Exercise 1 and 12 items, long labels, zero and negative values, decimals, prefixes/suffixes, and each palette.
