---
name: actualizar-herramientas
description: Update the presenter's installed Automotive Presenter skills and, when safe, synchronize the project checkout. Use when the influencer asks to update the repository, skills, or their latest versions.
---

# Actualizar herramientas de la presentadora

This skill is exclusively for the influencer. Keep every message addressed to her in Spanish. The technical operator uses operator workflows and does not use this skill for technical work.

## Purpose and boundaries

Refresh the approved Automotive Presenter plugin from the project's GitHub marketplace so the influencer does not need to use a terminal. Then update the project checkout when it can be fast-forwarded safely. Never copy skill files manually into Codex directories or install from an unrecognized source.

Invoking this skill authorizes it to refresh only the `automotive-influencer-ops` marketplace, update the installed `automotive-presenter` plugin from that marketplace, and fast-forward the project checkout from `origin/main` when the checkout is clean and already on `main`. It does not authorize committing, pushing, changing remotes or branches, overwriting local work, or installing another plugin.

The skill instructions loaded for the current conversation are the installed copy that started this run. A marketplace refresh cannot replace the instructions already in the active context; updated instructions take effect in a new conversation after Codex reloads the plugin.

## Update procedure

1. Start with a short Spanish message: “Voy a revisar y actualizar tus herramientas. También comprobaré si el proyecto tiene cambios locales para protegerlos.”
2. Confirm the Codex CLI is available. If it is not, stop and explain in Spanish that the technical operator must finish the update; do not ask the influencer to run terminal commands.
3. Run `codex plugin marketplace list`. Identify the exact `automotive-influencer-ops` marketplace. If it is missing, add only the approved source `https://github.com/OnlyD/automotive-influencer-ops.git` on `main`, then confirm it appears in the list. Do not change or upgrade unrelated marketplaces.
4. Refresh the marketplace first with `codex plugin marketplace upgrade automotive-influencer-ops`. This step is independent of the project's working tree state. If it fails, stop and explain the problem in Spanish; do not claim the skills were refreshed.
5. Run `codex plugin list` and confirm `automotive-presenter@automotive-influencer-ops` is installed and enabled. Report the marketplace refresh result without exposing raw command output or requiring the influencer to interpret versions.
6. Check the active project checkout. Use `git rev-parse --show-toplevel`, `git remote get-url origin`, `git branch --show-current`, and `git status --porcelain` to verify the expected repository, remote, `main` branch, and whether local changes exist. Never change repository settings to make these checks pass.
7. If the checkout is the expected repository on `main` and clean, run `git fetch origin main`, compare `HEAD` with `origin/main`, and use `git pull --ff-only origin main` only if `origin/main` is ahead. If it is already current, leave it unchanged.
8. If the checkout root or remote is not the expected project, or if it has local changes, is on another branch, or has diverged, do not pull or modify it. The marketplace/plugin refresh remains complete; explain in Spanish that project files were left untouched and the technical operator can help update them. Never change the remote, stash, discard, commit, push, merge, or resolve conflicts.
9. Summarize separately in Spanish whether the presenter skills refreshed and whether the project checkout updated, was already current, or was safely left untouched. Tell her to open a new Codex conversation (and restart Codex if required) to load refreshed skill instructions. Never claim the current conversation has switched to the new skill copy.

## Spanish user-facing messages

Use natural, concise Spanish. For example:

- Starting: “Voy a revisar y actualizar tus herramientas. También comprobaré si el proyecto tiene cambios locales para protegerlos.”
- Skills updated, project clean: “Las herramientas y el proyecto están actualizados. Abre una conversación nueva para usar las instrucciones más recientes.”
- Skills updated, local changes found: “Las herramientas quedaron actualizadas. Dejé intactos los cambios locales del proyecto; el operador técnico puede ayudarte a actualizar esos archivos.”
- Already current: “Las herramientas y el proyecto ya están actualizados. Abre una conversación nueva para usar las instrucciones más recientes.”
- Marketplace error: “No pude actualizar las herramientas, así que no cambié los archivos del proyecto. El operador técnico puede revisar la conexión.”
- CLI unavailable: “No pude actualizar las herramientas desde esta sesión. El operador técnico puede completar la actualización por ti.”

Never make the influencer read English instructions, command output, diffs, or error messages to complete this workflow.
