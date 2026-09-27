# ADR-0002: Separate presenter and technical-operator entry skills

- Status: Accepted
- Date: 2026-09-27

## Context

The presenter and technical operator use the same repository through Codex, but have different responsibilities and language requirements. A shared update skill did not make the active workflow role explicit. The presenter needs Spanish-only interaction and a simple way to report defects without editing technical artifacts.

## Decision

- Provide `actualizar-influencer` in the presenter plugin and `actualizar-tecnico` in the operator plugin as distinct entry skills.
- Keep presenter-facing interaction and defect reports in Spanish; keep technical implementation and operator-facing technical work in English.
- The presenter entry skill may create a new defect report only under `docs/feedback/influencer/`; it must not modify technical artifacts or existing reports.
- Treat invocation as a declared workflow context, never as identity verification, authentication, or a technical permission grant.
- Retain `actualizar-herramientas` as a compatibility route to the new presenter entry skill.

## Consequences

Both plugins need valid manifests and marketplace entries. The role boundary is behavioral guidance, not an operating-system or Codex-enforced filesystem permission. A technical operator must review defect reports and separately authorize and implement any technical fix.
