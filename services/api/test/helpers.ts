import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Operations } from "../src/engine.js";
import { FileOperationStore, type Actor, type Ref } from "../src/store.js";
import type { ProductionScript } from "@automotive/contracts";
export const operator: Actor = {
  role: "technical-operator",
  name: "fixture_operator",
};
export const presenter: Actor = {
  role: "presenter",
  name: "fixture_presenter",
};
export const worker: Actor = { role: "worker", name: "fixture_worker" };
export const fixture: ProductionScript = {
  title: "Prueba ficticia",
  duration: 2,
  scenes: [
    {
      id: "hook",
      start: 0,
      end: 1,
      visual: "Tarjeta de prueba",
      narration: "Ejemplo ficticio para la prueba.",
      onScreen: "Fixture",
      factRefs: ["fact_fixture"],
      sourceRefs: ["src_fixture"],
      commercial: false,
    },
    {
      id: "close",
      start: 1,
      end: 2,
      visual: "Cierre de prueba",
      narration:
        "Escríbenos por el medio de prueba. Sigue la cuenta, dale me gusta y comenta.",
      onScreen: "Fixture",
      factRefs: [],
      sourceRefs: [],
      commercial: false,
    },
  ],
  facts: [
    {
      id: "fact_fixture",
      text: "Fictional attribute only",
      sourceIds: ["src_fixture"],
    },
  ],
  sources: [
    {
      id: "src_fixture",
      title: "Fictional source",
      url: "https://example.invalid/fixture",
      retrievedAt: "2026-09-30T00:00:00Z",
    },
  ],
  commercial: null,
  contactMethod: "medio de prueba",
};
export async function context(mode: "PROMO" | "VOICE_OVER" = "VOICE_OVER") {
  const root = await mkdtemp(join(tmpdir(), "automotive-ops-"));
  let time = new Date("2026-09-30T16:00:00Z");
  const ops = new Operations(
    new FileOperationStore(root),
    "0".repeat(40),
    () => new Date(time),
  );
  await ops.create(operator, {
    productionId: "prd_fixture",
    vehicleId: "veh_fixture",
    title: "Fixture only",
    mode,
    targetPlatforms: ["TIKTOK", "INSTAGRAM", "YOUTUBE", "FACEBOOK"],
  });
  return {
    root,
    ops,
    tick: (ms: number) => {
      time = new Date(time.getTime() + ms);
    },
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}
export async function approveScript(
  ops: Operations,
  script: ProductionScript = fixture,
  id = "script_fixture",
): Promise<Ref> {
  const a = await ops.saveScript(operator, "prd_fixture", id, script);
  for (const type of [
    "FACTUAL",
    "CREATIVE",
    ...(script.commercial ? ["COMMERCIAL"] : []),
  ] as const)
    await ops.approve(
      type === "CREATIVE" ? presenter : operator,
      a,
      type as never,
      "APPROVED",
      "Reviewed fictional fixture only",
    );
  return { artifactId: a.artifactId, version: a.version };
}
