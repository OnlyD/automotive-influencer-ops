# automotive-presenter

The influencer-facing plugin. All user-facing questions, instructions, errors, explanations, and generated content must always be in Spanish. Technical implementation instructions remain in English.

The `actualizar-influencer` skill refreshes this plugin, starts the presenter-only Spanish context, and can save new Spanish defect reports under `docs/feedback/influencer/` after presenter review. The `generar-guion` skill prepares a source-linked, non-official script preview in Spanish; candidate facts require technical review, and the skill does not persist or publish the draft. `actualizar-herramientas` remains as a compatibility entry that routes to the supported skill.
