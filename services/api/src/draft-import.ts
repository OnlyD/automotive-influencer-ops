import {
  executeRegisteredWorkflow,
  loadWorkflowRegistry,
} from "@automotive/ai-runner";
import type { ProductionScript } from "@automotive/contracts";
import type { Operations } from "./engine.js";
import type { Actor, Artifact } from "./store.js";
import { digest } from "./engine.js";
export async function importValidatedDraft(
  ops: Operations,
  actor: Actor,
  pid: string,
  id: string,
  workflowId: string,
  workflowVersion: string,
  input: unknown,
  output: unknown,
): Promise<Artifact> {
  if (
    !["draft-presenter-script", "draft-promotional-script"].includes(workflowId)
  )
    throw new Error("Only registered script drafts can be imported.");
  const registry = await loadWorkflowRegistry();
  const accepted = (await executeRegisteredWorkflow(
    registry,
    { workflowId, workflowVersion, role: "technical-operator", input },
    async () => structuredClone(output),
  )) as Record<string, any>;
  const source = input as Record<string, any>;
  const state = await ops.store.read(),
    production = state.productions.find((p) => p.productionId === pid);
  if (
    !production ||
    source.production_id !== pid ||
    source.vehicle.vehicle_id !== production.vehicleId
  )
    throw new Error(
      "Draft identity must match the production and vehicle exactly.",
    );
  if (
    production.vehicleIdentity &&
    Object.entries(production.vehicleIdentity).some(
      ([field, value]) => source.vehicle[field] !== value,
    )
  )
    throw new Error(
      "Draft year/make/model/trim/market differs from the canonical inventory identity.",
    );
  const promo = workflowId === "draft-promotional-script";
  const facts = (
    promo
      ? source.vehicle_research.candidate_facts
      : (source.candidate_facts ?? source.verified_facts)
  ) as Array<Record<string, any>>;
  const sources = (
    promo
      ? [...source.vehicle_research.sources, ...source.offer_context.sources]
      : (source.sources ?? [])
  ) as Array<Record<string, any>>;
  const factId = (id: string) => id.replace(/^candidate_/, "fact_");
  const cta = accepted.script.closing_cta as Record<string, string>;
  const script: ProductionScript = {
    title: accepted.script.title,
    duration: accepted.script.target_duration_seconds,
    scenes: (accepted.script.scenes ?? accepted.script.blocks).map(
      (sc: Record<string, any>) => ({
        id: sc.id,
        start: sc.target_range_seconds[0],
        end: sc.target_range_seconds[1],
        visual: sc.visual_direction ?? sc.shot_intent,
        narration: sc.spoken_text,
        onScreen: sc.on_screen_text ?? "",
        factRefs: (
          sc.used_vehicle_fact_refs ??
          sc.candidate_fact_refs ??
          sc.fact_refs
        ).map(factId),
        sourceRefs: sc.source_refs ?? [],
        commercial:
          (sc.used_offer_fields ?? []).length > 0 || sc.type === "promotion",
      }),
    ),
    facts: facts.map((f) => ({
      id: factId(f.candidate_fact_id ?? f.fact_id),
      canonicalValue: f.value,
      canonicalUnit: f.unit ?? null,
      text: [f.label, JSON.stringify(f.value), f.unit ?? ""].join(" ").trim(),
      sourceIds: f.source_ids,
    })),
    sources: sources.map((s) => ({
      id: s.source_id ?? s.sourceId,
      title: s.title ?? s.description,
      url: s.url ?? s.reference ?? null,
      retrievedAt:
        s.retrievedAt ?? s.captured_at ?? `${s.retrieved_on}T00:00:00Z`,
    })),
    commercial: null,
    contactMethod:
      source.closing_cta?.contact_method ??
      source.constraints?.contact_method ??
      "[MEDIO DE CONTACTO POR CONFIRMAR]",
  };
  const usedFacts = new Set(script.scenes.flatMap((scene) => scene.factRefs));
  script.facts = script.facts.filter((f) => usedFacts.has(f.id));
  const sourceIds = new Set([
    ...script.facts.flatMap((f) => f.sourceIds),
    ...(promo ? source.offer_context.source_ids : []),
    ...script.scenes.flatMap((scene) => scene.sourceRefs),
  ]);
  const uniqueSources = new Map<string, ProductionScript["sources"][number]>();
  for (const source of script.sources) {
    const previous = uniqueSources.get(source.id);
    if (previous && digest(previous) !== digest(source))
      throw new Error(
        "A source identifier has conflicting records; resolve it before draft import.",
      );
    uniqueSources.set(source.id, source);
  }
  script.sources = [...uniqueSources.values()].filter((source) =>
    sourceIds.has(source.id),
  );
  const final = script.scenes.at(-1)!;
  final.narration +=
    " " +
    [cta.contact_text, cta.engagement_text, cta.spoken_text]
      .filter(Boolean)
      .join(" ");
  if (promo && source.offer_context.status === "CONFIRMED") {
    const offer = source.offer_context;
    script.commercial = {
      terms: [
        offer.price ? `${offer.price.amount} ${offer.price.currency}` : null,
        offer.promotion_text,
        offer.availability_text,
        offer.financing_text,
        ...offer.eligibility_terms,
      ].filter(Boolean),
      sourceIds: offer.source_ids,
      confirmedBy: offer.confirmed_by,
      confirmedAt: offer.confirmed_at,
      validUntil: offer.valid_until,
    };
  }
  const a = await ops.saveScript(actor, pid, id, script);
  await ops.store.transaction((s) => {
    s.events.push({
      id: `import_${a.artifactId}_${a.version}`,
      type: "draft.validated_import",
      at: ops.clock().toISOString(),
      productionId: pid,
      actor,
      details: {
        workflowId,
        workflowVersion,
        sourceCommit: ops.sourceCommit,
        input: structuredClone(input),
        output: structuredClone(output),
        artifact: { artifactId: a.artifactId, version: a.version },
      },
    });
  });
  return a;
}
