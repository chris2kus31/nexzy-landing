// Browser calls for the /drops pages, through the same-origin proxy
// (src/app/api/trends). Errors carry the HTTP status so the UI can tell
// "sign in", "already joined" and "try again" apart.
"use client";

import type {
  DropMatches,
  TrendChoice,
  TrendEntryRow,
} from "@/lib/trends/types";

export class TrendApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const base = (slug: string) => `/api/trends/${encodeURIComponent(slug)}`;

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
      error?: string;
    };
    const msg = Array.isArray(b.message) ? b.message[0] : b.message;
    throw new TrendApiError(msg || b.error || `Request failed`, res.status);
  }
  return (await res.json()) as T;
}

export type TrendEventType = "view" | "try" | "build" | "share" | "visit";

/** Funnel counts. Best effort: never throws, survives page unload. */
export function logTrendEvent(
  slug: string,
  type: TrendEventType,
  extra: { platform?: string; source?: string } = {},
): void {
  try {
    void fetch(`${base(slug)}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...extra }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // counting must never break the page
  }
}

export async function fetchChoices(
  slug: string,
  q: string,
  signal?: AbortSignal,
): Promise<TrendChoice[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  const r = await json<{ data: TrendChoice[] }>(
    await fetch(`${base(slug)}/choices${qs}`, { signal }),
  );
  return r.data;
}

/** The share image of unposted picks (JPEG bytes, made in memory: the file
 *  people download and share, so the server encodes it once). */
export async function fetchPreview(
  slug: string,
  body: { picks: string[]; shape: "portrait" | "tall"; handle?: string },
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await fetch(`${base(slug)}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      answers: { picks: body.picks },
      shape: body.shape,
      format: "jpeg",
      ...(body.handle ? { handle: body.handle } : {}),
    }),
    signal,
  });
  if (!res.ok) await json(res);
  return res.blob();
}

/** Save the picks for sharing (no account): the same picks always get the
 *  same code, so the link has its own page and preview image. */
export async function saveBuild(
  slug: string,
  picks: string[],
): Promise<{ code: string }> {
  return json(
    await fetch(`${base(slug)}/builds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { picks } }),
    }),
  );
}

/** Players who share most of a build's or an entry's picks. */
export async function fetchMatches(
  slug: string,
  by: { code: string } | { entry: string },
  signal?: AbortSignal,
): Promise<DropMatches> {
  const qs = new URLSearchParams(by as Record<string, string>);
  return json(
    await fetch(`${base(slug)}/matches?${qs.toString()}`, { signal }),
  );
}

export async function postEntry(
  slug: string,
  picks: string[],
): Promise<{ id: string; slug: string }> {
  return json(
    await fetch(`${base(slug)}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { picks } }),
    }),
  );
}

export async function fetchEntriesPage(
  slug: string,
  tab: "top" | "new",
  cursor: string | null,
): Promise<{ data: TrendEntryRow[]; nextCursor: string | null }> {
  const qs = new URLSearchParams({ tab, limit: "12" });
  if (cursor) qs.set("cursor", cursor);
  return json(await fetch(`${base(slug)}/entries?${qs.toString()}`));
}

export type GameRequestResult =
  | {
      status: "exists";
      game: { id: string; name: string; slug: string | null };
    }
  | { status: "requested"; requests: number };

export async function requestGame(body: {
  name: string;
  platform?: string;
  year?: number;
  trend?: string;
}): Promise<GameRequestResult> {
  return json(
    await fetch(`/api/trends/request-game`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
