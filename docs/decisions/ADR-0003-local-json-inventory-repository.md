# ADR-0003: Use a replaceable JSON file repository for the first local inventory increment

- Status: Accepted
- Date: 2026-09-27

## Context

Section 28 calls for a locally runnable persistence adapter, with SQLite or an equivalent, while preserving the domain contract for later migration. The available runtime is Node.js 20, which does not provide the stable built-in SQLite API used by newer Node releases. Native SQLite packages would add compilation requirements to this initial bootstrap.

## Decision

Use a JSON-backed local repository behind the `InventoryRepository` interface for the first verifiable increment. Store runtime state and preview snapshots under the ignored `.local/inventory/` directory. Keep schemas and domain types independent of this adapter so it can be replaced by SQLite or a remote repository later.

## Consequences

- The adapter is suitable for one local operator process and fictional/local testing, not concurrent production writers.
- Preview/apply uses a snapshot hash and atomic file replacement to prevent applying against a changed snapshot in the ordinary single-process workflow.
- No local inventory state is tracked in Git.
- Evaluate SQLite before real inventory use or concurrent operation; this decision does not select AWS storage or authorize storing real data.
