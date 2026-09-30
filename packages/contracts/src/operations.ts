import type { MediaAsset, VideoMode, Platform } from "./production.js";
export type OperationProductionState =
  | "BORRADOR"
  | "INVESTIGANDO"
  | "DATOS_VERIFICADOS"
  | "GUION_GENERADO"
  | "REVISION_PRESENTADORA"
  | "APROBADO"
  | "LISTO_PARA_GRABAR"
  | "GRABADO"
  | "EDITADO"
  | "LISTO"
  | "PROGRAMADO"
  | "PUBLICADO"
  | "MEDIDO";
export type Actor = {
  role: "presenter" | "technical-operator" | "worker";
  name: string;
};
export type ArtifactKind =
  | "RESEARCH"
  | "SCRIPT"
  | "SHOOTING_PLAN"
  | "RENDER_PLAN"
  | "MASTER"
  | "CLIP"
  | "PUBLICATION_PACKAGE"
  | "PERFORMANCE_REPORT";
export type ApprovalType =
  | "FACTUAL"
  | "CREATIVE"
  | "COMMERCIAL"
  | "RIGHTS"
  | "TECHNICAL"
  | "PUBLICATION";
export type Ref = { artifactId: string; version: number };
export interface Artifact extends Ref {
  status: "CANDIDATE" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "SUPERSEDED";
  productionId: string;
  parentVersion: number | null;
  kind: ArtifactKind;
  payload: unknown;
  hash: string;
  lockedFactsHash: string;
  parents: Ref[];
  provenance: {
    workflowId: string;
    workflowVersion: string;
    sourceCommit: string;
    runner: string;
  };
  createdBy: Actor;
  createdAt: string;
}
export interface Production {
  vehicleIdentity?: {
    year: number;
    make: string;
    model: string;
    trim: string;
    market: string;
  };
  productionId: string;
  vehicleId: string;
  title: string;
  mode: VideoMode;
  state: OperationProductionState;
  targetPlatforms: Platform[];
  createdBy: Actor;
  createdAt: string;
}
export interface Approval {
  approvalId: string;
  productionId: string;
  artifact: Ref;
  artifactHash: string;
  type: ApprovalType;
  decision: "APPROVED" | "REJECTED";
  decidedBy: Actor;
  decidedAt: string;
  notes: string;
  validUntil: string | null;
}
export interface Job {
  jobId: string;
  productionId: string;
  workflowId:
    | "create-shooting-plan"
    | "render-video"
    | "extract-clips"
    | "prepare-publication-package";
  workflowVersion: "1.0.0";
  input: Record<string, unknown>;
  idempotencyKey: string;
  requestHash: string;
  requestedBy: Actor;
  status:
    | "QUEUED"
    | "CLAIMED"
    | "RUNNING"
    | "VALIDATING"
    | "COMPLETED"
    | "FAILED"
    | "RETRY_PENDING"
    | "DEAD_LETTER";
  attempt: number;
  maxAttempts: number;
  leaseToken: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  availableAt: string;
  result: Ref[];
  error: string | null;
}
export interface Publication {
  publicationId: string;
  productionId: string;
  package: Ref;
  platform: Platform;
  accountRef: string;
  status: "PROGRAMADO" | "PUBLICADO";
  remoteId: string | null;
  url: string | null;
  scheduledAt: string;
  publishedAt: string | null;
  idempotencyKey: string;
}
export interface MetricSnapshot {
  snapshotId: string;
  publicationId: string;
  capturedAt: string;
  windowHours: number;
  metrics: Array<{
    name: string;
    definition: string;
    value: number;
    denominator: number | null;
  }>;
}
