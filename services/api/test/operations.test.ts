import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  context,
  fixture,
  operator,
  presenter,
  worker,
  approveScript,
} from "./helpers.js";
import { artifact } from "../src/engine.js";
import { FileOperationStore } from "../src/store.js";
import { presenterDocument } from "../src/documents.js";
import { createLocalServer } from "../src/server.js";
import { importValidatedDraft } from "../src/draft-import.js";
import { fileURLToPath } from "node:url";
import { runCli } from "../src/cli.js";

test("operator CLI discovers commands and shares the configured server storage", async (t) => {
  const c = await context();
  const previous = process.env.OPS_STORAGE;
  const logs = t.mock.method(console, "log", () => {});
  try {
    process.env.OPS_STORAGE = c.root;
    await runCli(["status"]);
    const status = JSON.parse(logs.mock.calls[0].arguments[0]);
    assert.equal(status.productions[0].productionId, "prd_fixture");
    await runCli(["--", "--help"]);
    assert.match(logs.mock.calls[1].arguments[0], /bind-facts/);
  } finally {
    if (previous === undefined) delete process.env.OPS_STORAGE;
    else process.env.OPS_STORAGE = previous;
    logs.mock.restore();
    await c.cleanup();
  }
});

test("role gates reject presenter technical actions and worker human approvals", async () => {
  const c = await context();
  try {
    await assert.rejects(
      c.ops.create(presenter, {
        vehicleId: "veh_x",
        title: "x",
        mode: "PROMO",
        targetPlatforms: ["TIKTOK"],
      }),
      /operator/,
    );
    await assert.rejects(
      c.ops.saveScript(presenter, "prd_fixture", "script_fixture", fixture),
      /operator/,
    );
    const a = await c.ops.saveScript(
      operator,
      "prd_fixture",
      "script_fixture",
      fixture,
    );
    await assert.rejects(
      c.ops.approve(presenter, a, "FACTUAL", "APPROVED", "x"),
      /operator/,
    );
    await assert.rejects(
      c.ops.approve(worker, a, "CREATIVE", "APPROVED", "x"),
      /human reviewer/,
    );
    await assert.rejects(
      c.ops.transition(presenter, "prd_fixture", "INVESTIGANDO"),
      /operator/,
    );
  } finally {
    await c.cleanup();
  }
});
test("versions preserve parents, facts, sources and explicit author while every revision needs new approvals", async () => {
  const c = await context();
  try {
    const a = await approveScript(c.ops);
    const revised = await c.ops.adapt(presenter, a, [
      { sceneId: "hook", narration: "Nuevo ejemplo ficticio para la prueba." },
    ]);
    assert.equal(revised.artifact.version, 2);
    assert.equal(revised.artifact.parentVersion, 1);
    assert.equal(revised.technicalReviewRequired, true);
    assert.deepEqual(
      (revised.artifact.payload as typeof fixture).facts,
      fixture.facts,
    );
    assert.equal(revised.artifact.createdBy.role, "presenter");
    assert.deepEqual(artifact(await c.ops.store.read(), a).payload, fixture);
    await assert.rejects(
      c.ops.enqueue(presenter, {
        workflowId: "render-video",
        workflowVersion: "1.0.0",
        productionId: "prd_fixture",
        idempotencyKey: "x",
        input: { plan: a, artifactId: "master_fixture" },
      }),
      /operator/,
    );
    assert.equal(artifact(await c.ops.store.read(), a).status, "APPROVED");
    await c.ops.approve(
      operator,
      revised.artifact,
      "FACTUAL",
      "APPROVED",
      "Revised narration reviewed",
    );
    assert.equal(artifact(await c.ops.store.read(), a).status, "APPROVED");
    await c.ops.approve(
      presenter,
      revised.artifact,
      "CREATIVE",
      "APPROVED",
      "Revised creative approved",
    );
    assert.equal(artifact(await c.ops.store.read(), a).status, "SUPERSEDED");
    await c.ops.enqueue(operator, {
      workflowId: "create-shooting-plan",
      workflowVersion: "1.0.0",
      productionId: "prd_fixture",
      idempotencyKey: "shoot",
      input: { script: a, artifactId: "shoot_fixture" },
    });
    await assert.rejects(c.ops.cycle(), /newer artifact/);
    assert.equal((await c.ops.store.read()).jobs[0].status, "DEAD_LETTER");
    await assert.rejects(
      c.ops.adapt(presenter, revised.artifact, [
        { sceneId: "hook", facts: [] } as never,
      ]),
      /creative fields/,
    );
  } finally {
    await c.cleanup();
  }
});
test("script schema and invariants reject unsupported sources, timing, duplicate scenes and missing CTA", async () => {
  const c = await context();
  try {
    for (const mutate of [
      (s: typeof fixture) => {
        s.scenes[0].sourceRefs = [];
      },
      (s: typeof fixture) => {
        s.scenes[1].start = 0.5;
      },
      (s: typeof fixture) => {
        s.scenes[1].id = "hook";
      },
      (s: typeof fixture) => {
        s.scenes[1].narration = "Sin cierre.";
      },
    ]) {
      const bad = structuredClone(fixture);
      mutate(bad);
      await assert.rejects(
        c.ops.saveScript(operator, "prd_fixture", "script_fixture", bad),
      );
    }
    assert.equal((await c.ops.store.read()).artifacts.length, 0);
  } finally {
    await c.cleanup();
  }
});
test("idempotent enqueue rejects altered payloads and concurrent claims return one job", async () => {
  const c = await context();
  try {
    const a = await approveScript(c.ops),
      request = {
        workflowId: "create-shooting-plan" as const,
        workflowVersion: "1.0.0" as const,
        productionId: "prd_fixture",
        idempotencyKey: "same",
        input: { script: a, artifactId: "shoot_fixture" },
      };
    const jobs = await Promise.all([
      c.ops.enqueue(operator, request),
      c.ops.enqueue(operator, request),
    ]);
    assert.equal(jobs[0].jobId, jobs[1].jobId);
    await assert.rejects(
      c.ops.enqueue(operator, {
        ...request,
        input: { script: a, artifactId: "another" },
      }),
      /different inputs/,
    );
    const claims = await Promise.all([
      c.ops.claim("worker_a"),
      c.ops.claim("worker_b"),
    ]);
    assert.equal(claims.filter(Boolean).length, 1);
    await assert.rejects(c.ops.heartbeat(jobs[0].jobId, "invalid"), /Lease/);
  } finally {
    await c.cleanup();
  }
});
test("leases expire across process restarts and stale tokens cannot finish or fail another attempt", async () => {
  const c = await context();
  try {
    const a = await approveScript(c.ops);
    await c.ops.enqueue(operator, {
      workflowId: "create-shooting-plan",
      workflowVersion: "1.0.0",
      productionId: "prd_fixture",
      idempotencyKey: "lease",
      input: { script: a, artifactId: "shoot_fixture" },
    });
    const first = (await c.ops.claim("worker_a", 10))!;
    c.tick(11000);
    const second = (await c.ops.claim("worker_b", 10))!;
    assert.equal(second.attempt, 2);
    assert.notEqual(second.leaseToken, first.leaseToken);
    await assert.rejects(c.ops.executeClaimed(first), /Lease/);
    await assert.rejects(
      c.ops.failJob(first.jobId, first.leaseToken!, "stale"),
      /Lease/,
    );
    await c.ops.executeClaimed(second);
    const restarted = await new FileOperationStore(c.root).read();
    assert.equal(restarted.jobs[0].status, "COMPLETED");
    assert.equal(
      restarted.artifacts.filter((a) => a.kind === "SHOOTING_PLAN").length,
      1,
    );
    const document = await presenterDocument(
      restarted.artifacts.find((a) => a.kind === "SHOOTING_PLAN")!,
    );
    assert.equal(document.subarray(0, 2).toString(), "PK");
    assert.ok(restarted.events.some((e) => e.type === "job.lease_expired"));
  } finally {
    await c.cleanup();
  }
});
test("retry backoff leads to dead-letter and only the operator can explicitly replay", async () => {
  const c = await context();
  try {
    const a = await approveScript(c.ops);
    await c.ops.enqueue(operator, {
      workflowId: "create-shooting-plan",
      workflowVersion: "1.0.0",
      productionId: "prd_fixture",
      idempotencyKey: "failure",
      input: { script: a, artifactId: "shoot_fixture" },
    });
    for (let i = 0; i < 3; i++) {
      const j = (await c.ops.claim("worker_a"))!;
      await c.ops.failJob(j.jobId, j.leaseToken!, "fixture_failure");
      assert.equal(await c.ops.claim("worker_a"), null);
      c.tick(10000);
    }
    const state = await c.ops.store.read();
    assert.equal(state.jobs[0].status, "DEAD_LETTER");
    await assert.rejects(
      c.ops.retry(presenter, state.jobs[0].jobId),
      /operator/,
    );
    await c.ops.retry(operator, state.jobs[0].jobId);
    assert.ok(await c.ops.claim("worker_a"));
  } finally {
    await c.cleanup();
  }
});
test("placeholders and missing factual approval block preparation without advancing state", async () => {
  const c = await context();
  try {
    const script = structuredClone(fixture);
    script.scenes[0].narration = "[DATO POR CONFIRMAR]";
    const a = await approveScript(c.ops, script);
    await c.ops.enqueue(operator, {
      workflowId: "create-shooting-plan",
      workflowVersion: "1.0.0",
      productionId: "prd_fixture",
      idempotencyKey: "placeholder",
      input: { script: a, artifactId: "shoot_fixture" },
    });
    await assert.rejects(c.ops.cycle(), /placeholder/);
    await assert.rejects(
      c.ops.transition(operator, "prd_fixture", "APROBADO"),
      /cannot transition/,
    );
    assert.equal((await c.ops.store.read()).productions[0].state, "BORRADOR");
    const clean = await c.ops.saveScript(
      operator,
      "prd_fixture",
      "script_fixture",
      fixture,
    );
    await c.ops.enqueue(operator, {
      workflowId: "create-shooting-plan",
      workflowVersion: "1.0.0",
      productionId: "prd_fixture",
      idempotencyKey: "unapproved",
      input: {
        script: { artifactId: clean.artifactId, version: clean.version },
        artifactId: "shoot_fixture",
      },
    });
    await assert.rejects(c.ops.cycle(), /factual.*approval/);
  } finally {
    await c.cleanup();
  }
});
test("artifact content tampering and cross-production references are rejected", async () => {
  const c = await context();
  try {
    const a = await approveScript(c.ops);
    await c.ops.create(operator, {
      productionId: "prd_second",
      vehicleId: "veh_second",
      title: "Second",
      mode: "VOICE_OVER",
      targetPlatforms: ["TIKTOK"],
    });
    await c.ops.enqueue(operator, {
      workflowId: "create-shooting-plan",
      workflowVersion: "1.0.0",
      productionId: "prd_second",
      idempotencyKey: "cross",
      input: { script: a, artifactId: "shoot_second" },
    });
    await assert.rejects(c.ops.cycle(), /another production/);
    await c.ops.store.transaction((s) => {
      (s.artifacts[0].payload as typeof fixture).title = "Tampered";
    });
    await assert.rejects(
      c.ops.approve(operator, a, "FACTUAL", "APPROVED", "x"),
      /content has changed/,
    );
  } finally {
    await c.cleanup();
  }
});
test("local API refuses unknown commands, browser origins and invalid request types", async () => {
  const c = await context(),
    server = createLocalServer(c.ops);
  await new Promise<void>((accept) => server.listen(0, "127.0.0.1", accept));
  const address = server.address() as { port: number },
    base = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(base + "/health")).status, 200);
    assert.equal(
      (
        await fetch(base + "/health", {
          headers: { Origin: "https://example.invalid" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/operations/run-shell", {
          method: "POST",
          body: "{}",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(base + "/worker/tick", {
          method: "POST",
          body: JSON.stringify({ command: "bad" }),
        })
      ).status,
      400,
    );
    assert.equal(
      (await fetch(base + "/operations/create", { method: "POST", body: "[]" }))
        .status,
      400,
    );
    assert.equal((await c.ops.store.read()).productions.length, 1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((accept) => server.close(() => accept()));
    await c.cleanup();
  }
});
test("validated draft import retains original workflow evidence and never approves candidates", async () => {
  const c = await context();
  try {
    const root = fileURLToPath(
      new URL(
        "../../../workflows/ai/draft-presenter-script/examples/",
        import.meta.url,
      ),
    );
    const input = JSON.parse(
        await readFile(join(root, "fictional-input.json"), "utf8"),
      ),
      output = JSON.parse(
        await readFile(join(root, "fictional-output.json"), "utf8"),
      );
    input.production_id = output.production_id = "prd_fixture";
    input.vehicle.vehicle_id = "veh_fixture";
    const a = await importValidatedDraft(
      c.ops,
      operator,
      "prd_fixture",
      "script_fixture",
      "draft-presenter-script",
      "1.2.0",
      input,
      output,
    );
    assert.equal(a.kind, "SCRIPT");
    assert.equal((await c.ops.store.read()).approvals.length, 0);
    assert.equal(
      (await c.ops.store.read()).events.at(-1)!.type,
      "draft.validated_import",
    );
    input.vehicle.vehicle_id = "veh_wrong";
    await assert.rejects(
      importValidatedDraft(
        c.ops,
        operator,
        "prd_fixture",
        "other",
        "draft-presenter-script",
        "1.2.0",
        input,
        output,
      ),
      /identity/,
    );
  } finally {
    await c.cleanup();
  }
});

test("presenter bridge routes allow creative work and recording requests without operator grants", async () => {
  const c = await context(),
    script = await approveScript(c.ops),
    server = createLocalServer(c.ops);
  await new Promise<void>((accept) => server.listen(0, "127.0.0.1", accept));
  const address = server.address() as { port: number },
    base = `http://127.0.0.1:${address.port}`;
  try {
    const body = {
      productionId: "prd_fixture",
      script,
      artifactId: "shoot_fixture",
      idempotencyKey: "presenter_shooting",
    };
    const response = await fetch(base + "/presenter/request-shooting-plan", {
      method: "POST",
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 200);
    const j = (await response.json()) as { requestedBy: { role: string } };
    assert.equal(j.requestedBy.role, "presenter");
    await c.ops.cycle();
    const document = await fetch(base + "/presenter/documents/shoot_fixture/1");
    assert.equal(document.status, 200);
    assert.match(document.headers.get("content-type")!, /wordprocessingml/);
    const denial = await fetch(base + "/presenter/approve-factual", {
      method: "POST",
      body: "{}",
    });
    assert.equal(denial.status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((accept) => server.close(() => accept()));
    await c.cleanup();
  }
});

test("backup and restore preserve exact state and reject overwrite or corrupted snapshots", async () => {
  const c = await context(),
    backup = join(c.root, "..", `backup-${c.root.split("/").at(-1)}`);
  const { backupStore, restoreStore } = await import("../src/backup.js");
  const { rm } = await import("node:fs/promises");
  try {
    await approveScript(c.ops);
    await backupStore(c.ops.store, backup);
    await assert.rejects(restoreStore(c.ops.store, backup), /not empty/);
    const original = await readFile(join(c.root, "state.json"), "utf8");
    await rm(c.root, { recursive: true, force: true });
    await restoreStore(c.ops.store, backup);
    assert.equal(await readFile(join(c.root, "state.json"), "utf8"), original);
    await writeFile(join(backup, "state.json"), "tampered");
    await assert.rejects(restoreStore(c.ops.store, backup), /hash mismatch/);
  } finally {
    await rm(backup, { recursive: true, force: true });
    await c.cleanup();
  }
});
