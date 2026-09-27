# Roles and permissions

The normative role matrix is in section 42 of `propuesta-tecnica.md`. All influencer-facing interaction must be in Spanish.

## Presenter script preview

The presenter may request `draft-presenter-script@1.0.0` to receive a Spanish chat preview based on source-linked facts marked `CANDIDATE`. The preview is not an approved artifact, cannot be published, and is not written to the inventory or production state by the skill. The technical operator must review the facts and sources before any fact is treated as verified or any script enters production.

The presenter may not run the operator-only `research-vehicle`, `validate-vehicle-data`, or `draft-vehicle-script` workflows, approve factual or commercial claims, or officialize artifacts. A role value passed to the local runner is workflow routing only; it does not prove identity or provide security enforcement.
