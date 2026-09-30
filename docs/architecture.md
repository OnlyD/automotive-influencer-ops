# Architecture

The target architecture remains skills → authenticated serverless API/state/storage/queue → local n8n/AI runner. Sections 6–8 of `propuesta-tecnica.md` define the cloud boundary; no AWS resources have been deployed.

The implemented local pilot uses `services/api` as an operator-controlled simulator, `packages/contracts` for versioned entities, `packages/domain` for production transitions, `packages/inventory` for preview/apply imports and `packages/media` for deterministic processing. The AI Runner accepts only fingerprinted registered workflow definitions and an explicit executor. Presenter research still retrieves sources in her active Codex conversation; the isolated CLI runner does not invent evidence when retrieval is unavailable.

Production artifacts, human approvals, leased jobs, audit events, publication receipts and metric snapshots live in ignored local operational storage for this adapter. Media originals remain immutable and source-linked edits reference them by hash. n8n calls a fixed leased-worker endpoint on a private Compose network; it receives no Codex home or social credentials.

The publisher boundary is an approved manual handoff during the pilot. Account authentication, always-available AWS persistence, signed cloud delivery, remote role enforcement and unattended publishing remain increment F/provider work. A second clone cannot recover ignored local operations from GitHub.

See `local-production.md`, `e2e-readiness.md` and ADR-0012/0013 for current capabilities and limits.
