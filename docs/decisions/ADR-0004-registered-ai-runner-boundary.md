# ADR-0004: Keep registered workflow execution behind an injected adapter

- Status: Accepted
- Date: 2026-09-27

## Context

Increment C needs reproducible validation of versioned workflow inputs and outputs. Invoking an authenticated model client during local tests would make those checks depend on credentials, network state, model availability, and cost.

## Decision

The AI Runner loads only the three exact workflow IDs and versions in the C track, validates their schemas and cross-references, and invokes the local Codex CLI through a fixed argument list. Each invocation uses JSONL events, ephemeral session state, a read-only sandbox, ignored user configuration, an isolated temporary working directory containing only the output schema, and the CLI output-schema option. The adapter requires an explicitly supplied absolute `CODEX_HOME` dedicated to the runner. It never discovers or creates credentials.

## Consequences

- Golden and validation tests run locally with a fake CLI executable and no model call.
- The schemas, manifests, prompts, and fixtures can be reviewed independently of provider behavior.
- A live run requires an operator-provided dedicated Codex home and consumes the configured account's model usage.
- Research produces no evidence-backed facts until a controlled retrieval tool is made available; the prompt must not treat model memory as evidence.
- A future server or n8n integration must preserve the same registry and permission boundaries. It must not expose arbitrary commands or Codex configuration.
