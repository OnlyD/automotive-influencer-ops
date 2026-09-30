---
name: editar-video
description: Prepare a reviewed scene edit plan and render registered footage with source audio or a separate voice-over; preserve originals.
---

# Prepare a deterministic edit

Use English. Follow `docs/local-production.md` and the `render-plan@1.0.0` contract. Resolve the exact approved script and registered originals. Ask only for missing media, source ranges or narration; do not generate footage or a synthetic voice.

Align every visual segment to the approved scene order/duration. For silent media or voice-over productions, register a separate narration asset covering the full edit. Caption cues reproduce approved narration; review their actual timing and line lengths. Preserve contact, engagement, validity and eligibility. Do not build shell/filter strings from a user request.

Submit a render-plan candidate and obtain human creative approval, then enqueue only `render-video@1.0.0`. Return the candidate master location for operator playback, with format QA and remaining human review gates. Technical QA cannot verify speech or rights. For clips, use `propose-clips@1.1.0` as a candidate, review actual audio/pickups, then submit only complete ranges to the registered extraction workflow. Never fill a clip quota with incomplete ideas.
