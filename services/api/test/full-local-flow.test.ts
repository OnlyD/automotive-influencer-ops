import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  createImportPreview,
  applyImportPreview,
  FileImportPreviewStore,
  FileInventoryRepository,
  applyReferenceReview,
  referenceReviewHash,
  snapshotHash,
} from "@automotive/inventory";
import {
  runMediaTool,
  verifyAsset,
  validateMasterMedia,
} from "@automotive/media";
import type {
  ProductionScript,
  Source,
  VehicleFact,
  Publication,
} from "@automotive/contracts";
import { Operations, artifact, digest } from "../src/engine.js";
import { FileOperationStore, type Ref } from "../src/store.js";
import { presenterDocument } from "../src/documents.js";
import { operator, presenter } from "./helpers.js";

const rights = {
  origin: "Generated test signals",
  licenseOrConsent: "Synthetic fixture only; no person or actual vehicle",
  confirmedBy: operator.name,
};
for (const mode of ["PROMO", "VOICE_OVER"] as const) {
  test(`${mode}: fictional local flow exercises every production state, rendering, clipping and historical receipts`, async () => {
    const root = await mkdtemp(join(tmpdir(), "automotive-full-audit-"));
    let time = new Date("2026-09-30T16:00:00Z");
    const pid = "prd_audit",
      source = join(root, "source.mp4"),
      voice = join(root, "voice.wav"),
      image = join(root, "still.png");
    const inventory = new FileInventoryRepository(join(root, "inventory.json"));
    const ops = new Operations(
      new FileOperationStore(join(root, "operations")),
      "0".repeat(40),
      () => new Date(time),
      inventory,
    );
    const enqueue = async (
      workflowId:
        | "create-shooting-plan"
        | "render-video"
        | "extract-clips"
        | "prepare-publication-package",
      input: Record<string, unknown>,
      key = workflowId,
    ) =>
      ops.enqueue(operator, {
        workflowId,
        workflowVersion: "1.0.0",
        productionId: pid,
        idempotencyKey: key,
        input,
      });
    const review = async (
      ref: Ref,
      gates: Array<
        | "FACTUAL"
        | "CREATIVE"
        | "COMMERCIAL"
        | "RIGHTS"
        | "TECHNICAL"
        | "PUBLICATION"
      >,
    ) => {
      for (const gate of gates)
        await ops.approve(
          gate === "CREATIVE" ? presenter : operator,
          ref,
          gate,
          "APPROVED",
          "Fictional automation fixture review; not an approval of real media",
        );
    };
    try {
      const csvContent =
        "source_system,source_record_id,year,make,model,trim,market,condition,status\nfixture,unit,2025,Honda,Fictional model,Fictional trim,US,NEW,AVAILABLE\n";
      const services = {
        repository: inventory,
        previewStore: new FileImportPreviewStore(join(root, "previews")),
        sourcePath: join(root, "inventory.csv"),
        csvContent,
        now: () => "2026-09-27T12:00:00Z",
      };
      const preview = await createImportPreview(services);
      await applyImportPreview({
        ...services,
        importId: preview.report.importId,
        approvedPreviewHash: preview.report.previewHash,
      });
      const vehicle = (await inventory.listVehicles())[0];
      const evidence: Source = {
        sourceId: "src_fixture",
        type: "TEST_FIXTURE",
        title: "Fictional source only",
        publisher: "Test fixture",
        url: "https://example.invalid/audit",
        retrievedAt: "2026-09-27T12:00:00Z",
        publishedAt: null,
        contentHash: null,
        archiveLocation: null,
        reliabilityTier: 5,
        locale: "es-US",
      };
      const facts: VehicleFact[] = [30, 50].map((value, i) => ({
        vehicleFactId: `fact_fixture_${i}`,
        vehicleId: vehicle.vehicleId,
        field: `fixture.attribute_${i}`,
        value,
        unit: "fixture_unit",
        scope: "MODEL_TRIM",
        verificationStatus: "VERIFIED",
        sourceIds: [evidence.sourceId],
        verifiedAt: "2026-09-27T12:00:00Z",
        verifiedBy: operator.name,
        validUntil: null,
        notes: "Invented test data",
      }));
      const factualReview = {
        sources: [evidence],
        facts,
        requestedBy: operator.name,
        requestedRole: "technical-operator" as const,
      };
      await applyReferenceReview(
        inventory,
        factualReview,
        referenceReviewHash(factualReview),
        snapshotHash(await inventory.readSnapshot()),
      );
      await ops.create(operator, {
        productionId: pid,
        vehicleId: vehicle.vehicleId,
        title: "Synthetic audit",
        mode,
        targetPlatforms: ["TIKTOK"],
      });
      const script: ProductionScript = {
        title: "Prueba ficticia",
        duration: 20,
        contactMethod: "el medio de prueba",
        scenes: [
          {
            id: "detail",
            start: 0,
            end: 10,
            visual: "Tarjeta ficticia",
            narration: "Esta prueba tiene 30 y 50 unidades ficticias.",
            onScreen: "30 y 50 unidades ficticias",
            factRefs: facts.map((f) => f.vehicleFactId),
            sourceRefs: [evidence.sourceId],
            commercial: false,
          },
          {
            id: "close",
            start: 10,
            end: 20,
            visual: "Tarjeta de cierre",
            narration:
              "Contáctanos por el medio de prueba. Sigue la cuenta, dale me gusta y comenta." +
              (mode === "PROMO"
                ? " Oferta ficticia de 1 USD, válida hasta el 1 de octubre de 2026."
                : ""),
            onScreen:
              mode === "PROMO"
                ? "1 USD · Válida hasta el 1 de octubre de 2026"
                : "Sigue la cuenta",
            factRefs: [],
            sourceRefs: mode === "PROMO" ? [evidence.sourceId] : [],
            commercial: mode === "PROMO",
          },
        ],
        facts: facts.map((f) => ({
          id: f.vehicleFactId,
          text: `${f.value} unidades ficticias`,
          canonicalValue: f.value,
          canonicalUnit: f.unit,
          sourceIds: f.sourceIds,
        })),
        sources: [
          {
            id: evidence.sourceId,
            title: evidence.title,
            url: evidence.url!,
            retrievedAt: evidence.retrievedAt,
          },
        ],
        commercial:
          mode === "PROMO"
            ? {
                terms: ["1 USD ficticio; sin oferta real"],
                sourceIds: [evidence.sourceId],
                confirmedBy: "fixture_dealer",
                confirmedAt: "2026-09-30T10:00:00-06:00",
                validUntil: "2026-10-01T23:59:59Z",
              }
            : null,
      };
      const draft = await ops.saveScript(operator, pid, "script_audit", script);
      const bound = await ops.bindFacts(operator, draft);
      await review(bound, [
        "FACTUAL",
        "CREATIVE",
        ...(mode === "PROMO" ? ["COMMERCIAL" as const] : []),
      ]);
      await assert.rejects(
        ops.saveScript(operator, pid, "another_script", script),
        /existing script identifier/,
      );
      for (const state of [
        "INVESTIGANDO",
        "DATOS_VERIFICADOS",
        "GUION_GENERADO",
        "REVISION_PRESENTADORA",
        "APROBADO",
      ] as const)
        await ops.transition(operator, pid, state);
      const shotJob = await enqueue("create-shooting-plan", {
        script: { artifactId: bound.artifactId, version: bound.version },
        artifactId: "shoot_audit",
      });
      const claimed = (await ops.claim("audit_worker"))!;
      const forged = structuredClone(claimed);
      forged.input.artifactId = "forged_shoot";
      forged.requestHash = digest({
        workflowId: forged.workflowId,
        workflowVersion: forged.workflowVersion,
        productionId: forged.productionId,
        idempotencyKey: forged.idempotencyKey,
        input: forged.input,
      });
      await assert.rejects(ops.executeClaimed(forged), /persisted immutable/);
      const shot = (await ops.executeClaimed(claimed))[0];
      assert.equal(
        (await ops.store.read()).jobs.find((j) => j.jobId === shotJob.jobId)!
          .status,
        "COMPLETED",
      );
      assert.ok(
        (await presenterDocument(artifact(await ops.store.read(), shot)))
          .length > 1000,
      );
      await review(shot, ["CREATIVE"]);
      await ops.transition(operator, pid, "LISTO_PARA_GRABAR");
      await assert.rejects(
        ops.transition(operator, pid, "GRABADO"),
        /visual material/,
      );
      await runMediaTool("ffmpeg", [
        "-nostdin",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=blue:s=320x240:r=30",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:sample_rate=48000",
        "-t",
        "20",
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
      await runMediaTool("ffmpeg", [
        "-nostdin",
        "-v",
        "error",
        "-i",
        source,
        "-vn",
        voice,
      ]);
      await runMediaTool("ffmpeg", [
        "-nostdin",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=red:s=320x240",
        "-frames:v",
        "1",
        "-threads",
        "1",
        image,
      ]);
      const audio = await ops.ingest(presenter, pid, voice, rights);
      await assert.rejects(
        ops.transition(operator, pid, "GRABADO"),
        /visual material/,
      );
      const visual = await ops.ingest(
        presenter,
        pid,
        mode === "PROMO" ? source : image,
        rights,
      );
      await ops.transition(operator, pid, "GRABADO");
      const plan = await ops.saveRenderPlan(operator, pid, "edit_audit", {
        scriptId: bound.artifactId,
        scriptVersion: bound.version,
        segments: script.scenes.map((scene) => ({
          assetId: visual.assetId,
          sceneId: scene.id,
          start: mode === "PROMO" ? scene.start : 0,
          end: mode === "PROMO" ? scene.end : 10,
        })),
        audioMode: mode === "PROMO" ? "SOURCE" : "VOICE_OVER",
        voiceoverAssetId: mode === "PROMO" ? null : audio.assetId,
        subtitles: script.scenes.map((scene) => ({
          start: scene.start,
          end: scene.end,
          text: scene.narration,
        })),
        burnSubtitles: true,
      });
      await review(plan, ["CREATIVE"]);
      await enqueue("render-video", {
        plan: { artifactId: plan.artifactId, version: plan.version },
        artifactId: "master_audit",
      });
      let master: Ref;
      if (mode === "PROMO") {
        const failedAttempt = (await ops.claim("audit_worker"))!;
        const blocked = join(
          ops.store.root,
          "productions",
          pid,
          "renders",
          `${failedAttempt.jobId}-${failedAttempt.attempt}-${failedAttempt.leaseToken}`,
        );
        await mkdir(blocked, { recursive: true });
        await writeFile(
          join(blocked, "segment-0.mp4"),
          "Partial previous output",
        );
        await assert.rejects(
          ops.executeClaimed(failedAttempt),
          /ffmpeg failed/,
        );
        await ops.retry(operator, failedAttempt.jobId);
        master = (await ops.cycle())!.result[0];
      } else master = (await ops.cycle())!.result[0];
      const masterAsset = (
        artifact(await ops.store.read(), master).payload as any
      ).asset;
      await validateMasterMedia(ops.store.root, masterAsset, 20);
      await verifyAsset(ops.store.root, visual);
      await ops.transition(operator, pid, "EDITADO");
      await review(master, ["CREATIVE", "TECHNICAL", "RIGHTS"]);
      await enqueue("extract-clips", {
        master,
        clips: [
          {
            clipId: "clip_audit",
            start: 0,
            end: 20,
            purpose: "Complete fictional example only",
            standaloneConfirmed: true,
          },
        ],
      });
      const clip = (await ops.cycle())!.result[0];
      await review(clip, ["CREATIVE", "TECHNICAL", "RIGHTS"]);
      await enqueue("prepare-publication-package", {
        artifactId: "package_audit",
        request: {
          masterId: clip.artifactId,
          masterVersion: clip.version,
          platform: "TIKTOK",
          accountRef: "fictional_account",
          caption: "Prueba ficticia, no publicar. Sigue la cuenta y comenta.",
          hashtags: ["#Prueba"],
          disclosure:
            mode === "PROMO" ? "Publicidad ficticia para pruebas" : null,
          scheduledAt: null,
          relatedContentUrl: null,
          rightsConfirmed: true,
        },
      });
      const packet = (await ops.cycle())!.result[0];
      await review(packet, ["PUBLICATION"]);
      await ops.transition(operator, pid, "LISTO");
      const exportPath = await ops.exportPackage(operator, packet);
      assert.ok((await readFile(join(exportPath, "video.mp4"))).length > 1000);
      const scheduled = (await ops.schedule(
        operator,
        packet,
        "audit_publication",
      )) as Publication;
      await ops.approve(
        operator,
        master,
        "RIGHTS",
        "REJECTED",
        "Synthetic revocation check",
      );
      await assert.rejects(
        ops.transition(operator, pid, "PROGRAMADO"),
        /rights approval/,
      );
      await ops.approve(
        operator,
        master,
        "RIGHTS",
        "APPROVED",
        "Fictional evidence rereviewed",
      );
      await ops.transition(operator, pid, "PROGRAMADO");
      await assert.rejects(
        ops.recordPublication(operator, scheduled.publicationId, {
          remoteId: "fixture",
          url: "https://tiktok.com/@fixture/video/123",
          publishedAt: "2026-09-30T15:00:00Z",
        }),
        /predates/,
      );
      const publishedAt = time.toISOString();
      // No platform call: delayed registration of an expressly fictional test attestation.
      time = new Date("2026-10-02T16:00:00Z");
      await inventory.upsertReferenceData(
        [evidence],
        facts.map((f) => ({ ...f, verificationStatus: "STALE" as const })),
      );
      await ops.recordPublication(operator, scheduled.publicationId, {
        remoteId: "fixture_only",
        url: "https://tiktok.com/@fixture/video/123",
        publishedAt,
      });
      await ops.transition(operator, pid, "PUBLICADO");
      await ops.metrics(operator, {
        publicationId: scheduled.publicationId,
        capturedAt: time.toISOString(),
        windowHours: 48,
        metrics: [
          {
            name: "fixture_views",
            definition: "Invented measurement only",
            value: 0,
            denominator: null,
          },
        ],
      });
      await ops.transition(operator, pid, "MEDIDO");
      const state = await ops.store.read();
      assert.equal(state.productions[0].state, "MEDIDO");
      assert.equal(state.publications.length, 1);
      assert.equal(state.metrics.length, 1);
      assert.equal(
        state.events.filter((e) => e.type === "production.transitioned").length,
        12,
      );
      await assert.rejects(
        ops.exportPackage(operator, packet),
        /canonical fact|expired|Review the selected/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}
