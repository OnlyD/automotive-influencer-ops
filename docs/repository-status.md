# Repository comparison with specification section 10

Snapshot: 2026-09-30. Existing repository: `automotive-influencer-ops`, branch `main`, remote `https://github.com/OnlyD/automotive-influencer-ops.git`. ADR-0001 preserves this identity instead of the specification's logical name.

| Target area | Current implementation / deliberate difference |
| --- | --- |
| Root workspace, contracts, domain, inventory, GitHub CI | Present; increments A/B already implemented before this change |
| `apps/ai-runner` | Registered CLI adapter and workflow validation; HTTP orchestration lives in `services/api/src/server.ts` rather than a second runner server |
| `services/api` | Added as a local controlled simulator/CLI, not deployed Lambda/API Gateway |
| `packages/media` | Added for hashed intake, explicit rendering and clip extraction |
| `packages/aws-client`, `infrastructure/aws-cdk` | Deferred to the separately approved F increment; no credentials, deployment or fake cloud adapter |
| `apps/web` | Absent as required; no web application added |
| `workflows/ai` | Research/validation/scripts plus adaptation, clip proposals, captions and analysis; shooting-plan generation uses a deterministic projection |
| `workflows/deterministic` | Added registered shooting, render, extraction and package contracts, with fixtures and templates |
| `automation/n8n` | Compose, pinned image, controlled inactive worker export and import helper now present |
| Presenter/operator plugins | Existing role/update/research/script flow retained; adaptation/recording/delivery/inventory/analysis placeholders implemented |
| `templates/production` | Fictional normalized production/script/approval/intake/edit/job templates added |
| `docs/runbooks` | Required local recovery runbooks implemented, including the non-applicable external credential boundary |
| Top-level `tests` | Existing organizational placeholders remain; runnable tests live alongside their workspace implementations |
| `.local/` | Ignored operational adapter data; never a Git inventory/video database |

## A/B audit checklist

- [x] Functional pnpm bootstrap, README, AGENTS, domain/contracts and CI.
- [x] Valid plugin/marketplace definitions with distinct declared roles.
- [x] Vehicle/fact/source/commercial/import schemas and fictional fixtures.
- [x] CSV preview/apply with exact approved preview/hash and stale-snapshot rejection.
- [x] Local repository/query/deduplication tests.
- [x] No external deployment or real social connection.

CODEOWNERS still awaits confirmed reviewer identities; branch protection was not asserted or changed by this local implementation.

See `e2e-readiness.md` for the current trial boundary. The remaining absence of AWS components is a real deployment/remote-operation limitation; local publishing handoff is the explicit pilot route, not an implementation of all cloud infrastructure.
