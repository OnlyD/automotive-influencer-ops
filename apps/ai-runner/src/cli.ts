import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "yaml";
import { createCodexExecutor, CodexExecutionError } from "./execute-codex.js";
import { executeRegisteredWorkflow } from "./runner.js";
import { getRegisteredWorkflow, loadWorkflowRegistry } from "./workflow-registry.js";
import { createPresenterDocumentModel, renderPresenterDocumentDocx } from "./presenter-document.js";

export interface RunnerCliArguments {
  workflowId: string;
  workflowVersion: string;
  role: "presenter" | "technical-operator";
  inputPath: string;
  format: "json" | "word";
  outputPath?: string;
}

export function parseRunnerCliArguments(args: string[]): RunnerCliArguments {
  const [workflowRef, ...options] = args;
  if (!workflowRef || !/^[a-z][a-z0-9-]*@[0-9]+\.[0-9]+\.[0-9]+$/.test(workflowRef)) {
    throw new Error("Usage: ai-runner <registered-workflow>@<version> --input <file.json|file.yaml>");
  }
  let role: RunnerCliArguments["role"] = "technical-operator";
  let inputPath: string | undefined;
  let format: RunnerCliArguments["format"] = "json";
  let formatProvided = false;
  let outputPath: string | undefined;
  let roleProvided = false;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const value = options[index + 1];
    if (!value || value.startsWith("--")) throw new Error("Each runner option requires a value.");
    if (option === "--input" && !inputPath) inputPath = value;
    else if (option === "--role" && !roleProvided && (value === "presenter" || value === "technical-operator")) {
      role = value;
      roleProvided = true;
    }
    else if (option === "--format" && !formatProvided && (value === "json" || value === "word")) {
      format = value;
      formatProvided = true;
    }
    else if (option === "--output" && !outputPath) outputPath = value;
    else throw new Error("Only one --input path and one optional --role are supported.");
    index += 1;
  }
  if (!inputPath) throw new Error("Usage: ai-runner <registered-workflow>@<version> --input <file.json|file.yaml> [--role presenter|technical-operator] [--format json|word --output <file.docx>]");
  if (format === "word" && (!outputPath || !outputPath.toLowerCase().endsWith(".docx"))) throw new Error("Word format requires --output <file.docx>.");
  if (format === "word" && !["draft-promotional-script", "draft-presenter-script"].includes(workflowRef.slice(0, workflowRef.lastIndexOf("@")))) throw new Error("Word format is available only for presenter script workflows.");
  if (format === "json" && outputPath) throw new Error("--output is supported only with --format word.");
  const separator = workflowRef.lastIndexOf("@");
  return {
    workflowId: workflowRef.slice(0, separator),
    workflowVersion: workflowRef.slice(separator + 1),
    role,
    inputPath,
    format,
    ...(outputPath ? { outputPath } : {}),
  };
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
  const output = await executeRegisteredWorkflow(registry, {
    workflowId: request.workflowId,
    workflowVersion: request.workflowVersion,
    role: request.role,
    input,
  }, createCodexExecutor({ codexHome }));
  if (request.format === "word") {
    const outputPath = resolve(environment.INIT_CWD ?? process.cwd(), request.outputPath!);
    const model = createPresenterDocumentModel(request.workflowId, input, output);
    await mkdir(resolve(outputPath, ".."), { recursive: true });
    await writeFile(outputPath, await renderPresenterDocumentDocx(model));
    return { format: "word", outputPath };
  }
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runWorkflowCli(process.argv.slice(2)).then((output) => {
    if (output && typeof output === "object" && "format" in output && output.format === "word" && "outputPath" in output) {
      process.stdout.write(`Documento Word listo: ${String(output.outputPath)}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    }
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Workflow execution failed.";
    const code = error instanceof CodexExecutionError ? error.code : "WORKFLOW_FAILED";
    const wordOutputRequested = process.argv.includes("word");
    process.stderr.write(wordOutputRequested ? `No se pudo preparar el documento Word. ${message}\n` : `${code}: ${message}\n`);
    process.exitCode = 1;
  });
}
