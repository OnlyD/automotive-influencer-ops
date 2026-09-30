import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import { createRequire } from "node:module";
import vehicleSchema from "../schemas/vehicle.schema.json" with { type: "json" };
import vehicleFactSchema from "../schemas/vehicle-fact.schema.json" with { type: "json" };
import sourceSchema from "../schemas/source.schema.json" with { type: "json" };
import commercialOfferSchema from "../schemas/commercial-offer.schema.json" with { type: "json" };
import importReportSchema from "../schemas/import-report.schema.json" with { type: "json" };

import productionScriptSchema from "../schemas/production-script.schema.json" with { type: "json" };
import renderPlanSchema from "../schemas/render-plan.schema.json" with { type: "json" };
import publicationRequestSchema from "../schemas/publication-request.schema.json" with { type: "json" };
import jobRequestSchema from "../schemas/job-request.schema.json" with { type: "json" };

import productionSchema from "../schemas/production.schema.json" with { type: "json" };
import artifactVersionSchema from "../schemas/artifact-version.schema.json" with { type: "json" };
import approvalSchema from "../schemas/approval.schema.json" with { type: "json" };
import mediaAssetSchema from "../schemas/media-asset.schema.json" with { type: "json" };
import jobSchema from "../schemas/job.schema.json" with { type: "json" };
import publicationSchema from "../schemas/publication.schema.json" with { type: "json" };
import metricSnapshotSchema from "../schemas/metric-snapshot.schema.json" with { type: "json" };

export type ContractName = "vehicle" | "vehicleFact" | "source" | "commercialOffer" | "importReport" | "productionScript" | "renderPlan" | "publicationRequest" | "jobRequest" | "production" | "artifactVersion" | "approval" | "mediaAsset" | "job" | "publication" | "metricSnapshot";
export interface ContractValidation {
  valid: boolean;
  errors: ErrorObject[];
}

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const require = createRequire(import.meta.url);
const addFormats = require("ajv-formats") as typeof import("ajv-formats").default;
addFormats(ajv);

const validators: Record<ContractName, ValidateFunction> = {
  productionScript: ajv.compile(productionScriptSchema),
  renderPlan: ajv.compile(renderPlanSchema),
  publicationRequest: ajv.compile(publicationRequestSchema),
  jobRequest: ajv.compile(jobRequestSchema),
  production: ajv.compile(productionSchema),
  artifactVersion: ajv.compile(artifactVersionSchema),
  approval: ajv.compile(approvalSchema),
  mediaAsset: ajv.compile(mediaAssetSchema),
  job: ajv.compile(jobSchema),
  publication: ajv.compile(publicationSchema),
  metricSnapshot: ajv.compile(metricSnapshotSchema),
  vehicle: ajv.compile(vehicleSchema),
  vehicleFact: ajv.compile(vehicleFactSchema),
  source: ajv.compile(sourceSchema),
  commercialOffer: ajv.compile(commercialOfferSchema),
  importReport: ajv.compile(importReportSchema),
};

export function validateContract(name: ContractName, value: unknown): ContractValidation {
  const valid = validators[name](value);
  return { valid: Boolean(valid), errors: validators[name].errors ?? [] };
}

export function assertContract(name: ContractName, value: unknown): void {
  const result = validateContract(name, value);
  if (!result.valid) {
    const details = result.errors.map((error) => `${error.instancePath || "/"} ${error.message}`).join("; ");
    throw new Error(`Invalid ${name} contract: ${details}`);
  }
}
