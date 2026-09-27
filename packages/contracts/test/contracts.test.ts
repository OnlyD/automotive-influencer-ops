import assert from "node:assert/strict";
import test from "node:test";
import { validateContract } from "../src/validate.js";

const vehicle = {
  vehicleId: "veh_fixture_001",
  inventoryKey: "fixture-only:unit-001",
  vin: null,
  year: 2025,
  make: "Honda",
  model: "CR-V",
  trim: "Fictional fixture",
  market: "US",
  condition: "NEW",
  status: "UNKNOWN",
  sourceSystem: "fixture_csv",
  sourceRecordId: "unit-001",
  createdAt: "2026-09-27T00:00:00Z",
  updatedAt: "2026-09-27T00:00:00Z",
};

test("validates a fictional vehicle and rejects a missing identity field", () => {
  assert.equal(validateContract("vehicle", vehicle).valid, true);
  const invalid = { ...vehicle, vehicleId: undefined };
  assert.equal(validateContract("vehicle", invalid).valid, false);
});

test("requires evidence and verification metadata for verified vehicle facts", () => {
  const fact = {
    vehicleFactId: "fact_fixture_001", vehicleId: vehicle.vehicleId, field: "fixture.label", value: "fictional",
    unit: null, scope: "MODEL_TRIM", verificationStatus: "VERIFIED", sourceIds: ["src_fixture_001"],
    verifiedAt: "2026-09-27T00:00:00Z", verifiedBy: "fixture-test", validUntil: null, notes: null,
  };
  assert.equal(validateContract("vehicleFact", fact).valid, true);
  assert.equal(validateContract("vehicleFact", { ...fact, sourceIds: [] }).valid, false);
});

test("validates source, commercial offer, and import report shapes", () => {
  const source = {
    sourceId: "src_fixture_001", type: "TEST_FIXTURE", title: "Fictional source", publisher: "Fixture only",
    url: "https://example.invalid/honda-fixture", retrievedAt: "2026-09-27T00:00:00Z", publishedAt: null,
    contentHash: null, archiveLocation: null, reliabilityTier: 5, locale: "en-US",
  };
  const offer = {
    offerId: "offer_fixture_001", vehicleId: vehicle.vehicleId, price: null, availability: "UNKNOWN",
    promotionText: null, financingText: null, confirmedBy: null, confirmedAt: null, expiresAt: null, status: "UNCONFIRMED",
  };
  const report = {
    importId: "imp_0123456789abcdef", mode: "PREVIEW", status: "PREVIEW_READY", sourcePath: "data/fixtures/honda-inventory.csv",
    sourceHash: "a".repeat(64), mappingVersion: "inventory_csv@1.0.1", previewHash: "b".repeat(64), requestedBy: "technical-operator",
    createdAt: "2026-09-27T00:00:00Z", rowsTotal: 1, rowsValid: 1, rowsRejected: 0,
    creates: 1, updates: 0, unchanged: 0, warnings: [], rows: [{ line: 2, inventoryKey: vehicle.inventoryKey, action: "CREATE", errors: [] }],
  };
  assert.equal(validateContract("source", source).valid, true);
  assert.equal(validateContract("commercialOffer", offer).valid, true);
  assert.equal(validateContract("importReport", report).valid, true);
  assert.equal(validateContract("commercialOffer", { ...offer, status: "CONFIRMED" }).valid, false);
});
