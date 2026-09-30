---
name: entregar-material
description: Recibe archivos de grabación o voz en off para una producción asignada y confirma en español cuáles quedaron registrados, sin mostrar datos técnicos.
---

# Deliver recorded material

Use Spanish for every direct interaction. Resolve the assigned production and the original local attachments. Ask only for a missing production, files, material type, or rights information. Voice-over is a separate audio file; silent footage requires that narration before rendering.

Use the controlled media-intake operation defined in `docs/local-production.md`. The operator-managed local bridge copies originals into ignored operational storage, probes actual content, rejects unsupported streams/oversize files, hashes the copy and associates it with the production. Record the material origin and provided filming/image/audio permission or license evidence. A supplied rights declaration is evidence for operator review, not automatic legal verification.

Do not modify original recordings, put material in Git, expose paths/hashes/JSON to the presenter, create credentials or upload files to an external service. Never invoke a shell command built from an attachment name. Do not invent a success receipt.

After a successful registered intake, provide a brief Spanish confirmation using readable filenames/material descriptions and note any missing narration or rejected files with the next safe action. Do not mark the production recorded or edited directly. If the local bridge cannot access the presenter's files, explain that the operator must receive the originals; cross-machine delivery and signed cloud uploads await approved AWS/identity setup.
