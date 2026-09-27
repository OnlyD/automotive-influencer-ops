export type VehicleCondition = "NEW" | "USED" | "CERTIFIED_PRE_OWNED" | "UNKNOWN";
export type VehicleStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "UNAVAILABLE" | "UNKNOWN";
export type VerificationStatus = "UNVERIFIED" | "IN_REVIEW" | "VERIFIED" | "CONFLICTED" | "STALE";

export interface Vehicle {
  vehicleId: string;
  inventoryKey: string;
  vin?: string | null;
  year: number;
  make: string;
  model: string;
  trim: string;
  market: string;
  condition: VehicleCondition;
  status: VehicleStatus;
  sourceSystem: string;
  sourceRecordId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFact {
  vehicleFactId: string;
  vehicleId: string;
  field: string;
  value: string | number | boolean | unknown[] | Record<string, unknown>;
  unit: string | null;
  scope: "UNIT" | "MODEL_TRIM" | "MODEL_YEAR" | "MARKET";
  verificationStatus: VerificationStatus;
  sourceIds: string[];
  verifiedAt: string | null;
  verifiedBy: string | null;
  validUntil: string | null;
  notes: string | null;
}

export interface Source {
  sourceId: string;
  type: "MANUFACTURER_PAGE" | "VEHICLE_DOCUMENT" | "AUTHORIZED_INVENTORY" | "REGULATORY" | "EDITORIAL" | "TEST_FIXTURE";
  title: string;
  publisher: string;
  url: string;
  retrievedAt: string;
  publishedAt: string | null;
  contentHash: string | null;
  archiveLocation: string | null;
  reliabilityTier: number;
  locale: string;
}

export interface CommercialOffer {
  offerId: string;
  vehicleId: string;
  price: { amount: number; currency: string } | null;
  availability: VehicleStatus;
  promotionText: string | null;
  financingText: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  expiresAt: string | null;
  status: "UNCONFIRMED" | "CONFIRMED" | "STALE";
}

export interface ImportReportRow {
  line: number;
  inventoryKey: string | null;
  action: "CREATE" | "UPDATE" | "UNCHANGED" | "REJECTED";
  errors: string[];
}

export interface InventoryImportReport {
  importId: string;
  mode: "PREVIEW" | "APPLY";
  status: "PREVIEW_READY" | "APPLIED";
  sourcePath: string;
  sourceHash: string;
  mappingVersion: string;
  previewHash: string;
  requestedBy: "technical-operator";
  errorReportPath?: string | null;
  createdAt: string;
  appliedAt?: string | null;
  rowsTotal: number;
  rowsValid: number;
  rowsRejected: number;
  creates: number;
  updates: number;
  unchanged: number;
  warnings: string[];
  rows: ImportReportRow[];
}
