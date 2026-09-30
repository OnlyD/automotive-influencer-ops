import {
  renderPresenterDocumentDocx,
  type PresenterDocumentModel,
} from "@automotive/ai-runner";
import type { Artifact } from "./store.js";
import type { ProductionScript } from "@automotive/contracts";
export async function presenterDocument(a: Artifact): Promise<Buffer> {
  const model: PresenterDocumentModel = {
    title: "Plan de grabación",
    vehicleLine: "Material de la producción",
    durationSeconds: 0,
    notice: `VERSIÓN ${a.version} · Confirma con el operador las aprobaciones antes de grabar.`,
    placeholderNote: null,
    scenes: [],
    sources: [],
  };
  if (a.kind === "SCRIPT") {
    const s = a.payload as ProductionScript;
    model.title = s.title;
    model.durationSeconds = s.duration;
    model.scenes = s.scenes.map((sc) => ({
      startSeconds: sc.start,
      endSeconds: sc.end,
      label: "Escena",
      visual: sc.visual,
      narration: sc.narration,
      onScreen: sc.onScreen,
    }));
    model.sources = s.sources.map((source) => ({
      title: source.title,
      url: source.url ?? undefined,
      retrievedOn: source.retrievedAt.slice(0, 10),
    }));
  } else if (a.kind === "SHOOTING_PLAN") {
    const p = a.payload as {
      title: string;
      shots: Array<{
        start: number;
        end: number;
        say: string;
        show: string;
        onScreen: string;
        recordAudio: string;
      }>;
      checklist: string[];
    };
    model.title = `Plan de grabación · ${p.title}`;
    model.durationSeconds = p.shots.at(-1)!.end;
    model.scenes = p.shots.map((sc) => ({
      startSeconds: sc.start,
      endSeconds: sc.end,
      label: "Toma",
      visual: `${sc.show}\n${sc.recordAudio}`,
      narration: sc.say,
      onScreen: sc.onScreen,
    }));
    model.checklist = p.checklist;
  } else throw new Error("This artifact has no presenter Word document.");
  return renderPresenterDocumentDocx(model);
}
