# MoneyMoves architecture

## Product boundary

MoneyMoves has three active cooperating deliverables and one frozen prototype, not one monolithic Premiere plugin:

1. A Manifest v5 UXP panel owns editor interaction and undoable timeline actions.
2. Native MediaCore effect bundles own real-time pixel processing.
3. A loopback-only renderer creates deterministic map and ASCII media outside the Premiere process.
4. The existing MOGRT prototype is retained for future charts work but is deferred from active development.

This split keeps Premiere responsive, lets GPU effects keep frames resident, and makes generated media reproducible from validated job specifications.

## Runtime flow

```text
UXP panel
  |-- Premiere UXP DOM --> selection, effects, import, MOGRT insertion
  |-- HTTP + bearer token --> 127.0.0.1:43127 render service
                                  |-- resvg/d3/FIGlet --> PNG frames
                                  `-- FFmpeg --> ProRes 4444

Premiere renderer --> MoneyMoves native effect --> Premiere GPU suite --> Metal
                                      `----------> CPU fallback
```

Only the UXP panel mutates a Premiere project. The renderer cannot reach the project and accepts no arbitrary command, path, URL, or shader input. Output names are constrained by the shared schema and all output is rooted under the configured generated-media directory.

## Stable interfaces

- Schema version: `packages/contracts/src/index.ts`.
- Brand/palette source of truth: `assets/brand/tokens.json` (mirrored into the contracts package for bundling).
- Native match names: `com.moneymoves.*`; they must never be renamed after release.
- Renderer API: `/health`, `/v1/maps`, `/v1/ascii-titles`, and `/v1/jobs/:id`.
- Generated assets are immutable and receive a job-id prefix.

Changing a schema, parameter order, match name, or exposed MOGRT property is a migration event. Additive API changes remain within schema version 1; incompatible changes require a new endpoint/schema version and migration notes. No MOGRT interface changes are made while charts are deferred.

## Native effect implementation

`native/core` is the deterministic CPU reference library and `native/shaders` contains portable kernel work. It is deliberately independent from proprietary Adobe headers so CI can test it. The loadable bundle layer is added only after the Phase 0 GPU spike confirms the installed SDK's exact PiPL, AE entry point, Premiere GPU suite, pixel formats, and Metal device ownership.

Each production effect must have:

- a stable parameter manifest and explicit parameter indices;
- a CPU implementation used for fallback and golden tests;
- a GPU kernel with numerically comparable output;
- alpha-preserving 8/16/32-bit paths supported by the host;
- deterministic behavior for the same source frame, time, and parameters;
- no render-order-dependent state.

Frame Gate uses clip-local frame time. Its default bitmask is binary `10101`, so frames 2 and 4 are transparent in each five-frame head/tail region. It never reads or edits audio.

## Renderer security and lifecycle

The renderer binds only to `127.0.0.1` and requires a 256-bit token stored with user-only permissions. The LaunchAgent starts it at login and restarts after failure. Requests are capped at 64 KiB and validated with Zod. Jobs are asynchronous and cancellable; the panel polls without blocking Premiere.

The panel stores the token in UXP local storage for the first development build. Before distribution, move it to UXP secure storage if the Premiere 25.6 host exposes that API consistently.

## Color and media assumptions

V1 is Rec.709 SDR. Palette quantization is defined in OKLab; conversion into and out of the working pixel representation belongs at the native adapter boundary. Generated video is transparent ProRes 4444 using `yuva444p10le`, subject to the documented Premiere/AME alpha round-trip gate.

## Out of scope for v1

Windows, Intel macOS, HDR, public Marketplace distribution, arbitrary geocoding, street tiles, cloud rendering, and copying proprietary Motion Pro or Remotion source/assets are excluded.
