# ADR-0007: Presenter-facing script drafts are Word documents

- Status: Accepted
- Date: 2026-09-27

## Context

Presenter feedback showed that raw JSON, schemas, workflow identifiers, technical errors, and dealership question lists are not usable script deliverables. The preferred script layout is a timed scene table with four columns: time/scene, brief visual direction, spoken narration, and on-screen copy. Promotional drafts also need to use terms the presenter supplies while clearly preserving their unverified status; placeholders should identify only missing or explicitly uncertain information.

## Decision

- Keep structured workflow outputs and schemas as internal data for validation and technical indexing.
- Render both presenter script workflows as Spanish Word documents using the four-column scene layout.
- Include sources by readable title or URL in detailed reviews; do not expose internal candidate/source IDs.
- Use presenter-supplied promotional terms verbatim as unverified drafting input. Never imply that the workflow independently confirmed them.
- Add spoken and on-screen placeholders only for absent or explicitly uncertain promotional fields. Include validity in both voiceover and on-screen copy.
- Keep the commercial/factual review gates and non-publishable status.
- Do not append dealership question lists, schemas, or technical workflow metadata to the presenter deliverable.
- Remove the duplicate generic `generar-guion` skill from the operator plugin. Keep its registered technical workflow and keep the presenter's detailed-review `generar-guion` skill and promotional skill.

## Consequences

The AI runner has a presenter-document renderer and a Word output mode restricted to the registered presenter script workflows. JSON remains available to technical callers. The presenter gets a local Word draft and still needs operator review before factual or commercial claims can be approved.

## Alternatives considered

- Presenting JSON with friendlier instructions: rejected because the technical structure still reaches the presenter.
- Removing structured outputs: rejected because schemas are needed for validation and indexing.
- Merging promotional and detailed-review skills: rejected because research-backed factual review and same-day commercial drafting have different responsibilities.
