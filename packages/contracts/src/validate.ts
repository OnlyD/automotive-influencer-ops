import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import { createRequire } from "node:module";
import vehicleSchema from "../schemas/vehicle.schema.json" with { type: "json" };
import vehicleFactSchema from "../schemas/vehicle-fact.schema.json" with { type: "json" };
import sourceSchema from "../schemas/source.schema.json" with { type: "json" };
import commercialOfferSchema from "../schemas/commercial-offer.schema.json" with { type: "json" };
import importReportSchema from "../schemas/import-report.schema.json" with { type: "json" };

export type ContractName = "vehicle" | "vehicleFact" | "source" | "commercialOffer" | "importReport";
export interface ContractValidation {
  valid: boolean;
  errors: ErrorObject[];
}

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const require = createRequire(import.meta.url);
const addFormats = require("ajv-formats") as typeof import("ajv-formats").default;
addFormats(ajv);

const validators: Record<ContractName, ValidateFunction> = {
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
