import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { FileInventoryRepository, snapshotHash } from "@automotive/inventory";
import type { Vehicle, VehicleFact, Source } from "@automotive/contracts";
import { Operations } from "../src/engine.js";
import { context, fixture, operator, presenter } from "./helpers.js";
const vehicle: Vehicle = {
  vehicleId: "veh_fixture",
  inventoryKey: "fixture:stock",
  vin: null,
  year: 2025,
  make: "Honda",
  model: "Fictional model",
  trim: "Fictional trim",
  market: "US",
  condition: "NEW",
  status: "AVAILABLE",
  sourceSystem: "fixture",
  sourceRecordId: "stock",
  createdAt: "2026-09-27T00:00:00Z",
  updatedAt: "2026-09-27T00:00:00Z",
};
const source: Source = {
  sourceId: "src_fixture",
  type: "TEST_FIXTURE",
  title: "Fictional source",
  publisher: "Fixture",
  url: "https://example.invalid/fixture",
  retrievedAt: "2026-09-27T00:00:00Z",
  publishedAt: null,
  contentHash: null,
  archiveLocation: null,
  reliabilityTier: 5,
  locale: "es-US",
};
const fact: VehicleFact = {
  vehicleFactId: "fact_fixture",
  vehicleId: "veh_fixture",
  field: "fixture.attribute",
  value: "Fictional attribute only",
  unit: null,
  scope: "MODEL_TRIM",
  verificationStatus: "VERIFIED",
  sourceIds: ["src_fixture"],
  verifiedAt: "2026-09-27T00:00:00Z",
  verifiedBy: "fixture_operator",
  validUntil: null,
  notes: null,
};
test("configured operation service requires canonical vehicles and current human-reviewed facts", async () => {
  const c = await context();
  try {
    const inventory = new FileInventoryRepository(
      join(c.root, "inventory.json"),
    );
    await inventory.applyImport(
      snapshotHash(await inventory.readSnapshot()),
      [vehicle],
      [],
      [],
    );
    const ops = new Operations(
      c.ops.store,
      c.ops.sourceCommit,
      c.ops.clock,
      inventory,
    );
    await assert.rejects(
      ops.create(operator, {
        vehicleId: "veh_unknown",
        title: "Missing",
        mode: "VOICE_OVER",
        targetPlatforms: ["TIKTOK"],
      }),
      /canonical inventory vehicle/,
    );
    const production = await ops.create(operator, {
      productionId: "prd_bound",
      vehicleId: vehicle.vehicleId,
      title: "Bound",
      mode: "VOICE_OVER",
      targetPlatforms: ["TIKTOK"],
    });
    assert.equal(production.vehicleIdentity!.model, vehicle.model);
    const script = structuredClone(fixture);
    script.facts[0].canonicalValue = fact.value;
    script.facts[0].canonicalUnit = null;
    const a = await ops.saveScript(
      operator,
      "prd_fixture",
      "script_fixture",
      script,
    );
    await assert.rejects(
      ops.approve(operator, a, "FACTUAL", "APPROVED", "Review"),
      /canonical fact/,
    );
    await inventory.upsertReferenceData([source], [fact]);
    await assert.rejects(
      ops.approve(operator, a, "FACTUAL", "APPROVED", "Review"),
      /Bind current/,
    );
    const bound = await ops.bindFacts(operator, a);
    assert.equal(bound.version, 2);
    await ops.approve(
      operator,
      bound,
      "FACTUAL",
      "APPROVED",
      "Exact canonical evidence reviewed",
    );
    await ops.approve(
      presenter,
      bound,
      "CREATIVE",
      "APPROVED",
      "Narration reviewed",
    );
    const candidate = await ops.saveScript(
      operator,
      "prd_fixture",
      "script_fixture",
      script,
    );
    assert.equal(candidate.version, 3);
    await ops.transition(operator, "prd_fixture", "INVESTIGANDO");
    const reviewed = await ops.transition(
      operator,
      "prd_fixture",
      "DATOS_VERIFICADOS",
    );
    assert.equal(reviewed.state, "DATOS_VERIFICADOS");
    await inventory.upsertReferenceData(
      [{ ...source, contentHash: "sha256:" + "1".repeat(64) }],
      [fact],
    );
    await ops.enqueue(operator, {
      workflowId: "create-shooting-plan",
      workflowVersion: "1.0.0",
      productionId: "prd_fixture",
      idempotencyKey: "stale_source",
      input: {
        script: { artifactId: bound.artifactId, version: bound.version },
        artifactId: "shoot_fixture",
      },
    });
    await assert.rejects(ops.cycle(), /Bind current/);
    await inventory.upsertReferenceData(
      [source],
      [{ ...fact, value: "Changed official value" }],
    );
    await assert.rejects(
      ops.bindFacts(operator, bound),
      /differs from verified inventory/,
    );
    assert.equal((await ops.store.read()).artifacts.length, 3);
  } finally {
    await c.cleanup();
  }
});
