# Local machinery validation record

Date: 2026-09-30. Scope: supervised local pilot; fictional fixtures and synthetic media only.

## Commands and results

| Validation | Result |
| --- | --- |
| `pnpm test` | Passed: builds/type checks and 57 tests (domain 2, contracts 3, inventory 10, AI runner 17, media 4, operations 21). |
| `pnpm operations -- --help` | Passed; the CLI storage/environment regression is covered in the operation tests. |
| `pnpm format:check` | Passed for the newly implemented TypeScript areas. |
| `git diff --check` | Passed. |
| Skill creator `quick_validate.py` for the ten implemented/updated operation and presenter skills | Passed. |
| Plugin metadata JSON and skill-directory checks | Both plugins resolve nine skill definitions, version 0.2.0. |
| Compose operations image build | Passed with FFmpeg and DejaVu fonts. |
| Media tests inside the operations image | Four passed, including source audio, voice-over, still images, approved on-screen copy and clip extraction. |
| Ephemeral operations container smoke check | Health reports local simulation and live publishing disabled; empty status and idle worker verified. Container removed afterward. |
| Reviewed inactive n8n workflow import into isolated local n8n state | Passed. No polling activation or production enqueue. |

The operation tests cover role routing, immutable approvals, candidate-versus-approved replacement, canonical vehicle/fact/source binding, stale evidence, placeholder gates, lease/retry handling, publication prerequisites, Word documents and backup/restore. Publication component tests use fictional attested receipts; they make no social network requests.

## Limits

- The complete production path has not been exercised as one end-to-end trial. Component tests do not establish full-flow acceptance.
- No real footage, inventory, credentials, accounts, AWS deployment or live post was used.
- Manual publishing receipts are operator attestations, not provider verification.
- Local role routing is not authenticated remote operation. Permanent remote storage, identity and signed uploads remain increment F.
- File-format checks do not replace human playback, source review, rights review or same-day commercial confirmation.
- GitHub CI results are separate from these local results. Reviewer identities and branch protection have not been configured or asserted.

See [the trial boundary](e2e-readiness.md) and [the operation guide](local-production.md) for resumption.
