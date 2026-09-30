---
name: verificar-datos
description: Review source-backed vehicle facts and apply an exact approved canonical reference review before binding a production script.
---

# Review canonical vehicle facts

Use English and the operator role. Read `docs/inventory-import.md` and `docs/local-production.md`. Locate the exact year/make/model/trim/market and retrieved sources. Treat the AI validation result as a proposal; require the human operator to inspect applicability, quantities, qualifications, contradictions and dates.

Prepare internal `Source` and `VehicleFact` records, marking only human-reviewed facts VERIFIED and preserving who reviewed them. Use `inventory preview-facts`, present its summary, then apply only the operator-approved review hash and unchanged inventory snapshot with `verify-facts`. Do not infer verification from model output, schema validity or a review request.

Bind the exact selected canonical facts to a new script version with `bind-facts`. If a value, unit or source differs, revise the candidate and ask for the factual decision that is actually missing. Factual approval reviews the exact narration and on-screen claims as well as metadata. No account or publication action is included.
