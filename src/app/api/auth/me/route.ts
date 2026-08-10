// Hydrate the current reader session. Reads the httpOnly access-token cookie and
// asks nexzy-api /auth/me who this is. If the access token has expired, it
// transparently refreshes using the refresh-token cookie and re-issues cookies.
// Returns { user } or 401 (signed out).
import { NextRequest, NextResponse } from "next/server";
import {
  USER_API_URL,
  USER_AT_COOKIE,
  USER_RT_COOKIE,
  userCookieOptions,
  AT_MAX_AGE,
  RT_MAX_AGE,
} from "@/lib/auth/server";

async function fetchMe(accessToken: string) {
  return fetch(`${USER_API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

export async function GET(req: NextRequest) {
  const at = req.cookies.get(USER_AT_COOKIE)?.value;
  const rt = req.cookies.get(USER_RT_COOKIE)?.value;

  // 1) Try the access token as-is.
  if (at) {
    try {
      const me = await fetchMe(at);
      if (me.ok) {
        const user = await me.json();
        return NextResponse.json({ user });
      }
    } catch {
      return NextResponse.json({ user: null }, { status: 502 });
    }
  }

  // 2) Access token missing/expired → refresh with the refresh token.
  if (rt) {
    let refreshed: Response;
    try {
      refreshed = await fetch(`${USER_API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt, deviceId: "web" }),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json({ user: null }, { status: 502 });
    }
    if (refreshed.ok) {
      const tokens = await refreshed.json();
      try {
        const me = await fetchMe(tokens.accessToken);
        if (me.ok) {
          const user = await me.json();
          const res = NextResponse.json({ user });
          if (tokens.accessToken)
            res.cookies.set(
              USER_AT_COOKIE,
              tokens.accessToken,
              userCookieOptions(AT_MAX_AGE),
            );
          if (tokens.refreshToken)
            res.cookies.set(
              USER_RT_COOKIE,
              tokens.refreshToken,
              userCookieOptions(RT_MAX_AGE),
            );
          return res;
        }
      } catch {
        // fall through to signed-out
      }
    }
  }

  // 3) No valid session → clear any stale cookies.
  const res = NextResponse.json({ user: null }, { status: 401 });
  res.cookies.set(USER_AT_COOKIE, "", userCookieOptions(0));
  res.cookies.set(USER_RT_COOKIE, "", userCookieOptions(0));
  return res;
}
