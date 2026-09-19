# ADR 0001: Four-component architecture

- Status: accepted
- Date: 2026-09-19

## Decision

Use UXP for workflow and project mutation, native Adobe effects for real-time pixels, a localhost service for generated media, and MOGRTs for editable data graphics.

## Consequences

UXP remains small and undo-safe; GPU work stays in the native render pipeline; expensive generation cannot block Premiere. Releases must version four artifacts and diagnostics must report compatibility between them.
