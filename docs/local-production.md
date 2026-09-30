# Supervised local production

## Scope

The local machinery supports promotional content and voice-over content through a reviewed publication handoff. It requires human source/fact checks, creative choices, filming/audio, media QA and explicit publication decisions. It does not invent footage or speech, automatically edit a story, authenticate a remote presenter, deploy AWS, connect accounts or upload posts.

Local runtime state and originals are ignored files. GitHub distributes definitions; it does not contain inventory state, production data or videos. A second clone does not inherit ignored state. Use an operator-managed handoff for the pilot. Independent presenter operation and permanent cloud state require increment F.

## Requirements and start

Node.js 20+, pnpm 9.15.9, FFmpeg/ffprobe with libx264 and libass, and optional Docker Compose. These commands are for the technical operator only.

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm operations -- status
pnpm operations:serve
```

The server binds `127.0.0.1:4318`. The CLI defaults to `.local/operations/` under the directory where pnpm was invoked. `--storage` selects a separate local store. Set an absolute `OPS_STORAGE` when sharing the server and CLI. `OPS_SOURCE_COMMIT` defaults to the current Git commit and must identify reviewed, committed definitions for an official run. Uncommitted development builds are tests, not approved production provenance.

The CLI/server require a canonical inventory vehicle at creation. `OPS_INVENTORY_FILE` defaults to the sibling `.local/inventory/inventory.json`; the vehicle identity is copied without VIN. Imported draft identity must match its year/make/model/trim/market. Test-only in-memory fixtures may omit the inventory adapter; they are not the normal CLI/server path.

Local roles are declared routing contexts: `--role presenter` and `--actor <declared-name>` never verify identity. CLI routing and the loopback API are a trusted operator simulator, without a remote authentication boundary. Never forward their ports to the internet or use the container-mode bind outside the private Compose network.

## Operator commands

Every mutation takes a JSON input file via `--input`. JSON is an internal operator interface; the presenter receives Word or Spanish confirmations. Fixtures under `templates/production/` contain no real vehicle facts or accounts.

| Command | Input and effect |
| --- | --- |
| `create` | Production ID, vehicle ID, title, `PROMO` or `VOICE_OVER`, target platforms; starts `BORRADOR` |
| `import-draft` | Exact production/artifact ID, registered workflow ID/version, original input and output; revalidates and retains source evidence without approvals |
| `bind-facts` | Exact script reference; verifies selected value/unit/source correspondence and creates a version bound to reviewed canonical fact/source hashes |
| `script` | A normalized `production-script@1.0.0` candidate; new versions preserve the earlier version |
| `adapt` | Exact `artifact` reference plus scene `changes`; creative fields only, renewed human gates |
| `approve` | Exact artifact reference, approval type, decision, notes, optional expiry |
| `transition` | Production ID and the next documented `to` state; checks evidence and rejects skipped steps |
| `document` | Exact artifact reference; produces the existing Spanish four-column Word layout for a script or shooting plan |
| `ingest` | Production ID, local original path and origin/license-or-consent/confirmer; probes and hashes the immutable copy |
| `render-plan` | Production/artifact ID and scene-aligned segments, audio mode, optional narration asset, reviewed subtitle cues |
| `register-master` | Production/artifact ID, approved script reference and registered media asset ID for a manually edited vertical master |
| `enqueue` | Exact registered deterministic workflow/version, production, immutable input and idempotency key |
| `work-once` | Claims and processes one local job; no model or social calls |
| `retry` | A pending/dead-letter job ID; explicit operator replay after diagnosis |
| `export-package` | Exact publication package reference; approved video/caption/handoff only, no publication |
| `schedule` | Exact package reference and idempotency key; records manual publication intent |
| `record-publication` | Scheduled publication ID plus remote ID, HTTPS platform URL and publication timestamp, attested by the operator |
| `metrics` | Confirmed publication, capture time/window and values with platform definitions/denominators; append-only snapshots |
| `audit` | Production ID; internal history including validated draft evidence |
| `backup` | Absolute `destination` in ignored `.local/backups/` or outside the repository, separate from the store; new versioned snapshot of state and all registered media |
| `restore` | Absolute backup `source`; verifies hashes and restores only to the empty original storage root |

Review canonical facts using `inventory preview-facts` and `verify-facts` as described in `inventory-import.md`. Bind the selected facts before factual approval. A changed/stale fact, source, canonical vehicle identity or unavailable stock blocks reuse. New canonical bindings create new script versions retaining the complete reviewed fact/source snapshot, so later inventory changes do not erase historical verification evidence.

Examples (copy templates into `.local/` and replace fictional IDs with canonical IDs from an approved inventory import):

```bash
pnpm inventory -- preview --file data/fixtures/honda-inventory.csv
# Apply only its reviewed preview/hash; select a resulting canonical vehicle ID.
pnpm operations -- create --input .local/review/production.json
pnpm operations -- script --input .local/review/script.json
pnpm operations -- bind-facts --input .local/review/script-reference.json
pnpm operations -- approve --input .local/review/factual-approval.json
pnpm operations -- enqueue --input templates/production/fictional-enqueue.json
pnpm operations -- work-once
```

The latter commands require actual creative/factual approval; this sequence is not permission to treat the fixture as real evidence. Do not approve boilerplate automatically. Use typed approvals `FACTUAL`, `CREATIVE`, `COMMERCIAL`, `RIGHTS`, `TECHNICAL`, `PUBLICATION` for their applicable artifacts. Reject decisions remain in history. Artifact status reflects recorded decisions; validity/lineage gates are always rechecked when operating.

`import-draft` automatically converts the two presenter draft formats. For the technical `draft-vehicle-script` contract, use an operator-prepared normalized script with its complete sources and required presenter closing; that older contract lacks source records and a contact destination. Do not invent missing sources during conversion.

## Two video paths

### Promotional video

Research and draft in the established presenter conversation, selecting only two or three attractive supported facts. The operator imports/registers the candidate and confirms exact offer eligibility, price, availability, financing where used, validity and contact destination. Unresolved markers block recording preparation and rendering.

After factual, creative and commercial approval, prepare the shooting plan. Register footage with audible source narration or a separate voice-over track. Confirm source/clip intervals, on-screen text and subtitle timing against actual recorded speech. Submit the render plan, approve its creative selection, enqueue `render-video`, then review the resulting master.

### Voice-over video

Use the same source-linked draft/review gates. Prepare a `VOICE_OVER` production. Register silent footage or still images plus the presenter's separate audio. Supply a `VOICE_OVER` render plan with a registered narration asset matching the entire edit duration, scene-aligned visual segments and reviewed subtitles. No synthetic voice is generated. Short visual sources cannot be silently extended beyond their original duration; stills may be held for an explicitly planned duration.

Approved on-screen scene copy is burned from the exact script, including promotional validity, independently of optional narration subtitles. Copy is passed through literal text files rather than interpreted as filter expressions. Voice-over length must match the edit; adjust timings or explicitly trim silence before intake instead of silently cutting the closing.

For both paths, the renderer fits rather than silently crops source frames, preserves originals, and checks resolution, audio and duration. Technical checks do not prove that the narration matches the script or that rights/consents are valid; the operator listens/watches and records those reviews.

## Clips and publication handoff

`propose-clips@1.0.0` produces a plan candidate from the exact script/master timing. Review actual audio and whether each idea stands alone. Mark pickups as needed rather than extracting a misleading fragment. `extract-clips@1.0.0` accepts one to six unique operator-confirmed intervals of 15–35 seconds. Every derived clip has its own rights/technical/creative reviews.

`generate-captions@1.0.0` prepares platform-specific Spanish copy from the approved script; the operator may also supply reviewed copy directly. Enqueue `prepare-publication-package@1.0.0` with the exact master/clip version, platform, account reference, caption/hashtags, disclosure, optional schedule and rights confirmation. Conservative pilot caption limits are configuration choices, not claims about every platform's current limit. Check current platform rules before the trial.

Approve the exact package for publication. Export the package, move the production to `LISTO` after the media gates, and record `schedule` before `PROGRAMADO`. These local records do not create a remote scheduled post. At the explicitly authorized trial, the operator uploads through the intended account, verifies preview/visibility/disclosure, then records the remote receipt. `PUBLICADO` requires receipts for all scheduled records; `MEDIDO` requires snapshots for each one. Repeating a publication key returns the original record; a conflicting receipt is rejected.

Commercial offers must remain unexpired and be confirmed on publication day, using UTC in the local adapter. Do not use a future confirmation. Changes or refreshed confirmations create a new script version and require new reviews of its media/package lineage. Previously published records and snapshots remain available as historical evidence.

## Presenter bridge

On the same operator-controlled machine, fixed local routes are available for the skills:

- `POST /presenter/adapt`: `artifact` and creative `changes`.
- `POST /presenter/approve-creative`: `artifact`, decision and notes; never factual/commercial approval.
- `POST /presenter/request-shooting-plan`: production, approved `script` reference, artifact ID and idempotency key.
- `POST /presenter/ingest`: production, original path accessible to the bridge, and declared rights evidence.
- `GET /presenter/documents/{artifactId}/{version}`: Word document, with readable Spanish scene directions.

Skills call the bridge internally and deliver Spanish explanations and Word links. They never give the presenter terminal instructions or technical output. The worker processes requests only when the operator runs it or explicitly enables the imported n8n workflow. A route selecting a presenter role is not identity verification or cross-machine file access.

Operator mutations use `POST /operations/<registered-command>`; `/worker/tick` accepts only an empty object. `GET /health` reports local simulation and disabled live publishing. There is no arbitrary command/prompt endpoint. Backups/restores are CLI-only. Browser-origin calls and unapproved hosts are rejected, but these checks do not replace authentication.

## Reliability and preservation

Jobs use persistent request hashes, idempotency keys, owner-bound expiring tokens, heartbeats, bounded retries/backoff and dead-letter status. A stale worker cannot complete a newer lease. Immutable parent references ensure an approved replacement script/plan/master version invalidates dependent preparation approvals. Definition fingerprints reject unreviewed drift; source-tree review still supplies trust.

Back up before irreplaceable material enters the pilot, and copy the verified backup to separately managed storage. This implementation creates a local consistent snapshot; it does not provision off-device backups, cloud versioning or a retention policy. Restore refuses nonempty targets and mismatched hashes. See the runbooks for safe recovery.

## Trial boundary

Component/contract tests and synthetic media checks are safe local verification. The complete production trial has not been run. Resume using `docs/e2e-readiness.md`: select a case, provide its real source/rights/commercial information and account destination, approve the trial, then follow the supervised flow through a manually confirmed publication. AWS and unattended/API publishing remain separately gated.
