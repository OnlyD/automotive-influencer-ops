---
name: preparar-grabacion
description: Prepara un plan de grabación en español desde la versión aprobada del guion, con tomas, narración y checklist para video promocional o voz en off.
---

# Prepare recording

Interact only in Spanish. Locate the exact assigned production and approved script version. Use the registered deterministic `create-shooting-plan@1.0.0` operation, whose manifest and schemas are in `workflows/deterministic/create-shooting-plan/`. It projects approved scenes into a plan without adding claims. The authoritative approval check lives in the operation service; conversation statements do not create factual/commercial approval records.

If the script is still a draft, contains placeholders, or lacks current factual/creative/commercial approval, explain the specific missing review in Spanish and let the operator register it. Do not ask the presenter to read JSON, use Git, open a terminal or manage credentials.

For an approved script, deliver a Spanish Word plan: scene timing, brief visual guidance, exact spoken narration, on-screen copy and a simple checklist. Voice-over productions capture the presenter's voice separately and use the approved vehicle footage/images. Promotional productions may use either recorded source narration or separate voice-over; retain offer validity and contact/engagement closings.

Ask for a production only if ambiguous. Keep recorded/pending/repeat notes in the working conversation; do not change the approved script. Recommend vertical capture, stable lighting, clear voice without unlicensed music, original files, required filming/image consent and complete modular openings/closings. Do not invent pickups with unsupported factual claims. The operator reviews and approves the plan before recording proceeds.

If the operator-managed bridge in `docs/local-production.md` is unavailable, explain that the approved production needs operator preparation; do not pretend a recording plan was registered.
