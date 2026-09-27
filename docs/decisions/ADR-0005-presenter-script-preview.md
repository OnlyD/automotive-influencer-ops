# ADR-0005: Allow presenter-requested, non-official script previews

- Status: Accepted
- Date: 2026-09-27

## Context

The presenter needs to prepare an initial review script before a vehicle's facts have been promoted into the verified inventory. The existing `draft-vehicle-script` workflow intentionally requires verified facts and remains an operator workflow. Blocking all presenter access prevents an early creative preview, while treating research candidates as verified would bypass the factual approval gate.

## Decision

- Add the separate `draft-presenter-script@1.0.0` workflow for the presenter and technical operator.
- It may use only source-linked facts marked `CANDIDATE`; each factual script block must retain candidate fact and source references.
- Its output is a chat preview only, always requires technical review, is never publishable, and is not persisted to inventory or production state by the skill.
- Exclude commercial claims and any unsupported factual claims. The presenter may request creative changes without changing facts, sources, or warnings.
- Keep `draft-vehicle-script` restricted to the operator and `VERIFIED` facts. Only the operator can verify facts or officialize a script.
- A declared runner role selects a workflow permission check; it does not authenticate the caller or enforce OS-level access controls.

## Consequences

The presenter can receive a useful early draft without treating candidate facts as truth. The result cannot enter production until the operator reviews the sources and facts and separately advances it through the existing approval process. Research source access remains dependent on tools available in the active Codex conversation.
