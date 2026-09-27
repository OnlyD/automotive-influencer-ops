import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FileImportPreviewStore, applyImportPreview, createImportPreview, saveImportReport } from "./importer.js";
import { FileInventoryRepository } from "./repository.js";

function parseArguments(args: string[]): { mode: string; options: Map<string, string> } {
  if (args[0] === "--") args = args.slice(1);
  const [mode, ...rest] = args;
  if (!mode) throw new Error("Usage: inventory <preview|apply|list|facts> [options]");
  const options = new Map<string, string>();
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument '${key}'.`);
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Option '${key}' requires a value.`);
    if (options.has(key)) throw new Error(`Option '${key}' cannot be repeated.`);
    options.set(key, value);
    index += 1;
  }
  return { mode, options };
}

function required(options: Map<string, string>, key: string): string {
  const value = options.get(key);
  if (!value) throw new Error(`Missing required option '${key}'.`);
  return value;
}

function assertAllowed(options: Map<string, string>, allowed: string[]): void {
  const unsupported = [...options.keys()].filter((key) => !allowed.includes(key));
  if (unsupported.length > 0) throw new Error(`Unsupported option '${unsupported[0]}'.`);
}

async function run(): Promise<void> {
  const { mode, options } = parseArguments(process.argv.slice(2));
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const resolveFromRoot = (path: string): string => resolve(repositoryRoot, path);
  const stateDirectory = resolveFromRoot(options.get("--state-dir") ?? ".local/inventory");
  const repository = new FileInventoryRepository(resolve(stateDirectory, "inventory.json"));
  const previewStore = new FileImportPreviewStore(resolve(stateDirectory, "previews"));
  const reportsDirectory = resolve(stateDirectory, "reports");

  if (mode === "preview") {
    assertAllowed(options, ["--file", "--state-dir"]);
    const file = resolveFromRoot(required(options, "--file"));
    const csvContent = await readFile(file, "utf8");
    const preview = await createImportPreview({ csvContent, sourcePath: file, repository, previewStore });
    const errorReportPath = await saveImportReport(preview.report, reportsDirectory);
    console.log(JSON.stringify({ ...preview.report, errorReportPath }, null, 2));
    return;
  }

  if (mode === "apply") {
    assertAllowed(options, ["--file", "--preview-id", "--preview-hash", "--state-dir"]);
    const file = resolveFromRoot(required(options, "--file"));
    const report = await applyImportPreview({
      importId: required(options, "--preview-id"),
      approvedPreviewHash: required(options, "--preview-hash"),
      csvContent: await readFile(file, "utf8"),
      sourcePath: file,
      repository,
      previewStore,
    });
    const errorReportPath = await saveImportReport(report, reportsDirectory);
    console.log(JSON.stringify({ ...report, errorReportPath }, null, 2));
    return;
  }

  if (mode === "list") {
    assertAllowed(options, ["--year", "--make", "--model", "--trim", "--condition", "--status", "--state-dir"]);
    const yearValue = options.get("--year");
    const year = yearValue === undefined ? undefined : Number(yearValue);
    if (yearValue !== undefined && !Number.isInteger(year)) throw new Error("--year must be an integer.");
    const condition = options.get("--condition")?.toUpperCase();
    const status = options.get("--status")?.toUpperCase();
    if (condition && !["NEW", "USED", "CERTIFIED_PRE_OWNED", "UNKNOWN"].includes(condition)) throw new Error("Unsupported --condition value.");
    if (status && !["AVAILABLE", "RESERVED", "SOLD", "UNAVAILABLE", "UNKNOWN"].includes(status)) throw new Error("Unsupported --status value.");
    const vehicles = await repository.listVehicles({
      year,
      make: options.get("--make"),
      model: options.get("--model"),
      trim: options.get("--trim"),
      condition: condition as never,
      status: status as never,
    });
    console.log(JSON.stringify(vehicles.map(({ vin: _vin, ...vehicle }) => vehicle), null, 2));
    return;
  }

  if (mode === "facts") {
    assertAllowed(options, ["--vehicle-id", "--state-dir"]);
    const vehicleId = required(options, "--vehicle-id");
    const facts = await repository.listVerifiedFacts(vehicleId);
    const sources = await repository.listSources([...new Set(facts.flatMap((fact) => fact.sourceIds))]);
    console.log(JSON.stringify({ vehicleId, facts, sources }, null, 2));
    return;
  }

  throw new Error(`Unknown command '${mode}'.`);
}

run().catch((error: unknown) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
