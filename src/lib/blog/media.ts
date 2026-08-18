// Shared video-source helpers for article media (YouTube + Streamable).
// Keeps the YouTube logic in youtube.ts untouched and layers Streamable on top,
// so adding a source never changes YouTube behavior.
import { youtubeId } from "@/lib/blog/youtube";

export type MediaType = "youtube" | "streamable";

/** Streamable share/embed link → its id (e.g. streamable.com/0wdrc5 → 0wdrc5). */
export function streamableId(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.trim().match(/streamable\.com\/(?:e\/)?([A-Za-z0-9]+)/i);
  return m?.[1] ?? null;
}

/** Identify a pasted URL as YouTube or Streamable. Null = neither. */
export function parseVideoUrl(
  input: string | null | undefined,
): { type: MediaType; videoId: string } | null {
  const yt = youtubeId(input);
  if (yt) return { type: "youtube", videoId: yt };
  const st = streamableId(input);
  if (st) return { type: "streamable", videoId: st };
  return null;
}

/** The embed (iframe) URL for a media item, per source. */
export function mediaEmbedUrl(
  m: { type?: MediaType; videoId: string },
  autoplay = true,
): string {
  if (m.type === "streamable") {
    return `https://streamable.com/e/${m.videoId}${autoplay ? "?autoplay=1" : ""}`;
  }
  return `https://www.youtube-nocookie.com/embed/${m.videoId}${
    autoplay ? "?autoplay=1" : ""
  }`;
}

/**
 * Poster/thumbnail for a media item. YouTube has a predictable no-API thumb;
 * Streamable does not, so it falls back to any stored thumbnailUrl or null
 * (callers render a play-on-black facade when null).
 */
export function mediaPoster(m: {
  type?: MediaType;
  videoId: string;
  thumbnailUrl?: string | null;
  quality?: "hq" | "mq";
}): string | null {
  if (m.thumbnailUrl) return m.thumbnailUrl;
  if (m.type === "streamable") return null;
  return `https://i.ytimg.com/vi/${m.videoId}/${m.quality === "mq" ? "mqdefault" : "hqdefault"}.jpg`;
}
