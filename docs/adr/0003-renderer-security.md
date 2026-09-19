# ADR 0003: Authenticated loopback renderer

- Status: accepted
- Date: 2026-09-19

## Decision

Run generation in a per-user LaunchAgent bound to `127.0.0.1`, require a generated bearer token, validate versioned request schemas, cap request bodies, and constrain output names/directories.

## Consequences

Premiere stays responsive and renderer crashes are isolated. Installer lifecycle, token storage, health checks, cancellation, and recovery are part of the product rather than deployment afterthoughts.
