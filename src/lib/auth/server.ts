// Server-only helpers for the consumer (reader) auth BFF. Mirrors the admin
// pattern: the user's nexzy-api JWTs live in httpOnly cookies, so the browser
// never sees a token and there is no cross-origin request. The SAME nexzy-api
// account system as the mobile app issues these JWTs — web Google/Apple sign-in
// resolves to the exact same user (matched by provider id / email server-side).
import { NextRequest } from "next/server";

/** nexzy-api base URL (server-side only — reuse the admin BFF's var). */
export const USER_API_URL =
  process.env.NEWSROOM_API_URL || "http://localhost:3003";

/** httpOnly cookies holding the reader session JWTs. */
export const USER_AT_COOKIE = "nexzy_user_at";
export const USER_RT_COOKIE = "nexzy_user_rt";

/** Best-effort real client IP, forwarded to the API. */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

/** Cookie options for a reader session token. */
export function userCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

// Access token: short-lived cookie; refresh token: 30 days.
export const AT_MAX_AGE = 60 * 60 * 24; // 1 day
export const RT_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
