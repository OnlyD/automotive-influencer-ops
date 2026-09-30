import { getRegisteredWorkflow, type RegisteredWorkflow } from "./workflow-registry.js";

export type WorkflowExecutor = (request: { workflowId: string; workflowVersion: string; prompt: string; input: unknown; outputSchemaPath: string }) => Promise<unknown>;

function validatePresenterClosingCta(
  contactMethod: string | null,
  cta: { contact_text: string; engagement_text: string },
  errors: string[],
): void {
  const contactText = cta.contact_text.toLocaleLowerCase("es-MX");
  const contactAction = /contacta|contáctame|contáctanos|escríbeme|escríbenos|llámame|llámanos|manda(?:me|nos) un mensaje/i.test(contactText);
  if (!contactAction) errors.push("closing CTA must invite viewers to get in touch");
  if (contactMethod && !cta.contact_text.includes(contactMethod)) errors.push("closing CTA must use the supplied contact method exactly");
  if (!contactMethod && !cta.contact_text.includes("[MEDIO DE CONTACTO POR CONFIRMAR]")) errors.push("closing CTA must use a contact placeholder when no contact method was supplied");
  const engagementText = cta.engagement_text.toLocaleLowerCase("es-MX");
  if (!/sígueme|síguenos|sigue la cuenta|seguir/.test(engagementText)) errors.push("closing CTA must invite viewers to follow the account");
  if (!/me gusta|like/.test(engagementText)) errors.push("closing CTA must invite viewers to like the video");
  if (!/comenta|comentario|cuéntame en los comentarios/.test(engagementText)) errors.push("closing CTA must invite viewers to comment");
}

function assertWorkflowSemantics(workflowId: string, input: Record<string, any>, output: Record<string, any>): void {
  const errors: string[] = [];
  if (["propose-clips", "generate-captions", "analyze-performance"].includes(workflowId)) {
    if (output.production_id !== input.production_id) errors.push("Candidate must preserve the production identity");
  }
  if (workflowId === "propose-clips") {
    if (output.master.artifactId !== input.master.artifactId || output.master.version !== input.master.version) errors.push("Clip plan must reference the exact master");
    if (output.clips.length > input.targetClipCount) errors.push("Clip plan exceeds the approved target count");
    const facts = new Set(input.script.facts.map((fact: {id:string}) => fact.id));
    const ids = new Set<string>();
    for (const clip of output.clips) {
      if (ids.has(clip.clipId)) errors.push("Duplicate clip identifier"); ids.add(clip.clipId);
      if (clip.start < 0 || clip.end > input.masterDuration || clip.end-clip.start < 15 || clip.end-clip.start > 35) errors.push("Clip must be a 15–35 second interval inside the exact master");
      if (clip.factRefs.some((id:string) => !facts.has(id))) errors.push("Clip references an unknown fact");
    }
  }
  if (workflowId === "generate-captions") {
    if (output.platform !== input.platform || output.disclosure !== input.disclosure) errors.push("Caption must preserve platform and supplied disclosure");
    const facts = new Set(input.script.facts.map((fact:{id:string}) => fact.id));
    if (output.factRefs.some((id:string) => !facts.has(id))) errors.push("Caption references an unknown fact");
    const suppliedNumbers = new Set((JSON.stringify({narration:input.script.scenes.map((scene:{narration:string})=>scene.narration),facts:input.script.facts,commercial:input.script.commercial,contactMethod:input.script.contactMethod}).match(/\b\d+(?:[.,]\d+)?\b/g) ?? []) as string[]);
    for (const number of output.caption.match(/\b\d+(?:[.,]\d+)?\b/g) ?? []) if (!suppliedNumbers.has(number)) errors.push("Caption introduces a number absent from the approved script");
  }
  if (workflowId === "analyze-performance") {
    const snapshots = new Set(input.snapshots.map((snapshot:{snapshotId:string}) => snapshot.snapshotId));
    for (const observation of output.observations) if (observation.snapshotRefs.some((id:string) => !snapshots.has(id))) errors.push("Observation references an unknown metric snapshot");
  }
  if (workflowId === "adapt-presenter-script") {
    if (output.production_id !== input.production_id || (output.base_artifact.artifactId !== input.base_artifact.artifactId || output.base_artifact.version !== input.base_artifact.version) || output.locked_facts_hash !== input.locked_facts_hash) errors.push("Revision must preserve the exact base artifact and locked facts hash");
    const known = new Set(input.base_script.scenes.map((scene: {id:string}) => scene.id));
    const changed = new Set<string>();
    for (const change of output.changes as Array<{sceneId:string;narration?:string;visual?:string;onScreen?:string}>) {
      if (!known.has(change.sceneId) || changed.has(change.sceneId)) errors.push("Revision references an unknown or duplicate scene");
      changed.add(change.sceneId);
      if (Object.keys(change).length < 2) errors.push("Revision must change at least one creative field");
    }
  }
  if (workflowId === "research-vehicle") {
    const requested = new Set(input.research_brief.requested_fields as string[]);
    const sourceIds = new Set((output.sources as Array<{ sourceId: string }>).map((source) => source.sourceId));
    if (output.vehicle_id !== input.vehicle.vehicle_id) errors.push("output vehicle_id must match the requested vehicle");
    for (const fact of output.candidate_facts as Array<{ field: string; source_ids: string[] }>) {
      if (!requested.has(fact.field)) errors.push(`candidate field was not requested: ${fact.field}`);
      for (const sourceId of fact.source_ids) if (!sourceIds.has(sourceId)) errors.push(`candidate references unknown source: ${sourceId}`);
    }
  }
  if (workflowId === "validate-vehicle-data") {
    const candidateIds = new Set((input.candidate_facts as Array<{ candidate_fact_id: string }>).map((fact) => fact.candidate_fact_id));
    const candidateSources = new Map((input.candidate_facts as Array<{ candidate_fact_id: string; source_ids: string[] }>).map((fact) => [fact.candidate_fact_id, new Set(fact.source_ids)]));
    const sourceIds = new Set((input.sources as Array<{ sourceId: string }>).map((source) => source.sourceId));
    if (output.vehicle_id !== input.vehicle.vehicle_id) errors.push("output vehicle_id must match the input vehicle");
    const proposedIds = new Set<string>();
    for (const proposal of output.proposals as Array<{ candidate_fact_id: string; proposed_status: string; supporting_source_ids: string[]; opposing_source_ids: string[] }>) {
      if (!candidateIds.has(proposal.candidate_fact_id)) errors.push(`proposal references unknown candidate: ${proposal.candidate_fact_id}`);
      if (proposedIds.has(proposal.candidate_fact_id)) errors.push(`duplicate proposal: ${proposal.candidate_fact_id}`);
      proposedIds.add(proposal.candidate_fact_id);
      for (const sourceId of [...proposal.supporting_source_ids, ...proposal.opposing_source_ids]) {
        if (!sourceIds.has(sourceId)) errors.push(`proposal references unknown source: ${sourceId}`);
        if (!candidateSources.get(proposal.candidate_fact_id)?.has(sourceId)) errors.push(`proposal cites evidence not linked to candidate ${proposal.candidate_fact_id}: ${sourceId}`);
      }
      if (proposal.proposed_status === "VERIFIED" && proposal.supporting_source_ids.length === 0) errors.push(`VERIFIED proposal has no supporting source: ${proposal.candidate_fact_id}`);
      if (proposal.proposed_status === "CONFLICTED" && proposal.opposing_source_ids.length === 0) errors.push(`CONFLICTED proposal has no opposing source: ${proposal.candidate_fact_id}`);
    }
    for (const candidateId of candidateIds) if (!proposedIds.has(candidateId)) errors.push(`candidate has no validation proposal: ${candidateId}`);
  }
  if (workflowId === "draft-vehicle-script") {
    const facts = new Map((input.verified_facts as Array<{ fact_id: string; source_ids: string[] }>).map((fact) => [fact.fact_id, fact]));
    const blockIds = new Set<string>();
    const referencesByFact = new Map<string, Set<string>>();
    const usedSourceIds = new Set<string>();
    const blocks = output.script.blocks as Array<{ id: string; target_range_seconds: [number, number]; fact_refs: string[]; clip_candidate: boolean }>;
    if (output.production_id !== input.production_id) errors.push("output production_id must match the input");
    if (output.script.target_duration_seconds !== input.editorial_brief.target_duration_seconds) errors.push("script target duration must match the approved brief");
    if (output.script.closing_cta.destination !== input.constraints.cta_destination) errors.push("closing CTA destination must match the input constraint");
    let previousEnd = 0;
    let clipCount = 0;
    for (const block of blocks) {
      const [start, end] = block.target_range_seconds;
      if (blockIds.has(block.id)) errors.push(`duplicate script block ID: ${block.id}`);
      blockIds.add(block.id);
      if (start >= end || start < previousEnd || end > output.script.target_duration_seconds) errors.push(`invalid or overlapping timing range for block ${block.id}`);
      previousEnd = end;
      if (block.clip_candidate) clipCount += 1;
      for (const factId of block.fact_refs) {
        const fact = facts.get(factId);
        if (!fact) errors.push(`block references unverified or unknown fact: ${factId}`);
        else {
          const usedIn = referencesByFact.get(factId) ?? new Set<string>();
          usedIn.add(block.id);
          referencesByFact.set(factId, usedIn);
          for (const sourceId of fact.source_ids) usedSourceIds.add(sourceId);
        }
      }
    }
    if (blocks.length > 0 && blocks[blocks.length - 1]?.target_range_seconds[1] !== output.script.target_duration_seconds) errors.push("last script block must end at the approved target duration");
    if (clipCount > input.editorial_brief.target_clip_count) errors.push("script exceeds the approved clip candidate count");
    if (output.script.closing_cta.destination === "NONE" && output.script.closing_cta.spoken_text.length > 0) errors.push("CTA text must be empty when the configured destination is NONE");
    const usageIds = new Set<string>();
    for (const usage of output.fact_usage as Array<{ fact_id: string; used_in_blocks: string[] }>) {
      if (usageIds.has(usage.fact_id)) errors.push(`duplicate fact_usage entry: ${usage.fact_id}`);
      usageIds.add(usage.fact_id);
      const expected = referencesByFact.get(usage.fact_id);
      if (!facts.has(usage.fact_id) || !expected) errors.push(`fact_usage references unused or unknown fact: ${usage.fact_id}`);
      else if (expected.size !== usage.used_in_blocks.length || usage.used_in_blocks.some((blockId) => !expected.has(blockId))) errors.push(`fact_usage does not match script references: ${usage.fact_id}`);
    }
    for (const [factId, blockIdsForFact] of referencesByFact) {
      if (!usageIds.has(factId)) errors.push(`missing fact_usage entry: ${factId}`);
      for (const blockId of blockIdsForFact) if (!blockIds.has(blockId)) errors.push(`fact usage references unknown block: ${blockId}`);
    }
    const flags: Record<string, boolean> = {
      price: input.commercial_context.include_price,
      availability: input.commercial_context.include_availability,
      promotion: false,
      financing: input.commercial_context.include_financing,
    };
    const approved = input.commercial_context.approved_claims as Array<{ kind: string; text: string; source_ids: string[] }>;
    for (const claim of output.commercial_claims as Array<{ kind: string; text: string; source_ids: string[] }>) {
      const match = approved.find((candidate) => candidate.kind === claim.kind && candidate.text === claim.text);
      if (!flags[claim.kind]) errors.push(`commercial claim is disabled by input: ${claim.kind}`);
      if (!match) errors.push(`commercial claim is not explicitly approved: ${claim.kind}`);
      else if (match.source_ids.length !== claim.source_ids.length || match.source_ids.some((sourceId) => !claim.source_ids.includes(sourceId))) errors.push(`commercial claim sources differ from approval: ${claim.kind}`);
    }
    for (const source of output.source_notes as Array<{ source_id: string }>) {
      if (!usedSourceIds.has(source.source_id) && !approved.some((claim) => claim.source_ids.includes(source.source_id))) errors.push(`source note is not tied to an input fact or approved claim: ${source.source_id}`);
    }
  }
  if (workflowId === "draft-presenter-script") {
    const factIds = new Set((input.candidate_facts as Array<{ candidate_fact_id: string }>).map((fact) => fact.candidate_fact_id));
    const factSources = new Map((input.candidate_facts as Array<{ candidate_fact_id: string; source_ids: string[] }>).map((fact) => [fact.candidate_fact_id, new Set(fact.source_ids)]));
    const sourceIds = new Set((input.sources as Array<{ source_id: string }>).map((source) => source.source_id));
    for (const fact of input.candidate_facts as Array<{ candidate_fact_id: string; source_ids: string[] }>) {
      for (const sourceId of fact.source_ids) if (!sourceIds.has(sourceId)) errors.push(`candidate references unknown source: ${sourceId}`);
    }
    const blockIds = new Set<string>();
    const expectedUsage = new Map<string, Set<string>>();
    if (output.production_id !== input.production_id) errors.push("output production_id must match the input");
    if (output.script.target_duration_seconds !== input.editorial_brief.target_duration_seconds) errors.push("script duration must match the brief");
    validatePresenterClosingCta(input.constraints.contact_method, output.script.closing_cta, errors);
    let previousEnd = 0;
    let clipCount = 0;
    const usedSources = new Set<string>();
    for (const block of output.script.blocks as Array<{ id: string; target_range_seconds: [number, number]; candidate_fact_refs: string[]; source_refs: string[]; clip_candidate: boolean }>) {
      const [start, end] = block.target_range_seconds;
      if (blockIds.has(block.id)) errors.push(`duplicate script block ID: ${block.id}`);
      blockIds.add(block.id);
      if (start >= end || start < previousEnd || end > output.script.target_duration_seconds) errors.push(`invalid or overlapping timing range for block ${block.id}`);
      previousEnd = end;
      if (block.clip_candidate) clipCount += 1;
      const citedSources = new Set(block.source_refs);
      for (const sourceId of block.source_refs) {
        if (!sourceIds.has(sourceId)) errors.push(`block references unknown source: ${sourceId}`);
        if (!block.candidate_fact_refs.some((factId) => factSources.get(factId)?.has(sourceId))) errors.push(`block source is not linked to a referenced candidate fact: ${sourceId}`);
        usedSources.add(sourceId);
      }
      for (const factId of block.candidate_fact_refs) {
        if (!factIds.has(factId)) errors.push(`block references unknown candidate fact: ${factId}`);
        else {
          const knownSources = factSources.get(factId) ?? new Set<string>();
          if (![...citedSources].some((sourceId) => knownSources.has(sourceId))) errors.push(`candidate fact has no linked source in block ${block.id}: ${factId}`);
          const usedIn = expectedUsage.get(factId) ?? new Set<string>();
          usedIn.add(block.id);
          expectedUsage.set(factId, usedIn);
        }
      }
    }
    if (output.script.blocks.length > 0 && output.script.blocks.at(-1)?.target_range_seconds[1] !== output.script.target_duration_seconds) errors.push("last script block must end at target duration");
    if (clipCount > input.editorial_brief.target_clip_count) errors.push("script exceeds the approved clip candidate count");
    const selectedFactCount = expectedUsage.size;
    const minimumFactCount = Math.min(2, factIds.size);
    if (selectedFactCount < minimumFactCount) errors.push(`detailed review must use at least ${minimumFactCount} source-linked research facts when available`);
    if (selectedFactCount > 3) errors.push("detailed review should use no more than three research facts");
    if (output.sources_used.length !== usedSources.size || output.sources_used.some((sourceId: string) => !usedSources.has(sourceId))) errors.push("sources_used must match source references in script blocks");
    const actualUsage = new Map<string, Set<string>>();
    for (const usage of output.candidate_fact_usage as Array<{ candidate_fact_id: string; used_in_blocks: string[] }>) {
      if (actualUsage.has(usage.candidate_fact_id)) errors.push(`duplicate candidate_fact_usage entry: ${usage.candidate_fact_id}`);
      actualUsage.set(usage.candidate_fact_id, new Set(usage.used_in_blocks));
    }
    if (actualUsage.size !== expectedUsage.size) errors.push("candidate_fact_usage must match factual references in script blocks");
    for (const [factId, blockIdsForFact] of expectedUsage) {
      const actual = actualUsage.get(factId);
      if (!actual || actual.size !== blockIdsForFact.size || [...actual].some((blockId) => !blockIdsForFact.has(blockId))) errors.push(`candidate_fact_usage does not match script references: ${factId}`);
    }
    if (output.technical_review_required !== true || output.publishable !== false) errors.push("presenter script preview must require technical review and remain non-publishable");
  }
  if (workflowId === "draft-promotional-script") {
    const vehicleResearch = input.vehicle_research as {
      candidate_facts: Array<{ candidate_fact_id: string; source_ids: string[] }>;
      sources: Array<{ source_id: string }>;
    };
    const offer = input.offer_context as {
      status: "NOT_PROVIDED" | "PRESENTER_PROVIDED" | "UNCONFIRMED" | "CONFIRMED";
      price: unknown;
      promotion_text: string | null;
      availability_text: string | null;
      financing_text: string | null;
      eligibility_terms: string[];
      confirmed_by: string | null;
      confirmed_at: string | null;
      valid_until: string | null;
      source_ids: string[];
      sources: Array<{ source_id: string }>;
    };
    const researchSourceIds = new Set(vehicleResearch.sources.map((source) => source.source_id));
    const researchFactSources = new Map(vehicleResearch.candidate_facts.map((fact) => [fact.candidate_fact_id, new Set(fact.source_ids)]));
    if (researchFactSources.size !== vehicleResearch.candidate_facts.length) errors.push("vehicle research candidate fact IDs must be unique");
    for (const fact of vehicleResearch.candidate_facts) {
      for (const sourceId of fact.source_ids) if (!researchSourceIds.has(sourceId)) errors.push(`vehicle research fact references unknown source: ${sourceId}`);
    }
    const knownSourceIds = new Set(offer.sources.map((source) => source.source_id));
    const outputPlaceholders = new Set(output.placeholders as string[]);
    const scenes = output.script.scenes as Array<{
      id: string;
      type: string;
      target_range_seconds: [number, number];
      spoken_text: string;
      on_screen_text: string | null;
      used_vehicle_fact_refs: string[];
      used_offer_fields: string[];
      source_refs: string[];
    }>;
    const requiredPlaceholders: Array<[string, string, boolean]> = [
      ["PRICE", "[PRECIO POR CONFIRMAR]", offer.status === "NOT_PROVIDED" || offer.status === "UNCONFIRMED" || offer.price === null],
      ["PROMOTION", "[PROMOCIÓN POR CONFIRMAR]", offer.status === "NOT_PROVIDED" || offer.status === "UNCONFIRMED" || offer.promotion_text === null],
      ["AVAILABILITY", "[DISPONIBILIDAD POR CONFIRMAR]", offer.status === "NOT_PROVIDED" || offer.status === "UNCONFIRMED" || offer.availability_text === null],
      ["FINANCING", "[FINANCIAMIENTO POR CONFIRMAR]", offer.status === "NOT_PROVIDED" || offer.status === "UNCONFIRMED" || offer.financing_text === null],
      ["ELIGIBILITY", "[CONDICIONES DE CRÉDITO POR CONFIRMAR]", offer.status === "NOT_PROVIDED" || offer.status === "UNCONFIRMED" || offer.financing_text !== null && offer.eligibility_terms.length === 0],
    ];
    if (output.production_id !== input.production_id) errors.push("output production_id must match the input");
    validatePresenterClosingCta(input.closing_cta.contact_method, output.script.closing_cta, errors);
    if (output.script.target_duration_seconds !== input.editorial_brief.target_duration_seconds) errors.push("promotional script duration must match the brief");
    if (offer.status === "CONFIRMED" && (!offer.confirmed_by || !offer.confirmed_at || offer.source_ids.length === 0)) errors.push("confirmed commercial offer requires confirmer, timestamp, and source IDs");
    for (const sourceId of offer.source_ids) if (!knownSourceIds.has(sourceId)) errors.push(`offer references unknown source: ${sourceId}`);
    const sceneIds = new Set<string>();
    const usedVehicleFactIds = new Set<string>();
    const usedOfferFields = new Set<string>();
    const usedSourceIds = new Set<string>();
    let previousEnd = 0;
    for (const scene of scenes) {
      const [start, end] = scene.target_range_seconds;
      if (sceneIds.has(scene.id)) errors.push(`duplicate promotional scene ID: ${scene.id}`);
      sceneIds.add(scene.id);
      if (start >= end || start < previousEnd || end > output.script.target_duration_seconds) errors.push(`invalid or overlapping timing range for scene ${scene.id}`);
      previousEnd = end;
      for (const factId of scene.used_vehicle_fact_refs) {
        const factSources = researchFactSources.get(factId);
        if (!factSources) errors.push(`promotional scene references unknown vehicle research fact: ${factId}`);
        else {
          usedVehicleFactIds.add(factId);
          if (!scene.source_refs.some((sourceId) => factSources.has(sourceId))) errors.push(`promotional vehicle fact has no linked source in scene ${scene.id}: ${factId}`);
        }
      }
      for (const field of scene.used_offer_fields) usedOfferFields.add(field);
      for (const sourceId of scene.source_refs) {
        if (!offer.source_ids.includes(sourceId) && !researchSourceIds.has(sourceId)) errors.push(`promotional scene references an unknown source: ${sourceId}`);
        usedSourceIds.add(sourceId);
      }
    }
    if (scenes[0]?.target_range_seconds[0] !== 0) errors.push("first promotional scene must start at 0 seconds");
    if (scenes.at(-1)?.target_range_seconds[1] !== output.script.target_duration_seconds) errors.push("last promotional scene must end at target duration");
    if (!scenes.some((scene) => scene.type === "opening") || !scenes.some((scene) => scene.type === "promotion") || !scenes.some((scene) => scene.type === "closing")) errors.push("promotional script needs opening, promotion, and closing scenes");
    const minimumVehicleFacts = Math.min(2, vehicleResearch.candidate_facts.length);
    if (usedVehicleFactIds.size < minimumVehicleFacts) errors.push(`promotional script must use at least ${minimumVehicleFacts} source-linked vehicle research facts when available`);
    if (usedVehicleFactIds.size > 3) errors.push("promotional script should use no more than three vehicle research facts");
    const closingCta = output.script.closing_cta as { contact_text: string; engagement_text: string };
    const spokenWords = [
      ...scenes.flatMap((scene) => scene.spoken_text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []),
      ...(closingCta.contact_text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []),
      ...(closingCta.engagement_text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []),
    ].length;
    const estimatedSpeechSeconds = spokenWords * 60 / 120;
    if (estimatedSpeechSeconds < output.script.target_duration_seconds * 0.7 || estimatedSpeechSeconds > output.script.target_duration_seconds * 1.2) errors.push("spoken narration length is inconsistent with the target duration");
    const fieldAvailable: Record<string, boolean> = {
      price: ["CONFIRMED", "PRESENTER_PROVIDED"].includes(offer.status) && offer.price !== null,
      promotion_text: ["CONFIRMED", "PRESENTER_PROVIDED"].includes(offer.status) && offer.promotion_text !== null,
      availability_text: ["CONFIRMED", "PRESENTER_PROVIDED"].includes(offer.status) && offer.availability_text !== null,
      financing_text: ["CONFIRMED", "PRESENTER_PROVIDED"].includes(offer.status) && offer.financing_text !== null,
      eligibility_terms: ["CONFIRMED", "PRESENTER_PROVIDED"].includes(offer.status) && offer.financing_text !== null && offer.eligibility_terms.length > 0,
    };
    for (const field of usedOfferFields) {
      if (!fieldAvailable[field]) errors.push(`promotional script uses a missing or unconfirmed offer field: ${field}`);
    }
    if (offer.status === "CONFIRMED" && usedOfferFields.size > 0 && usedSourceIds.size === 0) errors.push("confirmed commercial claims require source references");
    const promotionSpeech = scenes.filter((scene) => scene.type === "promotion").map((scene) => scene.spoken_text).join(" ");
    for (const [placeholder, token, required] of requiredPlaceholders) {
      if (required && !outputPlaceholders.has(placeholder)) errors.push(`missing required placeholder declaration: ${placeholder}`);
      if (required && !promotionSpeech.includes(token)) errors.push(`missing required in-script placeholder: ${token}`);
      if (!required && outputPlaceholders.has(placeholder)) errors.push(`unneeded placeholder declaration for available offer data: ${placeholder}`);
    }
    const validity = output.validity_disclosure as { status: string; valid_until: string | null; scene_id: string };
    const validityScene = scenes.find((scene) => scene.id === validity.scene_id);
    if (!validityScene || validityScene.type !== "closing") errors.push("validity disclosure must be included in the closing scene");
    if (["CONFIRMED", "PRESENTER_PROVIDED"].includes(offer.status) && offer.valid_until) {
      const expectedStatus = offer.status === "CONFIRMED" ? "CONFIRMED_UNTIL" : "PRESENTER_PROVIDED_UNTIL";
      if (validity.status !== expectedStatus || validity.valid_until !== offer.valid_until) errors.push("validity disclosure must match the provided offer end date");
      const date = new Date(offer.valid_until);
      const spokenDate = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
      if (!validityScene?.spoken_text.toLocaleLowerCase("es-MX").includes(spokenDate.toLocaleLowerCase("es-MX"))) errors.push("offer end date must appear in spoken closing copy");
      if (!validityScene?.on_screen_text?.toLocaleLowerCase("es-MX").includes(spokenDate.toLocaleLowerCase("es-MX"))) errors.push("offer end date must appear in on-screen closing copy");
      if (outputPlaceholders.has("VALIDITY")) errors.push("do not leave the validity placeholder when an end date is provided");
    } else {
      if (validity.status !== "PENDING" || validity.valid_until !== null) errors.push("missing or unconfirmed offer validity must remain pending");
      if (!outputPlaceholders.has("VALIDITY") || !validityScene?.spoken_text.includes("[VIGENCIA POR CONFIRMAR]") || !validityScene.on_screen_text?.includes("[VIGENCIA POR CONFIRMAR]")) errors.push("missing spoken and on-screen validity placeholder");
    }
    if (output.commercial_review_required !== true || output.publishable !== false) errors.push("promotional script must require commercial review and remain non-publishable");
  }
  if (errors.length > 0) throw new Error(`Workflow semantic validation failed: ${errors.join("; ")}`);
}

export async function executeRegisteredWorkflow(
  registry: Map<string, RegisteredWorkflow>,
  request: { workflowId: string; workflowVersion: string; role?: "presenter" | "technical-operator"; input: unknown },
  executor: WorkflowExecutor,
): Promise<unknown> {
  const workflow = getRegisteredWorkflow(registry, request.workflowId, request.workflowVersion);
  const role = request.role ?? "technical-operator";
  if (!workflow.manifest.allowed_roles.includes(role)) {
    throw new Error(`${role} is not authorized for ${request.workflowId}.`);
  }
  if (!workflow.validateInput(request.input)) {
    const detail = workflow.validateInput.errors?.map((error) => `${error.instancePath || "/"} ${error.message}`).join("; ");
    throw new Error(`Invalid workflow input: ${detail}`);
  }

  const output = await executor({
    workflowId: workflow.manifest.id,
    workflowVersion: workflow.manifest.version,
    prompt: workflow.prompt,
    input: request.input,
    outputSchemaPath: `${workflow.directory}/output.schema.json`,
  });
  if (!workflow.validateOutput(output)) {
    const detail = workflow.validateOutput.errors?.map((error) => `${error.instancePath || "/"} ${error.message}`).join("; ");
    throw new Error(`Invalid workflow output: ${detail}`);
  }
  assertWorkflowSemantics(workflow.manifest.id, request.input as Record<string, any>, output as Record<string, any>);
  return output;
}
