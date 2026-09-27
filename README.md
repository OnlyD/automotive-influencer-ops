# automotive-influencer-ops

A repository for the automotive content operation, from verifiable vehicle inventory and script development through approval, publishing, and measurement.

## Technical specification

The current execution specification is [`docs/propuesta-tecnica.md`](docs/propuesta-tecnica.md). It defines the architecture, inventory and content contracts, skills, implementation increments, and pending decisions.

## Repository status

This repository keeps its existing name and remote. The initial structure follows section 10 of the specification. Placeholder `README.md` files explain each area's purpose and will be replaced or expanded as that area is implemented.

Technical files and operator-facing technical work use English. Every interaction and user-facing output for the influencer must always use Spanish, her primary language. The presenter onboarding skill is exclusive to her workflow; the technical operator uses the technical workflows.

The `pnpm` workspace and contracts package provide local build, typecheck, and test commands. The inventory package supports fictional CSV preview/apply using a replaceable local JSON repository under ignored `.local/inventory/`. Real inventory, videos, and secrets must never be committed.

The initial C-track workflows are versioned under `workflows/ai/` and validated by the local `apps/ai-runner/`. They currently use an injected executor for deterministic testing; no model client or external service is connected. See `docs/ai-workflows.md`.

## Local development

Requirements: Node.js 20 or newer and pnpm 9.15.9 (selected by Corepack from `package.json`). Run `pnpm install`, `pnpm build`, `pnpm typecheck`, and `pnpm test` from the repository root.

Preview the fictional Honda fixture with `pnpm inventory -- preview --file data/fixtures/honda-inventory.csv`. Apply only after reviewing the preview, using its `importId` and `previewHash`: `pnpm inventory -- apply --file data/fixtures/honda-inventory.csv --preview-id <id> --preview-hash <hash>`. The importer refuses changed source files or inventory snapshots. Use `pnpm inventory -- list --make Honda` to query local vehicles.

## Role entry skills

Use `actualizar-influencer` for the presenter's Spanish-only context. It can save new presenter-reviewed defect reports under `docs/feedback/influencer/`, without editing technical artifacts. Use `actualizar-tecnico` for the operator's English technical context. These skills declare a workflow role; they do not verify identity or technically enforce file permissions.
