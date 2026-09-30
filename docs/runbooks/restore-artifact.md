# Restore artifact

## Symptoms

State or registered media is lost/corrupt, or the wrong candidate was produced.

## Diagnosis

For a content correction, load its exact version and parents; for data loss, verify backup.json, original storage root and all state/media hashes. Stop writers/workers first.

## Safe action

Content corrections create a new reviewed version. Disaster recovery uses the restore command only into the empty original storage root, after preserving current damaged data elsewhere. Retain n8n_data independently; never use Docker down -v as routine cleanup.

The operations backup covers operation state and registered media. The canonical inventory adapter is a separate file (`OPS_INVENTORY_FILE`, normally `.local/inventory/inventory.json`): stop its single writer, preserve an independent hash-verified copy and restore it to its configured path before resuming factual checks. Keep both backups outside tracked repository content. Existing script evidence snapshots preserve old evidence but do not replace current canonical inventory.

## Preserve

Damaged state, originals, backup manifests, canonical inventory, approvals, remote receipts and n8n volume.

## Closure

Hash-verified state/media are restored, audit lineage remains intact and expired jobs recover without duplicate artifacts.
