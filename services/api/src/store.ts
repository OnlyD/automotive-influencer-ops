import { assertContract } from "@automotive/contracts";
import { mkdir, readFile, rename, rm, writeFile, open } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { MediaAsset } from "@automotive/media";
import type { ProductionState } from "@automotive/domain";
import type { VideoMode, Platform } from "@automotive/contracts";

export type {
  Actor,
  Artifact,
  ArtifactKind,
  Approval,
  ApprovalType,
  Ref,
  Production,
  Job,
  Publication,
  MetricSnapshot,
} from "@automotive/contracts";
import type {
  Actor,
  Artifact,
  Approval,
  Production,
  Job,
  Publication,
  MetricSnapshot,
} from "@automotive/contracts";
export interface LocalState {
  schemaVersion: "1.0.0";
  productions: Production[];
  artifacts: Artifact[];
  approvals: Approval[];
  assets: Array<
    MediaAsset & { productionId: string; createdBy: Actor; createdAt: string }
  >;
  jobs: Job[];
  publications: Publication[];
  metrics: MetricSnapshot[];
  events: Array<{
    id: string;
    at: string;
    type: string;
    actor: Actor;
    productionId: string;
    details: Record<string, unknown>;
  }>;
}
export class FileOperationStore {
  readonly root: string;
  constructor(root: string) {
    this.root = resolve(root);
  }
  async read(): Promise<LocalState> {
    try {
      const state = JSON.parse(
        await readFile(join(this.root, "state.json"), "utf8"),
      ) as LocalState;
      if (state.schemaVersion !== "1.0.0")
        throw new Error("Unsupported local state version.");
      return state;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return {
        schemaVersion: "1.0.0",
        productions: [],
        artifacts: [],
        approvals: [],
        assets: [],
        jobs: [],
        publications: [],
        metrics: [],
        events: [],
      };
    }
  }
  async transaction<T>(
    update: (state: LocalState) => T | Promise<T>,
  ): Promise<T> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const lock = join(this.root, "writer.lock"),
      deadline = Date.now() + 10000;
    while (true) {
      try {
        await mkdir(lock);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        if (Date.now() > deadline)
          throw new Error(
            "Operational storage is locked. Inspect writer.lock; follow expired-lease runbook.",
          );
        await new Promise((accept) => setTimeout(accept, 25));
      }
    }
    const temporary = join(this.root, `state-${randomUUID()}.tmp`);
    try {
      await writeFile(
        join(lock, "owner.json"),
        JSON.stringify({
          pid: process.pid,
          createdAt: new Date().toISOString(),
        }),
      );
      const state = await this.read();
      const result = await update(state);
      for (const [contract, records] of [
        ["production", state.productions],
        ["artifactVersion", state.artifacts],
        ["approval", state.approvals],
        ["job", state.jobs],
        ["publication", state.publications],
        ["metricSnapshot", state.metrics],
      ] as const)
        for (const value of records) assertContract(contract, value);
      for (const {
        productionId: _productionId,
        createdBy: _createdBy,
        createdAt: _createdAt,
        ...value
      } of state.assets)
        assertContract("mediaAsset", value);
      const handle = await open(temporary, "wx", 0o600);
      try {
        await handle.writeFile(JSON.stringify(state, null, 2) + "\n");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, join(this.root, "state.json"));
      if (process.platform !== "win32") {
        const directory = await open(this.root, "r");
        try {
          await directory.sync();
        } finally {
          await directory.close();
        }
      }
      return result;
    } finally {
      await rm(temporary, { force: true });
      await rm(lock, { recursive: true, force: true });
    }
  }
}
