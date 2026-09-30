import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { before, after } from "node:test";
import { runMediaTool } from "@automotive/media";
import {
  context,
  fixture,
  operator,
  presenter,
  approveScript,
} from "./helpers.js";
import type { PublicationRequest } from "@automotive/contracts";
import type { Ref } from "../src/store.js";
let mediaRoot: string, source: string;
before(async () => {
  mediaRoot = await mkdtemp(join(tmpdir(), "publication-fixture-"));
  source = join(mediaRoot, "synthetic.mp4");
  await runMediaTool("ffmpeg", [
    "-nostdin",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=green:s=1080x1920:r=30",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=300:sample_rate=48000",
    "-t",
    "2",
    "-threads",
    "2",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-c:a",
    "aac",
    source,
  ]);
});
after(async () => rm(mediaRoot, { recursive: true, force: true }));
async function ready(promo = false) {
  const c = await context(promo ? "PROMO" : "VOICE_OVER"),
    s = structuredClone(fixture);
  if (promo) {
    s.scenes[0].commercial = true;
    s.scenes[0].narration =
      "Promoción ficticia por 1 USD hasta el 1 de octubre de 2026.";
    s.scenes[1].narration += " Oferta válida hasta el 1 de octubre de 2026.";
    s.scenes[1].onScreen = "Válida hasta el 1 de octubre de 2026";
    s.commercial = {
      terms: ["Fictional offer for testing: 1 USD"],
      sourceIds: ["src_fixture"],
      confirmedBy: "fixture_dealer",
      confirmedAt: "2026-09-30T15:00:00Z",
      validUntil: "2026-10-01T23:59:59Z",
    };
  }
  const script = await approveScript(c.ops, s);
  const media = await c.ops.ingest(operator, "prd_fixture", source, {
    origin: "Synthetic signals",
    licenseOrConsent: "Generated fixture; no person or vehicle",
    confirmedBy: "fixture_operator",
  });
  const master = await c.ops.registerMaster(
    operator,
    "prd_fixture",
    "master_fixture",
    script,
    media.assetId,
  );
  const ref = { artifactId: master.artifactId, version: master.version };
  for (const gate of ["CREATIVE", "TECHNICAL", "RIGHTS"] as const)
    await c.ops.approve(
      gate === "CREATIVE" ? presenter : operator,
      ref,
      gate,
      "APPROVED",
      "Synthetic asset component review",
    );
  // Publication component fixture: do not execute the entire production sequence.
  await c.ops.store.transaction((state) => {
    state.productions[0].state = "LISTO";
  });
  return { ...c, script, master: ref };
}
function request(
  master: Ref,
  platform: PublicationRequest["platform"] = "TIKTOK",
  disclosure: string | null = null,
): PublicationRequest {
  return {
    masterId: master.artifactId,
    masterVersion: master.version,
    platform,
    accountRef: "account_fixture",
    caption: "Video ficticio para pruebas; no publicar.",
    hashtags: ["#PruebaFicticia"],
    disclosure,
    scheduledAt: null,
    relatedContentUrl: null,
    rightsConfirmed: true,
  };
}
async function packet(
  c: Awaited<ReturnType<typeof ready>>,
  disclosure: string | null = null,
) {
  await c.ops.enqueue(operator, {
    workflowId: "prepare-publication-package",
    workflowVersion: "1.0.0",
    productionId: "prd_fixture",
    idempotencyKey: "packet",
    input: {
      request: request(c.master, "TIKTOK", disclosure),
      artifactId: "package_fixture",
    },
  });
  return (await c.ops.cycle())!.result[0];
}
test("publication export requires exact package approval and does not publish or fabricate receipts", async () => {
  const c = await ready();
  try {
    const p = await packet(c);
    await assert.rejects(
      c.ops.exportPackage(operator, p),
      /publication.*approval/,
    );
    await assert.rejects(
      c.ops.schedule(presenter, p, "pub_fixture"),
      /operator/,
    );
    await c.ops.approve(
      operator,
      p,
      "PUBLICATION",
      "APPROVED",
      "Review intended account and caption",
    );
    const directory = await c.ops.exportPackage(operator, p);
    assert.match(
      await readFile(join(directory, "caption.txt"), "utf8"),
      /PruebaFicticia/,
    );
    assert.equal((await c.ops.store.read()).publications.length, 0);
    const first = (await c.ops.schedule(operator, p, "pub_fixture")) as {
      publicationId: string;
    };
    const repeated = (await c.ops.schedule(operator, p, "pub_fixture")) as {
      publicationId: string;
    };
    assert.equal(first.publicationId, repeated.publicationId);
    await c.ops.transition(operator, "prd_fixture", "PROGRAMADO");
    const receipt = {
      remoteId: "fixture_remote_123",
      url: "https://www.tiktok.com/@fixture/video/123",
      publishedAt: "2026-09-30T16:00:00Z",
    };
    await assert.rejects(
      c.ops.recordPublication(operator, first.publicationId, {
        ...receipt,
        url: "https://youtube.com/watch?v=fixture",
      }),
      /another platform/,
    );
    const recorded = (await c.ops.recordPublication(
      operator,
      first.publicationId,
      receipt,
    )) as { status: string };
    assert.equal(recorded.status, "PUBLICADO");
    await c.ops.recordPublication(operator, first.publicationId, receipt);
    await assert.rejects(
      c.ops.recordPublication(operator, first.publicationId, {
        ...receipt,
        remoteId: "different",
      }),
      /overwritten/,
    );
    for (let i = 0; i < 2; i++)
      await c.ops.metrics(operator, {
        publicationId: first.publicationId,
        capturedAt: "2026-09-30T16:00:00Z",
        windowHours: 1 / 60,
        metrics: [
          {
            name: "fixture_views",
            definition: "Fictional platform metric",
            value: i,
            denominator: null,
          },
        ],
      });
    assert.equal((await c.ops.store.read()).metrics.length, 2);
  } finally {
    await c.cleanup();
  }
});
test("new script versions revoke the old media/package approval chain", async () => {
  const c = await ready();
  try {
    const p = await packet(c);
    await c.ops.approve(operator, p, "PUBLICATION", "APPROVED", "Fixture");
    const revision = await c.ops.adapt(presenter, c.script, [
      { sceneId: "hook", visual: "Otra tarjeta ficticia" },
    ]);
    assert.ok(await c.ops.exportPackage(operator, p));
    await c.ops.approve(
      operator,
      revision.artifact,
      "FACTUAL",
      "APPROVED",
      "Revision fact review",
    );
    await c.ops.approve(
      presenter,
      revision.artifact,
      "CREATIVE",
      "APPROVED",
      "Revision creative review",
    );
    await assert.rejects(c.ops.exportPackage(operator, p), /newer artifact/);
    await assert.rejects(c.ops.schedule(operator, p, "new"), /newer artifact/);
  } finally {
    await c.cleanup();
  }
});
test("promo packets require disclosure and day-of-publication commercial confirmation", async () => {
  const c = await ready(true);
  try {
    await c.ops.enqueue(operator, {
      workflowId: "prepare-publication-package",
      workflowVersion: "1.0.0",
      productionId: "prd_fixture",
      idempotencyKey: "missing_disclosure",
      input: { request: request(c.master), artifactId: "missing_package" },
    });
    await assert.rejects(c.ops.cycle(), /relationship disclosure/);
    const p = await packet(
      c,
      "Publicidad: relación comercial ficticia para la prueba.",
    );
    await c.ops.approve(operator, p, "PUBLICATION", "APPROVED", "Fixture");
    assert.ok(await c.ops.exportPackage(operator, p));
    c.tick(24 * 60 * 60 * 1000);
    await assert.rejects(c.ops.exportPackage(operator, p), /Reconfirm/);
    c.tick(24 * 60 * 60 * 1000);
    await assert.rejects(c.ops.exportPackage(operator, p), /expired/);
  } finally {
    await c.cleanup();
  }
});
test("render plans reject unsupported caption text, another vehicle's assets and scene order changes", async () => {
  const c = await ready();
  try {
    const state = await c.ops.store.read(),
      assetId = state.assets[0].assetId;
    const voicePath = join(c.root, "voice.wav");
    await runMediaTool("ffmpeg", [
      "-nostdin",
      "-v",
      "error",
      "-i",
      source,
      "-vn",
      voicePath,
    ]);
    const voice = await c.ops.ingest(operator, "prd_fixture", voicePath, {
      origin: "Synthetic extracted audio",
      licenseOrConsent: "Fixture signals only",
      confirmedBy: "fixture_operator",
    });
    const plan = {
      scriptId: c.script.artifactId,
      scriptVersion: c.script.version,
      segments: [
        { assetId, start: 0, end: 1, sceneId: "hook" },
        { assetId, start: 1, end: 2, sceneId: "close" },
      ],
      audioMode: "VOICE_OVER" as const,
      voiceoverAssetId: voice.assetId,
      subtitles: [],
      burnSubtitles: false,
    };
    const a = await c.ops.saveRenderPlan(
      operator,
      "prd_fixture",
      "plan_fixture",
      plan,
    );
    assert.equal(a.kind, "RENDER_PLAN");
    await assert.rejects(
      c.ops.saveRenderPlan(operator, "prd_fixture", "invalid_plan", {
        ...plan,
        subtitles: [{ start: 0, end: 2, text: "Unsupported claim" }],
      }),
      /approved narration/,
    );
    await assert.rejects(
      c.ops.saveRenderPlan(operator, "prd_fixture", "invalid_plan", {
        ...plan,
        segments: [...plan.segments].reverse(),
      }),
      /scene order/,
    );
    await assert.rejects(
      c.ops.saveRenderPlan(operator, "prd_fixture", "invalid_plan", {
        ...plan,
        segments: [
          { ...plan.segments[0], assetId: "asset_missing" },
          plan.segments[1],
        ],
      }),
      /missing media/,
    );
  } finally {
    await c.cleanup();
  }
});

test("publication intents recheck media integrity and reject contradictory metric windows", async () => {
  const c = await ready();
  try {
    const p = await packet(c);
    await c.ops.approve(operator, p, "PUBLICATION", "APPROVED", "Fixture");
    const pub = (await c.ops.schedule(operator, p, "publication_fixture")) as {
      publicationId: string;
    };
    await c.ops.transition(operator, "prd_fixture", "PROGRAMADO");
    await assert.rejects(
      c.ops.recordPublication(operator, pub.publicationId, {
        remoteId: "fixture",
        url: "https://tiktok.com/@fixture/video/1",
        publishedAt: "2026-09-30T15:00:00Z",
      }),
      /predates/,
    );
    await c.ops.recordPublication(operator, pub.publicationId, {
      remoteId: "fixture",
      url: "https://tiktok.com/@fixture/video/1",
      publishedAt: "2026-09-30T16:00:00Z",
    });
    await assert.rejects(
      c.ops.metrics(operator, {
        publicationId: pub.publicationId,
        capturedAt: "2026-09-30T16:00:00Z",
        windowHours: 24,
        metrics: [
          { name: "views", definition: "Fixture", value: 1, denominator: null },
        ],
      }),
      /exceeds/,
    );
    const state = await c.ops.store.read();
    const asset = (
      state.artifacts.find((a) => a.kind === "MASTER")!.payload as any
    ).asset;
    const { writeFile } = await import("node:fs/promises");
    await writeFile(asset.path, "Changed media");
    await assert.rejects(c.ops.exportPackage(operator, p), /no longer matches/);
    assert.equal(
      (
        (await c.ops.schedule(operator, p, "publication_fixture")) as {
          publicationId: string;
        }
      ).publicationId,
      pub.publicationId,
    );
  } finally {
    await c.cleanup();
  }
});
