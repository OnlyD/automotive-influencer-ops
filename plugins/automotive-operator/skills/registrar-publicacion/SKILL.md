---
name: registrar-publicacion
description: Export an exactly approved manual publication handoff and record the operator-attested remote receipt after an authorized upload.
---

# Record an approved manual publication

Use English. Read `docs/local-production.md` and `docs/runbooks/failed-publication.md`. Require publication approval for the exact package/platform/account and all current upstream gates. Check commercial confirmation on the publication day.

Export the approved video/caption/handoff and record manual scheduling intent with a stable idempotency key. An export or local schedule is not a remote post. Actual upload requires the operator's explicit publication authorization and the intended account. Do not create credentials or connect a provider as part of this skill.

After the operator confirms a remote upload, record the actual remote ID, platform URL and timestamp once. Do not invent a receipt or silently retry an uncertain upload. Reconcile existing platform content first to avoid duplicates. Keep historical approvals and receipts intact; missing publication confirmation prevents advancing to PUBLICADO.
