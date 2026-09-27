# Roles and permissions

The normative role matrix is in section 42 of `propuesta-tecnica.md`. All influencer-facing interaction must be in Spanish.

## Presenter script preview

The technical operator uses `$investigar-vehiculo` and `research-vehicle@1.0.0` to produce a source-linked research bundle. The workflow returns unverified candidate facts; it does not approve them or mutate inventory. The operator can share its Spanish presenter handoff with the presenter.

The presenter may request `draft-presenter-script@1.0.0` only from a supplied research bundle. This skill does not search for or complete facts. It returns a Spanish chat preview based on the source-linked candidate facts in the bundle. The preview is not an approved artifact, cannot be published, and is not written to inventory or production state. The technical operator must review the facts and sources before any fact is treated as verified or any script enters production.

The presenter may not run the operator-only `research-vehicle`, `validate-vehicle-data`, or `draft-vehicle-script` workflows, approve factual or commercial claims, or officialize artifacts. A role value passed to the local runner is workflow routing only; it does not prove identity or provide security enforcement.
