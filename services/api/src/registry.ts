import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { Ajv } from "ajv";
import { parse } from "yaml";
import { assertWorkflowIntegrity } from "@automotive/ai-runner";
const require = createRequire(import.meta.url),
  addFormats = require("ajv-formats") as typeof import("ajv-formats").default;
function workflowRoot(): string {
  let dir = process.cwd();
  while (true) {
    const candidate = resolve(dir, "workflows");
    if (existsSync(resolve(candidate, "approved-workflows.json")))
      return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Reviewed workflows cannot be found.");
    dir = parent;
  }
}
export async function validateDeterministicWorkflow(
  id: string,
  input: unknown,
  output?: unknown,
): Promise<void> {
  if (
    ![
      "create-shooting-plan",
      "render-video",
      "extract-clips",
      "prepare-publication-package",
    ].includes(id)
  )
    throw new Error("Unregistered deterministic workflow.");
  const root = workflowRoot(),
    directory = resolve(root, "deterministic", id);
  await assertWorkflowIntegrity(directory, root);
  const manifest = parse(
    await readFile(resolve(directory, "manifest.yaml"), "utf8"),
  );
  if (
    manifest.id !== id ||
    manifest.version !== "1.0.0" ||
    manifest.type !== "deterministic" ||
    manifest.allows_freeform_prompt !== false
  )
    throw new Error("Deterministic manifest is not approved.");
  const ajv = new Ajv({ strict: true, allErrors: true });
  addFormats(ajv);
  for (const [name, value] of [
    ["input", input],
    ...(output === undefined ? [] : [["output", output]]),
  ] as Array<[string, unknown]>) {
    const validate = ajv.compile(
      JSON.parse(
        await readFile(resolve(directory, `${name}.schema.json`), "utf8"),
      ),
    );
    if (!validate(value))
      throw new Error(
        `Invalid deterministic workflow ${name}: ${ajv.errorsText(validate.errors)}`,
      );
  }
}
