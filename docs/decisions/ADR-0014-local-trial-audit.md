# ADR-0014: Close release gaps and preserve historical publication evidence

- Status: Accepted for supervised local implementation
- Date: 2026-09-30

## Context

The pre-trial audit found that isolated component tests did not exercise every production state together. It also found incomplete recording/media checks, premature official script replacement, stale parent reviews, retry output collisions and incorrect rejection of delayed historical receipts. The permission matrix contradicted the already accepted presenter research flow.

## Decision

Require complete applicable reviews and current canonical evidence before official script replacement, retaining one primary script identifier and the actual revised base version. Validate recording suitability, edit cues and actual publication master streams. Recheck ancestor reviews and current release gates when preparing packages or entering PROGRAMADO. Record rejected transitions without changing state.

Treat a manually attested publication receipt as historical evidence, evaluated at the claimed publication instant after recorded intent. Retain the complete reviewed source/fact snapshot and review ledger. Future expiry or stock changes block fresh release, while historical receipts and metrics remain accessible. This is an attestation, not a verification of an external upload or historical dealer stock. Reject future timestamps, conflicting receipts and impossible measurement windows.

Compare worker input against persisted leased requests, isolate render outputs by lease token, process extracted clips sequentially and serialize polling within one instance. Separate processes are still operator-controlled; this does not implement distributed worker orchestration.

Allow optional public URLs in normalized `production-script@1.1.0` source records, preserving dealer descriptions instead of inventing links. Adaptation, caption and clip-proposal workflows become 1.1.0 with updated definition fingerprints. Adaptation supports scene reordering with durations and closing preserved. Existing string-URL script records remain compatible.

Use Node 24 LTS for development, CI and the operations container. The [official Node release table](https://nodejs.org/en/about/previous-releases) lists Node 20 as end-of-life and Node 24 as LTS. Add bounded tracked-tree secret-pattern checks and forbidden media/runtime checks in CI. These do not classify every secret or inspect Git history.

## Consequences and evidence

Two real FFmpeg synthetic integration tests exercise every state from BORRADOR through MEDIDO for promotional and separate-voice-over cases. Additional regressions cover confirmed dealer evidence without a URL, parent approval revocation, malformed media, scene lineage, overlapping polls, rejected transitions and Spanish UTF-8 transport. Plugin metadata advances to 0.2.1; installed caches require the normal refresh workflow.

The supported trial boundary remains supervised local operation with approved manual publication. Twenty-second generated footage is functional evidence, not a real 120–150-second editorial/performance test. Actual presenter usability, human playback, rights, dealer terms, contact destinations, account permissions, remote operation, cloud retention/backup and automatic publishing still need their documented inputs or increments. See `docs/self-audit.md` and `docs/validation-report.md` for audit findings and executable evidence.
