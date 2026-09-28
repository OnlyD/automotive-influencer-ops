# ADR-0008: Detailed presenter reviews use relevant research facts

- Status: Accepted
- Date: 2026-09-27

## Context

Presenter feedback found that a research-backed draft could still read like a generic script even when a vehicle research bundle was available. A detailed review should use the research to make the script specific, while avoiding a full technical specification dump or unsupported interpretation.

## Decision

- Update `draft-presenter-script` to version `1.1.0`.
- Select two or three source-linked candidate facts that fit the stated audience and editorial angle.
- Prefer distinctive, useful specifications or features and explain their practical relevance only when the candidate evidence supports the explanation.
- Do not add facts from model memory, overstate unverified candidates, or include more than three distinct facts.
- If the research bundle contains fewer than two usable facts, use the supported facts available and tell the presenter the research is limited.
- Keep each factual block linked to its candidate fact and source, and retain technical review and non-publishable gates.

## Consequences

The prompt and runner now steer and validate fact coverage. Fixtures and tests include three clearly fictional facts and reject an otherwise valid-looking draft that uses only one. The presenter-facing Word renderer stays free of technical identifiers.

## Alternatives considered

- Require the draft to use every researched fact: rejected because it would create a specification dump.
- Leave fact selection entirely to model discretion: rejected because prior drafts omitted available research details.
- Promote candidate facts to verified facts during drafting: rejected because validation and approval belong to the technical operator.
