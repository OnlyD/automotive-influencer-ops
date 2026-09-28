import { createRequire } from "node:module";

// The docx package's public declaration barrel omits symbols it exports at runtime.
// Resolve its CommonJS public entry and keep the renderer's types local.
const require = createRequire(import.meta.url);
const {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} = require("docx") as Record<string, any>;

export interface PresenterScene {
  startSeconds: number;
  endSeconds: number;
  label: string;
  visual: string;
  narration: string;
  onScreen: string;
}

export interface PresenterDocumentModel {
  title: string;
  vehicleLine: string;
  durationSeconds: number;
  notice: string;
  placeholderNote: string | null;
  scenes: PresenterScene[];
  sources: Array<{ title: string; publisher?: string; url?: string; retrievedOn?: string }>;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function vehicleLine(vehicle: Record<string, unknown>): string {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim, vehicle.market]
    .filter((part) => part !== null && part !== undefined && String(part).trim().length > 0)
    .join(" · ");
}

function sourcesFromInput(input: Record<string, any>, sourceIds: Set<string>): PresenterDocumentModel["sources"] {
  const offerSources = input.offer_context?.sources as Array<Record<string, unknown>> | undefined;
  const vehicleResearchSources = input.vehicle_research?.sources as Array<Record<string, unknown>> | undefined;
  const presenterSources = input.sources as Array<Record<string, unknown>> | undefined;
  const records = [...(offerSources ?? []), ...(vehicleResearchSources ?? []), ...(presenterSources ?? [])];
  const result = new Map<string, PresenterDocumentModel["sources"][number]>();
  for (const record of records) {
    const id = String(record.source_id ?? "");
    if (!sourceIds.has(id)) continue;
    result.set(id, {
      title: String(record.title ?? record.description ?? "Fuente consultada"),
      ...(record.publisher ? { publisher: String(record.publisher) } : {}),
      ...(record.url || record.reference ? { url: String(record.url ?? record.reference) } : {}),
      ...(record.retrieved_on || record.captured_at ? { retrievedOn: String(record.retrieved_on ?? record.captured_at) } : {}),
    });
  }
  return [...result.values()];
}

export function createPresenterDocumentModel(workflowId: string, inputValue: unknown, outputValue: unknown): PresenterDocumentModel {
  const input = inputValue as Record<string, any>;
  const output = outputValue as Record<string, any>;
  const vehicle = input.vehicle as Record<string, unknown>;
  const durationSeconds = output.script.target_duration_seconds as number;

  if (workflowId === "draft-promotional-script") {
    const script = output.script as Record<string, any>;
    const scenes = script.scenes as Array<Record<string, any>>;
    const sourceIds = new Set<string>(scenes.flatMap((scene) => scene.source_refs as string[]));
    const placeholders = output.placeholders as string[];
    const vehicleFactsUsed = new Set<string>(scenes.flatMap((scene) => scene.used_vehicle_fact_refs as string[]));
    const presenterNotes = [
      ...(placeholders.length > 0 ? ["Los textos entre corchetes son datos comerciales pendientes. Sustitúyelos antes de grabar; no leas los marcadores literalmente."] : []),
      ...(vehicleFactsUsed.size < 2 ? ["La investigación disponible aporta menos de dos datos utilizables; el guion puede necesitar más contexto técnico."] : []),
    ];
    return {
      title: script.title,
      vehicleLine: vehicleLine(vehicle),
      durationSeconds,
      notice: "BORRADOR · Requiere revisión comercial antes de grabar o publicar.",
      placeholderNote: presenterNotes.length > 0 ? presenterNotes.join(" ") : null,
      scenes: scenes.map((scene) => ({
        startSeconds: scene.target_range_seconds[0] as number,
        endSeconds: scene.target_range_seconds[1] as number,
        label: scene.label as string,
        visual: scene.visual_direction as string,
        narration: scene.spoken_text as string,
        onScreen: scene.on_screen_text as string | null ?? "—",
      })),
      sources: sourcesFromInput(input, sourceIds),
    };
  }

  if (workflowId === "draft-presenter-script") {
    const script = output.script as Record<string, any>;
    const blocks = script.blocks as Array<Record<string, any>>;
    const finalBlock = blocks.at(-1);
    if (finalBlock && typeof script.closing_cta?.spoken_text === "string" && !finalBlock.spoken_text.includes(script.closing_cta.spoken_text)) {
      finalBlock.spoken_text = `${finalBlock.spoken_text} ${script.closing_cta.spoken_text}`;
    }
    const sourceIds = new Set<string>(blocks.flatMap((block) => block.source_refs as string[]));
    return {
      title: script.title,
      vehicleLine: vehicleLine(vehicle),
      durationSeconds,
      notice: "VISTA PREVIA · Los datos y las fuentes requieren revisión técnica antes de considerarse verificados.",
      placeholderNote: (output.candidate_fact_usage as unknown[]).length < 2
        ? "La investigación disponible aporta menos de dos datos utilizables; el guion puede necesitar más contexto técnico."
        : null,
      scenes: blocks.map((block) => ({
        startSeconds: block.target_range_seconds[0] as number,
        endSeconds: block.target_range_seconds[1] as number,
        label: String(block.id).replace(/[-_]+/g, " "),
        visual: block.shot_intent as string,
        narration: block.spoken_text as string,
        onScreen: block.on_screen_text as string | null ?? "—",
      })),
      sources: sourcesFromInput(input, sourceIds),
    };
  }
  throw new Error(`Word output is not supported for workflow: ${workflowId}`);
}

function cell(text: string, width: number, options: { header?: boolean; alternate?: boolean } = {}): any {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: options.header ? "17365D" : options.alternate ? "F2F6FA" : "FFFFFF" },
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 100, bottom: 100, left: 110, right: 110 },
    children: [new Paragraph({
      children: [new TextRun({
        text,
        bold: options.header,
        color: options.header ? "FFFFFF" : "1F2937",
        font: "Aptos",
        size: options.header ? 18 : 17,
      })],
      spacing: { after: 40 },
    })],
  });
}

export async function renderPresenterDocumentDocx(model: PresenterDocumentModel): Promise<Buffer> {
  const widths = [1450, 2500, 6500, 3500];
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D7E0EA" } as const;
  const header = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      cell("Tiempo / escena", widths[0]!, { header: true }),
      cell("Visual breve", widths[1]!, { header: true }),
      cell("Voz en off", widths[2]!, { header: true }),
      cell("Texto en pantalla", widths[3]!, { header: true }),
    ],
  });
  const rows = model.scenes.map((scene, index) => new TableRow({
    cantSplit: true,
    children: [
      cell(`${formatTime(scene.startSeconds)}–${formatTime(scene.endSeconds)}\n${scene.label}`, widths[0]!, { alternate: index % 2 === 1 }),
      cell(scene.visual, widths[1]!, { alternate: index % 2 === 1 }),
      cell(scene.narration, widths[2]!, { alternate: index % 2 === 1 }),
      cell(scene.onScreen || "—", widths[3]!, { alternate: index % 2 === 1 }),
    ],
  }));
  const children: any[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: model.notice, bold: true, color: "8A4B08", font: "Aptos", size: 18 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, heading: "Title", spacing: { after: 100 }, children: [new TextRun({ text: model.title, bold: true, color: "17365D", font: "Aptos Display", size: 34 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, children: [new TextRun({ text: `${model.vehicleLine} · ${Math.floor(model.durationSeconds / 60)}:${(model.durationSeconds % 60).toString().padStart(2, "0")}`, color: "5B6573", font: "Aptos", size: 20 })] }),
  ];
  if (model.placeholderNote) children.push(new Paragraph({ spacing: { after: 180 }, children: [new TextRun({ text: model.placeholderNote, italics: true, color: "684E18", font: "Aptos", size: 18 })] }));
  children.push(new Table({
    width: { size: widths.reduce((sum, width) => sum + width, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [header, ...rows],
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
  }));
  if (model.sources.length > 0) {
    children.push(new Paragraph({ heading: "Heading1", spacing: { before: 260, after: 100 }, children: [new TextRun({ text: "Fuentes", bold: true, color: "17365D", font: "Aptos Display", size: 25 })] }));
    for (const source of model.sources) {
      const detail = [source.publisher, source.retrievedOn].filter(Boolean).join(" · ");
      children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `${source.title}${detail ? ` — ${detail}` : ""}${source.url ? `\n${source.url}` : ""}`, font: "Aptos", size: 16 })] }));
    }
  }
  const document = new Document({
    sections: [{
      properties: { page: { size: { width: 15840, height: 12240, orientation: "landscape" }, margin: { top: 650, bottom: 650, left: 720, right: 720 } } },
      children,
    }],
  });
  return Packer.toBuffer(document);
}
