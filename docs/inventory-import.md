# Local inventory import

The inventory record schemas are versioned `1.0.0`. The first CSV mapping is `inventory_csv@1.0.1` in `data/mappings/inventory_csv-1.0.1.json`. It accepts the required columns `source_system`, `source_record_id`, `year`, `make`, `model`, `trim`, `market`, `condition`, and `status`; optional commercial columns are `price_amount`, `currency`, `promotion_text`, and `financing_text`. Unknown columns are ignored. VIN and buyer/customer/owner contact columns are rejected.

`source_system` and `source_record_id` form the stable inventory key. When a row already exists, changing `year`, `make`, `model`, `trim`, or `market` under that key is rejected for operator review so facts cannot silently move between vehicle variants. A missing trim on an existing row retains its current value; a new row uses `UNKNOWN`.

Run `pnpm inventory -- preview --file <csv-path>` from the repository root. Preview writes a local review snapshot and report under `.local/inventory/`, but does not change inventory state. Review the counts and row errors, then explicitly apply with the returned ID and hash:

```sh
pnpm inventory -- apply \
  --file <same-csv-path> \
  --preview-id <import-id> \
  --preview-hash <preview-hash>
```

Apply refuses a changed source file, changed inventory snapshot, mapping version, unknown or already-applied preview, or mismatched approval hash. Valid rows in a mixed preview may be applied while rejected rows remain in the report. Duplicate keys within one CSV reject later occurrences. Commercial details from CSV create `UNCONFIRMED` offers; they never establish commercial confirmation. Changed offers are retained as stale history.

The current JSON repository is for a single local operator process and fictional testing. Do not use it for real inventory until concurrency, backups, access controls, retention, and the SQLite migration decision are addressed. The tracked Honda fixture contains only synthetic rows; the presenter's later model photos have not been added or treated as inventory records.
