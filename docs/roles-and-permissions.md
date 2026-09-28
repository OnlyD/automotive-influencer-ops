# Roles and permissions

The normative role matrix is in section 42 of `propuesta-tecnica.md`. All influencer-facing interaction must be in Spanish.

## Presenter script preview

The technical operator uses `$investigar-vehiculo` and `research-vehicle@1.0.0` to produce a source-linked research bundle. The workflow returns unverified candidate facts; it does not approve them or mutate inventory. The operator can share its Spanish presenter handoff with the presenter.

The presenter may request `draft-presenter-script@1.1.0` only from a supplied research bundle. This skill does not search for or complete facts. It selects two or three facts relevant to the audience and editorial angle, then renders a Spanish four-column Word draft with source-linked candidate facts. If fewer than two supported facts are available, it uses what it can support and warns that the research is limited. Machine-readable JSON is internal and is not presented as a deliverable. The draft is not approved, cannot be published, and is not written to inventory or production state. The technical operator must review the facts and sources before any fact is treated as verified or any script enters production.

The presenter may also request `draft-promotional-script@1.2.0` with a supplied source-linked vehicle research bundle. This workflow selects only two or three attractive facts relevant to the audience and promotional angle; it does not use the full research or investigate additional vehicle facts. Same-day commercial terms she supplies are a separate, unverified drafting input; the workflow does not independently confirm them. Missing or explicitly uncertain commercial details remain marked inline. Both script skills use the same presenter-facing Word layout: time/scene, brief visual direction, spoken narration, and on-screen copy. Do not append technical schemas, workflow identifiers, or dealership question lists.

The presenter may not run the operator-only `research-vehicle`, `validate-vehicle-data`, or `draft-vehicle-script` workflows, approve factual or commercial claims, or officialize artifacts. A role value passed to the local runner is workflow routing only; it does not prove identity or provide security enforcement.
