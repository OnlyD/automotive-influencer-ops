import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  assertContract,
  type CommercialOffer,
  type Source,
  type Vehicle,
  type VehicleFact,
} from "@automotive/contracts";

export interface InventorySnapshot {
  vehicles: Vehicle[];
  vehicleFacts: VehicleFact[];
  sources: Source[];
  commercialOffers: CommercialOffer[];
}

export interface VehicleQuery {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  condition?: Vehicle["condition"];
  status?: Vehicle["status"];
}

export interface InventoryRepository {
  readSnapshot(): Promise<InventorySnapshot>;
  applyImport(
    expectedSnapshotHash: string,
    vehicles: Vehicle[],
    staleOfferIds: string[],
    offers: CommercialOffer[],
  ): Promise<boolean>;
  upsertReferenceData(sources: Source[], facts: VehicleFact[]): Promise<void>;
  listVehicles(query?: VehicleQuery): Promise<Vehicle[]>;
  listVerifiedFacts(vehicleId: string): Promise<VehicleFact[]>;
  listSources(sourceIds: string[]): Promise<Source[]>;
}

const emptySnapshot = (): InventorySnapshot => ({ vehicles: [], vehicleFacts: [], sources: [], commercialOffers: [] });

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export class FileInventoryRepository implements InventoryRepository {
  constructor(private readonly filePath: string) {}

  async readSnapshot(): Promise<InventorySnapshot> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filePath, "utf8"));
      if (typeof parsed !== "object" || parsed === null) throw new Error("Inventory state must be a JSON object.");
      const state = parsed as InventorySnapshot;
      for (const key of ["vehicles", "vehicleFacts", "sources", "commercialOffers"] as const) {
        if (!Array.isArray(state[key])) throw new Error(`Inventory state field '${key}' must be an array.`);
      }
      state.vehicles.forEach((vehicle) => assertContract("vehicle", vehicle));
      state.vehicleFacts.forEach((fact) => assertContract("vehicleFact", fact));
      state.sources.forEach((source) => assertContract("source", source));
      state.commercialOffers.forEach((offer) => assertContract("commercialOffer", offer));
      const vehicleIds = new Set(state.vehicles.map((vehicle) => vehicle.vehicleId));
      const sourceIds = new Set(state.sources.map((source) => source.sourceId));
      for (const fact of state.vehicleFacts) {
        if (!vehicleIds.has(fact.vehicleId) || fact.sourceIds.some((sourceId) => !sourceIds.has(sourceId))) {
          throw new Error(`Inventory state contains unresolved references for fact '${fact.vehicleFactId}'.`);
        }
      }
      return state;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptySnapshot();
      throw error;
    }
  }

  async applyImport(
    expectedSnapshotHash: string,
    vehicles: Vehicle[],
    staleOfferIds: string[],
    offers: CommercialOffer[],
  ): Promise<boolean> {
    const current = await this.readSnapshot();
    if (snapshotHash(current) !== expectedSnapshotHash) return false;

    const vehiclesByKey = new Map(current.vehicles.map((vehicle) => [vehicle.inventoryKey, vehicle]));
    for (const vehicle of vehicles) {
      assertContract("vehicle", vehicle);
      vehiclesByKey.set(vehicle.inventoryKey, vehicle);
    }

    const staleIds = new Set(staleOfferIds);
    const offersById = new Map(current.commercialOffers.map((offer) => [offer.offerId, offer]));
    for (const [offerId, offer] of offersById) {
      if (staleIds.has(offerId)) offersById.set(offerId, { ...offer, status: "STALE" });
    }
    for (const offer of offers) {
      assertContract("commercialOffer", offer);
      offersById.set(offer.offerId, offer);
    }

    const next: InventorySnapshot = {
      ...current,
      vehicles: [...vehiclesByKey.values()].sort((left, right) => left.inventoryKey.localeCompare(right.inventoryKey)),
      commercialOffers: [...offersById.values()].sort((left, right) => left.offerId.localeCompare(right.offerId)),
    };
    await this.writeSnapshot(next);
    return true;
  }

  async upsertReferenceData(sources: Source[], facts: VehicleFact[]): Promise<void> {
    const current = await this.readSnapshot();
    const sourceMap = new Map(current.sources.map((source) => [source.sourceId, source]));
    for (const source of sources) {
      assertContract("source", source);
      sourceMap.set(source.sourceId, source);
    }
    const vehicleIds = new Set(current.vehicles.map((vehicle) => vehicle.vehicleId));
    const knownSourceIds = new Set(sourceMap.keys());
    const factMap = new Map(current.vehicleFacts.map((fact) => [fact.vehicleFactId, fact]));
    for (const fact of facts) {
      assertContract("vehicleFact", fact);
      if (!vehicleIds.has(fact.vehicleId)) throw new Error(`Unknown vehicle '${fact.vehicleId}' for fact '${fact.vehicleFactId}'.`);
      const missingSource = fact.sourceIds.find((sourceId) => !knownSourceIds.has(sourceId));
      if (missingSource) throw new Error(`Unknown source '${missingSource}' for fact '${fact.vehicleFactId}'.`);
      factMap.set(fact.vehicleFactId, fact);
    }
    await this.writeSnapshot({
      ...current,
      sources: [...sourceMap.values()].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
      vehicleFacts: [...factMap.values()].sort((left, right) => left.vehicleFactId.localeCompare(right.vehicleFactId)),
    });
  }

  async listVehicles(query: VehicleQuery = {}): Promise<Vehicle[]> {
    const vehicles = (await this.readSnapshot()).vehicles;
    const equals = <T extends string | number>(actual: T, expected: T | undefined): boolean =>
      expected === undefined || (typeof actual === "string" ? actual.toLocaleLowerCase() === String(expected).toLocaleLowerCase() : actual === expected);
    return vehicles
      .filter((vehicle) => equals(vehicle.year, query.year))
      .filter((vehicle) => equals(vehicle.make, query.make))
      .filter((vehicle) => equals(vehicle.model, query.model))
      .filter((vehicle) => equals(vehicle.trim, query.trim))
      .filter((vehicle) => equals(vehicle.condition, query.condition))
      .filter((vehicle) => equals(vehicle.status, query.status))
      .sort((left, right) => left.year - right.year || left.make.localeCompare(right.make) || left.model.localeCompare(right.model));
  }

  async listVerifiedFacts(vehicleId: string): Promise<VehicleFact[]> {
    return (await this.readSnapshot()).vehicleFacts
      .filter((fact) => fact.vehicleId === vehicleId && fact.verificationStatus === "VERIFIED" && fact.sourceIds.length > 0)
      .sort((left, right) => left.field.localeCompare(right.field));
  }

  async listSources(sourceIds: string[]): Promise<Source[]> {
    const ids = new Set(sourceIds);
    return (await this.readSnapshot()).sources.filter((source) => ids.has(source.sourceId));
  }

  private async writeSnapshot(snapshot: InventorySnapshot): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: "wx" });
    await rename(temporaryPath, this.filePath);
  }
}

export function snapshotHash(snapshot: InventorySnapshot): string {
  const normalized: InventorySnapshot = {
    vehicles: [...snapshot.vehicles].sort((a, b) => a.inventoryKey.localeCompare(b.inventoryKey)),
    vehicleFacts: [...snapshot.vehicleFacts].sort((a, b) => a.vehicleFactId.localeCompare(b.vehicleFactId)),
    sources: [...snapshot.sources].sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
    commercialOffers: [...snapshot.commercialOffers].sort((a, b) => a.offerId.localeCompare(b.offerId)),
  };
  return createSha256(canonicalJson(normalized));
}

export function createSha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
