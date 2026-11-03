// Server-only: the /r/<code> invite preview fetch. Kept out of
// lib/rooms/public.ts, which client components import.
//
// The request reaches the API from Netlify, so it forwards the visitor's IP
// signed with NEWSROOM_WEBHOOK_SECRET (same scheme as the hubs BFF). The API's
// invite route rate-limits per visitor on that signed IP, so one bot probing
// codes can't use up the limit for every other visitor.
import { createHmac } from "crypto";
import { headers } from "next/headers";
import {
  INVITE_RE,
  type InviteResult,
  type PublicRoomSummary,
} from "@/lib/rooms/public";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

async function visitorIp(): Promise<string | null> {
  const h = await headers();
  // Platform-set headers only (see lib/auth/server clientIp): the first
  // x-forwarded-for entry is client-supplied.
  return (
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-nf-client-connection-ip")?.trim() ||
    null
  );
}

/** Invite preview, fetched without a login (the code is the only key). Not
 *  cached: the answer depends on the code only, but the per-visitor IP header
 *  must reach the API for its rate limit. One indexed lookup per view. */
export async function fetchRoomInvite(code: string): Promise<InviteResult> {
  if (!INVITE_RE.test(code)) return { state: "gone" };
  const reqHeaders: Record<string, string> = {};
  const ip = await visitorIp();
  const secret = process.env.NEWSROOM_WEBHOOK_SECRET;
  if (ip && secret && ip.length <= 64) {
    reqHeaders["x-nexzy-client-ip"] = ip;
    reqHeaders["x-nexzy-client-sig"] = createHmac("sha256", secret)
      .update(ip)
      .digest("hex");
  }
  try {
    const res = await fetch(`${API}/rooms/invite/${encodeURIComponent(code)}`, {
      headers: reqHeaders,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok)
      return { state: "ok", room: (await res.json()) as PublicRoomSummary };
    if (res.status === 404) return { state: "gone" };
    if (res.status === 429) return { state: "busy" };
    // RoomsOpenGuard answers 503 rooms_off while rooms are off (or staff-only)
    // for signed-out readers.
    if (res.status === 503 || res.status === 403) return { state: "off" };
    return { state: "error" };
  } catch {
    return { state: "error" };
  }
}
