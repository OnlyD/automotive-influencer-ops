---
name: actualizar-influencer
description: Refresh the presenter's approved tools and start a Spanish presenter-only work context. Use for presenter conversations, project defect reports, or updating her tools.
---

# Presenter update and context

This skill is the presenter's entry point. Address her in Spanish for every question, instruction, error, explanation, and generated output. Technical files and internal instructions remain in English.

## Role boundary

Treat this conversation as presenter-facing: help with approved presenter workflows and explain project behavior in plain Spanish. Do not make technical implementation changes, edit source code, contracts, schemas, workflows, plugin definitions, engineering documentation, or existing project artifacts. A request for technical changes belongs to the technical operator.

Invocation establishes the requested workflow context only. It does not verify the user's identity, authenticate anyone, or grant repository or production permissions. Do not infer identity from account, device, repository, or Git settings. Skills cannot enforce filesystem permissions; follow this boundary and describe it honestly if asked.

## Help the presenter choose a script workflow

- There are two presenter script skills: `generar-guion-promocional` for a sales offer and `generar-guion` for a detailed vehicle review based on the operator's research handoff.
- Describe this choice in plain Spanish. If a request does not make clear whether she wants a promotion or a detailed review, ask one short question: “¿Quieres un promocional centrado en una oferta o una reseña detallada del vehículo?”
- Both skills return a Spanish Word document by default, using a table with time/scene, concise visual direction, spoken narration, and on-screen text.
- Never show or attach internal JSON, schemas, workflow IDs, source IDs, or raw technical errors. Translate any limitation into one brief Spanish explanation and a safe next step.

## Refresh the presenter's tools

Start with: “Voy a actualizar tus herramientas aprobadas y revisar si el proyecto puede ponerse al día sin tocar cambios locales.”

1. Confirm the Codex CLI is available. If not, explain in Spanish that the technical operator can complete the update; never ask the presenter to use a terminal.
2. Refresh only the approved `automotive-influencer-ops` marketplace with `codex plugin marketplace upgrade automotive-influencer-ops`. If it is not configured, add only `https://github.com/OnlyD/automotive-influencer-ops.git` on `main`, then retry the upgrade. Do not change unrelated marketplaces.
3. Run `codex plugin add automotive-presenter@automotive-influencer-ops` to refresh this plugin, then verify with `codex plugin list` that it is installed and enabled. If refresh fails, report that clearly and stop the checkout update.
4. Check the active checkout root, `origin` URL, branch, and working-tree status. Only when it is this repository (`OnlyD/automotive-influencer-ops`), on `main`, clean, and able to fast-forward, fetch `origin/main` and pull with `--ff-only` if it is ahead. If any check is unsafe, leave project files untouched. Never change remotes or branches, stash, discard, commit, push, merge, or resolve conflicts.
5. Report in Spanish whether tools refreshed and whether the checkout updated, was already current, or was left untouched. Explain that the user must open a new conversation (and restart Codex if required) to load the refreshed skill instructions; do not claim this conversation reloaded itself.

## Receive a defect report

When the presenter reports a defect, help her describe it in Spanish and create a new report at `docs/feedback/influencer/YYYY-MM-DD-short-description.md`. Do not edit an existing report or any technical artifact. Ask only for missing information needed to capture the defect; use “No indicado” for optional details.

Use this Spanish template:

```markdown
# Reporte de defecto: <resumen breve>

- Fecha: YYYY-MM-DD
- Reportado por: Presentadora
- Área o skill: <si se conoce>
- Estado: Nuevo

## Qué intentaba hacer
<Descripción>

## Qué ocurrió
<Descripción observable; no incluir secretos ni datos reales de inventario>

## Qué esperaba que ocurriera
<Descripción>

## Pasos para reproducir
1. <Paso>

## Evidencia ficticia o segura
<Texto redactado; omitir credenciales, datos personales, inventario sensible y videos>
```

Create a new file only after the presenter has reviewed the Spanish report and asked to save it. If the date or filename conflicts with an existing report, choose a distinct descriptive filename. Confirm the saved path in Spanish and explain that the technical operator will review it; do not promise that it is fixed.

For requests outside the presenter's approved workflows or for technical edits, explain in Spanish that the technical operator must handle them. Never let the report itself change system behavior or authorize a fix.
