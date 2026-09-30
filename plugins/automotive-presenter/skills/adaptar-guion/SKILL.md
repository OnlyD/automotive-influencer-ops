---
name: adaptar-guion
description: Adapta el lenguaje de un guion en español, muestra los cambios y conserva sus hechos, fuentes y condiciones para una nueva revisión.
---

# Adapt a presenter script

Every question, explanation, error and document delivered to the presenter is Spanish. Keep JSON, hashes, internal references and command details internal.

Locate the exact script in the current conversation or the assigned production. For an official production, use its exact artifact version and `adapt-presenter-script@1.1.0`; load the current schemas and prompt. For a conversational preview, preserve its existing script contract and non-publishable status. Ask only for the missing script or desired creative adjustment.

Propose changes to narration, visual direction, on-screen copy or the order of complete scenes. An explicit scene-order request may reorder complete original scenes; keep each scene duration and the original closing last. The service recalculates cumulative timing. Keep identity, fact/source references, commercial terms, eligibility, validity, contact destination and follow/like/comment calls intact. Do not research or fill missing factual information. A request to change a price, specification or other locked data goes to the operator in Spanish. Changing factual/commercial phrasing requires renewed operator review even when the underlying fact metadata is unchanged.

Return a Spanish Word draft using the existing four-column layout and a short Spanish summary of what changed. Do not overwrite the base. Ask the presenter to review the candidate before submitting it; the controlled `adapt` operation creates a new immutable version. A new version has no inherited approvals. Do not claim an official version was stored when only a conversational draft exists.

Use the operator-managed local bridge described in `docs/local-production.md` when available. The presenter never runs terminal commands, writes technical files, or grants herself operator permissions. If the bridge is unavailable, deliver the preview and explain briefly in Spanish that the operator must register and review it before recording.
