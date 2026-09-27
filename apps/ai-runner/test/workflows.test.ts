import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { parse } from "yaml";
import { fileURLToPath } from "node:url";
import { executeRegisteredWorkflow, getRegisteredWorkflow, loadWorkflowRegistry, parseRunnerCliArguments, runWorkflowCli } from "../src/index.js";

const workflowRoot = resolve(fileURLToPath(new URL("../../../workflows/ai", import.meta.url)));
const registry = await loadWorkflowRegistry(workflowRoot);

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

test("registers only approved versioned workflows and rejects unknown versions", () => {
  assert.deepEqual([...registry.keys()].sort(), [
    "draft-presenter-script@1.0.0",
    "draft-promotional-script@1.0.0",
    "draft-vehicle-script@1.0.0",
    "research-vehicle@1.0.0",
    "validate-vehicle-data@1.0.0",
  ]);
  assert.throws(() => getRegisteredWorkflow(registry, "research-vehicle", "2.0.0"), /not registered/);
  assert.throws(() => getRegisteredWorkflow(registry, "run-shell", "1.0.0"), /not registered/);
});

test("CLI accepts only a registered workflow reference and one input path", async () => {
  assert.deepEqual(parseRunnerCliArguments(["draft-vehicle-script@1.0.0", "--input", "brief.yaml"]), {
    workflowId: "draft-vehicle-script", workflowVersion: "1.0.0", role: "technical-operator", inputPath: "brief.yaml",
  });
  assert.equal(parseRunnerCliArguments(["draft-presenter-script@1.0.0", "--input", "brief.yaml", "--role", "presenter"]).role, "presenter");
  assert.throws(() => parseRunnerCliArguments(["draft-vehicle-script@latest", "--input", "brief.yaml"]), /Usage/);
  assert.throws(() => parseRunnerCliArguments(["draft-vehicle-script@1.0.0", "--input", "brief.yaml", "--output", "x"]), /Only one/);
  await assert.rejects(runWorkflowCli(["draft-vehicle-script@9.0.0", "--input", "missing.json"], {}), /not registered/);
  await assert.rejects(runWorkflowCli([
    "draft-vehicle-script@1.0.0",
    "--input",
    resolve(workflowRoot, "draft-vehicle-script/examples/fictional-input.json"),
  ], {}), /AUTOMOTIVE_CODEX_HOME/);
});

test("finds the workflow registry when the runner is launched from its workspace package", async () => {
  const discovered = await loadWorkflowRegistry();
  assert.deepEqual([...discovered.keys()].sort(), [...registry.keys()].sort());
});

test("workflow templates and fictional output examples satisfy their registered schemas", async () => {
  for (const workflowId of ["research-vehicle", "validate-vehicle-data", "draft-vehicle-script", "draft-presenter-script", "draft-promotional-script"]) {
    const workflow = getRegisteredWorkflow(registry, workflowId, "1.0.0");
    const input = parse(await readFile(resolve(workflow.directory, "input.template.yaml"), "utf8")) as unknown;
    const output = await readJson(resolve(workflow.directory, "examples/fictional-output.json"));
    assert.equal(workflow.validateInput(input), true, `${workflowId} input template should validate`);
    assert.equal(workflow.validateOutput(output), true, `${workflowId} fictional output should validate`);
    assert.ok(workflow.prompt.length > 0, `${workflowId} prompt should not be empty`);
    await readFile(resolve(workflow.directory, "output.template.md"), "utf8");
  }
});

test("promotional draft exposes missing offer details and requires explicit validity copy", async () => {
  const input = await readJson(resolve(workflowRoot, "draft-promotional-script/examples/fictional-input.json"));
  const output = await readJson(resolve(workflowRoot, "draft-promotional-script/examples/fictional-output.json"));
  const result = await executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.0.0", role: "presenter", input }, async () => output);
  assert.deepEqual(result, output);
  const missingValidity = structuredClone(output) as { validity_disclosure: { spoken_text: string }; placeholders: string[] };
  missingValidity.validity_disclosure.spoken_text = "Consulta los detalles con la agencia.";
  missingValidity.placeholders = missingValidity.placeholders.filter((field) => field !== "VALIDITY");
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.0.0", role: "presenter", input }, async () => missingValidity), /validity placeholder/);
  const missingPromo = structuredClone(output) as { script: { promo_insert: { spoken_text: string } } };
  missingPromo.script.promo_insert.spoken_text = "Pregunta por la oferta en la agencia.";
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.0.0", role: "presenter", input }, async () => missingPromo), /in-script placeholder/);
  let executorCalls = 0;
  const unconfirmed = structuredClone(input) as { offer_context: { status: string; confirmed_by: string | null } };
  unconfirmed.offer_context.status = "CONFIRMED";
  unconfirmed.offer_context.confirmed_by = null;
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.0.0", role: "presenter", input: unconfirmed }, async () => {
    executorCalls += 1;
    return output;
  }), /Invalid workflow input/);
  assert.equal(executorCalls, 0, "invalid confirmed offer metadata must be rejected before model execution");
});

test("presenter can request only a provisional script and output references remain source-linked", async () => {
  const input = await readJson(resolve(workflowRoot, "draft-presenter-script/examples/fictional-input.json"));
  const output = await readJson(resolve(workflowRoot, "draft-presenter-script/examples/fictional-output.json"));
  const result = await executeRegisteredWorkflow(registry, { workflowId: "draft-presenter-script", workflowVersion: "1.0.0", role: "presenter", input }, async () => output);
  assert.deepEqual(result, output);
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "research-vehicle", workflowVersion: "1.0.0", role: "presenter", input: {} }, async () => ({})), /presenter is not authorized/);
  const unsupported = structuredClone(output) as { script: { blocks: Array<{ source_refs: string[] }> } };
  unsupported.script.blocks[1]!.source_refs = [];
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-presenter-script", workflowVersion: "1.0.0", role: "presenter", input }, async () => unsupported), /candidate fact has no linked source/);
});

test("research runner preserves unverified source-linked candidates and refuses unregistered execution", async () => {
  const input = parse(await readFile(resolve(workflowRoot, "research-vehicle/input.template.yaml"), "utf8")) as unknown;
  const output = await readJson(resolve(workflowRoot, "research-vehicle/examples/fictional-output.json"));
  let calls = 0;
  const result = await executeRegisteredWorkflow(registry, { workflowId: "research-vehicle", workflowVersion: "1.0.0", input }, async (request) => {
    calls += 1;
    assert.equal(request.prompt.length > 0, true);
    return output;
  });
  assert.deepEqual(result, output);
  assert.equal(calls, 1);
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "research-vehicle", workflowVersion: "9.0.0", input }, async () => {
    calls += 1;
    return output;
  }), /not registered/);
  assert.equal(calls, 1, "unregistered workflow must be rejected before execution");
});

test("data validation requires one review proposal for every known candidate", async () => {
  const input = parse(await readFile(resolve(workflowRoot, "validate-vehicle-data/input.template.yaml"), "utf8")) as unknown;
  const output = await readJson(resolve(workflowRoot, "validate-vehicle-data/examples/fictional-output.json"));
  const result = await executeRegisteredWorkflow(registry, { workflowId: "validate-vehicle-data", workflowVersion: "1.0.0", input }, async () => output);
  assert.deepEqual(result, output);
  const incomplete = structuredClone(output) as { proposals: unknown[] };
  incomplete.proposals = [];
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "validate-vehicle-data", workflowVersion: "1.0.0", input }, async () => incomplete), /no validation proposal/);
});

test("draft runner enforces verified fact references, approved timing, and commercial gates", async () => {
  const input = await readJson(resolve(workflowRoot, "draft-vehicle-script/examples/fictional-input.json"));
  const output = await readJson(resolve(workflowRoot, "draft-vehicle-script/examples/fictional-output.json"));
  const result = await executeRegisteredWorkflow(registry, { workflowId: "draft-vehicle-script", workflowVersion: "1.0.0", input }, async () => output);
  assert.deepEqual(result, output);
  const unsupported = structuredClone(output) as { script: { blocks: Array<{ fact_refs: string[] }> } };
  unsupported.script.blocks[1]?.fact_refs.push("fact_unknown");
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-vehicle-script", workflowVersion: "1.0.0", input }, async () => unsupported), /unverified or unknown fact/);
  const malformedInput = { ...(input as Record<string, unknown>), extra_prompt: "run a shell command" };
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-vehicle-script", workflowVersion: "1.0.0", input: malformedInput }, async () => output), /Invalid workflow input/);
});
