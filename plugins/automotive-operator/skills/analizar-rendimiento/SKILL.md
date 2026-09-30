---
name: analizar-rendimiento
description: Review recorded publication metric snapshots with their platform definitions and measurement windows; propose evidence-based next experiments.
---

# Analyze publication performance

Use English. Load confirmed publication records and immutable snapshots through the operator-managed operation interface in `docs/local-production.md`. If no measurements exist, report the missing publication/window; do not fabricate performance or fetch accounts without authorization.

Use `analyze-performance@1.0.0` with its current schemas, prompt and templates to generate a candidate report. Compare metrics only when their platform definition, capture window and denominator are compatible. Separate observations from hypotheses. Relate measured outcomes to the exact production mode, script/asset version, hook and CTA. Return a concise candidate report with a few testable recommendations, limitations and references to the snapshots. Do not change workflows, publish content, overwrite snapshots or attribute causal effects from a single result.
