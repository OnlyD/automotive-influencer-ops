# automotive-influencer-ops

Source-controlled definitions for vehicle inventory, research, Spanish scripts, reviewed recordings, video processing and publication records.

The supervised local machinery supports promotional and voice-over pilots through an approved **manual publication handoff**. The full production trial remains pending. AWS, remote presenter authentication and unattended/API publishing are separate increments; no live accounts or cloud resources are connected.

## Source of truth and status

Read [`docs/propuesta-tecnica.md`](docs/propuesta-tecnica.md) in full before implementation. The existing repository name and remote remain unchanged.

- [Repository audit and A/B checklist](docs/repository-status.md)
- [Local production commands and presenter bridge](docs/local-production.md)
- [Trial readiness and exact resumption](docs/e2e-readiness.md)
- [AI workflow registry](docs/ai-workflows.md)
- [Inventory preview/apply and factual review](docs/inventory-import.md)
- [Architecture](docs/architecture.md) and [technical decisions](docs/decisions/README.md)

Technical files and operator interfaces are English. Every presenter interaction and audience-facing deliverable is Spanish. Use `actualizar-tecnico` for operator context and `actualizar-influencer` for presenter context; neither authenticates a person.

## Development

Requirements: Node.js 20+, pnpm 9.15.9, FFmpeg/ffprobe with libx264/libass and fonts. Docker Compose is optional for n8n.

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm test
pnpm operations -- status
```

Tests validate contracts, roles, immutable versions, canonical fact/source binding, approvals, leases/retries/idempotency, backup/recovery and synthetic media. No live model or social publication occurs in tests. The optional Codex CLI executor requires an operator-supplied dedicated home; presenter research uses the authorized source tools in her conversation.

## Local workflow

Preview the fictional inventory with `pnpm inventory -- preview --file data/fixtures/honda-inventory.csv`. Apply only the reviewed preview ID/hash. Query canonical records using `pnpm inventory -- list --make Honda`.

Research the exact vehicle, choose a promotional or detailed Spanish Word draft, then let the operator register its candidate, review/verify the selected canonical facts, bind source hashes and record exact-version approvals. The service supports creative adaptation, recording plans, hashed media intake, explicit source-audio/voice-over edits, clips, platform-specific packages and attested remote publication receipts. Follow [the local guide](docs/local-production.md) for the actual command order and gates.

Start the loopback service with `pnpm operations:serve`, or use [the inactive n8n Compose setup](automation/n8n/README.md). Run `pnpm operations -- work-once` to process one reviewed queued job. Do not enable polling or run the full trial without the operator's decision.

## Operational data

GitHub contains code, contracts, templates, skills, fictional fixtures and workflows. Ignored `.local/inventory/` and `.local/operations/` contain this adapter's runtime state and media. A new clone does not inherit them. Preserve originals and configure an off-device backup before ingesting irreplaceable recordings.

Never commit secrets, real videos or sensitive inventory. Candidate drafts may contain missing commercial placeholders; recording/publication gates reject unresolved placeholders, stale facts and unconfirmed or expired offers. Exporting a package or recording a schedule never publishes content.
