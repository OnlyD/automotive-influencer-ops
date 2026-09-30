# Expired lease

## Symptoms

The worker stopped, a lease expired, or writer.lock blocks mutations.

## Diagnosis

Inspect the job lease owner/expiry and writer.lock/owner.json. Confirm the owning process is stopped; age alone is not proof.

## Safe action

Restart the worker; claim handles expired leases with a new owner-bound token. Remove an abandoned writer.lock directory only after proving no writer remains and preserving a store copy. Do not delete the state or job.

## Preserve

State, request hash, media, prior attempts and audit events.

## Closure

A new lease succeeds and stale tokens cannot complete or fail that attempt.
