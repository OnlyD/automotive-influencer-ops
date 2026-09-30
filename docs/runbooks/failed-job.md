# Failed job

## Symptoms

A job is in RETRY_PENDING or DEAD_LETTER.

## Diagnosis

Inspect status, typed error, request hash, workflow version and the production audit.

## Safe action

Correct the missing approval, input/media or runtime issue. Replay only the same reviewed request with the operator retry command; a changed input needs a new idempotency key.

## Preserve

Input, earlier attempts, partial outputs, artifacts and approval records.

## Closure

One validated result exists and no second official artifact was created by an expired worker.
