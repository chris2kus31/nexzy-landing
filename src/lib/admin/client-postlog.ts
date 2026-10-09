// POSTS LOG client (Content Studio): card labels, the per-platform "Posted"
// record, the "Log it" card and the TikTok/Reddit "Needs numbers" list.
// All routes are zero-token and admin-guarded on the API.
"use client";

import { AuthError, type ContentSuggestion } from "@/lib/admin/client";

export type PostLogPlatform =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "youtube"
  | "x"
  | "threads"
  | "reddit";

export const POST_LOG_PLATFORMS: { id: PostLogPlatform; label: string }[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X" },
  { id: "threads", label: "Threads" },
  { id: "reddit", label: "Reddit" },
];

export const POST_KINDS: { id: string; label: string }[] = [
  { id: "video_meme", label: "Video meme" },
  { id: "voice_short", label: "Short with voice" },
  { id: "long_form", label: "Long form" },
  { id: "rewind", label: "Rewind" },
  { id: "text_post", label: "Text post" },
  { id: "image_post", label: "Image post" },
  { id: "other", label: "Other" },
];

export function kindLabel(kind: string | null | undefined): string {
  return POST_KINDS.find((k) => k.id === kind)?.label ?? kind ?? "";
}

/** The card's labels — the things no platform tells us. */
export interface PostMeta {
  kind?: string;
  origin?: "suggestion" | "manual" | "social";
  angle?: string;
  franchise?: string;
  franchiseSize?: "mega" | "aaa" | "indie";
  storyAgeHours?: number;
  firstToPost?: "early" | "with_pack" | "late";
  headline?: string;
  overlay?: string;
  movie?: string;
  clipLine?: string;
  clipSeconds?: number;
  lengthSeconds?: number;
  hookStyle?: string;
  voice?: boolean;
  music?: "trending_sound" | "elevenlabs" | "library" | "none";
  thumbnail?: "custom" | "frame" | "none";
  gutRating?: number;
  effortMinutes?: number;
  bigDay?: string;
  outcomeNote?: string;
}

export interface PostLogMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  follows?: number;
  score?: number;
  completionPct?: number;
  avgWatchSec?: number;
  at?: string;
}

export interface PostLogEntry {
  id: string;
  cardId: string | null;
  videoId: string | null;
  platform: PostLogPlatform;
  url: string | null;
  postId: string | null;
  postedAt: string;
  plannedAt: string | null;
  timing: "early" | "on_time" | "late" | null;
  postedVia: "manual" | "in_app" | string;
  repliedFirstHour: boolean | null;
  caption: string | null;
  pinnedQuestion: string | null;
  notes: string | null;
  metrics: { h24?: PostLogMetrics; d7?: PostLogMetrics } | null;
}

export interface NeedsNumbersRow extends PostLogEntry {
  cardTitle: string | null;
  due: "h24" | "d7";
}

export interface PostLogInput {
  platform?: PostLogPlatform;
  url?: string;
  postedAt?: string;
  plannedAt?: string | null;
  repliedFirstHour?: boolean | null;
  caption?: string | null;
  pinnedQuestion?: string | null;
  notes?: string | null;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/newsroom/admin/${path}`, init);
  if (res.status === 401) {
    if (
      typeof window !== "undefined" &&
      !location.pathname.startsWith("/admin/login")
    ) {
      location.href = "/admin/login";
    }
    throw new AuthError("Not signed in");
  }
  const text = await res.text().catch(() => "");
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!res.ok) {
    const b = (body ?? {}) as { message?: unknown; error?: unknown };
    const msg =
      (typeof b.message === "string" && b.message) ||
      (Array.isArray(b.message) && b.message.join(", ")) ||
      (typeof b.error === "string" && b.error) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function setPostMeta(
  cardId: string,
  meta: PostMeta,
): Promise<{ ok: boolean; card: ContentSuggestion }> {
  return call(`content/${cardId}/post-meta`, post({ meta }));
}

export function listPostLog(cardId: string): Promise<PostLogEntry[]> {
  return call(`content/${cardId}/post-log`);
}

export function addPostLog(
  cardId: string,
  input: PostLogInput,
): Promise<PostLogEntry> {
  return call(`content/${cardId}/post-log`, post(input));
}

export function updatePostLog(
  entryId: string,
  patch: PostLogInput & {
    metricsWindow?: "h24" | "d7";
    metrics?: PostLogMetrics | null;
  },
): Promise<PostLogEntry> {
  return call(`content-log/${entryId}`, post(patch));
}

export function deletePostLog(entryId: string): Promise<{ ok: boolean }> {
  return call(`content-log/${entryId}`, { method: "DELETE" });
}

export function getNeedsNumbers(): Promise<NeedsNumbersRow[]> {
  return call("content-log/needs-numbers");
}

/** "Log it": a zero-token Suggestions card for something already made. */
export function logPost(input: {
  title: string;
  kind: string;
  context?: string;
  angle?: string;
  lane?: "news" | "deal" | "guide" | "meme";
  games?: string[];
  imageUrl?: string;
  meta?: PostMeta;
}): Promise<{ ok: boolean; card: ContentSuggestion }> {
  return call("content/log-post", post(input));
}

// ---- Central-time helpers (Chris works in CT; inputs are CT wall time) ----

const CT = "America/Chicago";

/** ISO → "YYYY-MM-DDTHH:mm" in Central time (for <input type="datetime-local">). */
export function isoToCtInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

/** "YYYY-MM-DDTHH:mm" typed as Central wall time → ISO (UTC). */
export function ctInputToIso(v: string): string | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  // Guess with UTC, then correct by the CT offset at that instant (DST-safe).
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (t: number): number => {
    const back = isoToCtInput(new Date(t).toISOString());
    const b = back.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!b) return 0;
    const [by, bmo, bd, bh, bmi] = b.slice(1).map(Number);
    return Date.UTC(by, bmo - 1, bd, bh, bmi) - t;
  };
  const first = guess - offsetAt(guess);
  const fixed = guess - offsetAt(first);
  return new Date(fixed).toISOString();
}

/** "Thu Oct 8, 5:45 PM" in Central time. */
export function fmtCt(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: CT,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
