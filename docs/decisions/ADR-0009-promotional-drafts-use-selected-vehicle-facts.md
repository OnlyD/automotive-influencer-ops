# ADR-0009: Promotional drafts use selected vehicle research facts

- Status: Accepted
- Date: 2026-09-27

## Context

A promotional script can have incomplete same-day dealer terms and still be useful, but generic copy alone does not make the unit attractive. Research may contain many specifications; including all of them would make a promotional script sound like a product sheet and distract from the offer.

## Decision

- Update `draft-promotional-script` to version `1.2.0` and require a separate source-linked vehicle research bundle in its input.
- Keep research facts separate from same-day commercial terms. The promotional workflow consumes research but does not research or verify vehicle claims.
- Select two or three attractive vehicle facts that fit the intended audience and promotional angle. Do not summarize the full research bundle.
- Keep each selected fact candidate-linked and source-linked. If fewer than two useful facts are available, use what is supported and warn that the research is limited.
- Keep commercial terms independently governed by their status, placeholders, validity disclosure, and commercial review gate.

## Consequences

Promotional scripts can combine a few specific vehicle highlights with current offer terms without exposing the full research packet. The operator must provide a research bundle for the exact unit; missing commercial offer details remain draftable placeholders.

## Alternatives considered

- Include the full research bundle: rejected because it creates a technical spec sheet instead of promotional copy.
- Use generic vehicle claims without research: rejected because it can omit useful unit-specific differentiators or invite unsupported claims.
- Conduct vehicle research inside the promotional skill: rejected because it mixes the research and promotional responsibilities.
