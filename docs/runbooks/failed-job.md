# Failed job

## Symptoms

A job is in RETRY_PENDING or DEAD_LETTER.

## Diagnosis

Inspect status, typed error, request hash, workflow version and the production audit.

## Safe action

Correct the missing approval, input/media or runtime issue. Replay only the same reviewed request with the operator retry command; a changed input needs a new idempotency key.

Replay uses a fresh lease-specific output directory. Keep incomplete prior attempts for diagnosis; remove orphan temporary directories only after confirming no active lease uses them and the successful registered output is backed up. Polling is serialized within one worker instance, not across separately started processes.

## Preserve

Input, earlier attempts, partial outputs, artifacts and approval records.

## Closure

One validated result exists and no second official artifact was created by an expired worker.
