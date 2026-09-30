import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertId,
  ingestMedia,
  verifyAsset,
  renderVideo,
  extractClip,
  runMediaTool,
  subtitlesSrt,
  probeMedia,
} from "../src/index.js";
const rights = {
  origin: "Generated test signals",
  licenseOrConsent: "Synthetic fixture, no person or real vehicle",
  confirmedBy: "fixture_operator",
};
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "automotive-media-"));
  const source = join(root, "fixture.mp4"),
    voice = join(root, "voice.wav"),
    image = join(root, "image.png");
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
    "2",
    "-threads",
    "2",
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    source,
  ]);
  await runMediaTool("ffmpeg", [
    "-nostdin",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=220:sample_rate=48000",
    "-t",
    "1",
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
  return {
    root,
    source,
    voice,
    image,
    clean: () => rm(root, { recursive: true, force: true }),
  };
}
test("intake detects media content, hashes immutable originals and rejects fake video files", async () => {
  const f = await fixture();
  try {
    const a = await ingestMedia(f.root, f.source, rights);
    assert.equal(a.kind, "VIDEO");
    assert.equal(a.hasAudio, true);
    assert.equal(a.width, 320);
    await verifyAsset(f.root, a);
    assert.equal((await ingestMedia(f.root, f.voice, rights)).kind, "AUDIO");
    assert.equal((await ingestMedia(f.root, f.image, rights)).kind, "IMAGE");
    const fake = join(f.root, "fake.mp4");
    await writeFile(fake, "not a video");
    await assert.rejects(ingestMedia(f.root, fake, rights), /ffprobe/);
    await assert.rejects(
      ingestMedia(f.root, f.source, { ...rights, licenseOrConsent: "" }),
      /rights/,
    );
    await writeFile(a.path, "changed");
    await assert.rejects(verifyAsset(f.root, a), /no longer matches/);
  } finally {
    await f.clean();
  }
});
test("source-audio and voice-over renderers produce playable vertical H.264/AAC masters without modifying originals", async () => {
  const f = await fixture();
  try {
    const video = await ingestMedia(f.root, f.source, rights),
      voice = await ingestMedia(f.root, f.voice, rights),
      image = await ingestMedia(f.root, f.image, rights);
    const base = {
      scriptId: "script_fixture",
      scriptVersion: 1,
      segments: [
        { assetId: video.assetId, start: 0, end: 1, sceneId: "scene_fixture" },
      ],
      subtitles: [{ start: 0, end: 1, text: "Prueba ficticia" }],
      burnSubtitles: true,
    };
    const source = await renderVideo(
      f.root,
      { ...base, audioMode: "SOURCE", voiceoverAssetId: null },
      [video],
      join(f.root, "source-render"),
      [{ start: 0, end: 1, text: "Prueba ficticia %{metadata:no_expansion}" }],
    );
    assert.equal(source.width, 1080);
    assert.equal(source.height, 1920);
    assert.equal(source.hasAudio, true);
    assert.ok(Math.abs(source.duration - 1) < 0.15);
    const off = await renderVideo(
      f.root,
      {
        ...base,
        segments: [
          {
            assetId: image.assetId,
            start: 0,
            end: 1,
            sceneId: "scene_fixture",
          },
        ],
        audioMode: "VOICE_OVER",
        voiceoverAssetId: voice.assetId,
      },
      [image, voice],
      join(f.root, "voice-render"),
    );
    assert.equal(off.width, 1080);
    assert.equal(off.hasAudio, true);
    await verifyAsset(f.root, video);
    await assert.rejects(
      renderVideo(
        f.root,
        { ...base, audioMode: "VOICE_OVER", voiceoverAssetId: null },
        [video],
        join(f.root, "missing-voice"),
      ),
      /Voice-over/,
    );
    await assert.rejects(
      renderVideo(
        f.root,
        { ...base, audioMode: "SOURCE", voiceoverAssetId: null },
        [video],
        join(f.root, "..", "unsafe-output"),
      ),
      /inside/,
    );
    await assert.rejects(
      extractClip(f.root, off, 0, 1, join(f.root, "short.mp4")),
      /15–35/,
    );
  } finally {
    await f.clean();
  }
});
test("subtitle and identifier checks reject traversal, invalid timing and unresolved markers", () => {
  assert.throws(() => assertId("../../evil"), /identifier/);
  assert.throws(() => subtitlesSrt([{ start: 1, end: 0, text: "bad" }]), /cue/);
  assert.throws(
    () => subtitlesSrt([{ start: 0, end: 1, text: "[PRECIO POR CONFIRMAR]" }]),
    /cue/,
  );
  assert.throws(
    () => subtitlesSrt([{ start: 0, end: 1, text: "bad\nsubtitle injection" }]),
    /cue/,
  );
  assert.match(
    subtitlesSrt([{ start: 61.125, end: 62, text: "Prueba" }]),
    /00:01:01,125 --> 00:01:02,000/,
  );
});

test("a valid approved-length clip remains playable and preserves its source master", async () => {
  const root = await mkdtemp(join(tmpdir(), "automotive-clip-"));
  try {
    const path = join(root, "master.mp4");
    await runMediaTool("ffmpeg", [
      "-nostdin",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=purple:s=1080x1920:r=30",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=330:sample_rate=48000",
      "-t",
      "16",
      "-threads",
      "2",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-c:a",
      "aac",
      path,
    ]);
    const master = await ingestMedia(root, path, rights),
      clip = await extractClip(root, master, 0, 15, join(root, "clip.mp4"));
    assert.equal(clip.width, 1080);
    assert.equal(clip.hasAudio, true);
    assert.ok(Math.abs(clip.duration - 15) < 0.15);
    await verifyAsset(root, master);
    await verifyAsset(root, clip);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
