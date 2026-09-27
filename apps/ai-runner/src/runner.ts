import { getRegisteredWorkflow, type RegisteredWorkflow } from "./workflow-registry.js";

export type WorkflowExecutor = (request: { workflowId: string; workflowVersion: string; prompt: string; input: unknown; outputSchemaPath: string }) => Promise<unknown>;

function assertWorkflowSemantics(workflowId: string, input: Record<string, any>, output: Record<string, any>): void {
  const errors: string[] = [];
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
  if (errors.length > 0) throw new Error(`Workflow semantic validation failed: ${errors.join("; ")}`);
}

export async function executeRegisteredWorkflow(
  registry: Map<string, RegisteredWorkflow>,
  request: { workflowId: string; workflowVersion: string; input: unknown },
  executor: WorkflowExecutor,
): Promise<unknown> {
  const workflow = getRegisteredWorkflow(registry, request.workflowId, request.workflowVersion);
  if (!workflow.manifest.allowed_roles.includes("technical-operator")) {
    throw new Error(`Technical operator is not authorized for ${request.workflowId}.`);
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
