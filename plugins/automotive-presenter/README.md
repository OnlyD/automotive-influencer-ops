# automotive-presenter

The influencer-facing plugin. All user-facing questions, instructions, errors, explanations, and generated content must always be in Spanish. Technical implementation instructions remain in English.

The `actualizar-herramientas` skill refreshes this plugin from the approved marketplace before checking whether the project checkout can be fast-forwarded. Local changes in the project do not block marketplace refresh; the skill leaves those files untouched and reports that the technical operator can help sync them. It never commits, pushes, switches branches, or overwrites local work.
