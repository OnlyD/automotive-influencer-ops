import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import {
  assertContract,
  type CommercialOffer,
  type ImportReportRow,
  type InventoryImportReport,
  type Vehicle,
} from "@automotive/contracts";
import { canonicalJson, createSha256, snapshotHash, type InventoryRepository } from "./repository.js";

export const inventoryCsvMapping = {
  id: "inventory_csv",
  version: "1.0.1",
  requiredHeaders: ["source_system", "source_record_id", "year", "make", "model", "trim", "market", "condition", "status"],
  optionalHeaders: ["price_amount", "currency", "promotion_text", "financing_text"],
  identityFields: ["year", "make", "model", "trim", "market"],
  sensitiveHeaders: ["vin", "buyer_name", "buyer_phone", "buyer_email", "customer_name", "customer_phone", "customer_email"],
  sensitiveHeaderPrefixes: ["vin_", "buyer_", "customer_", "owner_"],
} as const;
export const INVENTORY_MAPPING_VERSION = `${inventoryCsvMapping.id}@${inventoryCsvMapping.version}`;

export interface ImportPlanRow {
  reportRow: ImportReportRow;
  vehicle: Vehicle | null;
  action: ImportReportRow["action"];
  offer: CommercialOffer | null;
  staleOfferIds: string[];
}

export interface ImportPreview {
  report: InventoryImportReport;
  baseSnapshotHash: string;
  plan: ImportPlanRow[];
}

export interface ImportPreviewStore {
  load(importId: string): Promise<ImportPreview | null>;
  save(preview: ImportPreview): Promise<void>;
}

export class FileImportPreviewStore implements ImportPreviewStore {
  constructor(private readonly directory: string) {}

  async load(importId: string): Promise<ImportPreview | null> {
    try {
      return JSON.parse(await readFile(resolve(this.directory, `${importId}.json`), "utf8")) as ImportPreview;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async save(preview: ImportPreview): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(resolve(this.directory, `${preview.report.importId}.json`), `${JSON.stringify(preview, null, 2)}\n`, { flag: "w" });
  }
}

const requiredHeaders = inventoryCsvMapping.requiredHeaders;
const optionalHeaders = inventoryCsvMapping.optionalHeaders;
const sensitiveHeaders = new Set<string>(inventoryCsvMapping.sensitiveHeaders);
const sensitiveHeaderPrefixes = inventoryCsvMapping.sensitiveHeaderPrefixes;
const conditions = new Set(["NEW", "USED", "CERTIFIED_PRE_OWNED", "UNKNOWN"]);
const statuses = new Set(["AVAILABLE", "RESERVED", "SOLD", "UNAVAILABLE", "UNKNOWN"]);

function parseCsv(csvContent: string): Record<string, string>[] {
  const headerRows = parse(csvContent, { bom: true, to_line: 1, skip_empty_lines: true, trim: true }) as string[][];
  const headers = headerRows[0]?.map((header) => header.trim().toLowerCase()) ?? [];
  if (headers.length === 0) throw new Error("The CSV file is empty or has no header row.");
  const repeated = headers.find((header, index) => headers.indexOf(header) !== index);
  if (repeated) throw new Error(`CSV header '${repeated}' appears more than once.`);
  const sensitive = headers.find((header) => sensitiveHeaders.has(header) || sensitiveHeaderPrefixes.some((prefix) => header.startsWith(prefix)));
  if (sensitive) throw new Error(`Sensitive column '${sensitive}' is not accepted by this mapping. Remove it before import.`);
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length > 0) throw new Error(`CSV is missing required columns: ${missing.join(", ")}.`);
  const supported = new Set<string>([...requiredHeaders, ...optionalHeaders]);
  const rows = parse(csvContent, {
    bom: true,
    columns: (columns: string[]) => columns.map((column) => column.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false,
  }) as Record<string, string>[];
  return rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => supported.has(key))));
}

function normalizeRow(
  row: Record<string, string>,
  line: number,
  existing: Vehicle | undefined,
  existingOffers: CommercialOffer[],
  now: string,
): ImportPlanRow {
  const errors: string[] = [];
  const sourceSystem = row.source_system?.trim().toLowerCase() ?? "";
  const sourceRecordId = row.source_record_id?.trim() ?? "";
  const year = Number(row.year);
  const make = row.make?.trim() ?? "";
  const model = row.model?.trim() ?? "";
  const trim = row.trim?.trim() || existing?.trim || "UNKNOWN";
  const market = row.market?.trim().toUpperCase() ?? "";
  const condition = row.condition?.trim().toUpperCase() ?? "";
  const status = row.status?.trim().toUpperCase() ?? "";

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(sourceSystem)) errors.push("source_system must use lowercase letters, digits, hyphens, or underscores.");
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(sourceRecordId)) errors.push("source_record_id must contain 1-80 letters, digits, dots, underscores, or hyphens.");
  if (!Number.isInteger(year) || year < 1886 || year > 2100) errors.push("year must be an integer from 1886 through 2100.");
  if (!make) errors.push("make is required.");
  if (!model) errors.push("model is required.");
  if (!/^[A-Z]{2}$/.test(market)) errors.push("market must be a two-letter uppercase market code.");
  if (!conditions.has(condition)) errors.push(`condition '${condition}' is not supported.`);
  if (!statuses.has(status)) errors.push(`status '${status}' is not supported.`);

  const inventoryKey = sourceSystem && sourceRecordId ? `${sourceSystem}:${sourceRecordId}` : null;
  if (existing && (
    existing.year !== year || existing.make.toLowerCase() !== make.toLowerCase() ||
    existing.model.toLowerCase() !== model.toLowerCase() || existing.trim.toLowerCase() !== trim.toLowerCase() ||
    existing.market !== market
  )) {
    errors.push("Identity fields year, make, model, trim, and market changed for an existing inventory key; operator review is required.");
  }
  const reportRow: ImportReportRow = { line, inventoryKey, action: "REJECTED", errors };
  if (errors.length > 0 || inventoryKey === null) return { reportRow, vehicle: null, action: "REJECTED", offer: null, staleOfferIds: [] };

  const vehicleId = existing?.vehicleId ?? `veh_${createSha256(inventoryKey).slice(0, 16)}`;
  const vehicle: Vehicle = {
    vehicleId,
    inventoryKey,
    vin: existing?.vin ?? null,
    year,
    make,
    model,
    trim,
    market,
    condition: condition as Vehicle["condition"],
    status: status as Vehicle["status"],
    sourceSystem,
    sourceRecordId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  assertContract("vehicle", vehicle);

  const amountText = row.price_amount?.trim() ?? "";
  const currency = row.currency?.trim().toUpperCase() ?? "";
  const promotionText = row.promotion_text?.trim() || null;
  const financingText = row.financing_text?.trim() || null;
  const offerPresent = Boolean(amountText || currency || promotionText || financingText);
  let offer: CommercialOffer | null = null;
  const staleOfferIds: string[] = [];
  if (offerPresent) {
    const amount = amountText ? Number(amountText) : null;
    if (amountText && (!Number.isFinite(amount) || (amount ?? -1) < 0)) errors.push("price_amount must be a non-negative number.");
    if (Boolean(amountText) !== Boolean(currency)) errors.push("price_amount and currency must be provided together.");
    if (currency && !/^[A-Z]{3}$/.test(currency)) errors.push("currency must be a three-letter uppercase code.");
    if (errors.length > 0) {
      reportRow.errors = errors;
      return { reportRow, vehicle: null, action: "REJECTED", offer: null, staleOfferIds: [] };
    }

    const price = amount === null ? null : { amount, currency };
    const candidate = {
      vehicleId,
      price,
      availability: status as Vehicle["status"],
      promotionText,
      financingText,
    };
    const current = existingOffers.filter((item) => item.vehicleId === vehicleId && item.status !== "STALE");
    const same = current.find((item) =>
      canonicalJson({ vehicleId: item.vehicleId, price: item.price, availability: item.availability, promotionText: item.promotionText, financingText: item.financingText }) === canonicalJson(candidate),
    );
    if (!same) {
      const offerId = `offer_${createSha256(canonicalJson({ candidate, importedAt: now })).slice(0, 16)}`;
      offer = {
        offerId,
        ...candidate,
        confirmedBy: null,
        confirmedAt: null,
        expiresAt: null,
        status: "UNCONFIRMED",
      };
      assertContract("commercialOffer", offer);
      staleOfferIds.push(...current.map((item) => item.offerId));
    }
  }
  if (!offerPresent) {
    staleOfferIds.push(...existingOffers
      .filter((item) => item.vehicleId === vehicleId && item.status !== "STALE" && item.availability !== status)
      .map((item) => item.offerId));
  }

  const comparable = (item: Vehicle): Omit<Vehicle, "createdAt" | "updatedAt"> => {
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = item;
    return rest;
  };
  const vehicleChanged = existing === undefined || canonicalJson(comparable(existing)) !== canonicalJson(comparable(vehicle));
  const action: ImportPlanRow["action"] = existing === undefined ? "CREATE" : vehicleChanged || offer !== null || staleOfferIds.length > 0 ? "UPDATE" : "UNCHANGED";
  reportRow.action = action;
  return { reportRow, vehicle: action === "UNCHANGED" ? null : vehicle, action, offer, staleOfferIds };
}

export async function createImportPreview(input: {
  csvContent: string;
  sourcePath: string;
  repository: InventoryRepository;
  previewStore: ImportPreviewStore;
  now?: () => string;
}): Promise<ImportPreview> {
  const rows = parseCsv(input.csvContent);
  const now = (input.now ?? (() => new Date().toISOString()))();
  const snapshot = await input.repository.readSnapshot();
  const existingByKey = new Map(snapshot.vehicles.map((vehicle) => [vehicle.inventoryKey, vehicle]));
  const seen = new Set<string>();
  const plan: ImportPlanRow[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const data = rows[index];
    const sourceSystem = data.source_system?.trim().toLowerCase() ?? "";
    const sourceRecordId = data.source_record_id?.trim() ?? "";
    const key = sourceSystem && sourceRecordId ? `${sourceSystem}:${sourceRecordId}` : "";
    const line = index + 2;
    if (key && seen.has(key)) {
      plan.push({
        reportRow: { line, inventoryKey: key, action: "REJECTED", errors: [`Duplicate inventory key '${key}' in this file.`] },
        vehicle: null, action: "REJECTED", offer: null, staleOfferIds: [],
      });
      continue;
    }
    if (key) seen.add(key);
    plan.push(normalizeRow(data, line, existingByKey.get(key), snapshot.commercialOffers, now));
  }

  const sourceHash = createSha256(input.csvContent);
  const baseSnapshotHash = snapshotHash(snapshot);
  const hashPayload = {
    sourceHash,
    mappingVersion: INVENTORY_MAPPING_VERSION,
    baseSnapshotHash,
    now,
    plan,
  };
  const previewHash = createSha256(canonicalJson(hashPayload));
  const importId = `imp_${previewHash.slice(0, 16)}`;
  const report: InventoryImportReport = {
    importId,
    mode: "PREVIEW",
    status: "PREVIEW_READY",
    sourcePath: resolve(input.sourcePath),
    sourceHash,
    mappingVersion: INVENTORY_MAPPING_VERSION,
    previewHash,
    requestedBy: "technical-operator",
    errorReportPath: null,
    createdAt: now,
    appliedAt: null,
    rowsTotal: plan.length,
    rowsValid: plan.filter((item) => item.action !== "REJECTED").length,
    rowsRejected: plan.filter((item) => item.action === "REJECTED").length,
    creates: plan.filter((item) => item.action === "CREATE").length,
    updates: plan.filter((item) => item.action === "UPDATE").length,
    unchanged: plan.filter((item) => item.action === "UNCHANGED").length,
    warnings: [],
    rows: plan.map((item) => item.reportRow),
  };
  assertContract("importReport", report);
  const preview = { report, baseSnapshotHash, plan };
  await input.previewStore.save(preview);
  return preview;
}

export async function applyImportPreview(input: {
  importId: string;
  approvedPreviewHash: string;
  csvContent: string;
  sourcePath: string;
  repository: InventoryRepository;
  previewStore: ImportPreviewStore;
  now?: () => string;
}): Promise<InventoryImportReport> {
  const preview = await input.previewStore.load(input.importId);
  if (!preview) throw new Error(`Preview '${input.importId}' was not found. Run preview again.`);
  if (preview.report.previewHash !== input.approvedPreviewHash) throw new Error("Preview hash does not match; apply was refused.");
  if (preview.report.mode !== "PREVIEW" || preview.report.status !== "PREVIEW_READY" || preview.report.appliedAt) {
    throw new Error("This preview has already been applied or is not applicable.");
  }
  if (preview.report.mappingVersion !== INVENTORY_MAPPING_VERSION) {
    throw new Error("Import mapping changed since preview; create a new preview.");
  }
  if (resolve(input.sourcePath) !== preview.report.sourcePath) throw new Error("Source file path changed since preview; create a new preview.");
  if (createSha256(input.csvContent) !== preview.report.sourceHash) throw new Error("Source file changed since preview; create a new preview.");
  if (preview.report.rowsValid === 0) throw new Error("Preview contains no valid rows to apply.");

  const vehicles = preview.plan.flatMap((item) => item.vehicle ? [item.vehicle] : []);
  const offers = preview.plan.flatMap((item) => item.offer ? [item.offer] : []);
  const staleOfferIds = [...new Set(preview.plan.flatMap((item) => item.staleOfferIds))];
  const applied = await input.repository.applyImport(preview.baseSnapshotHash, vehicles, staleOfferIds, offers);
  if (!applied) throw new Error("Inventory changed since preview; create a new preview before applying.");

  const report: InventoryImportReport = {
    ...preview.report,
    mode: "APPLY",
    status: "APPLIED",
    appliedAt: (input.now ?? (() => new Date().toISOString()))(),
  };
  await input.previewStore.save({ ...preview, report });
  return report;
}

export async function saveImportReport(report: InventoryImportReport, directory: string): Promise<string | null> {
  await mkdir(directory, { recursive: true });
  const reportPath = resolve(directory, `${report.importId}.json`);
  let errorReportPath: string | null = null;
  if (report.rowsRejected > 0) {
    errorReportPath = resolve(directory, `${report.importId}-errors.csv`);
    const rejected = report.rows.filter((row) => row.action === "REJECTED");
    const csvRows = ["line,inventory_key,errors", ...rejected.map((row) => [row.line, row.inventoryKey ?? "", row.errors.join("; ")].map(escapeCsv).join(","))];
    await writeFile(errorReportPath, `${csvRows.join("\n")}\n`, "utf8");
  }
  const persisted = { ...report, errorReportPath };
  assertContract("importReport", persisted);
  await writeFile(reportPath, `${JSON.stringify(persisted, null, 2)}\n`, "utf8");
  return errorReportPath;
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function previewSummary(preview: ImportPreview): string {
  return `${basename(preview.report.sourcePath)}: ${preview.report.creates} create, ${preview.report.updates} update, ${preview.report.unchanged} unchanged, ${preview.report.rowsRejected} rejected. Preview ID: ${preview.report.importId}; approval hash: ${preview.report.previewHash}`;
}
