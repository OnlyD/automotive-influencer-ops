---
name: actualizar-herramientas
description: Update the presenter's local project checkout and refresh the approved Automotive Presenter plugin from the project's main branch. Use when the influencer asks to update the repository, skills, or their latest versions.
---

# Actualizar herramientas de la presentadora

This skill is exclusively for the influencer. Keep every message addressed to her in Spanish. The technical operator uses operator workflows and does not use this skill for technical work.

## Purpose and boundaries

Synchronize the existing project checkout with the approved `main` branch, then refresh the Automotive Presenter plugin through Codex's configured marketplace. Never copy skill files manually into Codex directories. Never install from an unrecognized source.

The influencer invokes this skill to request an update. Invocation authorizes this workflow to fetch and fast-forward the project checkout and refresh only the Automotive Presenter marketplace. It does not authorize committing, pushing, changing the remote, changing branches, overwriting local work, or installing another plugin.

## Preconditions

1. Identify the project root using `git rev-parse --show-toplevel`.
2. Confirm that `origin` is exactly `https://github.com/OnlyD/automotive-influencer-ops.git` (the SSH equivalent is allowed only if it resolves to the same repository).
3. Confirm the current branch is `main`.
4. Check `git status --porcelain`. If the checkout is not clean, stop before fetching or changing files. Explain in Spanish that local changes need the technical operator's help; never stash, discard, commit, or overwrite them.
5. Confirm the `codex` CLI is available before trying to refresh a marketplace. If unavailable, synchronize nothing and provide the manual next step in Spanish.

If the project root, remote, or branch does not match these conditions, stop and explain the mismatch in Spanish. Never change repository configuration to make the check pass.

## Update procedure

1. Fetch only `origin main` with `git fetch origin main`.
2. Compare `HEAD` with `origin/main`. If they are identical, tell her the project checkout is already current and continue to the marketplace check.
3. If `origin/main` is ahead, report in Spanish how many commits will be received and show a concise, human-readable summary of changed areas. Do not expose raw diffs, code, JSON, or Git terminology unless she asks.
4. Fast-forward only with `git pull --ff-only origin main`. If Git reports divergence, a conflict, or any error, stop without resolving it and explain in Spanish that the technical operator must review it.
5. Run `codex plugin marketplace list` and identify the marketplace whose source is this repository. Do not upgrade unrelated marketplaces.
6. If this repository marketplace is not configured, add it with `codex plugin marketplace add https://github.com/OnlyD/automotive-influencer-ops.git --ref main`. Explain in Spanish that this registers the project's approved plugin catalog in Codex.
7. Refresh only this repository marketplace with `codex plugin marketplace upgrade <marketplace-name>`, using the exact name reported by the CLI. Do not guess a marketplace name. If the CLI reports that the plugin is not installed, explain the next step in Spanish and let the influencer or operator install `Automotive Presenter` from the Plugins Directory; do not invoke unrelated installation commands.
8. Report the resulting repository revision and marketplace result in Spanish. If Codex requires a restart or a new conversation to load updated instructions, say so plainly. Do not claim the active conversation has loaded a newly updated copy of this skill.

## Spanish user-facing messages

Use natural, concise Spanish. For example:

- Before updating: “Voy a revisar si hay una actualización aprobada para el proyecto y sus herramientas. No cambiaré tus archivos locales.”
- Local changes found: “Encontré cambios locales en el proyecto. Para protegerlos, detuve la actualización. Pídele al operador técnico que los revise contigo.”
- Update completed: “El proyecto y las herramientas quedaron actualizados. Para usar las instrucciones nuevas, abre una conversación nueva en Codex.”
- No update: “El proyecto ya está actualizado. Revisé también el catálogo de herramientas.”
- Error: “No pude terminar la actualización y no resolví el problema automáticamente. El operador técnico puede revisar el estado del proyecto.”

Never make the influencer read English instructions, command output, diffs, or error messages to complete this workflow.
