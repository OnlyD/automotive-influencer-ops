# ADR-0001: Preserve the existing repository identity

- Status: Accepted
- Date: 2026-09-27

## Context

The specification uses `automotive-content-ops` as its logical project name. The open repository is named `automotive-influencer-ops` and has an existing `origin` remote.

## Decision

Keep the existing repository name and remote. The logical name describes the system; it does not authorize renaming the repository.

## Consequences

Documents and tooling must refer to the existing repository. Do not rename it or change `origin` as part of the bootstrap.
