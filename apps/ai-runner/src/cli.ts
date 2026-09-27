import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "yaml";
import { createCodexExecutor, CodexExecutionError } from "./execute-codex.js";
import { executeRegisteredWorkflow } from "./runner.js";
import { getRegisteredWorkflow, loadWorkflowRegistry } from "./workflow-registry.js";

export interface RunnerCliArguments {
  workflowId: string;
  workflowVersion: string;
  inputPath: string;
}

export function parseRunnerCliArguments(args: string[]): RunnerCliArguments {
  const [workflowRef, ...options] = args;
  if (!workflowRef || !/^[a-z][a-z0-9-]*@[0-9]+\.[0-9]+\.[0-9]+$/.test(workflowRef)) {
    throw new Error("Usage: ai-runner <registered-workflow>@<version> --input <file.json|file.yaml>");
  }
  if (options.length !== 2 || options[0] !== "--input" || !options[1] || options[1].startsWith("--")) {
    throw new Error("Only one --input file option is supported.");
  }
  const separator = workflowRef.lastIndexOf("@");
  return { workflowId: workflowRef.slice(0, separator), workflowVersion: workflowRef.slice(separator + 1), inputPath: options[1] };
}

export async function runWorkflowCli(args: string[], environment: NodeJS.ProcessEnv = process.env): Promise<unknown> {
  const request = parseRunnerCliArguments(args);
  const registry = await loadWorkflowRegistry();
  getRegisteredWorkflow(registry, request.workflowId, request.workflowVersion);
  const inputPath = resolve(environment.INIT_CWD ?? process.cwd(), request.inputPath);
  const content = await readFile(inputPath, "utf8");
  const extension = inputPath.toLowerCase().split(".").at(-1);
  if (extension !== "json" && extension !== "yaml" && extension !== "yml") throw new Error("Input files must use .json, .yaml, or .yml.");
  const input: unknown = extension === "json" ? JSON.parse(content) as unknown : parse(content) as unknown;
  const codexHome = environment.AUTOMOTIVE_CODEX_HOME;
  if (!codexHome || !isAbsolute(codexHome)) {
    throw new CodexExecutionError("INVALID_CONFIGURATION", "Set AUTOMOTIVE_CODEX_HOME to an absolute, dedicated Codex home before live execution.");
  }
  return executeRegisteredWorkflow(registry, {
    workflowId: request.workflowId,
    workflowVersion: request.workflowVersion,
    input,
  }, createCodexExecutor({ codexHome }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runWorkflowCli(process.argv.slice(2)).then((output) => {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Workflow execution failed.";
    const code = error instanceof CodexExecutionError ? error.code : "WORKFLOW_FAILED";
    process.stderr.write(`${JSON.stringify({ error: { code, message } })}\n`);
    process.exitCode = 1;
  });
}
