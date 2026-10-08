// Content Studio client helpers that need the HTTP status of a failure (409 =
// "already running", 504 = proxy timeout while the server keeps working).
// The shared `handle()` in client.ts throws a plain Error with only a message,
// so these calls use a small status-carrying wrapper with the same 401 bounce
// and the same "null for an empty 2xx body" rule as the shared helper.
"use client";

import {
  AuthError,
  getContentSuggestions,
  getVideoLeads,
  type ContentSuggestion,
  type PublishResult,
} from "@/lib/admin/client";

/** A failed admin API call, with the HTTP status (0 = network/no response). */
export class AdminHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminHttpError";
  }
}

/** True when the API refused because the same job is already running. */
export function isConflict(e: unknown): boolean {
  return e instanceof AdminHttpError && e.status === 409;
}

/** Readable message from any thrown value. */
export function errorMessage(e: unknown, fallback = "Request failed"): string {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`/api/newsroom/admin/${path}`, init);
  } catch {
    throw new AdminHttpError("Could not reach the server", 0);
  }
  if (res.status === 401) {
    if (
      typeof window !== "undefined" &&
      !location.pathname.startsWith("/admin/login")
    ) {
      location.href = "/admin/login";
    }
    throw new AuthError("Not signed in");
  }
  // Read as text first: a gateway timeout can come back as HTML, and an empty
  // 2xx body must not throw on JSON.parse.
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
      (res.status === 504
        ? "The server took too long to answer (timeout)"
        : `Request failed (${res.status})`);
    throw new AdminHttpError(msg, res.status);
  }
  return body as T | null;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// ---- Publish (K1) ----

export type RepostPlatform = "facebook" | "instagram" | "threads" | "x";

export interface PublishCardOpts {
  videoUrl?: string;
  facebook?: boolean;
  instagram?: boolean;
  threads?: boolean;
  fbCaption?: string;
  igCaption?: string;
  threadsText?: string;
  threadsTopicTag?: string;
  fbPinned?: string;
  igPinned?: string;
  threadsPinned?: string;
  x?: boolean;
  xPost?: string;
  xReply?: string;
  imageUrl?: string;
  xImageUrl?: string;
  threadsImageUrl?: string;
  fbImageUrl?: string;
  igImageUrl?: string;
  force?: boolean;
  /** Platforms already posted that should be posted AGAIN (explicit opt-in). */
  repostPlatforms?: RepostPlatform[];
}

/** Publish a card; throws AdminHttpError (409 when a publish is in flight). */
export async function publishCard(
  id: string,
  opts: PublishCardOpts,
): Promise<{ results: PublishResult[] }> {
  const r = await request<{ results?: PublishResult[] }>(
    `content/${id}/publish`,
    json(opts),
  );
  return { results: Array.isArray(r?.results) ? r.results : [] };
}

/**
 * Re-read one card's persisted state via GET content/card/:id. Falls back to
 * scanning the open board (then the leads board) when the API predates that
 * route. Returns null when the card can't be found.
 */
export async function fetchContentCard(
  id: string,
): Promise<ContentSuggestion | null> {
  try {
    const card = await request<ContentSuggestion>(
      `content/card/${encodeURIComponent(id)}`,
    );
    if (card) return card;
  } catch (e) {
    // 404 = card gone, or an older API without the route: fall through to
    // the board scan. Anything else (auth, network) should surface.
    if (!(e instanceof AdminHttpError) || e.status !== 404) throw e;
  }
  const board = await getContentSuggestions();
  const hit = board.find((c) => c.id === id);
  if (hit) return hit;
  const leads = await getVideoLeads().catch(() => [] as ContentSuggestion[]);
  return leads.find((c) => c.id === id) ?? null;
}

// ---- Card regenerate / script-only (LS-7) ----

export async function regenerateCard(
  id: string,
  persona?: string,
): Promise<ContentSuggestion | null> {
  return request<ContentSuggestion>(
    `content/${id}/regenerate`,
    json({ persona }),
  );
}

export async function regenerateCardScript(
  id: string,
  persona?: string,
  steer?: string,
): Promise<ContentSuggestion | null> {
  return request<ContentSuggestion>(
    `content/${id}/script`,
    json({
      ...(persona ? { persona } : {}),
      ...(steer ? { steer } : {}),
    }),
  );
}

// ---- Lead actions (K2) ----

/** `queued` is only true when the server says so. */
export interface QueuedResponse {
  queued: boolean;
  message?: string;
}

function asQueued(r: unknown): QueuedResponse {
  const o = (r ?? {}) as { queued?: unknown; message?: unknown };
  return {
    queued: o.queued === true,
    message: typeof o.message === "string" ? o.message : undefined,
  };
}

export async function leadGenerate(
  id: string,
  body: {
    writer?: string;
    format?: string;
    steer?: string;
    xFormat?: string;
    plan?: Record<string, string>;
    longFormChapters?: unknown[];
  },
): Promise<QueuedResponse> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    clean[k] = v;
  }
  return asQueued(
    await request(`content/${id}/generate-from-lead`, json(clean)),
  );
}

export async function leadGamingMeme(
  id: string,
  writer?: string,
  steer?: string,
): Promise<QueuedResponse> {
  return asQueued(
    await request(
      `content/${id}/gaming-meme`,
      json({
        ...(writer ? { writer } : {}),
        ...(steer ? { steer } : {}),
      }),
    ),
  );
}

export async function leadQuickAnnounce(
  id: string,
  writer?: string,
  steers?: {
    xSteer?: string;
    threadsSteer?: string;
    fbSteer?: string;
    igSteer?: string;
  },
): Promise<QueuedResponse> {
  return asQueued(
    await request(
      `content/${id}/quick-announce`,
      json({
        ...(writer ? { writer } : {}),
        ...(steers?.xSteer ? { xSteer: steers.xSteer } : {}),
        ...(steers?.threadsSteer ? { threadsSteer: steers.threadsSteer } : {}),
        ...(steers?.fbSteer ? { fbSteer: steers.fbSteer } : {}),
        ...(steers?.igSteer ? { igSteer: steers.igSteer } : {}),
      }),
    ),
  );
}

// ---- Video insights scan (K8) ----

export interface VideoInsightsScanStatus {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  scanned: number;
  errors: number;
}

/** Start the background scan. Old API (sync) returned {scanned}; both handled. */
export async function startVideoInsightsScan(): Promise<{
  started: boolean;
  running: boolean;
  scanned?: number;
}> {
  const r =
    (await request<Record<string, unknown>>("content/scan-video-insights", {
      method: "POST",
    })) ?? {};
  return {
    started: r.started === true,
    running: r.running === true,
    scanned: typeof r.scanned === "number" ? r.scanned : undefined,
  };
}

export async function getVideoInsightsScanStatus(): Promise<VideoInsightsScanStatus | null> {
  return request<VideoInsightsScanStatus>("content/scan-video-insights/status");
}

/**
 * Re-read a card every `intervalMs` until `done(card)` is true, the card is
 * gone, `timeoutMs` passes or `isCancelled()` says stop. Resolves with the
 * last card read (null when it could not be read). Used after a timed-out
 * request: the server usually keeps working and persists the real result.
 */
export async function pollContentCard(
  id: string,
  done: (card: ContentSuggestion) => boolean,
  opts: {
    intervalMs?: number;
    timeoutMs?: number;
    isCancelled?: () => boolean;
    onTick?: (card: ContentSuggestion) => void;
  } = {},
): Promise<ContentSuggestion | null> {
  const interval = opts.intervalMs ?? 5000;
  const deadline = Date.now() + (opts.timeoutMs ?? 90_000);
  let last: ContentSuggestion | null = null;
  for (;;) {
    if (opts.isCancelled?.()) return last;
    let readOk = false;
    try {
      last = await fetchContentCard(id);
      readOk = true;
    } catch {
      /* transient read failure — keep trying until the deadline */
    }
    if (last) opts.onTick?.(last);
    // Stop only on: a confirmed-missing card (successful read, nothing found),
    // the caller's done() condition, or the deadline. A failed read retries.
    if (readOk && !last) return null;
    if ((last && done(last)) || Date.now() >= deadline) return last;
    await new Promise((r) => setTimeout(r, interval));
  }
}

/** True when the error means "no answer" (network drop or gateway timeout),
 *  i.e. the server may still be working and the card should be re-read. */
export function isTimeoutLike(e: unknown): boolean {
  return (
    e instanceof AdminHttpError &&
    (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504)
  );
}
