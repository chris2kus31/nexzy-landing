// Server-only reads for the /drops pages and game pages. Straight to nexzy-api,
// signed as the site's own server (SITE_SERVER_ID in the API's
// SignedIpThrottlerGuard): page builds are not visitors and must not share,
// or use up, one per-IP bucket.
//
// While TRENDS_ENABLED is off the API answers 404 to every trend route, so
// these return null and the pages 404 too: nothing to hide by hand.
// Only a real 404 means "not there"; any other failure throws, so an ISR
// rebuild keeps serving the last good page.
import "server-only";
import { createHmac } from "crypto";
import type {
  DropBuildPage,
  DropMatches,
  DropsPage,
  GameDropShare,
  TrendEntryPage,
  TrendEntryRow,
  TrendPick,
  TrendView,
} from "@/lib/trends/types";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";
const TIMEOUT_MS = 8000;
const SITE_SERVER_ID = "site-server";
const enc = encodeURIComponent;

function signedHeaders(): Record<string, string> {
  const secret = process.env.NEWSROOM_WEBHOOK_SECRET;
  if (!secret) return {};
  return {
    "x-nexzy-client-ip": SITE_SERVER_ID,
    "x-nexzy-client-sig": createHmac("sha256", secret)
      .update(SITE_SERVER_ID)
      .digest("hex"),
  };
}

async function get<T>(path: string, revalidate: number): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    headers: signedHeaders(),
    next: { revalidate, tags: ["trends"] },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`trends ${res.status} for ${path}`);
  return (await res.json()) as T;
}

/** The /drops page: live, soon, past and the public totals. */
export async function fetchDropsPage(): Promise<DropsPage | null> {
  const r = await get<{ data: DropsPage }>("/trends?surface=drops", 120);
  return r ? r.data : null;
}

export function fetchBuild(
  slug: string,
  code: string,
): Promise<DropBuildPage | null> {
  return get<DropBuildPage>(`/trends/${enc(slug)}/builds/${enc(code)}`, 300);
}

/** Match count for a build page (anonymous: no players listed). */
export function fetchBuildMatches(
  slug: string,
  code: string,
): Promise<DropMatches | null> {
  return get<DropMatches>(
    `/trends/${enc(slug)}/matches?code=${enc(code)}`,
    300,
  );
}

/** "On X% of #Tag builds" for a game page. Never fails the page. */
export async function fetchGameDrops(gameId: string): Promise<GameDropShare[]> {
  try {
    const r = await get<{ data: GameDropShare[] }>(
      `/trends/games/${enc(gameId)}`,
      600,
    );
    return r?.data ?? [];
  } catch {
    return [];
  }
}

export function fetchTrend(slug: string): Promise<TrendView | null> {
  return get<TrendView>(`/trends/${enc(slug)}`, 120);
}

export async function fetchTrendPicks(slug: string): Promise<TrendPick[]> {
  const r = await get<{ data: TrendPick[] }>(`/trends/${enc(slug)}/picks`, 300);
  return r?.data ?? [];
}

export async function fetchTrendEntries(
  slug: string,
  tab: "top" | "new",
  limit = 12,
): Promise<TrendEntryRow[]> {
  const r = await get<{ data: TrendEntryRow[] }>(
    `/trends/${enc(slug)}/entries?tab=${tab}&limit=${limit}`,
    120,
  );
  return r?.data ?? [];
}

export function fetchTrendEntry(
  slug: string,
  postId: string,
): Promise<TrendEntryPage | null> {
  return get<TrendEntryPage>(
    `/trends/${enc(slug)}/entries/${enc(postId)}`,
    300,
  );
}
