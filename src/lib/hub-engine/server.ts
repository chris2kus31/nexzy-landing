// Server-side reads of the mega hub engine (hub page, map, entry and
// checklist pages). Straight to nexzy-api.
//
// Only a real 404 means "not there". Any other failure (timeout, 429, 5xx)
// THROWS, so an ISR rebuild fails and Next keeps serving the last good page
// instead of caching a 404, or a hub without its guide, for hours.
//
// Requests are signed as the site's own server (SITE_SERVER_ID in the API's
// SignedIpThrottlerGuard): page builds are not visitors and must not share,
// or exhaust, one per-IP bucket.
import { createHmac } from "crypto";
import type {
  HubChecklistPage,
  HubEnginePage,
  HubEntryFull,
} from "@/lib/hub-engine/types";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";
const TIMEOUT_MS = 8000;
const SITE_SERVER_ID = "site-server";
const enc = encodeURIComponent;

const OFF: HubEnginePage = {
  enabled: false,
  contentVersion: 0,
  config: null,
  sections: [],
};

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

/** null = the API says 404; throws on anything else that isn't 2xx. */
async function get<T>(path: string, revalidate: number): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    headers: signedHeaders(),
    next: { revalidate },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`hub engine ${res.status} for ${path}`);
  return (await res.json()) as T;
}

/** Hub page: same window as the hub (6 h); the client refreshes on mount. */
export async function fetchEnginePage(
  slug: string,
  revalidate = 21600,
): Promise<HubEnginePage> {
  return (
    (await get<HubEnginePage>(`/game-hubs/${enc(slug)}/engine`, revalidate)) ??
    OFF
  );
}

export async function fetchEngineEntry(
  slug: string,
  entrySlug: string,
): Promise<HubEntryFull | null> {
  return get<HubEntryFull>(
    `/game-hubs/${enc(slug)}/engine/entries/${enc(entrySlug)}`,
    300,
  );
}

export async function fetchEngineChecklist(
  slug: string,
  key: string,
): Promise<HubChecklistPage | null> {
  return get<HubChecklistPage>(
    `/game-hubs/${enc(slug)}/engine/checklists/${enc(key)}`,
    300,
  );
}
