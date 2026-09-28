import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { parse } from "yaml";
import { fileURLToPath } from "node:url";
import { executeRegisteredWorkflow, getRegisteredWorkflow, loadWorkflowRegistry, parseRunnerCliArguments, runWorkflowCli } from "../src/index.js";
import { createPresenterDocumentModel, renderPresenterDocumentDocx } from "../src/presenter-document.js";

const workflowRoot = resolve(fileURLToPath(new URL("../../../workflows/ai", import.meta.url)));
const registry = await loadWorkflowRegistry(workflowRoot);

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

test("registers only approved versioned workflows and rejects unknown versions", () => {
  assert.deepEqual([...registry.keys()].sort(), [
    "draft-presenter-script@1.1.0",
    "draft-promotional-script@1.2.0",
    "draft-vehicle-script@1.0.0",
    "research-vehicle@1.0.0",
    "validate-vehicle-data@1.0.0",
  ]);
  assert.throws(() => getRegisteredWorkflow(registry, "research-vehicle", "2.0.0"), /not registered/);
  assert.throws(() => getRegisteredWorkflow(registry, "run-shell", "1.0.0"), /not registered/);
});

test("CLI accepts only a registered workflow reference and one input path", async () => {
  assert.deepEqual(parseRunnerCliArguments(["draft-vehicle-script@1.0.0", "--input", "brief.yaml"]), {
    workflowId: "draft-vehicle-script", workflowVersion: "1.0.0", role: "technical-operator", inputPath: "brief.yaml", format: "json",
  });
  assert.equal(parseRunnerCliArguments(["draft-presenter-script@1.1.0", "--input", "brief.yaml", "--role", "presenter"]).role, "presenter");
  assert.deepEqual(parseRunnerCliArguments(["draft-promotional-script@1.2.0", "--input", "brief.json", "--role", "presenter", "--format", "word", "--output", ".local/drafts/script.docx"]), {
    workflowId: "draft-promotional-script", workflowVersion: "1.2.0", role: "presenter", inputPath: "brief.json", format: "word", outputPath: ".local/drafts/script.docx",
  });
  assert.throws(() => parseRunnerCliArguments(["draft-vehicle-script@latest", "--input", "brief.yaml"]), /Usage/);
  assert.throws(() => parseRunnerCliArguments(["draft-vehicle-script@1.0.0", "--input", "brief.yaml", "--output", "x"]), /--output is supported only with --format word/);
  assert.throws(() => parseRunnerCliArguments(["draft-vehicle-script@1.0.0", "--input", "brief.yaml", "--format", "word", "--output", "x.docx"]), /only for presenter/);
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
  for (const workflowId of ["research-vehicle", "validate-vehicle-data", "draft-vehicle-script"]) {
    const workflow = getRegisteredWorkflow(registry, workflowId, "1.0.0");
    const input = parse(await readFile(resolve(workflow.directory, "input.template.yaml"), "utf8")) as unknown;
    const output = await readJson(resolve(workflow.directory, "examples/fictional-output.json"));
    assert.equal(workflow.validateInput(input), true, `${workflowId} input template should validate`);
    assert.equal(workflow.validateOutput(output), true, `${workflowId} fictional output should validate`);
    assert.ok(workflow.prompt.length > 0, `${workflowId} prompt should not be empty`);
    await readFile(resolve(workflow.directory, "output.template.md"), "utf8");
  }
  const promotional = getRegisteredWorkflow(registry, "draft-promotional-script", "1.2.0");
  const promotionalTemplate = parse(await readFile(resolve(promotional.directory, "input.template.yaml"), "utf8")) as unknown;
  assert.equal(promotional.validateInput(promotionalTemplate), true);
  const presenter = getRegisteredWorkflow(registry, "draft-presenter-script", "1.1.0");
  const presenterInput = parse(await readFile(resolve(presenter.directory, "input.template.yaml"), "utf8")) as unknown;
  const presenterOutput = await readJson(resolve(presenter.directory, "examples/fictional-output.json"));
  assert.equal(presenter.validateInput(presenterInput), true);
  assert.equal(presenter.validateOutput(presenterOutput), true);
  await readFile(resolve(presenter.directory, "output.template.md"), "utf8");
  const promotionalInput = await readJson(resolve(promotional.directory, "examples/fictional-input.json"));
  const promotionalOutput = await readJson(resolve(promotional.directory, "examples/fictional-output.json"));
  assert.equal(promotional.validateInput(promotionalInput), true);
  assert.equal(promotional.validateOutput(promotionalOutput), true);
  await readFile(resolve(promotional.directory, "output.template.md"), "utf8");
});

test("promotional draft exposes missing offer details and requires explicit validity copy", async () => {
  const input = await readJson(resolve(workflowRoot, "draft-promotional-script/examples/fictional-input.json"));
  const output = await readJson(resolve(workflowRoot, "draft-promotional-script/examples/fictional-output.json"));
  const result = await executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.2.0", role: "presenter", input }, async () => output);
  assert.deepEqual(result, output);
  const generic = structuredClone(output) as { script: { scenes: Array<{ type: string; used_vehicle_fact_refs: string[]; source_refs: string[] }> } };
  const vehicleScene = generic.script.scenes.find((scene) => scene.type === "detail")!;
  vehicleScene.used_vehicle_fact_refs = [];
  vehicleScene.source_refs = [];
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.2.0", role: "presenter", input }, async () => generic), /must use at least 2 source-linked vehicle research facts/);
  const tooDetailed = structuredClone(output) as { script: { scenes: Array<{ type: string; used_vehicle_fact_refs: string[] }> } };
  tooDetailed.script.scenes.find((scene) => scene.type === "detail")!.used_vehicle_fact_refs.push("candidate_fixture_004");
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.2.0", role: "presenter", input }, async () => tooDetailed), /no more than three vehicle research facts/);
  const limitedResearchInput = structuredClone(input) as Record<string, any>;
  limitedResearchInput.vehicle_research.candidate_facts = [limitedResearchInput.vehicle_research.candidate_facts[0]];
  const limitedResearchOutput = structuredClone(output) as Record<string, any>;
  const limitedVehicleScene = limitedResearchOutput.script.scenes.find((scene: Record<string, any>) => scene.type === "detail");
  limitedVehicleScene.used_vehicle_fact_refs = ["candidate_fixture_001"];
  limitedVehicleScene.spoken_text = "La ficha ficticia destaca una autonomía de prueba de 75 kilómetros; su exactitud todavía requiere revisión.";
  limitedVehicleScene.on_screen_text = "Autonomía: 75 km";
  limitedResearchOutput.warnings.push("La investigación contiene menos de dos datos utilizables.");
  await executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.2.0", role: "presenter", input: limitedResearchInput }, async () => limitedResearchOutput);
  const limitedModel = createPresenterDocumentModel("draft-promotional-script", limitedResearchInput, limitedResearchOutput);
  assert.match(limitedModel.placeholderNote ?? "", /menos de dos datos utilizables/);
  const missingValidity = structuredClone(output) as { script: { scenes: Array<{ id: string; type: string; spoken_text: string; on_screen_text: string | null }> }; placeholders: string[] };
  const closing = missingValidity.script.scenes.find((scene) => scene.type === "closing")!;
  closing.spoken_text = "Envíanos un mensaje para conocer más.";
  closing.on_screen_text = "Escríbenos hoy.";
  missingValidity.placeholders = missingValidity.placeholders.filter((field) => field !== "VALIDITY");
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.2.0", role: "presenter", input }, async () => missingValidity), /spoken and on-screen validity placeholder/);
  const missingPromo = structuredClone(output) as { script: { scenes: Array<{ type: string; spoken_text: string }> } };
  missingPromo.script.scenes.find((scene) => scene.type === "promotion")!.spoken_text = "Tenemos opciones para ti.";
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.2.0", role: "presenter", input }, async () => missingPromo), /in-script placeholder/);
  let executorCalls = 0;
  const unconfirmed = structuredClone(input) as { offer_context: { status: string; confirmed_by: string | null } };
  unconfirmed.offer_context.status = "CONFIRMED";
  unconfirmed.offer_context.confirmed_by = null;
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.2.0", role: "presenter", input: unconfirmed }, async () => {
    executorCalls += 1;
    return output;
  }), /Invalid workflow input/);
  assert.equal(executorCalls, 0, "invalid confirmed offer metadata must be rejected before model execution");
});

test("presenter-provided offer values are usable while only missing fields receive placeholders", async () => {
  const workflow = getRegisteredWorkflow(registry, "draft-promotional-script", "1.2.0");
  const input = await readJson(resolve(workflow.directory, "examples/fictional-input.json")) as Record<string, any>;
  input.offer_context.status = "PRESENTER_PROVIDED";
  input.offer_context.financing_text = "$1,000 down and 5% APR";
  const output = await readJson(resolve(workflow.directory, "examples/fictional-output.json")) as Record<string, any>;
  const promotion = output.script.scenes.find((scene: Record<string, any>) => scene.type === "promotion");
  promotion.spoken_text = "Para Honda usados certificados, hay una opción con $1,000 de enganche y 5% APR. El precio es [PRECIO POR CONFIRMAR], la promoción es [PROMOCIÓN POR CONFIRMAR] y la disponibilidad queda [DISPONIBILIDAD POR CONFIRMAR]. Las condiciones de crédito son [CONDICIONES DE CRÉDITO POR CONFIRMAR].";
  promotion.used_offer_fields = ["financing_text"];
  output.placeholders = ["PRICE", "PROMOTION", "AVAILABILITY", "ELIGIBILITY", "VALIDITY"];
  const result = await executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.2.0", role: "presenter", input }, async () => output);
  assert.deepEqual(result, output);
  const withUnneededMarker = structuredClone(output) as Record<string, any>;
  withUnneededMarker.script.scenes.find((scene: Record<string, any>) => scene.type === "promotion").spoken_text += " [FINANCIAMIENTO POR CONFIRMAR]";
  withUnneededMarker.placeholders.push("FINANCING");
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-promotional-script", workflowVersion: "1.2.0", role: "presenter", input }, async () => withUnneededMarker), /unneeded placeholder/);
});

test("presenter document renderer creates a Spanish four-column Word draft without technical labels", async () => {
  const workflow = getRegisteredWorkflow(registry, "draft-promotional-script", "1.2.0");
  const input = await readJson(resolve(workflow.directory, "examples/fictional-input.json"));
  const output = await readJson(resolve(workflow.directory, "examples/fictional-output.json"));
  const model = createPresenterDocumentModel("draft-promotional-script", input, output);
  assert.deepEqual(model.scenes.map((scene) => scene.label), ["Una opción para empezar", "Tres detalles del vehículo", "Oferta y alternativas", "Siguiente paso"]);
  assert.match(model.scenes[1]!.narration, /75 kilómetros/);
  assert.match(model.scenes[1]!.narration, /400 litros/);
  assert.equal(model.sources[0]?.title, "Fictional manufacturer vehicle specifications");
  assert.match(model.scenes[2]!.narration, /\[PROMOCIÓN POR CONFIRMAR\]/);
  assert.doesNotMatch(model.notice, /JSON|schema|workflow/);
  const docx = await renderPresenterDocumentDocx(model);
  assert.equal(docx.subarray(0, 2).toString("ascii"), "PK", "Word documents are ZIP-based OOXML files");
  assert.ok(docx.length > 4_000, "rendered Word document should contain the presenter-facing table and content");
});

test("presenter scripts use multiple relevant research facts and keep their source links", async () => {
  const workflow = getRegisteredWorkflow(registry, "draft-presenter-script", "1.1.0");
  const input = await readJson(resolve(workflow.directory, "examples/fictional-input.json"));
  const output = await readJson(resolve(workflow.directory, "examples/fictional-output.json"));
  const result = await executeRegisteredWorkflow(registry, { workflowId: "draft-presenter-script", workflowVersion: "1.1.0", role: "presenter", input }, async () => output);
  assert.deepEqual(result, output);
  const presenterDocument = createPresenterDocumentModel("draft-presenter-script", input, output);
  const detailNarration = presenterDocument.scenes.find((scene) => scene.label === "detail")?.narration ?? "";
  assert.match(detailNarration, /ocho pulgadas/);
  assert.match(detailNarration, /cuatrocientos litros/);
  assert.equal(presenterDocument.sources[0]?.title, "Fictional manufacturer specification page");
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "research-vehicle", workflowVersion: "1.0.0", role: "presenter", input: {} }, async () => ({})), /presenter is not authorized/);
  const unsupported = structuredClone(output) as { script: { blocks: Array<{ source_refs: string[] }> } };
  unsupported.script.blocks[1]!.source_refs = [];
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-presenter-script", workflowVersion: "1.1.0", role: "presenter", input }, async () => unsupported), /candidate fact has no linked source/);
  const generic = structuredClone(output) as { script: { blocks: Array<{ candidate_fact_refs: string[] }> }; candidate_fact_usage: Array<{ candidate_fact_id: string; used_in_blocks: string[] }> };
  generic.script.blocks[1]!.candidate_fact_refs = ["candidate_fixture_001"];
  generic.candidate_fact_usage = [{ candidate_fact_id: "candidate_fixture_001", used_in_blocks: ["detail"] }];
  await assert.rejects(executeRegisteredWorkflow(registry, { workflowId: "draft-presenter-script", workflowVersion: "1.1.0", role: "presenter", input }, async () => generic), /must use at least 2 source-linked research facts/);
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
