# automotive-influencer-ops

A repository for the automotive content operation, from verifiable vehicle inventory and script development through approval, publishing, and measurement.

## Technical specification

The current execution specification is [`docs/propuesta-tecnica.md`](docs/propuesta-tecnica.md). It defines the architecture, inventory and content contracts, skills, implementation increments, and pending decisions.

## Repository status

This repository keeps its existing name and remote. The initial structure follows section 10 of the specification. Placeholder `README.md` files explain each area's purpose and will be replaced or expanded as that area is implemented.

Technical files and operator-facing technical work use English. Every interaction and user-facing output for the influencer must always use Spanish, her primary language. The presenter onboarding skill is exclusive to her workflow; the technical operator uses the technical workflows.

The packages and workflows are documentation scaffolding only: there is not yet a compilable workspace or functional inventory importer. Increment B will add contracts, fictional fixtures, and local preview/apply import. Never commit real inventory, videos, or secrets.

## Role entry skills

Use `actualizar-influencer` for the presenter's Spanish-only context. It can save new presenter-reviewed defect reports under `docs/feedback/influencer/`, without editing technical artifacts. Use `actualizar-tecnico` for the operator's English technical context. These skills declare a workflow role; they do not verify identity or technically enforce file permissions.
