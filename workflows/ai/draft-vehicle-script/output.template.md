# Vehicle script draft

- Workflow: `draft-vehicle-script@1.0.0`
- Production: `prd_example`
- Script: title, target duration, ordered blocks with timing, Spanish spoken text, optional on-screen text, shot intent, fact references, and clip candidacy.
- Fact usage: list each referenced verified fact and the blocks using it.
- Source notes: map cited source IDs to concise description-ready references.
- Commercial claims: enumerate only claims explicitly approved and enabled in the input.
- Approval: `approval_required` must remain `true`; the draft is not publishable.

The output must validate against `output.schema.json` and pass runner cross-reference checks.
