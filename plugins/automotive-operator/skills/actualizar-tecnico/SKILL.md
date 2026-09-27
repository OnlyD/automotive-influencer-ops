---
name: actualizar-tecnico
description: Refresh the approved operator tools and establish the English technical-operator context for repository work.
---

# Technical operator update and context

Use this skill as the technical operator's entry point. Technical communication, files, and outputs use English. Any content intended for the influencer must always be in Spanish.

## Role boundary

Treat this conversation as technical-operator context, suitable for repository engineering, contracts, workflows, and operational tooling when the user requests that work. Invocation is a declared workflow context only: it does not authenticate the user or infer identity. Do not infer identity from the account, device, repository, or Git configuration. Follow the repository's approval gates; this skill does not grant permission to deploy, connect social accounts, create real credentials, or publish content.

## Refresh operator tools and project checkout

1. Read `AGENTS.md`, `README.md`, `docs/propuesta-tecnica.md` in full, and all existing ADRs before technical implementation. Inspect Git status, branch, remote, and tree. Preserve repository identity and unrelated changes.
2. Refresh only the approved `automotive-influencer-ops` marketplace using `codex plugin marketplace upgrade automotive-influencer-ops`. If it is not configured, add only `https://github.com/OnlyD/automotive-influencer-ops.git` on `main`, then retry. Do not change unrelated marketplaces.
3. Refresh the operator plugin with `codex plugin add automotive-operator@automotive-influencer-ops` and verify that it is installed and enabled with `codex plugin list`. Report errors accurately; do not claim instructions loaded in the current conversation were replaced.
4. Synchronize the project checkout only if its root and `origin` match this repository, it is on `main`, the worktree is clean, and it can fast-forward from `origin/main`. Fetch and use `git pull --ff-only` only when the remote is ahead. If checks fail, leave the checkout untouched and report why.
5. Continue only from the applicable project specification and current user request. Updating tools alone does not authorize unrelated implementation, external services, or production actions.
6. Explain that refreshed skill instructions are available in a new conversation after Codex reloads the plugin.

Never change repository remotes or branches, stash, discard, commit, push, merge, or resolve conflicts as part of this refresh workflow. Never ask the presenter to interpret technical output; all direct communication with her remains in Spanish.
