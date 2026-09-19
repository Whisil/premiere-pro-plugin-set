# ADR 0002: Gate the native adapter on an installed Adobe SDK spike

- Status: accepted
- Date: 2026-09-19

## Decision

Keep reference algorithms and shaders buildable in CI, but do not manufacture a loadable bundle API from memory. Pin the Rust Adobe bindings, GPU adapter, SDK version, PiPL resources, parameter indices, and Metal behavior only after RGB Shift runs in Premiere 25.6.4 through GPU and CPU paths.

## Consequences

The current native code is testable but not a Premiere bundle. Phase 2 cannot exit until proprietary SDK headers, UXP Developer Tool, and Xcode 16.2+ are installed and the spike evidence is recorded.
