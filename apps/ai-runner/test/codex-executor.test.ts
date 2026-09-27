import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { CodexExecutionError, createCodexExecutor } from "../src/execute-codex.js";
import { executeRegisteredWorkflow, loadWorkflowRegistry } from "../src/index.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const outputPath = resolve(repositoryRoot, "workflows/ai/draft-vehicle-script/examples/fictional-output.json");

test("Codex executor uses a temporary read-only, ephemeral JSON run and cleans its workspace", async () => {
  const codexHome = await mkdtemp(join(tmpdir(), "codex-home-fixture-"));
  const fakeBinary = join(codexHome, "fake-codex");
  const recordedPath = join(codexHome, "recorded.json");
  const output = await readFile(outputPath, "utf8");
  const script = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
const prompt = fs.readFileSync(0, 'utf8');
fs.writeFileSync(path.join(process.env.CODEX_HOME, 'recorded.json'), JSON.stringify({ args, prompt, envKeys: Object.keys(process.env).sort() }));
fs.accessSync(option('--output-schema'));
fs.writeFileSync(option('--output-last-message'), ${JSON.stringify(output)});
process.stdout.write(JSON.stringify({ type: 'turn.completed' }) + '\\n');
`;
  await writeFile(fakeBinary, script, { mode: 0o700 });
  await chmod(fakeBinary, 0o700);
  const previousSecret = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only-sentinel";
  const eventTypes: string[] = [];
  try {
    const registry = await loadWorkflowRegistry(resolve(repositoryRoot, "workflows/ai"));
    const input = JSON.parse(await readFile(resolve(repositoryRoot, "workflows/ai/draft-vehicle-script/examples/fictional-input.json"), "utf8")) as unknown;
    const executor = createCodexExecutor({ codexHome, codexBinary: fakeBinary, onEventType: (type) => eventTypes.push(type) });
    const result = await executeRegisteredWorkflow(registry, { workflowId: "draft-vehicle-script", workflowVersion: "1.0.0", input }, executor);
    assert.deepEqual(result, JSON.parse(output));
    assert.deepEqual(eventTypes, ["turn.completed"]);
    const recorded = JSON.parse(await readFile(recordedPath, "utf8")) as { args: string[]; prompt: string; envKeys: string[] };
    assert.ok(recorded.args.includes("--json"));
    assert.ok(recorded.args.includes("--ephemeral"));
    assert.ok(recorded.args.includes("read-only"));
    assert.ok(recorded.args.includes("--ignore-user-config"));
    assert.ok(recorded.args.includes("--skip-git-repo-check"));
    assert.equal(recorded.args.at(-1), "-");
    assert.match(recorded.prompt, /UNTRUSTED_INPUT/);
    assert.ok(!recorded.envKeys.includes("OPENAI_API_KEY"));
    const workspace = recorded.args[recorded.args.indexOf("--cd") + 1];
    await assert.rejects(stat(workspace), { code: "ENOENT" });
  } finally {
    if (previousSecret === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousSecret;
    await rm(codexHome, { recursive: true, force: true });
  }
});

test("Codex executor refuses non-dedicated relative homes and overlong prompts", async () => {
  assert.throws(() => createCodexExecutor({ codexHome: ".codex" }), (error) => error instanceof CodexExecutionError && error.code === "INVALID_CONFIGURATION");
  const codexHome = await mkdtemp(join(tmpdir(), "codex-home-fixture-"));
  try {
    const executor = createCodexExecutor({ codexHome });
    await assert.rejects(executor({
      workflowId: "research-vehicle",
      workflowVersion: "1.0.0",
      prompt: "x".repeat(256 * 1024),
      input: {},
      outputSchemaPath: outputPath,
    }), (error) => error instanceof CodexExecutionError && error.code === "PROMPT_TOO_LARGE");
  } finally {
    await rm(codexHome, { recursive: true, force: true });
  }
});

test("Codex executor reports typed process failures and removes failed run workspaces", async () => {
  const codexHome = await mkdtemp(join(tmpdir(), "codex-home-fixture-"));
  const fakeBinary = join(codexHome, "failing-codex");
  const recordedPath = join(codexHome, "failed-run.json");
  await writeFile(fakeBinary, `#!/usr/bin/env node
const fs = require('node:fs');
fs.writeFileSync(process.env.CODEX_HOME + '/failed-run.json', JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }));
process.exit(7);
`, { mode: 0o700 });
  await chmod(fakeBinary, 0o700);
  try {
    const executor = createCodexExecutor({ codexHome, codexBinary: fakeBinary });
    await assert.rejects(executor({
      workflowId: "draft-vehicle-script",
      workflowVersion: "1.0.0",
      prompt: "Fictional failure case.",
      input: {},
      outputSchemaPath: resolve(repositoryRoot, "workflows/ai/draft-vehicle-script/output.schema.json"),
    }), (error) => error instanceof CodexExecutionError && error.code === "PROCESS_FAILED");
    const recorded = JSON.parse(await readFile(recordedPath, "utf8")) as { cwd: string };
    await assert.rejects(stat(recorded.cwd), { code: "ENOENT" });
  } finally {
    await rm(codexHome, { recursive: true, force: true });
  }
});
