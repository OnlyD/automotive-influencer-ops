# Local AI workflows

The AI Runner registers five exact workflow IDs and versions. It validates input and output schemas and then applies workflow-specific reference checks. It rejects unknown workflow/version pairs. Callers must supply an executor adapter; the runner does not construct shell commands or access external services. The optional caller role is a declared workflow context, not authentication.

## Registered workflows

| Workflow | Input | Output | Approval boundary |
| --- | --- | --- | --- |
| `research-vehicle@1.0.0` | Exact vehicle identity and requested fields | Unverified candidate facts with source records | Operator reviews source identity, applicability, and evidence |
| `validate-vehicle-data@1.0.0` | Candidate facts and source records | One validation proposal per candidate | Operator reviews every proposal; no inventory mutation |
| `draft-vehicle-script@1.0.0` | Production brief and `VERIFIED` facts | Spanish script candidate, fact usage, source notes | Operator reviews before the draft can enter production |
| `draft-presenter-script@1.1.0` | Spanish editorial brief and source-linked `CANDIDATE` facts | Internally validated script using two or three relevant research facts, rendered as a Spanish four-column Word draft | Operator fact review required; never publishable or persisted to production state |
| `draft-promotional-script@1.2.0` | Exact vehicle identity, separate source-linked vehicle research, brief, and optional same-day commercial offer | Spanish sales draft rendered as a four-column Word document, using only two or three attractive research facts; only missing or explicitly uncertain commercial terms get placeholders | Commercial review required; never publishable; validity must be spoken and displayed |

`$investigar-vehiculo` is the operator interface for the registered research workflow. It returns a technical source bundle and a copyable Spanish handoff that preserves candidate and source IDs. Both `$generar-guion` and `$generar-guion-promocional` consume source-linked vehicle research but do not conduct research. The detailed workflow uses two or three relevant facts; the promotional workflow also selects only two or three attractive facts while treating same-day commercial terms separately. The promotional workflow may use the presenter's supplied terms as unverified draft input, marks only missing or explicitly uncertain commercial details inline, and always speaks and displays the validity statement. Both presenter workflows render Word for the presenter; structured JSON remains internal for validation and technical indexing.

Schemas and prompt text are versioned with each workflow. Example files use fictional values and `example.invalid` sources. They are fixtures, not automotive guidance.

## Current execution boundary

The `createCodexExecutor` adapter invokes `codex exec` with JSONL events, ephemeral session state, a read-only sandbox, ignored user configuration, a per-run temporary directory, and the registered output schema. It accepts only a caller-supplied absolute `CODEX_HOME` dedicated to the runner; it does not create or discover credentials. It captures event types without persisting traces, validates the final JSON in the registry, and deletes its temporary workspace on success or failure.

The direct interface is `pnpm ai-runner -- <registered-workflow>@<version> --input <file.json|file.yaml>`. Relative input paths resolve from the directory where the operator invoked pnpm. Input files are read from the operator's current machine and passed to the model only when that command is explicitly run.

Tests use a fake CLI executable and make no model calls. Live invocation requires a local Codex CLI login in the dedicated home and may use account/model quota. No real research run was performed. The research prompt requires retrieved sources and instructs the model to return no candidate facts when no authorized retrieval tool is available. Adding a controlled source-retrieval capability remains follow-up work under section 16 of the technical specification.
