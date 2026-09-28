import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv, type ValidateFunction } from "ajv";
import { parse } from "yaml";

const require = createRequire(import.meta.url);
const addFormats = require("ajv-formats") as typeof import("ajv-formats").default;

function findWorkflowRoot(): string {
  let directory = process.cwd();
  while (true) {
    const candidate = resolve(directory, "workflows/ai");
    if (existsSync(resolve(candidate, "research-vehicle/manifest.yaml"))) return candidate;
    const parent = resolve(directory, "..");
    if (parent === directory) break;
    directory = parent;
  }
  const sourceRelative = resolve(dirname(fileURLToPath(import.meta.url)), "../../../workflows/ai");
  throw new Error(`Cannot locate registered workflows from ${sourceRelative}.`);
}

export interface WorkflowManifest {
  id: string;
  version: string;
  owner: "technical-operator";
  allowed_roles: Array<"presenter" | "technical-operator">;
  input_schema: "input.schema.json";
  output_schema: "output.schema.json";
  requires_human_approval: true;
  allows_freeform_prompt: false;
  editable_fields: string[];
  locked_fields: string[];
  execution: { initial: "main"; revisions: "main" };
  delegation: { allowed: boolean; only_when: string[]; maximum_subagents: number };
}

export interface RegisteredWorkflow {
  manifest: WorkflowManifest;
  directory: string;
  prompt: string;
  validateInput: ValidateFunction;
  validateOutput: ValidateFunction;
}

const approvedWorkflows = [
  { id: "research-vehicle", version: "1.0.0" },
  { id: "validate-vehicle-data", version: "1.0.0" },
  { id: "draft-vehicle-script", version: "1.0.0" },
  { id: "draft-presenter-script", version: "1.1.0" },
  { id: "draft-promotional-script", version: "1.2.0" },
] as const;

function isManifest(value: unknown, expectedId: string, expectedVersion: string): value is WorkflowManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<WorkflowManifest>;
  return manifest.id === expectedId
    && manifest.version === expectedVersion
    && manifest.owner === "technical-operator"
    && Array.isArray(manifest.allowed_roles)
    && manifest.allowed_roles.length > 0
    && manifest.allowed_roles.every((role) => role === "presenter" || role === "technical-operator")
    && manifest.input_schema === "input.schema.json"
    && manifest.output_schema === "output.schema.json"
    && manifest.requires_human_approval === true
    && manifest.allows_freeform_prompt === false
    && Array.isArray(manifest.editable_fields)
    && Array.isArray(manifest.locked_fields)
    && manifest.execution?.initial === "main"
    && manifest.execution?.revisions === "main"
    && typeof manifest.delegation?.allowed === "boolean"
    && Array.isArray(manifest.delegation.only_when)
    && Number.isInteger(manifest.delegation.maximum_subagents);
}

export async function loadWorkflowRegistry(workflowRoot = findWorkflowRoot()): Promise<Map<string, RegisteredWorkflow>> {
  const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajv);
  const registry = new Map<string, RegisteredWorkflow>();

  for (const approved of approvedWorkflows) {
    const directory = resolve(workflowRoot, approved.id);
    const manifest = parse(await readFile(resolve(directory, "manifest.yaml"), "utf8")) as unknown;
    if (!isManifest(manifest, approved.id, approved.version)) {
      throw new Error(`Workflow manifest is not approved: ${approved.id}@${approved.version}`);
    }
    const [inputSchemaText, outputSchemaText, prompt] = await Promise.all([
      readFile(resolve(directory, "input.schema.json"), "utf8"),
      readFile(resolve(directory, "output.schema.json"), "utf8"),
      readFile(resolve(directory, "prompt.md"), "utf8"),
    ]);
    registry.set(`${manifest.id}@${manifest.version}`, {
      manifest,
      directory,
      prompt,
      validateInput: ajv.compile(JSON.parse(inputSchemaText)),
      validateOutput: ajv.compile(JSON.parse(outputSchemaText)),
    });
  }

  return registry;
}

export function getRegisteredWorkflow(registry: Map<string, RegisteredWorkflow>, id: string, version: string): RegisteredWorkflow {
  const workflow = registry.get(`${id}@${version}`);
  if (!workflow) throw new Error(`Workflow is not registered: ${id}@${version}`);
  return workflow;
}
