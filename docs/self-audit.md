# Pre-trial self-audit

Date: 2026-09-30. Scope: supervised local promotional and separate-voice-over workflows, ending in an approved manual publication handoff. No live account, credentials, cloud deployment or publication used.

## Findings and corrections

| Finding | Correction and regression evidence |
| --- | --- |
| Component checks did not prove the full sequence | Two complete synthetic integrations traverse every state through MEDIDO with real FFmpeg rendering/extraction, Word delivery, fictional receipts and metrics |
| Recording could advance with unusable material | Approved plan, visual assets and applicable audio required; empty/audio-only recording rejected |
| Manual master metadata could mask wrong container/codec | Probe actual MP4/H.264/yuv420p/AAC streams, geometry and duration; MOV and MPEG-4 codec regressions |
| Unfinished candidates could replace the official script | Stable primary script ID; complete current applicable approvals, canonical snapshot and placeholder gates before replacement |
| Scene reordering was missing; lineage could use a different candidate | Preserve exact edited base, scene lengths, locked evidence and closing; reject no-op revisions |
| Derived releases could outlive revoked parent reviews | Recheck render-plan/master ancestors and current gates, including PROGRAMADO; revocation regression |
| Caller could substitute leased input; retries could reuse partial files | Persisted request comparison, lease-specific output folders, serialized polls and sequential extraction; forged-request/retry regressions |
| Historical receipt was blocked by later stock/source expiry | Validate exact retained evidence/reviews at attested publication time after intent; fresh expired exports remain blocked |
| Metrics could claim impossible windows or duplicate names | Reject these inputs; preserve immutable snapshots |
| Confirmed dealer source import expected a title/public URL | Preserve description and null URL, reject conflicting source IDs; additive script schema 1.1.0 |
| Spanish HTTP text could be corrupted across streamed chunks | Decode the complete buffered body; Spanish/emoji regression; render Word before setting its MIME type |
| Permission matrix disallowed accepted presenter research | Correct section 42 to match sections 13/36, increment D and ADR-0010 |
| CI lacked secret checks and used an unsupported runtime | Node 24 LTS, bounded secret-pattern/forbidden-media checks and scanner regressions |

## Readiness assessment

The corrected implementation and its documented contracts support a supervised **local** trial. Validation results are recorded in [validation-report.md](validation-report.md); this is an assessment of known gaps in that scope, not a guarantee that no unknown defect exists.

## Remaining boundaries

- Real presenter usability, vehicle source accuracy, actual speech/framing/readability and the 120–150-second pilot still require the human trial. Synthetic tests use 20-second generated media and do not replace playback or performance checks.
- Actual facts, dealer confirmation/availability/validity, contact details, filming/consent/music rights and platform/account permissions are real inputs. Missing or stale inputs stop their applicable gates.
- Publication is manual. Receipts attest what the operator reports; this adapter does not verify platform activity or historical dealer stock. Direct-post integration/provider approval remains separate.
- Local role selection does not authenticate anyone. Independent remote presenter operation, identity, permanent cloud state, retention and signed upload remain increment F. Loopback services must remain on the controlled local machine/private container network.
- Establish an off-device backup before ingesting irreplaceable material. Local backup tools do not provision external storage or a retention policy. Multiple independently started workers are operator-managed.
- Secret checks cover known patterns in tracked text and selected forbidden media paths, not every secret, binary format or historical commit. Branch protection and CODEOWNERS still need confirmed reviewer identities.
- Plugin definitions are 0.2.1 in the repository; installed tools must be refreshed before the trial. Skill invocation is role context, not authentication.

Resume at [e2e-readiness.md](e2e-readiness.md) after refreshing the tools. Do not treat synthetic receipts, fixture rights or schedule records as permission or proof of a real publication.
