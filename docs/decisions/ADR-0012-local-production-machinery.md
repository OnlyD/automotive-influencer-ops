# ADR-0012: Build the supervised local production path before external accounts

- Status: Accepted for local implementation
- Date: 2026-09-30

## Context

The operator authorized completing the machinery needed for promotional and voice-over pilots, stopping before the full production trial and external account setup. Sections 39.4 and 47 allow a controlled local simulation and manual publishing during the pilot. AWS deployment, presenter identity, retention and the publishing provider remain pending.

## Decision

- Implement local productions, immutable artifact versions, exact-version approvals, leased jobs, retries, audit events and metric snapshots in `services/api`.
- Store runtime state under ignored `.local/operations/`, with serialized writers, atomic durable replacement and explicit backup/restore. Keep a replaceable store boundary. This is an operator-controlled local pilot adapter, not always-available production storage.
- Keep role routing separate from authentication. Local operator and presenter routes have fixed responsibilities, run on loopback/private Compose networking and do not authenticate a person. Independent presenter access requires the separately approved cloud/identity increment.
- Require a canonical inventory vehicle in the CLI/server and bind selected candidate values, units and source references to human-reviewed inventory facts before factual approval. Changed fact/source hashes invalidate reuse.
- Preserve normalized production-script contracts and source-linked research evidence when the operator imports validated drafts. Registration does not verify facts or approve a script.
- A revision creates a candidate version. It supersedes the old official version only after its required human approvals. All dependent gates must be reviewed again. A metadata hash cannot prove factual equivalence of paraphrased narration; changed factual/commercial wording requires human review.
- Require registered workflow definition fingerprints. Changes to manifests, prompts or schemas must update the reviewed fingerprint file and pass repository review. This detects local definition drift; it is not a security boundary against somebody who controls the source tree.

## Consequences

Local pilots can be prepared without AWS or social credentials. The operator must preserve and back up ignored state and recordings. AWS persistence, authenticated assignments, signed uploads and availability while the operator machine is off remain increment F; this ADR does not replace that architecture or authorize deployment.
