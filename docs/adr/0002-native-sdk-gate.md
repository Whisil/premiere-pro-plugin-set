# ADR 0002: Gate the native adapter on an installed Adobe SDK spike

- Status: accepted
- Date: 2026-09-19

## Decision

Keep reference algorithms and shaders buildable in CI, but do not manufacture a loadable bundle API from memory. Pin the Rust Adobe bindings, GPU adapter, SDK version, PiPL resources, parameter indices, and Metal behavior only after RGB Shift runs in Premiere 25.6.4 through GPU and CPU paths.

## Consequences

The required SDKs and tools are now installed. Commit `fb4a608` opens the implementation gate with a loadable-shape arm64 bundle built from the pinned `exaecut` 0.5 and `prgpu` 0.2.0 stack. It exports the AE software and Premiere GPU entry points, packages PiPL resources, signs, and installs per user.

Phase 2 still cannot begin until Premiere 25.6.4 confirms the bundle loads and the remaining RGB Shift, UXP undo, and alpha round-trip host checks are recorded. Packaging success alone does not pass the host gate.
