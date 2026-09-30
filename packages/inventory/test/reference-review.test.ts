import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  FileInventoryRepository,
  snapshotHash,
  referenceReviewHash,
  applyReferenceReview,
  type ReferenceReview,
} from "../src/index.js";
import type { Vehicle } from "@automotive/contracts";
export const vehicle: Vehicle = {
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
export const review: ReferenceReview = {
  requestedBy: "fixture_operator",
  requestedRole: "technical-operator",
  sources: [
    {
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
    },
  ],
  facts: [
    {
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
      notes: "Fictional fixture only",
    },
  ],
};
test("human factual review requires an exact unchanged review and inventory snapshot", async () => {
  const root = await mkdtemp(join(tmpdir(), "reference-review-"));
  try {
    const repository = new FileInventoryRepository(
      join(root, "inventory.json"),
    );
    await repository.applyImport(
      snapshotHash(await repository.readSnapshot()),
      [vehicle],
      [],
      [],
    );
    const expected = snapshotHash(await repository.readSnapshot()),
      approved = referenceReviewHash(review);
    await assert.rejects(
      applyReferenceReview(
        repository,
        { ...review, facts: [{ ...review.facts[0], value: "Changed" }] },
        approved,
        expected,
      ),
      /changed/,
    );
    await applyReferenceReview(repository, review, approved, expected);
    assert.equal(
      (await repository.listVerifiedFacts(vehicle.vehicleId)).length,
      1,
    );
    await assert.rejects(
      applyReferenceReview(repository, review, approved, expected),
      /snapshot changed/,
    );
    assert.throws(
      () =>
        referenceReviewHash({ ...review, requestedRole: "presenter" as never }),
      /operator/,
    );
    assert.throws(
      () =>
        referenceReviewHash({
          ...review,
          facts: [{ ...review.facts[0], verifiedBy: "different" }],
        }),
      /attributed/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
