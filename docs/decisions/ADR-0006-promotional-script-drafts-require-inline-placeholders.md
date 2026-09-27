# ADR-0006: Keep promotional claims explicit and reviewable

- Status: Accepted
- Date: 2026-09-27

## Context

Promotional videos need same-day dealership terms such as price, availability, incentives, financing, credit eligibility, and offer validity. These details may be unknown while a draft is being prepared. Blocking all drafting until the dealership confirms every term would prevent early preparation, while omitting missing terms could make a draft appear complete or invite unsupported claims. Detailed vehicle research and promotional terms also have separate owners and lifecycles.

## Decision

- Use a separate `draft-promotional-script@1.0.0` workflow and `generar-guion-promocional` presenter skill.
- Do not search for, confirm, or infer commercial terms in this workflow.
- Put a visible Spanish placeholder directly in the spoken promotional copy for each missing or unconfirmed offer field.
- Always provide an explicit validity disclosure. Use `[VIGENCIA POR CONFIRMAR]` unless an exact end date is confirmed and sourced.
- Use confirmed offer values only when confirmation metadata and source references are present; preserve exact amounts, dates, and conditions.
- Require commercial review and keep every generated draft non-publishable. The presenter skill does not persist offer data or drafts.

## Consequences

The presenter can prepare the script structure before same-day terms are available, then fill the visible markers after operator confirmation. A placeholder is not an authorization to record or publish. Any prompt behavior change requires a new workflow version and updated fixtures/tests.
