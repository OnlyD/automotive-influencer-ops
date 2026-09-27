import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { Source, VehicleFact } from "@automotive/contracts";
import { applyImportPreview, createImportPreview, FileImportPreviewStore, inventoryCsvMapping } from "../src/importer.js";
import { FileInventoryRepository, snapshotHash } from "../src/repository.js";

const header = "source_system,source_record_id,year,make,model,trim,market,condition,status,price_amount,currency,promotion_text,financing_text";
const oneRow = `${header}\nfixture_only,unit-001,2025,Honda,CR-V,Fictional fixture,US,NEW,UNKNOWN,,,,\n`;
const fixedNow = () => "2026-09-27T12:00:00.000Z";

test("versioned CSV mapping matches the importer's accepted columns and identity rules", async () => {
  const mappingPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../data/mappings/inventory_csv-1.0.1.json");
  const mapping = JSON.parse(await readFile(mappingPath, "utf8")) as Record<string, unknown>;
  assert.equal(mapping.id, inventoryCsvMapping.id);
  assert.equal(mapping.version, inventoryCsvMapping.version);
  assert.deepEqual(mapping.requiredColumns, inventoryCsvMapping.requiredHeaders);
  assert.deepEqual(mapping.optionalColumns, inventoryCsvMapping.optionalHeaders);
  assert.deepEqual(mapping.identityFields, inventoryCsvMapping.identityFields);
  assert.deepEqual(mapping.sensitiveColumns, inventoryCsvMapping.sensitiveHeaders);
  assert.deepEqual(mapping.sensitiveColumnPrefixes, inventoryCsvMapping.sensitiveHeaderPrefixes);
});

async function withWorkspace(run: (workspace: string) => Promise<void>): Promise<void> {
  const workspace = await mkdtemp(join(tmpdir(), "automotive-inventory-test-"));
  try {
    await run(workspace);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

function createServices(workspace: string) {
  return {
    repository: new FileInventoryRepository(join(workspace, "inventory.json")),
    previewStore: new FileImportPreviewStore(join(workspace, "previews")),
    sourcePath: join(workspace, "inventory.csv"),
  };
}

test("preview is fictional, deduplicates repeated source keys, and does not apply rows", async () => {
  await withWorkspace(async (workspace) => {
    const services = createServices(workspace);
    const csvContent = `${oneRow}fixture_only,unit-001,2025,Honda,CR-V,Fictional fixture,US,NEW,UNKNOWN,,,,\n`;
    const preview = await createImportPreview({ ...services, csvContent, now: fixedNow });

    assert.equal(preview.report.rowsTotal, 2);
    assert.equal(preview.report.rowsValid, 1);
    assert.equal(preview.report.rowsRejected, 1);
    assert.equal(preview.report.creates, 1);
    assert.equal(preview.report.rows[1].action, "REJECTED");
    assert.match(preview.report.rows[1].errors[0], /Duplicate inventory key/);
    assert.deepEqual(await services.repository.readSnapshot(), { vehicles: [], vehicleFacts: [], sources: [], commercialOffers: [] });
  });
});

test("apply requires the approved preview ID and hash, then provides queryable vehicles", async () => {
  await withWorkspace(async (workspace) => {
    const services = createServices(workspace);
    const preview = await createImportPreview({ ...services, csvContent: oneRow, now: fixedNow });
    await assert.rejects(
      applyImportPreview({ ...services, csvContent: oneRow, importId: preview.report.importId, approvedPreviewHash: "0".repeat(64), now: fixedNow }),
      /Preview hash does not match/,
    );
    assert.equal((await services.repository.readSnapshot()).vehicles.length, 0);

    const report = await applyImportPreview({
      ...services, csvContent: oneRow, importId: preview.report.importId,
      approvedPreviewHash: preview.report.previewHash, now: fixedNow,
    });
    assert.equal(report.status, "APPLIED");
    assert.equal(report.mode, "APPLY");
    const vehicles = await services.repository.listVehicles({ make: "honda", status: "UNKNOWN" });
    assert.equal(vehicles.length, 1);
    assert.equal(vehicles[0].model, "CR-V");
    assert.equal(vehicles[0].vin, null);
  });
});

test("apply rejects a changed source file and a stale inventory snapshot", async () => {
  await withWorkspace(async (workspace) => {
    const services = createServices(workspace);
    const preview = await createImportPreview({ ...services, csvContent: oneRow, now: fixedNow });
    await assert.rejects(applyImportPreview({
      ...services, csvContent: oneRow.replace("CR-V", "Civic"), importId: preview.report.importId,
      approvedPreviewHash: preview.report.previewHash, now: fixedNow,
    }), /Source file changed/);

    const dummyVehicle = {
      vehicleId: "veh_conflict_test", inventoryKey: "test:conflict", year: 2025, make: "Honda", model: "Civic",
      trim: "Test fixture", market: "US", condition: "NEW", status: "UNKNOWN", sourceSystem: "test",
      sourceRecordId: "conflict", createdAt: fixedNow(), updatedAt: fixedNow(), vin: null,
    } as const;
    const before = await services.repository.readSnapshot();
    await services.repository.applyImport(snapshotHash(before), [dummyVehicle], [], []);
    await assert.rejects(applyImportPreview({
      ...services, csvContent: oneRow, importId: preview.report.importId,
      approvedPreviewHash: preview.report.previewHash, now: fixedNow,
    }), /Inventory changed since preview/);
    assert.equal((await services.repository.readSnapshot()).vehicles.length, before.vehicles.length + 1);
  });
});

test("apply rejects a preview generated from a different mapping version", async () => {
  await withWorkspace(async (workspace) => {
    const services = createServices(workspace);
    const preview = await createImportPreview({ ...services, csvContent: oneRow, now: fixedNow });
    const stored = await services.previewStore.load(preview.report.importId);
    assert.ok(stored);
    stored.report.mappingVersion = "inventory_csv@1.0.0";
    await services.previewStore.save(stored);
    await assert.rejects(applyImportPreview({
      ...services, csvContent: oneRow, importId: preview.report.importId,
      approvedPreviewHash: preview.report.previewHash, now: fixedNow,
    }), /mapping changed since preview/);
  });
});

test("preview rejects identity changes instead of merging different vehicle variants", async () => {
  await withWorkspace(async (workspace) => {
    const services = createServices(workspace);
    const initial = await createImportPreview({ ...services, csvContent: oneRow, now: fixedNow });
    await applyImportPreview({ ...services, csvContent: oneRow, importId: initial.report.importId, approvedPreviewHash: initial.report.previewHash, now: fixedNow });

    const changedIdentity = oneRow.replace("CR-V", "Civic");
    const preview = await createImportPreview({ ...services, csvContent: changedIdentity, now: fixedNow });
    assert.equal(preview.report.rowsRejected, 1);
    assert.match(preview.report.rows[0].errors[0], /Identity fields/);
    assert.equal((await services.repository.listVehicles())[0].model, "CR-V");
  });
});

test("unchanged imports are idempotent and verified facts retain their source", async () => {
  await withWorkspace(async (workspace) => {
    const services = createServices(workspace);
    const preview = await createImportPreview({ ...services, csvContent: oneRow, now: fixedNow });
    await applyImportPreview({ ...services, csvContent: oneRow, importId: preview.report.importId, approvedPreviewHash: preview.report.previewHash, now: fixedNow });

    const repeated = await createImportPreview({ ...services, csvContent: oneRow, now: fixedNow });
    assert.equal(repeated.report.creates, 0);
    assert.equal(repeated.report.unchanged, 1);
    await applyImportPreview({ ...services, csvContent: oneRow, importId: repeated.report.importId, approvedPreviewHash: repeated.report.previewHash, now: fixedNow });
    assert.equal((await services.repository.readSnapshot()).vehicles.length, 1);

    const vehicle = (await services.repository.listVehicles())[0];
    const source: Source = {
      sourceId: "src_fixture_only", type: "TEST_FIXTURE", title: "Synthetic test source", publisher: "Fixture only",
      url: "https://example.invalid/fixtures/honda", retrievedAt: fixedNow(), publishedAt: null,
      contentHash: null, archiveLocation: null, reliabilityTier: 5, locale: "en-US",
    };
    const fact: VehicleFact = {
      vehicleFactId: "fact_fixture_only", vehicleId: vehicle.vehicleId, field: "fixture.marker", value: "synthetic-only",
      unit: null, scope: "UNIT", verificationStatus: "VERIFIED", sourceIds: [source.sourceId],
      verifiedAt: fixedNow(), verifiedBy: "contract-test", validUntil: null, notes: "Not a vehicle specification.",
    };
    await services.repository.upsertReferenceData([source], [fact]);
    assert.deepEqual(await services.repository.listVerifiedFacts(vehicle.vehicleId), [fact]);
    assert.deepEqual(await services.repository.listSources([source.sourceId]), [source]);
  });
});

test("CSV commercial details remain unconfirmed and changed offers are retained as stale history", async () => {
  await withWorkspace(async (workspace) => {
    const services = createServices(workspace);
    const priced = oneRow.replace(",UNKNOWN,,,,", ",UNKNOWN,25000,USD,,");
    const first = await createImportPreview({ ...services, csvContent: priced, now: fixedNow });
    await applyImportPreview({ ...services, csvContent: priced, importId: first.report.importId, approvedPreviewHash: first.report.previewHash, now: fixedNow });
    let offers = (await services.repository.readSnapshot()).commercialOffers;
    assert.equal(offers.length, 1);
    assert.equal(offers[0].status, "UNCONFIRMED");
    assert.equal(offers[0].confirmedBy, null);

    const revised = priced.replace("25000", "26000");
    const next = await createImportPreview({ ...services, csvContent: revised, now: fixedNow });
    assert.equal(next.report.updates, 1);
    await applyImportPreview({ ...services, csvContent: revised, importId: next.report.importId, approvedPreviewHash: next.report.previewHash, now: fixedNow });
    offers = (await services.repository.readSnapshot()).commercialOffers;
    assert.equal(offers.length, 2);
    assert.equal(offers.filter((offer) => offer.status === "STALE").length, 1);
    assert.equal(offers.filter((offer) => offer.status === "UNCONFIRMED").length, 1);
  });
});

test("sensitive VIN columns are rejected before a preview is created", async () => {
  await withWorkspace(async (workspace) => {
    const services = createServices(workspace);
    await assert.rejects(
      createImportPreview({ ...services, csvContent: `${header},vin\n`, now: fixedNow }),
      /Sensitive column 'vin'/,
    );
    await assert.rejects(readFile(join(workspace, "previews", "missing.json"), "utf8"), { code: "ENOENT" });
  });
});
