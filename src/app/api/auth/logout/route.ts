// Sign out: revoke the session server-side (best-effort) and clear the httpOnly
// cookies.
import { NextRequest, NextResponse } from "next/server";
import {
  USER_API_URL,
  USER_AT_COOKIE,
  USER_RT_COOKIE,
  userCookieOptions,
} from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  const at = req.cookies.get(USER_AT_COOKIE)?.value;
  if (at) {
    try {
      await fetch(`${USER_API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${at}`,
        },
        body: JSON.stringify({ deviceId: "web" }),
        cache: "no-store",
      });
    } catch {
      // ignore — we still clear cookies below
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(USER_AT_COOKIE, "", userCookieOptions(0));
  res.cookies.set(USER_RT_COOKIE, "", userCookieOptions(0));
  return res;
}
