# Local AI workflows

The AI Runner registers nine exact workflow IDs and versions. It validates input and output schemas and then applies workflow-specific reference checks. It rejects unknown workflow/version pairs. Callers must supply an executor adapter; the runner does not construct shell commands or access external services. The optional caller role is a declared workflow context, not authentication.

## Registered workflows

| Workflow | Input | Output | Approval boundary |
| --- | --- | --- | --- |
| `research-vehicle@1.1.0` | Requested vehicle identity and fields | Unverified candidate facts with source records | Candidate facts require operator review before becoming verified |
| `validate-vehicle-data@1.0.0` | Candidate facts and source records | One validation proposal per candidate | Operator reviews every proposal; no inventory mutation |
| `draft-vehicle-script@1.0.0` | Production brief and `VERIFIED` facts | Spanish script candidate, fact usage, source notes | Operator reviews before the draft can enter production |
| `draft-presenter-script@1.2.0` | Spanish editorial brief and source-linked `CANDIDATE` facts | Internally validated script using two or three relevant research facts, rendered as a Spanish four-column Word draft | Operator fact review required; never publishable or persisted to production state |
| `draft-promotional-script@1.3.0` | Exact vehicle identity, separate source-linked vehicle research, brief, optional same-day commercial offer, and contact method when supplied | Spanish sales draft rendered as a four-column Word document, using only two or three attractive research facts; missing commercial terms and contact methods receive placeholders | Commercial review required; never publishable; validity must be spoken and displayed |

The presenter flow is `actualizar-influencer`, then presenter-facing `$investigar-vehiculo` in the same conversation, then `$generar-guion-promocional` (priority) or `$generar-guion` (detailed review). The operator retains a separate research skill for technical workflows. Both script skills consume the source-linked candidate bundle but do not conduct research. Each selects two or three relevant vehicle facts; the promotional workflow treats same-day commercial terms separately, uses placeholders only for missing or explicitly uncertain commercial details, and always speaks and displays validity. Both scripts include contact and follow/like/comment CTAs; a missing contact method stays a placeholder. Presenter-facing skills render Word and keep structured JSON internal for validation and technical indexing.

Schemas and prompt text are versioned with each workflow. Example files use fictional values and `example.invalid` sources. They are fixtures, not automotive guidance.

## Current execution boundary

The `createCodexExecutor` adapter invokes `codex exec` with JSONL events, ephemeral session state, a read-only sandbox, ignored user configuration, a per-run temporary directory, and the registered output schema. It accepts only a caller-supplied absolute `CODEX_HOME` dedicated to the runner; it does not create or discover credentials. It captures event types without persisting traces, validates the final JSON in the registry, and deletes its temporary workspace on success or failure.

The direct interface is `pnpm ai-runner -- <registered-workflow>@<version> --input <file.json|file.yaml>`. Relative input paths resolve from the directory where the operator invoked pnpm. Input files are read from the operator's current machine and passed to the model only when that command is explicitly run.

Tests use a fake CLI executable and make no model calls. Live invocation requires a local Codex CLI login in the dedicated home and may use account/model quota. No real research run was performed. The research prompt requires retrieved sources and instructs the model to return no candidate facts when no authorized retrieval tool is available. Adding a controlled source-retrieval capability remains follow-up work under section 16 of the technical specification.


## Production candidates and deterministic work

`adapt-presenter-script@1.0.0` proposes creative changes over an exact normalized script version and locked metadata hash. `propose-clips@1.0.0` proposes complete intervals with pickup warnings; `generate-captions@1.0.0` drafts platform-specific Spanish copy; `analyze-performance@1.0.0` references immutable metric snapshots with their definitions and windows. All remain human-reviewed candidates. Changing a referenced hash, scene, platform or evidence ID fails validation.

`workflows/approved-workflows.json` fingerprints the registered prompts, manifests and schemas. A locally modified definition is rejected until a reviewed technical change updates its version and fingerprint. Source-tree control is still the trust boundary.

The operation worker runs the four registered deterministic workflows under `workflows/deterministic/`. It never constructs caller shell commands or discovers credentials. See `local-production.md` for the queues, media and manual publication handoff. The full real production trial has not been executed.
