import {
  assertContract,
  type VehicleFact,
  type Source,
} from "@automotive/contracts";
import {
  createSha256,
  canonicalJson,
  snapshotHash,
  type InventoryRepository,
} from "./repository.js";
export interface ReferenceReview {
  sources: Source[];
  facts: VehicleFact[];
  requestedBy: string;
  requestedRole: "technical-operator";
}
export function referenceReviewHash(review: ReferenceReview): string {
  if (review.requestedRole !== "technical-operator")
    throw new Error("Only the technical operator may verify facts.");
  if (!review.requestedBy.trim() || !review.facts.length)
    throw new Error("An operator and reviewed facts are required.");
  for (const source of review.sources) assertContract("source", source);
  for (const fact of review.facts) {
    assertContract("vehicleFact", fact);
    if (
      fact.verificationStatus !== "VERIFIED" ||
      fact.verifiedBy !== review.requestedBy ||
      !fact.verifiedAt ||
      Date.parse(fact.verifiedAt) > Date.now() ||
      (fact.validUntil && Date.parse(fact.validUntil) <= Date.now())
    )
      throw new Error(
        "Facts need an explicit current human verification attributed to the requester.",
      );
  }
  if (
    new Set(review.facts.map((f) => f.vehicleFactId)).size !==
      review.facts.length ||
    new Set(review.sources.map((s) => s.sourceId)).size !==
      review.sources.length
  )
    throw new Error("Reviewed identifiers must be unique.");
  return createSha256(canonicalJson(review));
}
export async function applyReferenceReview(
  repository: InventoryRepository,
  review: ReferenceReview,
  approvedHash: string,
  expectedSnapshotHash: string,
): Promise<void> {
  if (
    referenceReviewHash(review) !== approvedHash ||
    snapshotHash(await repository.readSnapshot()) !== expectedSnapshotHash
  )
    throw new Error(
      "Reviewed data or inventory snapshot changed; preview and approve again.",
    );
  await repository.upsertReferenceData(review.sources, review.facts);
}
