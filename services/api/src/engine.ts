import type { InventoryRepository } from "@automotive/inventory";
import { validateDeterministicWorkflow } from "./registry.js";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertContract,
  type ProductionScript,
  type RenderPlan,
  type PublicationRequest,
  type VideoMode,
  type Platform,
} from "@automotive/contracts";
import {
  canTransitionProductionState,
  type ProductionState,
} from "@automotive/domain";
import {
  assertId,
  ingestMedia,
  verifyAsset,
  renderVideo,
  extractClip,
  type MediaAsset,
} from "@automotive/media";
import {
  FileOperationStore,
  type Actor,
  type ApprovalType,
  type Artifact,
  type ArtifactKind,
  type Job,
  type LocalState,
  type Ref,
  type Production,
} from "./store.js";

export class OperationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OperationError";
  }
}
function fail(code: string, message: string): never {
  throw new OperationError(code, message);
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function digest(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
}
function operator(actor: Actor): void {
  if (actor.role !== "technical-operator" || !actor.name.trim())
    fail("FORBIDDEN", "A technical operator is required.");
}
function reviewer(actor: Actor): void {
  if (
    !["technical-operator", "presenter"].includes(actor.role) ||
    !actor.name.trim()
  )
    fail("FORBIDDEN", "A declared human reviewer is required.");
}
function production(s: LocalState, id: string): Production {
  const p = s.productions.find((p) => p.productionId === id);
  return p ?? fail("NOT_FOUND", "Production was not found.");
}
export function artifact(
  s: LocalState,
  ref: Ref,
  kind?: ArtifactKind,
): Artifact {
  const a = s.artifacts.find(
    (a) => a.artifactId === ref.artifactId && a.version === ref.version,
  );
  if (!a || (kind && a.kind !== kind))
    fail(
      "NOT_FOUND",
      "Artifact version was not found or has a different type.",
    );
  const { hash: _hash, status: _status, ...unsigned } = a;
  if (a.hash !== digest(unsigned))
    fail("INTEGRITY", "Artifact content has changed.");
  return a;
}
function current(s: LocalState, a: Artifact, seen = new Set<string>()): void {
  const key = `${a.artifactId}:${a.version}`;
  if (seen.has(key)) fail("INTEGRITY", "Artifact lineage contains a cycle.");
  seen.add(key);
  if (
    a.status === "SUPERSEDED" ||
    s.artifacts.some(
      (v) =>
        v.status === "APPROVED" &&
        v.productionId === a.productionId &&
        v.artifactId === a.artifactId &&
        v.version > a.version,
    )
  )
    fail(
      "STALE_ARTIFACT",
      "A newer artifact version invalidates this approval chain.",
    );
  for (const parent of a.parents) {
    const base = artifact(s, parent);
    if (base.productionId !== a.productionId)
      fail("INTEGRITY", "Cross-production artifact lineage is forbidden.");
    current(s, base, new Set(seen));
  }
}
function approved(
  s: LocalState,
  a: Artifact,
  type: ApprovalType,
  now: Date,
): void {
  current(s, a);
  const decision = s.approvals
    .filter(
      (p) =>
        p.artifact.artifactId === a.artifactId &&
        p.artifact.version === a.version &&
        p.type === type,
    )
    .at(-1);
  if (
    !decision ||
    decision.decision !== "APPROVED" ||
    decision.artifactHash !== a.hash ||
    (decision.validUntil && new Date(decision.validUntil) <= now)
  )
    fail(
      "APPROVAL_REQUIRED",
      `Current ${type.toLowerCase()} approval is required for this exact version.`,
    );
}
function validateScript(value: unknown): asserts value is ProductionScript {
  assertContract("productionScript", value);
  const script = value as ProductionScript;
  const facts = new Map(script.facts.map((f) => [f.id, f]));
  const sources = new Set(script.sources.map((s) => s.id));
  if (
    facts.size !== script.facts.length ||
    sources.size !== script.sources.length
  )
    fail("INVALID_SCRIPT", "Fact and source identifiers must be unique.");
  for (const fact of script.facts)
    if (fact.sourceIds.some((id) => !sources.has(id)))
      fail("INVALID_SCRIPT", "Every fact needs a supplied source.");
  let end = 0;
  const ids = new Set<string>();
  for (const scene of script.scenes) {
    if (
      ids.has(scene.id) ||
      Math.abs(scene.start - end) > 0.01 ||
      scene.end <= scene.start
    )
      fail("INVALID_SCRIPT", "Scenes must be unique, contiguous, and ordered.");
    ids.add(scene.id);
    end = scene.end;
    for (const fact of scene.factRefs)
      if (
        !facts.has(fact) ||
        !facts.get(fact)!.sourceIds.some((id) => scene.sourceRefs.includes(id))
      )
        fail("INVALID_SCRIPT", "Scene facts require known source references.");
    if (scene.sourceRefs.some((id) => !sources.has(id)))
      fail("INVALID_SCRIPT", "Unknown scene source.");
  }
  if (Math.abs(end - script.duration) > 0.01)
    fail("INVALID_SCRIPT", "Scene duration differs from the script duration.");
  const closing = script.scenes.at(-1)!.narration;
  if (
    !closing.includes(script.contactMethod) ||
    !/sígueme|síguenos|sigue la cuenta|seguir/i.test(closing) ||
    !/me gusta|like/i.test(closing) ||
    !/comenta|comentario/i.test(closing)
  )
    fail(
      "INVALID_SCRIPT",
      "Closing must preserve contact and follow/like/comment calls to action.",
    );
  if (script.commercial) {
    const validity = new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
      .format(new Date(script.commercial.validUntil))
      .toLocaleLowerCase("es-MX");
    if (
      !closing.toLocaleLowerCase("es-MX").includes(validity) ||
      !script.scenes
        .at(-1)!
        .onScreen.toLocaleLowerCase("es-MX")
        .includes(validity)
    )
      fail(
        "INVALID_SCRIPT",
        "Commercial validity must remain in both final narration and on-screen copy.",
      );
  }
  if (
    script.commercial &&
    (script.commercial.sourceIds.some((id) => !sources.has(id)) ||
      new Date(script.commercial.confirmedAt) >=
        new Date(script.commercial.validUntil))
  )
    fail(
      "INVALID_SCRIPT",
      "Commercial confirmation needs source references and a future expiry.",
    );
}
function record(
  s: LocalState,
  type: string,
  pid: string,
  actor: Actor,
  now: Date,
  details: Record<string, unknown>,
): void {
  s.events.push({
    id: `evt_${randomUUID()}`,
    at: now.toISOString(),
    type,
    productionId: pid,
    actor,
    details,
  });
}
function put(
  s: LocalState,
  pid: string,
  id: string,
  kind: ArtifactKind,
  payload: unknown,
  parents: Ref[],
  actor: Actor,
  now: Date,
  sourceCommit: string,
  workflowId: string,
  lockedFactsHash: string,
): Artifact {
  assertId(id);
  production(s, pid);
  for (const parent of parents) {
    const a = artifact(s, parent);
    if (a.productionId !== pid)
      fail("INTEGRITY", "Parent belongs to another production.");
    current(s, a);
  }
  const previous = s.artifacts
    .filter((a) => a.productionId === pid && a.artifactId === id)
    .at(-1);
  if (previous && previous.kind !== kind)
    fail("INVALID_ARTIFACT", "Artifact identity cannot change kind.");
  if (s.artifacts.some((a) => a.productionId !== pid && a.artifactId === id))
    fail(
      "INVALID_ARTIFACT",
      "Artifact identifier is already used by another production.",
    );
  const version = (previous?.version ?? 0) + 1;
  const provenance = {
    workflowId,
    workflowVersion: "1.0.0",
    sourceCommit,
    runner: "local-deterministic",
  };
  const unsigned = {
    artifactId: id,
    version,
    productionId: pid,
    parentVersion: previous?.version ?? null,
    kind,
    payload: structuredClone(payload),
    parents: parents.map((p) => ({
      artifactId: p.artifactId,
      version: p.version,
    })),
    lockedFactsHash,
    provenance,
    createdBy: actor,
    createdAt: now.toISOString(),
  };
  const a: Artifact = {
    ...unsigned,
    status: "CANDIDATE",
    hash: digest(unsigned),
  };

  s.artifacts.push(a);
  record(s, "artifact.created", pid, actor, now, {
    artifactId: id,
    version,
    hash: a.hash,
  });
  return a;
}
function scriptReady(s: LocalState, a: Artifact, now: Date): ProductionScript {
  const script = a.payload;
  validateScript(script);
  if (
    /\[[^\]]+\]/.test(
      script.scenes
        .map((scene) =>
          [scene.narration, scene.visual, scene.onScreen].join(" "),
        )
        .join(" "),
    ) ||
    /POR CONFIRMAR/.test(script.contactMethod)
  )
    fail(
      "UNRESOLVED_PLACEHOLDER",
      "Resolve all script placeholders before recording or rendering.",
    );
  approved(s, a, "FACTUAL", now);
  approved(s, a, "CREATIVE", now);
  const p = production(s, a.productionId);
  if (
    p.mode === "PROMO" &&
    (!script.commercial || !script.scenes.some((scene) => scene.commercial))
  )
    fail(
      "COMMERCIAL_REQUIRED",
      "Promo recording requires confirmed offer terms and validity.",
    );
  if (script.commercial) {
    approved(s, a, "COMMERCIAL", now);
    if (
      new Date(script.commercial.validUntil) <= now ||
      new Date(script.commercial.confirmedAt) > now
    )
      fail(
        "STALE_COMMERCIAL",
        "The commercial offer is expired or has a future confirmation.",
      );
  }
  return script;
}
function masterScript(s: LocalState, a: Artifact): Artifact {
  if (a.kind === "MASTER")
    return artifact(s, (a.payload as { script: Ref }).script, "SCRIPT");
  if (a.kind === "CLIP")
    return masterScript(
      s,
      artifact(s, (a.payload as { master: Ref }).master, "MASTER"),
    );
  fail("INVALID_ARTIFACT", "Expected an approved master or clip.");
}
export class Operations {
  constructor(
    readonly store: FileOperationStore,
    readonly sourceCommit: string,
    readonly clock: () => Date = () => new Date(),
    readonly inventory?: InventoryRepository,
  ) {
    if (!/^[a-f0-9]{40}$/.test(sourceCommit))
      throw new Error("An exact source commit is required.");
  }
  async create(
    actor: Actor,
    input: {
      productionId?: string;
      vehicleId: string;
      title: string;
      mode: VideoMode;
      targetPlatforms: Platform[];
    },
  ): Promise<Production> {
    operator(actor);
    const id = input.productionId ?? `prd_${randomUUID()}`;
    assertId(id);
    assertId(input.vehicleId);
    if (
      !input.title.trim() ||
      !["PROMO", "VOICE_OVER"].includes(input.mode) ||
      !input.targetPlatforms.length ||
      input.targetPlatforms.some(
        (p) => !["TIKTOK", "INSTAGRAM", "YOUTUBE", "FACEBOOK"].includes(p),
      )
    )
      fail(
        "INVALID_PRODUCTION",
        "Title, video mode, and target platforms are required.",
      );
    const canonicalVehicle = this.inventory
      ? (await this.inventory.listVehicles()).find(
          (v) => v.vehicleId === input.vehicleId,
        )
      : undefined;
    if (this.inventory && !canonicalVehicle)
      fail(
        "UNKNOWN_VEHICLE",
        "Select a canonical inventory vehicle before creating a production.",
      );
    return this.store.transaction(async (s) => {
      if (s.productions.some((p) => p.productionId === id))
        fail("CONFLICT", "Production already exists.");
      const p: Production = {
        ...input,
        productionId: id,
        state: "BORRADOR",
        createdBy: actor,
        createdAt: this.clock().toISOString(),
        ...(canonicalVehicle
          ? {
              vehicleIdentity: {
                year: canonicalVehicle.year,
                make: canonicalVehicle.make,
                model: canonicalVehicle.model,
                trim: canonicalVehicle.trim,
                market: canonicalVehicle.market,
              },
            }
          : {}),
      };
      s.productions.push(p);
      record(s, "production.created", id, actor, this.clock(), {});
      return p;
    });
  }
  private async canonicalFacts(a: Artifact): Promise<void> {
    if (!this.inventory) return;
    const p = production(await this.store.read(), a.productionId),
      script = a.payload as ProductionScript;
    const vehicle = (await this.inventory.listVehicles()).find(
      (v) => v.vehicleId === p.vehicleId,
    );
    if (
      !vehicle ||
      (p.vehicleIdentity &&
        Object.entries(p.vehicleIdentity).some(
          ([key, value]) => vehicle[key as keyof typeof vehicle] !== value,
        ))
    )
      fail(
        "STALE_IDENTITY",
        "Canonical vehicle identity has changed or is missing.",
      );
    if (script.commercial && ["SOLD", "UNAVAILABLE"].includes(vehicle.status))
      fail(
        "STALE_COMMERCIAL",
        "Canonical inventory no longer marks the vehicle available for this offer.",
      );
    const facts = await this.inventory.listVerifiedFacts(p.vehicleId);
    for (const selected of script.facts) {
      const fact = facts.find((f) => f.vehicleFactId === selected.id);
      if (
        !fact ||
        (fact.validUntil && new Date(fact.validUntil) <= this.clock())
      )
        fail(
          "FACT_REVIEW_REQUIRED",
          "Review the selected canonical fact before approval or reuse.",
        );
      const sources = await this.inventory.listSources(fact.sourceIds);
      if (
        !selected.canonicalFactHash ||
        selected.canonicalFactHash !== digest({ fact, sources })
      )
        fail(
          "STALE_FACT",
          "Bind current reviewed canonical facts and sources to a new script version.",
        );
    }
  }
  async bindFacts(actor: Actor, ref: Ref): Promise<Artifact> {
    operator(actor);
    if (!this.inventory)
      fail("INVENTORY_REQUIRED", "Canonical inventory must be configured.");
    const snapshot = await this.store.read(),
      a = artifact(snapshot, ref, "SCRIPT");
    current(snapshot, a);
    const p = production(snapshot, a.productionId),
      script = structuredClone(a.payload) as ProductionScript;
    const facts = await this.inventory.listVerifiedFacts(p.vehicleId);
    script.verifiedReferences = { facts: [], sources: [] };
    for (const selected of script.facts) {
      const fact = facts.find((f) => f.vehicleFactId === selected.id);
      if (!fact)
        fail(
          "FACT_REVIEW_REQUIRED",
          "Verify the selected fact in canonical inventory first.",
        );
      const sources = await this.inventory.listSources(fact.sourceIds);
      if (
        selected.sourceIds.length !== fact.sourceIds.length ||
        selected.sourceIds.some((id) => !fact.sourceIds.includes(id)) ||
        sources.some(
          (src) =>
            !script.sources.some(
              (s) => s.id === src.sourceId && s.url === src.url,
            ),
        )
      )
        fail(
          "SOURCE_MISMATCH",
          "Script sources differ from the reviewed canonical fact sources.",
        );
      if (
        selected.canonicalValue === undefined ||
        digest(selected.canonicalValue) !== digest(fact.value) ||
        selected.canonicalUnit !== fact.unit
      )
        fail(
          "FACT_VALUE_MISMATCH",
          "The candidate fact value/unit differs from verified inventory; revise the script candidate before binding.",
        );
      selected.canonicalFactHash = digest({ fact, sources });
      script.verifiedReferences.facts.push(structuredClone(fact));
      for (const source of sources)
        if (
          !script.verifiedReferences.sources.some(
            (s) => s.sourceId === source.sourceId,
          )
        )
          script.verifiedReferences.sources.push(structuredClone(source));
    }
    await this.canonicalFacts({ ...a, payload: script });
    const bound = await this.saveScript(
      actor,
      a.productionId,
      a.artifactId,
      script,
    );
    return bound;
  }
  async saveScript(
    actor: Actor,
    pid: string,
    id: string,
    value: unknown,
  ): Promise<Artifact> {
    operator(actor);
    validateScript(value);
    return this.store.transaction(async (s) =>
      put(
        s,
        pid,
        id,
        "SCRIPT",
        value,
        [],
        actor,
        this.clock(),
        this.sourceCommit,
        "register-script",
        digest({
          verifiedReferences: value.verifiedReferences ?? null,
          facts: value.facts,
          sources: value.sources,
          commercial: value.commercial,
          contactMethod: value.contactMethod,
        }),
      ),
    );
  }
  async adapt(
    actor: Actor,
    base: Ref,
    changes: Array<{
      sceneId: string;
      narration?: string;
      visual?: string;
      onScreen?: string;
    }>,
  ): Promise<{
    artifact: Artifact;
    technicalReviewRequired: boolean;
    changes: unknown[];
  }> {
    reviewer(actor);
    return this.store.transaction(async (s) => {
      const original = artifact(s, base, "SCRIPT");
      current(s, original);
      const script = structuredClone(original.payload) as ProductionScript;
      let technicalReviewRequired = false;
      if (
        changes.length === 0 ||
        new Set(changes.map((c) => c.sceneId)).size !== changes.length
      )
        fail("INVALID_REVISION", "Supply unique scene changes.");
      const diff: unknown[] = [];
      for (const change of changes) {
        if (
          Object.keys(change).some(
            (k) => !["sceneId", "narration", "visual", "onScreen"].includes(k),
          )
        )
          fail("LOCKED_FIELD", "Only creative fields can be adapted.");
        const scene = script.scenes.find((b) => b.id === change.sceneId);
        if (!scene) fail("INVALID_REVISION", "Unknown scene.");
        for (const key of ["narration", "visual", "onScreen"] as const)
          if (change[key] !== undefined && change[key] !== scene[key]) {
            if (typeof change[key] !== "string" || !change[key]!.trim())
              fail("INVALID_REVISION", "Creative text cannot be empty.");
            if (
              scene.factRefs.length ||
              scene.commercial ||
              script.scenes.at(-1)?.id === scene.id
            )
              technicalReviewRequired = true;
            diff.push({
              sceneId: scene.id,
              field: key,
              before: scene[key],
              after: change[key],
            });
            scene[key] = change[key]!;
          }
      }
      validateScript(script);
      const a = put(
        s,
        original.productionId,
        original.artifactId,
        "SCRIPT",
        script,
        [],
        actor,
        this.clock(),
        this.sourceCommit,
        "adapt-presenter-script",
        original.lockedFactsHash,
      );
      record(s, "script.adapted", a.productionId, actor, this.clock(), {
        base,
        revision: { artifactId: a.artifactId, version: a.version },
        technicalReviewRequired,
        changes: diff,
      });
      return { artifact: a, technicalReviewRequired, changes: diff };
    });
  }
  async approve(
    actor: Actor,
    ref: Ref,
    type: ApprovalType,
    decision: "APPROVED" | "REJECTED",
    notes: string,
    validUntil: string | null = null,
  ): Promise<unknown> {
    reviewer(actor);
    if (type !== "CREATIVE") operator(actor);
    if (
      ![
        "FACTUAL",
        "CREATIVE",
        "COMMERCIAL",
        "RIGHTS",
        "TECHNICAL",
        "PUBLICATION",
      ].includes(type) ||
      !["APPROVED", "REJECTED"].includes(decision) ||
      !notes.trim()
    )
      fail("INVALID_APPROVAL", "Typed approval and review notes are required.");
    if (
      validUntil &&
      (!Number.isFinite(Date.parse(validUntil)) ||
        new Date(validUntil) <= this.clock())
    )
      fail("INVALID_APPROVAL", "Approval expiry must be in the future.");
    return this.store.transaction(async (s) => {
      const a = artifact(s, ref);
      current(s, a);
      if (type === "FACTUAL" && decision === "APPROVED")
        await this.canonicalFacts(a);
      if (
        (["FACTUAL", "COMMERCIAL"].includes(type) && a.kind !== "SCRIPT") ||
        (type === "PUBLICATION" && a.kind !== "PUBLICATION_PACKAGE") ||
        (["TECHNICAL", "RIGHTS"].includes(type) &&
          !["MASTER", "CLIP"].includes(a.kind))
      )
        fail(
          "INVALID_APPROVAL",
          "Approval type does not apply to this artifact.",
        );
      const approval = {
        approvalId: `apr_${randomUUID()}`,
        productionId: a.productionId,
        artifact: { artifactId: ref.artifactId, version: ref.version },
        artifactHash: a.hash,
        type,
        decision,
        decidedBy: actor,
        decidedAt: this.clock().toISOString(),
        notes,
        validUntil,
      };
      s.approvals.push(approval);
      const required: ApprovalType[] =
        a.kind === "SCRIPT"
          ? [
              "FACTUAL",
              "CREATIVE",
              ...((a.payload as ProductionScript).commercial
                ? ["COMMERCIAL" as const]
                : []),
            ]
          : ["MASTER", "CLIP"].includes(a.kind)
            ? ["CREATIVE", "TECHNICAL", "RIGHTS"]
            : a.kind === "PUBLICATION_PACKAGE"
              ? ["PUBLICATION"]
              : ["CREATIVE"];
      const latest = required.map((gate) =>
        s.approvals
          .filter(
            (p) =>
              p.artifact.artifactId === a.artifactId &&
              p.artifact.version === a.version &&
              p.type === gate,
          )
          .at(-1),
      );
      a.status = latest.some((p) => p?.decision === "REJECTED")
        ? "REJECTED"
        : latest.every((p) => p?.decision === "APPROVED")
          ? "APPROVED"
          : "IN_REVIEW";
      if (a.status === "APPROVED")
        for (const older of s.artifacts)
          if (
            older.productionId === a.productionId &&
            older.artifactId === a.artifactId &&
            older.version < a.version &&
            older.status !== "REJECTED"
          )
            older.status = "SUPERSEDED";
      record(s, "approval.recorded", a.productionId, actor, this.clock(), {
        ...approval,
      });
      return approval;
    });
  }
  async transition(
    actor: Actor,
    pid: string,
    to: ProductionState,
  ): Promise<Production> {
    operator(actor);
    return this.store.transaction(async (s) => {
      const p = production(s, pid),
        now = this.clock();
      if (!canTransitionProductionState(p.state, to))
        fail("INVALID_STATE", `${p.state} cannot transition to ${to}.`);
      const latest = (kind: ArtifactKind) =>
        s.artifacts
          .filter((a) => a.productionId === pid && a.kind === kind)
          .sort(
            (a, b) =>
              Number(a.status === "APPROVED") -
                Number(b.status === "APPROVED") || a.version - b.version,
          )
          .at(-1) ??
        fail(
          "ARTIFACT_REQUIRED",
          `A ${kind.toLowerCase()} artifact is required.`,
        );
      if (!["INVESTIGANDO"].includes(to)) {
        const scripts = s.artifacts.filter(
          (a) => a.productionId === pid && a.kind === "SCRIPT",
        );
        if (scripts.length) await this.canonicalFacts(latest("SCRIPT"));
      }
      if (to === "DATOS_VERIFICADOS")
        approved(s, latest("SCRIPT"), "FACTUAL", now);
      if (["GUION_GENERADO", "REVISION_PRESENTADORA"].includes(to))
        latest("SCRIPT");
      if (["APROBADO", "LISTO_PARA_GRABAR", "GRABADO"].includes(to))
        scriptReady(s, latest("SCRIPT"), now);
      if (to === "LISTO_PARA_GRABAR") {
        const plan = latest("SHOOTING_PLAN");
        current(s, plan);
        approved(s, plan, "CREATIVE", now);
      }
      if (
        to === "GRABADO" &&
        s.assets.filter((a) => a.productionId === pid).length === 0
      )
        fail("MEDIA_REQUIRED", "Recorded material has not been registered.");
      if (to === "EDITADO") {
        const master = latest("MASTER");
        current(s, master);
      }
      if (to === "LISTO") {
        const master = latest("MASTER");
        scriptReady(s, masterScript(s, master), now);
        for (const gate of ["CREATIVE", "TECHNICAL", "RIGHTS"] as const)
          approved(s, master, gate, now);
      }
      if (
        to === "PROGRAMADO" &&
        !s.publications.some((pub) => pub.productionId === pid)
      )
        fail("PUBLICATION_REQUIRED", "No approved publication is scheduled.");
      if (
        to === "PUBLICADO" &&
        (!s.publications.some((pub) => pub.productionId === pid) ||
          s.publications.some(
            (pub) => pub.productionId === pid && pub.status !== "PUBLICADO",
          ))
      )
        fail(
          "PUBLICATION_REQUIRED",
          "All scheduled publications need a confirmed remote receipt.",
        );
      if (
        to === "MEDIDO" &&
        !s.publications
          .filter((pub) => pub.productionId === pid)
          .every((pub) =>
            s.metrics.some((m) => m.publicationId === pub.publicationId),
          )
      )
        fail("METRICS_REQUIRED", "Each publication needs a metric snapshot.");
      const from = p.state;
      p.state = to;
      record(s, "production.transitioned", pid, actor, now, { from, to });
      return p;
    });
  }
  async ingest(
    actor: Actor,
    pid: string,
    path: string,
    rights: MediaAsset["rights"],
  ): Promise<MediaAsset> {
    reviewer(actor);
    production(await this.store.read(), pid);
    const asset = await ingestMedia(this.store.root, path, rights);
    await this.store.transaction(async (s) => {
      production(s, pid);
      s.assets.push({
        ...asset,
        productionId: pid,
        createdBy: actor,
        createdAt: this.clock().toISOString(),
      });
      record(s, "upload.completed", pid, actor, this.clock(), {
        assetId: asset.assetId,
        hash: asset.hash,
        bytes: asset.bytes,
        mimeType: asset.mimeType,
      });
    });
    return asset;
  }
  async registerMaster(
    actor: Actor,
    pid: string,
    id: string,
    scriptRef: Ref,
    assetId: string,
  ): Promise<Artifact> {
    operator(actor);
    const snapshot = await this.store.read();
    const media = snapshot.assets.find(
      (a) => a.assetId === assetId && a.productionId === pid,
    );
    if (
      !media ||
      media.kind !== "VIDEO" ||
      media.width !== 1080 ||
      media.height !== 1920 ||
      !media.hasAudio
    )
      fail(
        "INVALID_MEDIA",
        "Edited masters must be registered 1080×1920 videos with audio.",
      );
    await verifyAsset(this.store.root, media);
    return this.store.transaction(async (s) => {
      const script = artifact(s, scriptRef, "SCRIPT");
      if (script.productionId !== pid)
        fail("INTEGRITY", "Script belongs to another production.");
      await this.canonicalFacts(script);
      const content = scriptReady(s, script, this.clock());
      if (Math.abs(media.duration - content.duration) > 0.15)
        fail(
          "INVALID_MEDIA",
          "Master duration differs from the approved script.",
        );
      return put(
        s,
        pid,
        id,
        "MASTER",
        {
          asset: media,
          script: scriptRef,
          technicalQa: {
            passed: true,
            width: 1080,
            height: 1920,
            hasAudio: true,
            duration: media.duration,
          },
        },
        [scriptRef],
        actor,
        this.clock(),
        this.sourceCommit,
        "register-edited-master",
        script.lockedFactsHash,
      );
    });
  }
  async saveRenderPlan(
    actor: Actor,
    pid: string,
    id: string,
    value: unknown,
  ): Promise<Artifact> {
    operator(actor);
    assertContract("renderPlan", value);
    const plan = value as RenderPlan;
    return this.store.transaction(async (s) => {
      const a = artifact(
        s,
        { artifactId: plan.scriptId, version: plan.scriptVersion },
        "SCRIPT",
      );
      if (a.productionId !== pid)
        fail("INTEGRITY", "Script belongs to another production.");
      await this.canonicalFacts(a);
      const script = scriptReady(s, a, this.clock());
      const sceneDuration = new Map<string, number>();
      let total = 0;
      for (const seg of plan.segments) {
        const media = s.assets.find(
          (m) => m.assetId === seg.assetId && m.productionId === pid,
        );
        if (!media || !script.scenes.some((sc) => sc.id === seg.sceneId))
          fail(
            "INVALID_EDIT",
            "Edit references another production, missing media, or an unknown scene.",
          );
        const duration = seg.end - seg.start;
        if (
          duration <= 0 ||
          seg.start < 0 ||
          (media.kind !== "IMAGE" && seg.end > media.duration + 0.05)
        )
          fail("INVALID_EDIT", "Invalid source range.");
        total += duration;
        sceneDuration.set(
          seg.sceneId,
          (sceneDuration.get(seg.sceneId) ?? 0) + duration,
        );
      }
      if (
        Math.abs(total - script.duration) > 0.1 ||
        script.scenes.some(
          (sc) =>
            Math.abs((sceneDuration.get(sc.id) ?? 0) - (sc.end - sc.start)) >
            0.1,
        )
      )
        fail(
          "INVALID_EDIT",
          "Edit must cover every scene at its approved duration.",
        );
      let lastScene = -1;
      for (const segment of plan.segments) {
        const index = script.scenes.findIndex(
          (sc) => sc.id === segment.sceneId,
        );
        if (index < lastScene)
          fail(
            "INVALID_EDIT",
            "Edit scene order differs from the approved script.",
          );
        lastScene = index;
      }
      if (
        plan.audioMode === "VOICE_OVER" &&
        !s.assets.some(
          (m) =>
            m.assetId === plan.voiceoverAssetId &&
            m.productionId === pid &&
            m.hasAudio,
        )
      )
        fail(
          "INVALID_EDIT",
          "Register the voice-over audio for this production.",
        );
      if (
        production(s, pid).mode === "VOICE_OVER" &&
        plan.audioMode !== "VOICE_OVER"
      )
        fail(
          "INVALID_EDIT",
          "Voice-over productions require a voice-over audio track.",
        );
      const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
      const allowed = normalize(
        script.scenes.map((sc) => sc.narration).join(" "),
      );
      if (
        plan.subtitles.length &&
        normalize(plan.subtitles.map((c) => c.text).join(" ")) !== allowed
      )
        fail(
          "INVALID_EDIT",
          "Subtitles must reproduce the approved narration without changing facts.",
        );
      if (
        plan.subtitles.some(
          (c) => c.end > total || c.end <= c.start || c.start < 0,
        )
      )
        fail("INVALID_EDIT", "Subtitle time is outside the edit.");
      return put(
        s,
        pid,
        id,
        "RENDER_PLAN",
        plan,
        [a],
        actor,
        this.clock(),
        this.sourceCommit,
        "prepare-render-plan",
        a.lockedFactsHash,
      );
    });
  }
  async enqueue(
    actor: Actor,
    request: {
      workflowId: Job["workflowId"];
      workflowVersion: "1.0.0";
      productionId: string;
      idempotencyKey: string;
      input: Record<string, unknown>;
    },
  ): Promise<Job> {
    if (request.workflowId === "create-shooting-plan") reviewer(actor);
    else operator(actor);
    assertContract("jobRequest", request);
    this.validateJobInput(request.workflowId, request.input);
    await validateDeterministicWorkflow(request.workflowId, request.input);
    return this.store.transaction(async (s) => {
      production(s, request.productionId);
      const hash = digest(request);
      const prior = s.jobs.find(
        (j) => j.idempotencyKey === request.idempotencyKey,
      );
      if (prior) {
        if (prior.requestHash !== hash)
          fail(
            "IDEMPOTENCY_CONFLICT",
            "Idempotency key was already used with different inputs.",
          );
        return prior;
      }
      const job: Job = {
        ...request,
        jobId: `job_${randomUUID()}`,
        requestHash: hash,
        requestedBy: actor,
        status: "QUEUED",
        attempt: 0,
        maxAttempts: 3,
        leaseToken: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        availableAt: this.clock().toISOString(),
        result: [],
        error: null,
      };
      s.jobs.push(job);
      record(s, "job.created", request.productionId, actor, this.clock(), {
        jobId: job.jobId,
      });
      return job;
    });
  }
  private validateJobInput(
    id: Job["workflowId"],
    input: Record<string, unknown>,
  ): void {
    const allowed: Record<Job["workflowId"], string[]> = {
      "create-shooting-plan": ["script", "artifactId"],
      "render-video": ["plan", "artifactId"],
      "extract-clips": ["master", "clips"],
      "prepare-publication-package": ["request", "artifactId"],
    };
    if (
      Object.keys(input).some((k) => !allowed[id].includes(k)) ||
      allowed[id].some((k) => !(k in input))
    )
      fail("INVALID_JOB", "Unexpected or missing job input.");
    const ref =
      id === "create-shooting-plan"
        ? input.script
        : id === "render-video"
          ? input.plan
          : id === "extract-clips"
            ? input.master
            : null;
    if (ref) {
      const r = ref as Ref;
      assertId(r.artifactId);
      if (
        Object.keys(r).sort().join(",") !== "artifactId,version" ||
        !Number.isInteger(r.version) ||
        r.version < 1
      )
        fail("INVALID_JOB", "Invalid artifact reference.");
    }
    if (id !== "extract-clips") assertId(input.artifactId as string);
    if (id === "prepare-publication-package")
      assertContract("publicationRequest", input.request);
    if (id === "extract-clips") {
      const clips = input.clips as Array<{
        clipId: string;
        start: number;
        end: number;
        standaloneConfirmed: boolean;
        purpose: string;
      }>;
      if (
        !Array.isArray(clips) ||
        !clips.length ||
        clips.length > 6 ||
        new Set(clips.map((c) => c.clipId)).size !== clips.length
      )
        fail("INVALID_JOB", "Supply one to six unique complete clips.");
      for (const c of clips) {
        assertId(c.clipId);
        if (
          Object.keys(c).sort().join(",") !==
            "clipId,end,purpose,standaloneConfirmed,start" ||
          !c.purpose.trim() ||
          c.standaloneConfirmed !== true ||
          !Number.isFinite(c.start) ||
          !Number.isFinite(c.end) ||
          c.start < 0 ||
          c.end - c.start < 15 ||
          c.end - c.start > 35
        )
          fail(
            "INVALID_JOB",
            "Every clip needs a complete idea and an approved 15–35 second range.",
          );
      }
    }
  }
  async claim(worker: string, leaseSeconds = 300): Promise<Job | null> {
    assertId(worker);
    if (
      !Number.isInteger(leaseSeconds) ||
      leaseSeconds < 10 ||
      leaseSeconds > 900
    )
      fail("INVALID_LEASE", "Lease must be 10–900 seconds.");
    return this.store.transaction(async (s) => {
      const now = this.clock(),
        actor: Actor = { role: "worker", name: worker };
      for (const j of s.jobs)
        if (
          ["CLAIMED", "RUNNING", "VALIDATING"].includes(j.status) &&
          j.leaseExpiresAt &&
          new Date(j.leaseExpiresAt) <= now
        ) {
          j.status =
            j.attempt >= j.maxAttempts ? "DEAD_LETTER" : "RETRY_PENDING";
          j.availableAt = now.toISOString();
          j.leaseToken = null;
          j.leaseOwner = null;
          j.leaseExpiresAt = null;
          record(s, "job.lease_expired", j.productionId, actor, now, {
            jobId: j.jobId,
            status: j.status,
          });
        }
      for (const j of s.jobs)
        if (j.status === "RETRY_PENDING" && new Date(j.availableAt) <= now)
          j.status = "QUEUED";
      const job = s.jobs.find(
        (j) => j.status === "QUEUED" && new Date(j.availableAt) <= now,
      );
      if (!job) return null;
      job.status = "CLAIMED";
      job.attempt++;
      job.leaseToken = randomUUID();
      job.leaseOwner = worker;
      job.leaseExpiresAt = new Date(
        now.getTime() + leaseSeconds * 1000,
      ).toISOString();
      record(s, "job.claimed", job.productionId, actor, now, {
        jobId: job.jobId,
        attempt: job.attempt,
      });
      return structuredClone(job);
    });
  }
  private lease(s: LocalState, id: string, token: string): Job {
    const j = s.jobs.find((j) => j.jobId === id);
    if (
      !j ||
      j.leaseToken !== token ||
      !j.leaseExpiresAt ||
      new Date(j.leaseExpiresAt) <= this.clock() ||
      !["CLAIMED", "RUNNING", "VALIDATING"].includes(j.status)
    )
      fail(
        "INVALID_LEASE",
        "Lease is expired, revoked, or belongs to another worker.",
      );
    return j;
  }
  async heartbeat(id: string, token: string): Promise<void> {
    await this.store.transaction(async (s) => {
      const j = this.lease(s, id, token);
      j.leaseExpiresAt = new Date(
        this.clock().getTime() + 300000,
      ).toISOString();
    });
  }
  async failJob(
    id: string,
    token: string,
    code: string,
    retryable = true,
  ): Promise<void> {
    await this.store.transaction(async (s) => {
      const j = this.lease(s, id, token);
      j.status = "FAILED";
      j.error = code.slice(0, 150);
      record(
        s,
        "job.failed",
        j.productionId,
        { role: "worker", name: j.leaseOwner! },
        this.clock(),
        { jobId: id, code: j.error },
      );
      j.status =
        retryable && j.attempt < j.maxAttempts
          ? "RETRY_PENDING"
          : "DEAD_LETTER";
      j.availableAt = new Date(
        this.clock().getTime() + Math.min(60000, 1000 * 2 ** j.attempt),
      ).toISOString();
      j.leaseToken = null;
      j.leaseOwner = null;
      j.leaseExpiresAt = null;
    });
  }
  async retry(actor: Actor, id: string): Promise<void> {
    operator(actor);
    await this.store.transaction(async (s) => {
      const j = s.jobs.find((j) => j.jobId === id);
      if (!j || !["DEAD_LETTER", "RETRY_PENDING"].includes(j.status))
        fail("INVALID_JOB", "Only pending or dead-letter jobs can be retried.");
      j.status = "QUEUED";
      j.attempt = 0;
      j.availableAt = this.clock().toISOString();
      record(s, "job.retry_requested", j.productionId, actor, this.clock(), {
        jobId: id,
      });
    });
  }
  async executeClaimed(job: Job): Promise<Ref[]> {
    const token = job.leaseToken!;
    await this.store.transaction(async (s) => {
      const j = this.lease(s, job.jobId, token);
      j.status = "RUNNING";
      record(
        s,
        "job.started",
        j.productionId,
        { role: "worker", name: j.leaseOwner! },
        this.clock(),
        { jobId: j.jobId },
      );
    });
    const heartbeat = setInterval(() => {
      void this.heartbeat(job.jobId, token).catch(() => {});
    }, 30000);
    try {
      const {
        workflowId,
        workflowVersion,
        productionId,
        idempotencyKey,
        input,
      } = job;
      if (
        job.requestHash !==
        digest({
          workflowId,
          workflowVersion,
          productionId,
          idempotencyKey,
          input,
        })
      )
        fail("INTEGRITY", "Job input no longer matches its immutable request.");
      await validateDeterministicWorkflow(job.workflowId, job.input);
      const results = await this.prepareJob(job);
      await validateDeterministicWorkflow(job.workflowId, job.input, {
        artifacts: results.map((r) => ({ artifactId: r.id, version: 1 })),
      });
      return await this.store.transaction(async (s) => {
        const j = this.lease(s, job.jobId, token);
        j.status = "VALIDATING";
        const refs = results.map((r) => {
          for (const parent of r.parents) current(s, artifact(s, parent));
          const a = put(
            s,
            j.productionId,
            r.id,
            r.kind,
            r.payload,
            r.parents,
            { role: "worker", name: j.leaseOwner! },
            this.clock(),
            this.sourceCommit,
            j.workflowId,
            r.lockedFactsHash,
          );
          return { artifactId: a.artifactId, version: a.version };
        });
        j.result = refs;
        j.status = "COMPLETED";
        record(
          s,
          "job.completed",
          j.productionId,
          { role: "worker", name: j.leaseOwner! },
          this.clock(),
          { jobId: j.jobId, result: refs },
        );
        j.leaseToken = null;
        j.leaseOwner = null;
        j.leaseExpiresAt = null;
        return refs;
      });
    } catch (error) {
      try {
        await this.failJob(
          job.jobId,
          token,
          error instanceof OperationError ? error.code : "PROCESSING_FAILED",
          !(error instanceof OperationError),
        );
      } catch {
        /* A superseded lease cannot change the newer attempt. */
      }
      throw error;
    } finally {
      clearInterval(heartbeat);
    }
  }
  private async prepareJob(j: Job): Promise<
    Array<{
      id: string;
      kind: ArtifactKind;
      payload: unknown;
      parents: Ref[];
      lockedFactsHash: string;
    }>
  > {
    const s = await this.store.read(),
      now = this.clock();
    const actor: Actor = { role: "worker", name: j.leaseOwner! };
    const get = (ref: Ref, kind: ArtifactKind) => {
      const a = artifact(s, ref, kind);
      if (a.productionId !== j.productionId)
        fail("INTEGRITY", "Job references another production.");
      current(s, a);
      return a;
    };
    if (j.workflowId === "create-shooting-plan") {
      await this.canonicalFacts(get(j.input.script as Ref, "SCRIPT"));
      const a = get(j.input.script as Ref, "SCRIPT"),
        script = scriptReady(s, a, now),
        mode = production(s, j.productionId).mode;
      const payload = {
        script: { artifactId: a.artifactId, version: a.version },
        mode,
        title: script.title,
        shots: script.scenes.map((scene) => ({
          sceneId: scene.id,
          start: scene.start,
          end: scene.end,
          say: scene.narration,
          show: scene.visual,
          onScreen: scene.onScreen,
          recordAudio:
            mode === "VOICE_OVER"
              ? "Graba la voz por separado, sin música."
              : "Graba la narración con audio claro o entrégala por separado.",
          status: "PENDING",
        })),
        checklist: [
          "Graba en vertical, con luz estable y sin marcas de agua.",
          "Confirma permiso de grabación y de las personas visibles.",
          "Captura el inicio y el cierre completos de cada bloque.",
          "Comprueba el enfoque y escucha el audio antes de terminar.",
          "Conserva los originales; no agregues música sin licencia.",
          ...(script.commercial
            ? ["Confirma la oferta y su vigencia antes de grabar."]
            : []),
        ],
      };
      return [
        {
          id: j.input.artifactId as string,
          kind: "SHOOTING_PLAN",
          payload,
          parents: [a],
          lockedFactsHash: a.lockedFactsHash,
        },
      ];
    }
    if (j.workflowId === "render-video") {
      const a = get(j.input.plan as Ref, "RENDER_PLAN"),
        plan = a.payload as RenderPlan;
      const script = get(
        { artifactId: plan.scriptId, version: plan.scriptVersion },
        "SCRIPT",
      );
      await this.canonicalFacts(script);
      scriptReady(s, script, now);
      approved(s, a, "CREATIVE", now);
      const master = await renderVideo(
        this.store.root,
        plan,
        s.assets.filter((m) => m.productionId === j.productionId),
        join(
          this.store.root,
          "productions",
          j.productionId,
          "renders",
          `${j.jobId}-${j.attempt}`,
        ),
        (script.payload as ProductionScript).scenes
          .filter((scene) => scene.onScreen.trim())
          .map((scene) => ({
            start: scene.start,
            end: scene.end,
            text: scene.onScreen,
          })),
      );
      return [
        {
          id: j.input.artifactId as string,
          kind: "MASTER",
          payload: {
            asset: master,
            script: { artifactId: script.artifactId, version: script.version },
            plan: { artifactId: a.artifactId, version: a.version },
            technicalQa: {
              width: 1080,
              height: 1920,
              hasAudio: true,
              duration: master.duration,
              passed: true,
            },
          },
          parents: [a, script],
          lockedFactsHash: script.lockedFactsHash,
        },
      ];
    }
    if (j.workflowId === "extract-clips") {
      const master = get(j.input.master as Ref, "MASTER");
      for (const gate of ["CREATIVE", "TECHNICAL", "RIGHTS"] as const)
        approved(s, master, gate, now);
      await this.canonicalFacts(masterScript(s, master));
      const script = scriptReady(s, masterScript(s, master), now);
      const clips = j.input.clips as Array<{
        clipId: string;
        start: number;
        end: number;
        purpose: string;
        standaloneConfirmed: true;
      }>;
      for (const clip of clips) {
        const overlap = script.scenes.filter(
          (scene) => scene.start < clip.end && scene.end > clip.start,
        );
        if (
          overlap.some(
            (scene) =>
              (scene.factRefs.length || scene.commercial) &&
              (clip.start > scene.start + 0.05 || clip.end < scene.end - 0.05),
          )
        )
          fail(
            "INCOMPLETE_CLIP",
            "Factual or commercial narration cannot be cut without a separately reviewed edit/pickup.",
          );
        const closing = script.scenes.at(-1)!;
        if (
          overlap.some((scene) => scene.commercial) &&
          (clip.start > closing.start || clip.end < closing.end)
        )
          fail(
            "INCOMPLETE_PROMO_CLIP",
            "A commercial clip must retain its complete validity and closing; prepare a reviewed pickup instead.",
          );
      }
      return await Promise.all(
        clips.map(async (clip) => ({
          id: clip.clipId,
          kind: "CLIP" as const,
          payload: {
            asset: await extractClip(
              this.store.root,
              (master.payload as { asset: MediaAsset }).asset,
              clip.start,
              clip.end,
              join(
                this.store.root,
                "productions",
                j.productionId,
                "clips",
                `${j.jobId}-${j.attempt}`,
                `${clip.clipId}.mp4`,
              ),
            ),
            master: { artifactId: master.artifactId, version: master.version },
            interval: [clip.start, clip.end],
            purpose: clip.purpose,
            standaloneConfirmed: true,
          },
          parents: [master],
          lockedFactsHash: master.lockedFactsHash,
        })),
      );
    }
    const request = j.input.request as unknown as PublicationRequest;
    assertContract("publicationRequest", request);
    const master = artifact(s, {
      artifactId: request.masterId,
      version: request.masterVersion,
    });
    if (
      !["MASTER", "CLIP"].includes(master.kind) ||
      master.productionId !== j.productionId
    )
      fail(
        "INVALID_ARTIFACT",
        "Package needs a master or clip from this production.",
      );
    for (const gate of ["CREATIVE", "TECHNICAL", "RIGHTS"] as const)
      approved(s, master, gate, now);
    await this.canonicalFacts(masterScript(s, master));
    const script = scriptReady(s, masterScript(s, master), now);
    if (
      !production(s, j.productionId).targetPlatforms.includes(request.platform)
    )
      fail("INVALID_PLATFORM", "Platform is not a target for this production.");
    const limits: Record<Platform, number> = {
      TIKTOK: 2200,
      INSTAGRAM: 2200,
      YOUTUBE: 5000,
      FACEBOOK: 5000,
    };
    const text = [
      request.caption,
      ...request.hashtags,
      request.disclosure ?? "",
    ].join("\n");
    if ([...text].length > limits[request.platform] || /\[[^\]]+\]/.test(text))
      fail(
        "INVALID_CAPTION",
        "Caption exceeds the pilot limit or contains placeholders.",
      );
    if (script.commercial && !request.disclosure?.trim())
      fail(
        "DISCLOSURE_REQUIRED",
        "Commercial content needs an explicit relationship disclosure.",
      );
    const asset = (master.payload as { asset: MediaAsset }).asset;
    await verifyAsset(this.store.root, asset);
    return [
      {
        id: j.input.artifactId as string,
        kind: "PUBLICATION_PACKAGE",
        payload: {
          ...request,
          asset,
          script: {
            artifactId: masterScript(s, master).artifactId,
            version: masterScript(s, master).version,
          },
          sources: script.sources,
          finalCaption: text,
          publishingMethod: "MANUAL",
          notice:
            "Operator must review current platform rules and confirm the remote receipt.",
        },
        parents: [master, masterScript(s, master)],
        lockedFactsHash: master.lockedFactsHash,
      },
    ];
  }
  async cycle(
    worker = "local_worker",
  ): Promise<{ jobId: string; result: Ref[] } | null> {
    const j = await this.claim(worker);
    return j ? { jobId: j.jobId, result: await this.executeClaimed(j) } : null;
  }
  private async publicationReady(
    s: LocalState,
    a: Artifact,
  ): Promise<
    PublicationRequest & {
      asset: MediaAsset;
      script: Ref;
      finalCaption: string;
    }
  > {
    approved(s, a, "PUBLICATION", this.clock());
    await this.canonicalFacts(
      artifact(s, (a.payload as { script: Ref }).script, "SCRIPT"),
    );
    const payload = a.payload as PublicationRequest & {
      asset: MediaAsset;
      script: Ref;
      finalCaption: string;
    };
    const script = scriptReady(
      s,
      artifact(s, payload.script, "SCRIPT"),
      this.clock(),
    );
    const master = artifact(s, {
      artifactId: payload.masterId,
      version: payload.masterVersion,
    });
    for (const gate of ["CREATIVE", "TECHNICAL", "RIGHTS"] as const)
      approved(s, master, gate, this.clock());
    if (script.commercial) {
      const day = this.clock().toISOString().slice(0, 10);
      const commercial = s.approvals
        .filter(
          (p) =>
            p.artifact.artifactId === payload.script.artifactId &&
            p.artifact.version === payload.script.version &&
            p.type === "COMMERCIAL",
        )
        .at(-1)!;
      if (
        commercial.decidedAt.slice(0, 10) !== day ||
        script.commercial.confirmedAt.slice(0, 10) !== day
      )
        fail(
          "STALE_COMMERCIAL",
          "Reconfirm availability and commercial terms on the publication day; save a new script version when terms change.",
        );
    }
    return payload;
  }
  async schedule(actor: Actor, ref: Ref, key: string): Promise<unknown> {
    operator(actor);
    if (!key.trim())
      fail("INVALID_KEY", "Publication idempotency key is required.");
    return this.store.transaction(async (s) => {
      const a = artifact(s, ref, "PUBLICATION_PACKAGE"),
        payload = await this.publicationReady(s, a);
      const existing = s.publications.find(
        (p) =>
          p.idempotencyKey === key ||
          (p.package.artifactId === ref.artifactId &&
            p.package.version === ref.version),
      );
      if (existing) {
        if (
          existing.package.artifactId !== ref.artifactId ||
          existing.package.version !== ref.version
        )
          fail("IDEMPOTENCY_CONFLICT", "Publication key was already used.");
        return existing;
      }
      if (
        production(s, a.productionId).state !== "LISTO" &&
        production(s, a.productionId).state !== "PROGRAMADO"
      )
        fail("INVALID_STATE", "Production must be ready before scheduling.");
      const p = {
        publicationId: `pub_${randomUUID()}`,
        productionId: a.productionId,
        package: ref,
        platform: payload.platform,
        accountRef: payload.accountRef,
        status: "PROGRAMADO" as const,
        remoteId: null,
        url: null,
        scheduledAt: payload.scheduledAt ?? this.clock().toISOString(),
        publishedAt: null,
        idempotencyKey: key,
      };
      s.publications.push(p);
      record(s, "publication.scheduled", p.productionId, actor, this.clock(), {
        publicationId: p.publicationId,
      });
      return p;
    });
  }
  async exportPackage(actor: Actor, ref: Ref): Promise<string> {
    operator(actor);
    const s = await this.store.read(),
      a = artifact(s, ref, "PUBLICATION_PACKAGE"),
      payload = await this.publicationReady(s, a);
    await verifyAsset(this.store.root, payload.asset);
    const directory = join(
      this.store.root,
      "productions",
      a.productionId,
      "publication-packages",
      `${a.artifactId}-${a.version}`,
    );
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await copyFile(payload.asset.path, join(directory, "video.mp4"));
    await writeFile(
      join(directory, "caption.txt"),
      payload.finalCaption + "\n",
    );
    await writeFile(
      join(directory, "handoff.md"),
      `# Approved publication handoff\n\nPlatform: ${payload.platform}\nAccount reference: ${payload.accountRef}\nArtifact hash: ${a.hash}\n\nUpload video.mp4 using the intended account, check preview, caption, disclosure, rights and visibility, then capture the remote ID and URL. No content has been published by this export.\n`,
    );
    return directory;
  }
  async recordPublication(
    actor: Actor,
    id: string,
    receipt: { remoteId: string; url: string; publishedAt: string },
  ): Promise<unknown> {
    operator(actor);
    const url = new URL(receipt.url);
    if (
      !receipt.remoteId.trim() ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !Number.isFinite(Date.parse(receipt.publishedAt)) ||
      new Date(receipt.publishedAt) > this.clock()
    )
      fail(
        "INVALID_RECEIPT",
        "A real remote ID, HTTPS URL, and publication time are required.",
      );
    return this.store.transaction(async (s) => {
      const p = s.publications.find((p) => p.publicationId === id);
      if (!p) fail("NOT_FOUND", "Publication is not scheduled.");
      if (p.status === "PUBLICADO") {
        if (
          p.remoteId !== receipt.remoteId ||
          p.url !== receipt.url ||
          p.publishedAt !== receipt.publishedAt
        )
          fail("CONFLICT", "A confirmed remote receipt cannot be overwritten.");
        return p;
      }
      const a = artifact(s, p.package, "PUBLICATION_PACKAGE");
      await this.publicationReady(s, a);
      const hosts: Record<Platform, string[]> = {
        TIKTOK: ["tiktok.com"],
        INSTAGRAM: ["instagram.com"],
        YOUTUBE: ["youtube.com", "youtu.be"],
        FACEBOOK: ["facebook.com", "fb.watch"],
      };
      if (
        !hosts[p.platform].some(
          (host) => url.hostname === host || url.hostname.endsWith("." + host),
        )
      )
        fail("INVALID_RECEIPT", "Receipt URL belongs to another platform.");
      if (
        s.publications.some(
          (other) =>
            other.platform === p.platform &&
            other.remoteId === receipt.remoteId,
        )
      )
        fail("CONFLICT", "Remote publication is already registered.");
      Object.assign(p, receipt, { status: "PUBLICADO" });
      record(s, "publication.confirmed", p.productionId, actor, this.clock(), {
        publicationId: id,
        ...receipt,
      });
      return p;
    });
  }
  async metrics(
    actor: Actor,
    input: {
      publicationId: string;
      capturedAt: string;
      windowHours: number;
      metrics: Array<{
        name: string;
        definition: string;
        value: number;
        denominator: number | null;
      }>;
    },
  ): Promise<unknown> {
    operator(actor);
    if (
      !Number.isFinite(Date.parse(input.capturedAt)) ||
      new Date(input.capturedAt) > this.clock() ||
      !Number.isFinite(input.windowHours) ||
      input.windowHours < 0 ||
      !input.metrics.length ||
      input.metrics.some(
        (m) =>
          !m.name.trim() ||
          !m.definition.trim() ||
          !Number.isFinite(m.value) ||
          m.value < 0 ||
          (m.denominator !== null &&
            (!Number.isFinite(m.denominator) || m.denominator <= 0)),
      )
    )
      fail(
        "INVALID_METRICS",
        "Each snapshot needs a valid window, metric definition, and nonnegative value.",
      );
    return this.store.transaction(async (s) => {
      const p = s.publications.find(
        (p) =>
          p.publicationId === input.publicationId && p.status === "PUBLICADO",
      );
      if (!p) fail("NOT_FOUND", "Metrics require a confirmed publication.");
      if (new Date(input.capturedAt) < new Date(p.publishedAt!))
        fail("INVALID_METRICS", "Capture predates publication.");
      const snapshot = { ...input, snapshotId: `metric_${randomUUID()}` };
      s.metrics.push(snapshot);
      record(s, "metrics.captured", p.productionId, actor, this.clock(), {
        snapshotId: snapshot.snapshotId,
        publicationId: p.publicationId,
      });
      return snapshot;
    });
  }
}
