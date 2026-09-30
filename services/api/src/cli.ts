import { FileInventoryRepository } from "@automotive/inventory";
import { backupStore, restoreStore } from "./backup.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { Operations, artifact } from "./engine.js";
import {
  FileOperationStore,
  type Actor,
  type ApprovalType,
  type Ref,
} from "./store.js";
import type { ProductionState } from "@automotive/domain";
import { presenterDocument } from "./documents.js";
import { importValidatedDraft } from "./draft-import.js";
export function localOperations(
  root = process.env.OPS_STORAGE ??
    resolve(process.env.INIT_CWD ?? process.cwd(), ".local/operations"),
): Operations {
  const commit =
    process.env.OPS_SOURCE_COMMIT ??
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  return new Operations(
    new FileOperationStore(root),
    commit,
    undefined,
    new FileInventoryRepository(
      resolve(
        process.env.OPS_INVENTORY_FILE ??
          join(root, "../inventory/inventory.json"),
      ),
    ),
  );
}
export async function command(
  ops: Operations,
  actor: Actor,
  action: string,
  input: Record<string, any>,
): Promise<unknown> {
  const ref = input.artifact as Ref;
  switch (action) {
    case "backup":
      if (actor.role !== "technical-operator")
        throw new Error("Operator-only backup.");
      return backupStore(ops.store, input.destination);
    case "restore":
      if (actor.role !== "technical-operator")
        throw new Error("Operator-only restore.");
      return restoreStore(ops.store, input.source);
    case "create":
      return ops.create(actor, input as never);
    case "bind-facts":
      return ops.bindFacts(actor, input.artifact);
    case "script":
      return ops.saveScript(
        actor,
        input.productionId,
        input.artifactId,
        input.script,
      );
    case "import-draft":
      return importValidatedDraft(
        ops,
        actor,
        input.productionId,
        input.artifactId,
        input.workflowId,
        input.workflowVersion,
        input.input,
        input.output,
      );
    case "adapt":
      return ops.adapt(actor, ref, input.changes);
    case "approve":
      return ops.approve(
        actor,
        ref,
        input.type as ApprovalType,
        input.decision,
        input.notes,
        input.validUntil ?? null,
      );
    case "transition":
      return ops.transition(
        actor,
        input.productionId,
        input.to as ProductionState,
      );
    case "ingest":
      return ops.ingest(actor, input.productionId, input.path, input.rights);
    case "register-master":
      return ops.registerMaster(
        actor,
        input.productionId,
        input.artifactId,
        input.script,
        input.assetId,
      );
    case "render-plan":
      return ops.saveRenderPlan(
        actor,
        input.productionId,
        input.artifactId,
        input.plan,
      );
    case "enqueue":
      return ops.enqueue(actor, input as never);
    case "retry":
      return ops.retry(actor, input.jobId);
    case "schedule":
      return ops.schedule(actor, ref, input.idempotencyKey);
    case "export-package":
      return ops.exportPackage(actor, ref);
    case "record-publication":
      return ops.recordPublication(actor, input.publicationId, input.receipt);
    case "metrics":
      return ops.metrics(actor, input as never);
    default:
      throw new Error("Unknown registered operation.");
  }
}
export async function runCli(args: string[]): Promise<void> {
  if (args[0] === "--") args = args.slice(1);
  if (!args.length || ["--help", "help"].includes(args[0])) {
    console.log(
      "Usage: pnpm operations -- <command> [--input file.json] [--storage directory] [--role technical-operator|presenter] [--actor declared-name]\n" +
        "Commands: create, script, import-draft, bind-facts, adapt, approve, transition, ingest, register-master, render-plan, enqueue, retry, schedule, export-package, record-publication, metrics, status, audit, document, work-once, backup, restore.\n" +
        "Runtime state and media are local and ignored. See docs/local-production.md for versioned inputs and approval gates.",
    );
    return;
  }
  const [action, ...remaining] = args,
    flags = new Map<string, string>();
  for (let i = 0; i < remaining.length; i += 2) {
    const key = remaining[i],
      value = remaining[i + 1];
    if (
      !["--input", "--storage", "--role", "--actor"].includes(key) ||
      !value ||
      flags.has(key)
    )
      throw new Error("Invalid or repeated operation option.");
    flags.set(key, value);
  }
  const base = process.env.INIT_CWD ?? process.cwd(),
    storage = resolve(
      base,
      flags.get("--storage") ?? process.env.OPS_STORAGE ?? ".local/operations",
    );
  const ops = localOperations(storage),
    role = flags.get("--role") ?? "technical-operator";
  if (!["presenter", "technical-operator"].includes(role))
    throw new Error("Unsupported local role.");
  const actor: Actor = {
    role: role as Actor["role"],
    name: flags.get("--actor") ?? role,
  };
  if (action === "status") {
    const s = await ops.store.read();
    console.log(
      JSON.stringify(
        {
          productions: s.productions,
          jobs: s.jobs.map((j) => ({
            jobId: j.jobId,
            status: j.status,
            workflowId: j.workflowId,
            attempt: j.attempt,
            error: j.error,
          })),
          artifacts: s.artifacts.map((a) => ({
            artifactId: a.artifactId,
            version: a.version,
            kind: a.kind,
            status: a.status,
            hash: a.hash,
          })),
          publications: s.publications,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (action === "work-once") {
    if (actor.role !== "technical-operator")
      throw new Error("Operator-only worker control.");
    console.log(JSON.stringify(await ops.cycle()));
    return;
  }
  const path = flags.get("--input");
  if (!path) throw new Error("Supply --input with a versioned JSON command.");
  const input = JSON.parse(await readFile(resolve(base, path), "utf8"));
  if (action === "document") {
    const a = artifact(await ops.store.read(), input.artifact);
    const directory = join(storage, "documents");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const target = join(directory, `${a.artifactId}-${a.version}.docx`);
    await writeFile(target, await presenterDocument(a));
    console.log(target);
    return;
  }
  if (action === "audit") {
    if (actor.role !== "technical-operator")
      throw new Error("Operator-only audit.");
    const s = await ops.store.read();
    console.log(
      JSON.stringify(
        s.events.filter((e) => e.productionId === input.productionId),
        null,
        2,
      ),
    );
    return;
  }
  console.log(
    JSON.stringify(await command(ops, actor, action, input), null, 2),
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Operation failed",
      }),
    );
    process.exitCode = 1;
  });
