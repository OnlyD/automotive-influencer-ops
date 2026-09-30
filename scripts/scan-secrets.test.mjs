import assert from "node:assert/strict";
import test from "node:test";
import { secretFindings } from "./scan-secrets.mjs";
test("known credential patterns are detected without echoing credential values", () => {
  const candidates = [
    "AK" + "IA" + "A".repeat(16),
    "gh" + "p_" + "a".repeat(36),
    "sk-" + "proj-" + "a".repeat(40),
    "-----BEGIN " + "PRIVATE KEY-----",
  ];
  for (const candidate of candidates) {
    const findings = secretFindings("Example\n" + candidate);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].line, 2);
    assert.ok(!JSON.stringify(findings).includes(candidate));
  }
});
test("documented placeholders and variable references are not credentials", () => {
  assert.deepEqual(
    secretFindings(
      "OPS_SOURCE_COMMIT=\nprocess.env.API_KEY\nfixture_only\n<token>",
    ),
    [],
  );
});
