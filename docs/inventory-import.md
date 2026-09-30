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


## Human-reviewed canonical reference data

The operator may prepare an ignored review file containing `requestedRole: technical-operator`, `requestedBy` (declared reviewer), full versioned `Source` records and `VehicleFact` records. Only human-reviewed facts use VERIFIED, attributed to that reviewer with an actual past verification time and nonexpired validity. Sources must correspond to the exact model/year/trim/market; schema validity does not establish truth.

```bash
pnpm inventory -- preview-facts --file .local/review/reference-data.json
pnpm inventory -- verify-facts --file .local/review/reference-data.json --approved-hash <reviewHash> --snapshot-hash <snapshotHash>
```

Preview is read-only. Apply requires the exact operator-approved review hash and unchanged canonical inventory snapshot; missing vehicles or sources fail. This inherits ADR-0003's single-operator writer boundary. Do not run concurrent inventory writers.

Imported presenter candidate IDs are normalized from `candidate_*` to `fact_*` for selected script facts. Keep those canonical IDs when preparing the reference review. The normalized script retains each selected value/unit separately from its human-readable label, and the original input/output remains in the internal audit. After verifying references, use the operation `bind-facts` to produce a new script version with hashes over the reviewed facts and sources. Changed values/units or different source URLs require revising the candidate. Factual approval then reviews that exact narration/version.
