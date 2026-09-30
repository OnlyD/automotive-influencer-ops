import type { VehicleFact, Source } from "./types.js";
export type Platform = "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "FACEBOOK";
export type VideoMode = "PROMO" | "VOICE_OVER";
export interface ProductionScript {
  verifiedReferences?: { facts: VehicleFact[]; sources: Source[] };
  title: string;
  duration: number;
  scenes: Array<{
    id: string;
    start: number;
    end: number;
    visual: string;
    narration: string;
    onScreen: string;
    factRefs: string[];
    sourceRefs: string[];
    commercial: boolean;
  }>;
  facts: Array<{
    id: string;
    text: string;
    sourceIds: string[];
    canonicalFactHash?: string;
    canonicalValue?: unknown;
    canonicalUnit?: string | null;
  }>;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    retrievedAt: string;
  }>;
  commercial: null | {
    terms: string[];
    sourceIds: string[];
    confirmedBy: string;
    confirmedAt: string;
    validUntil: string;
  };
  contactMethod: string;
}
export interface RenderPlan {
  scriptId: string;
  scriptVersion: number;
  segments: Array<{
    assetId: string;
    start: number;
    end: number;
    sceneId: string;
  }>;
  audioMode: "SOURCE" | "VOICE_OVER";
  voiceoverAssetId: string | null;
  subtitles: Array<{ start: number; end: number; text: string }>;
  burnSubtitles: boolean;
}
export interface PublicationRequest {
  masterId: string;
  masterVersion: number;
  platform: Platform;
  accountRef: string;
  caption: string;
  hashtags: string[];
  disclosure: string | null;
  scheduledAt: string | null;
  relatedContentUrl: string | null;
  rightsConfirmed: true;
}

export interface MediaAsset {
  assetId: string;
  path: string;
  hash: string;
  bytes: number;
  kind: "VIDEO" | "AUDIO" | "IMAGE";
  mimeType: string;
  duration: number;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  rights: { origin: string; licenseOrConsent: string; confirmedBy: string };
}
