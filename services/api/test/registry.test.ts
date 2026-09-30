import assert from "node:assert/strict";
import { readFile, mkdtemp, cp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { assertWorkflowIntegrity } from "@automotive/ai-runner";
import { validateDeterministicWorkflow } from "../src/registry.js";
import { assertContract } from "@automotive/contracts";
const root = fileURLToPath(new URL("../../../workflows/", import.meta.url));
test("all deterministic examples and human input templates validate against the reviewed registry", async () => {
  const { parse } = await import("yaml");
  for (const id of [
    "create-shooting-plan",
    "render-video",
    "extract-clips",
    "prepare-publication-package",
  ]) {
    const dir = join(root, "deterministic", id);
    const input = JSON.parse(
      await readFile(join(dir, "examples/fictional-input.json"), "utf8"),
    );
    const output = JSON.parse(
      await readFile(join(dir, "examples/fictional-output.json"), "utf8"),
    );
    await validateDeterministicWorkflow(id, input, output);
    await validateDeterministicWorkflow(
      id,
      parse(await readFile(join(dir, "input.template.yaml"), "utf8")),
    );
    await assert.rejects(
      validateDeterministicWorkflow(id, { ...input, command: "never" }),
      /input/,
    );
  }
});
test("changing a workflow definition breaks its reviewed fingerprint", async () => {
  const temp = await mkdtemp(join(tmpdir(), "workflow-lock-"));
  try {
    await cp(root, temp, { recursive: true });
    const dir = join(temp, "ai", "adapt-presenter-script");
    await assertWorkflowIntegrity(dir, temp);
    await writeFile(join(dir, "prompt.md"), "Changed without review");
    await assert.rejects(assertWorkflowIntegrity(dir, temp), /fingerprint/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
test("the operator's fictional canonical script and render-plan templates satisfy contracts", async () => {
  const dir = fileURLToPath(
    new URL("../../../templates/production/", import.meta.url),
  );
  assertContract(
    "productionScript",
    JSON.parse(await readFile(join(dir, "fictional-script.json"), "utf8"))
      .script,
  );
  assertContract(
    "renderPlan",
    JSON.parse(await readFile(join(dir, "fictional-render-plan.json"), "utf8"))
      .plan,
  );
});
