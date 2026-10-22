// Server-only helpers for the newsroom admin BFF (route handlers).
// The admin JWT lives in an httpOnly cookie; the browser never sees it.
import { NextRequest } from "next/server";

/** nexzy-api base URL (server-side only). */
export const NEWSROOM_API_URL =
  process.env.NEWSROOM_API_URL || "http://localhost:3003";

/** httpOnly cookie holding the admin session JWT. */
export const ADMIN_COOKIE = "nexzy_news_admin";

/** Best-effort real client IP, forwarded to the API for IP binding. */
export function clientIp(req: NextRequest): string {
  // Trust platform-set headers over x-forwarded-for: the FIRST XFF entry is
  // whatever the caller typed, so it must never drive IP binding/rate limits.
  // cf-connecting-ip: set by Cloudflare (fronting www); clients can't forge it
  // through the CF edge. x-nf-client-connection-ip: set by Netlify from the
  // actual TCP connection. XFF stays only as a local-dev fallback.
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const nf = req.headers.get("x-nf-client-connection-ip");
  if (nf) return nf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

/** Cookie options for the admin session. */
export function adminCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
