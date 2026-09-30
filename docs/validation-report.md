# Local machinery validation record

Date: 2026-09-30. Scope: supervised local pilot; fictional fixtures and synthetic media only.

## Commands and results

| Validation | Result |
| --- | --- |
| Node 24 `pnpm install --frozen-lockfile` | Passed. |
| Node 24 `pnpm test` | Passed: builds/type checks and 67 tests (domain 2, contracts 3, inventory 10, AI runner 17, media 5, operations 28, secret scanner 2). |
| `pnpm operations -- --help` | Passed. |
| `pnpm format:check` and `git diff --check` | Passed. |
| Skill creator `quick_validate.py` for changed adaptation/edit/publication skills | Passed. |
| Plugin metadata and skill-directory checks | Both plugins resolve nine skills, version 0.2.1; canonical and compatibility metadata synchronized. |
| `pnpm secrets:check` on staged tracked definitions | Passed; no forbidden runtime/media or matching credential patterns. |
| Fresh temporary Git clone of `bc4dab2`, Node 24 frozen install, formatting, scanner and `pnpm test` | Passed: all 67 tests; no inherited ignored operational state or toolchain. |
| Node 24 operations Docker build from `bc4dab2` | Passed; image records the exact source commit. |
| Media tests inside the operations container | All five passed using its FFmpeg/fonts/runtime. |
| Container registry/fixture checks | Nine AI contracts and four deterministic input/output fixture pairs valid. |
| Ephemeral container health/status/worker smoke | Healthy local simulation; live publishing disabled; empty store; idle worker. Container removed. |
| GitHub CI for implementation `bc4dab2` | [Passed](https://github.com/OnlyD/automotive-influencer-ops/actions/runs/36784065025): frozen install, scanner, formatting, builds/typechecks and tests. |

The two complete integration tests use actual FFmpeg on generated 20-second video/audio/still media. They exercise inventory CSV preview/apply, reviewed canonical evidence, script binding and approvals, every production state, recording gates, Word delivery, render retry, master/clip reviews, manual packages, parent review revocation, fictional historical publication receipts and measurements. They make no social or live model calls. Temporary media and state are removed after each test.

Additional regressions cover scene order/base lineage, unusable master formats, dealer confirmation without a public URL, conflicting source IDs, split Spanish UTF-8 request bodies, forged leased requests, overlapping local worker polls, stale releases, measurement windows and bounded secret detection.

## Limits

- Both synthetic complete flows are exercised; the real presenter/operator trial remains pending. Generated 20-second media does not validate 120–150-second performance, actual narration or human editorial acceptance.
- No real footage, inventory, credentials, accounts, AWS deployment or live post was used.
- Manual receipts are operator attestations, not provider verification or proof of historical dealer stock.
- Local role routing is not authenticated remote operation. Cloud identity/state and signed uploads remain increment F.
- Format checks do not replace human playback, source/rights review or same-day commercial confirmation.
- The tracked-tree scanner covers bounded known patterns, not every secret or Git history. CODEOWNERS and branch protection require confirmed reviewer identities.

See [the self-audit](self-audit.md), [trial boundary](e2e-readiness.md) and [operation guide](local-production.md).

The final validation-record commit changes documentation only. The fresh-clone and container evidence above identifies the audited implementation commit explicitly; no n8n polling or production job was activated. The earlier inactive n8n import check remains applicable because its definition was unchanged.
