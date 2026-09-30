import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  copyFile,
  mkdir,
  realpath,
  stat,
  writeFile,
  rm,
} from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import type { RenderPlan } from "@automotive/contracts";

import type { MediaAsset } from "@automotive/contracts";
export type { MediaAsset } from "@automotive/contracts";
export function assertId(value: string): void {
  if (!/^[a-z][a-zA-Z0-9_-]{0,95}$/.test(value))
    throw new Error("Invalid identifier.");
}
export async function hashFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return `sha256:${hash.digest("hex")}`;
}
export async function runMediaTool(
  binary: "ffmpeg" | "ffprobe",
  args: string[],
  cwd?: string,
): Promise<string> {
  return new Promise((accept, reject) => {
    const child = spawn(binary, args, {
      shell: false,
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 240_000,
    });
    let output = "",
      diagnostic = "",
      bytes = 0;
    for (const [stream, isOutput] of [
      [child.stdout, true],
      [child.stderr, false],
    ] as const)
      stream.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 2_000_000) child.kill("SIGKILL");
        else if (isOutput) output += chunk.toString();
        else diagnostic += chunk.toString();
      });
    child.on("error", () =>
      reject(new Error(`${binary} is unavailable or could not start.`)),
    );
    child.on("close", (code) =>
      code === 0 && bytes <= 2_000_000
        ? accept(output)
        : reject(
            new Error(
              `${binary} failed (${code}); media processing stopped. ${diagnostic.slice(-1200)}`,
            ),
          ),
    );
  });
}
export async function probeMedia(
  path: string,
): Promise<Omit<MediaAsset, "assetId" | "path" | "hash" | "bytes" | "rights">> {
  const info = JSON.parse(
    await runMediaTool("ffprobe", [
      "-v",
      "error",
      "-protocol_whitelist",
      "file,pipe",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      path,
    ]),
  );
  const streams = info.streams as Array<{
    codec_type: string;
    codec_name: string;
    width?: number;
    height?: number;
    duration?: string;
  }>;
  const video = streams.find((stream) => stream.codec_type === "video");
  const audio = streams.some((stream) => stream.codec_type === "audio");
  const format = String(info.format?.format_name ?? "");
  const image =
    video &&
    ["png", "mjpeg"].includes(video.codec_name) &&
    /image2|png_pipe|jpeg_pipe/.test(format);
  if (
    streams.length === 0 ||
    streams.some((stream) => !["video", "audio"].includes(stream.codec_type)) ||
    !/mov|mp4|matroska|webm|wav|mp3|flac|ogg|image2|png_pipe|jpeg_pipe/.test(
      format,
    )
  )
    throw new Error("Unsupported media container or streams.");
  const duration = image ? 0 : Number(info.format?.duration ?? video?.duration);
  if (
    !image &&
    (!Number.isFinite(duration) || duration <= 0 || duration > 7200)
  )
    throw new Error("Invalid media duration; maximum is two hours.");
  if (
    video &&
    (!video.width || !video.height || video.width > 7680 || video.height > 7680)
  )
    throw new Error("Unsupported media dimensions.");
  return {
    kind: image ? "IMAGE" : video ? "VIDEO" : "AUDIO",
    duration,
    width: video?.width ?? null,
    height: video?.height ?? null,
    hasAudio: audio,
    mimeType: image
      ? video.codec_name === "png"
        ? "image/png"
        : "image/jpeg"
      : video
        ? /matroska|webm/.test(format)
          ? "video/x-matroska"
          : info.format?.tags?.major_brand?.trim() === "qt"
            ? "video/quicktime"
            : "video/mp4"
        : /wav/.test(format)
          ? "audio/wav"
          : /ogg/.test(format)
            ? "audio/ogg"
            : /flac/.test(format)
              ? "audio/flac"
              : /mov|mp4/.test(format)
                ? "audio/mp4"
                : "audio/mpeg",
  };
}
export async function ingestMedia(
  root: string,
  sourcePath: string,
  rights: MediaAsset["rights"],
): Promise<MediaAsset> {
  if (
    Object.values(rights).some(
      (value) => typeof value !== "string" || !value.trim(),
    )
  )
    throw new Error(
      "Origin, rights evidence, and confirming operator are required.",
    );
  const original = await realpath(sourcePath);
  const details = await stat(original);
  if (!details.isFile() || details.size === 0 || details.size > 2_000_000_000)
    throw new Error("Expected a regular media file between 1 byte and 2 GB.");
  const assetId = `asset_${randomUUID()}`;
  const directory = join(root, "assets", assetId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, "original");
  try {
    await copyFile(original, path, 1);
    const copied = await stat(path);
    if (copied.size > 2_000_000_000)
      throw new Error("File changed during intake.");
    const metadata = await probeMedia(path);
    return {
      assetId,
      path,
      hash: await hashFile(path),
      bytes: copied.size,
      rights,
      ...metadata,
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
export async function verifyAsset(
  root: string,
  asset: MediaAsset,
): Promise<void> {
  assertId(asset.assetId);
  const path = await realpath(asset.path);
  const safeRoot = await realpath(root);
  if (!path.startsWith(safeRoot + sep) || (await hashFile(path)) !== asset.hash)
    throw new Error(
      "Media path or content no longer matches the registered asset.",
    );
}
export async function validateMasterMedia(
  root: string,
  asset: MediaAsset,
  duration: number,
): Promise<void> {
  await verifyAsset(root, asset);
  const info = JSON.parse(
    await runMediaTool("ffprobe", [
      "-v",
      "error",
      "-protocol_whitelist",
      "file,pipe",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      asset.path,
    ]),
  );
  const videos = info.streams.filter((s: any) => s.codec_type === "video");
  const audios = info.streams.filter((s: any) => s.codec_type === "audio");
  const brand = String(info.format?.tags?.major_brand ?? "").trim();
  if (
    asset.mimeType !== "video/mp4" ||
    brand === "qt" ||
    !/mov|mp4/.test(String(info.format?.format_name)) ||
    videos.length !== 1 ||
    audios.length !== 1 ||
    info.streams.length !== 2 ||
    videos[0].codec_name !== "h264" ||
    videos[0].pix_fmt !== "yuv420p" ||
    videos[0].width !== 1080 ||
    videos[0].height !== 1920 ||
    audios[0].codec_name !== "aac" ||
    Math.abs(Number(info.format.duration) - duration) > 0.15 ||
    !Number.isFinite(Number(info.format.duration))
  )
    throw new Error(
      "Publication media must be an actual 1080×1920 H.264/yuv420p and AAC MP4 matching the approved duration.",
    );
}
function timestamp(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  return (
    `${Math.floor(ms / 3600000)
      .toString()
      .padStart(2, "0")}:${Math.floor(ms / 60000) % 60}`.replace(
      /:(\d)$/,
      ":0$1",
    ) +
    `:${(Math.floor(ms / 1000) % 60).toString().padStart(2, "0")},${(ms % 1000).toString().padStart(3, "0")}`
  );
}
export function subtitlesSrt(cues: RenderPlan["subtitles"]): string {
  let previous = 0;
  return cues
    .map((cue, index) => {
      if (
        !Number.isFinite(cue.start) ||
        !Number.isFinite(cue.end) ||
        cue.start < previous ||
        cue.end <= cue.start ||
        /[\r\n]|-->|\[.*POR CONFIRMAR\]/.test(cue.text)
      )
        throw new Error("Invalid subtitle cue.");
      previous = cue.end;
      return `${index + 1}\n${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cue.text}\n`;
    })
    .join("\n");
}
export async function renderVideo(
  root: string,
  plan: RenderPlan,
  assets: MediaAsset[],
  outputDirectory: string,
  onScreen: RenderPlan["subtitles"] = [],
): Promise<MediaAsset> {
  const outputRoot = resolve(root),
    out = resolve(outputDirectory);
  if (!out.startsWith(outputRoot + sep))
    throw new Error(
      "Render output must remain inside local operational storage.",
    );
  await mkdir(out, { recursive: true, mode: 0o700 });
  const lookup = new Map(assets.map((a) => [a.assetId, a]));
  let duration = 0;
  const videoPaths: string[] = [];
  for (const [index, segment] of plan.segments.entries()) {
    const asset = lookup.get(segment.assetId);
    if (!asset || asset.kind === "AUDIO")
      throw new Error("Render segment requires a registered video or image.");
    await verifyAsset(root, asset);
    if (
      segment.start < 0 ||
      segment.end <= segment.start ||
      (asset.kind !== "IMAGE" && segment.end > asset.duration + 0.05)
    )
      throw new Error("Segment is outside the source duration.");
    if (plan.audioMode === "SOURCE" && !asset.hasAudio)
      throw new Error(
        "Source narration is missing; supply a voice-over track.",
      );
    const length = segment.end - segment.start;
    duration += length;
    if (duration > 600)
      throw new Error("Render exceeds the ten-minute safety limit.");
    const target = join(out, `segment-${index}.mp4`);
    videoPaths.push(target);
    const args = [
      "-nostdin",
      "-v",
      "error",
      "-n",
      "-threads",
      "2",
      "-protocol_whitelist",
      "file,pipe",
      ...(asset.kind === "IMAGE"
        ? ["-loop", "1"]
        : ["-ss", String(segment.start)]),
      "-i",
      asset.path,
      "-t",
      String(length),
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      ...(plan.audioMode === "SOURCE"
        ? ["-c:a", "aac", "-ar", "48000", "-ac", "2"]
        : ["-an"]),
      target,
    ];
    await runMediaTool("ffmpeg", args);
  }
  const concat = join(out, "concat.txt");
  await writeFile(
    concat,
    videoPaths.map((_, i) => `file 'segment-${i}.mp4'`).join("\n"),
  );
  const args = [
    "-nostdin",
    "-v",
    "error",
    "-n",
    "-threads",
    "2",
    "-protocol_whitelist",
    "file,pipe",
    "-f",
    "concat",
    "-safe",
    "1",
    "-i",
    concat,
  ];
  if (plan.audioMode === "VOICE_OVER") {
    const audio = lookup.get(plan.voiceoverAssetId ?? "");
    if (!audio || !audio.hasAudio || Math.abs(audio.duration - duration) > 0.15)
      throw new Error(
        "Voice-over track must match the complete edit duration; adjust the approved timing or trim silence explicitly before intake.",
      );
    await verifyAsset(root, audio);
    args.push(
      "-protocol_whitelist",
      "file,pipe",
      "-i",
      audio.path,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
    );
  } else args.push("-map", "0:v:0", "-map", "0:a:0");
  const srt = join(out, "subtitles.srt");
  await writeFile(srt, subtitlesSrt(plan.subtitles));
  const filters: string[] = [];
  if (plan.burnSubtitles && plan.subtitles.length)
    filters.push(
      "subtitles=filename=subtitles.srt:force_style='FontSize=18,MarginV=80,Outline=2'",
    );
  for (const [index, cue] of onScreen.entries()) {
    if (
      !Number.isFinite(cue.start) ||
      !Number.isFinite(cue.end) ||
      cue.start < 0 ||
      cue.end <= cue.start ||
      cue.end > duration ||
      typeof cue.text !== "string" ||
      cue.text.includes("\0") ||
      /\[[^\]]+\]/.test(cue.text)
    )
      throw new Error("Invalid approved on-screen copy.");
    const lines: string[] = [];
    let line = "";
    for (const word of cue.text.split(/\s+/)) {
      if (line.length + word.length > 32 && line) {
        lines.push(line);
        line = "";
      }
      line += (line ? " " : "") + word;
    }
    if (line) lines.push(line);
    const filename = `overlay-${index}.txt`;
    await writeFile(join(out, filename), lines.join("\n"));
    filters.push(
      `drawtext=font='DejaVu Sans':textfile=${filename}:expansion=none:fontsize=44:fontcolor=white:borderw=2:bordercolor=black:x=(w-tw)/2:y=120:box=1:boxcolor=black@0.6:boxborderw=12:enable='gte(t,${cue.start})*lt(t,${cue.end})'`,
    );
  }
  if (filters.length)
    args.push(
      "-vf",
      filters.join(","),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
    );
  else args.push("-c:v", "copy");
  const path = join(out, "master.mp4");
  args.push(
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-t",
    String(duration),
    "-movflags",
    "+faststart",
    path,
  );
  await runMediaTool("ffmpeg", args, out);
  const probe = await probeMedia(path);
  if (
    probe.width !== 1080 ||
    probe.height !== 1920 ||
    !probe.hasAudio ||
    Math.abs(probe.duration - duration) > 0.15
  )
    throw new Error("Rendered master failed technical validation.");
  return {
    assetId: `asset_${randomUUID()}`,
    path,
    hash: await hashFile(path),
    bytes: (await stat(path)).size,
    rights: {
      origin: "Approved production edit",
      licenseOrConsent: "Inherits the declared rights of all source assets",
      confirmedBy: "technical-operator",
    },
    ...probe,
  };
}
export async function extractClip(
  root: string,
  master: MediaAsset,
  start: number,
  end: number,
  path: string,
): Promise<MediaAsset> {
  await verifyAsset(root, master);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end <= start ||
    end > master.duration ||
    end - start < 15 ||
    end - start > 35
  )
    throw new Error(
      "Clip must be a complete 15–35 second interval within the master.",
    );
  const safeRoot = await realpath(root);
  if (!resolve(path).startsWith(safeRoot + sep))
    throw new Error("Clip output must remain in operational storage.");
  await mkdir(resolve(path, ".."), { recursive: true, mode: 0o700 });
  await runMediaTool("ffmpeg", [
    "-nostdin",
    "-v",
    "error",
    "-n",
    "-threads",
    "2",
    "-protocol_whitelist",
    "file,pipe",
    "-ss",
    String(start),
    "-i",
    master.path,
    "-t",
    String(end - start),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "22",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    path,
  ]);
  return {
    ...master,
    assetId: `asset_${randomUUID()}`,
    path,
    hash: await hashFile(path),
    bytes: (await stat(path)).size,
    ...(await probeMedia(path)),
  };
}
