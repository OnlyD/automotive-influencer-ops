# ADR-0010: Presenter Vehicle Research Stays in the Same Conversation

- Status: Accepted
- Date: 2026-09-27
- Supersedes: ADR-0005's operator-only research handoff for presenter drafts

## Context

The presenter needs to follow a simple, repeatable flow: refresh her tools, research a vehicle, then choose a promotional draft or a detailed review. Requiring a separate operator conversation and a technical copy-and-paste handoff created friction and exposed raw research structures in presenter-facing chat. Research and script writing still have distinct responsibilities: research identifies source-linked candidate facts; script skills select and use those facts without performing additional research.

## Decision

- The presenter plugin provides a Spanish-facing `investigar-vehiculo` skill that uses the registered `research-vehicle@1.1.0` workflow in the current conversation.
- The operator keeps a separate technical research skill over the same registered workflow.
- The research workflow allows both `presenter` and `technical-operator` routing roles. This is declarative workflow routing, not identity verification or security enforcement.
- Presenter research returns a readable Spanish summary and keeps the candidate bundle, IDs, source URLs, and retrieval dates available in conversation context for a later script skill. It does not expose raw JSON or schemas as the presenter deliverable and does not persist the bundle to Git or inventory.
- Facts remain unverified candidates. Operator factual review remains mandatory before a claim becomes verified or enters production.
- The default presenter sequence is `actualizar-influencer`, `investigar-vehiculo`, then either `generar-guion-promocional` (priority) or `generar-guion` (detailed review).

## Consequences

- The presenter can research and draft within one chat without merging research and drafting responsibilities.
- Research availability still depends on an authorized retrieval tool in the conversation. If unavailable, the skill must say so and must not invent sources or facts.
- The prior separate operator handoff remains available for operator workflows but is not a prerequisite for presenter drafts.
