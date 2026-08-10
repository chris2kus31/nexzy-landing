// Same-origin token exchange for web Google Sign-In. The browser gets a Google
// ID token via Google Identity Services and POSTs it here; we relay it to
// nexzy-api /auth/google (which verifies it against the SAME account system as
// mobile), then store the returned JWTs in httpOnly cookies. No token reaches
// client JS.
import { NextRequest, NextResponse } from "next/server";
import {
  USER_API_URL,
  USER_AT_COOKIE,
  USER_RT_COOKIE,
  userCookieOptions,
  AT_MAX_AGE,
  RT_MAX_AGE,
  clientIp,
} from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const idToken = body?.idToken;
  const deviceId = body?.deviceId || "web";
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": clientIp(req),
      },
      body: JSON.stringify({ idToken, deviceId }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the auth API" },
      { status: 502 },
    );
  }

  const data = await apiRes.json().catch(() => ({}));
  if (!apiRes.ok) {
    return NextResponse.json(data, { status: apiRes.status });
  }

  const res = NextResponse.json({ user: data.user });
  if (data.accessToken)
    res.cookies.set(
      USER_AT_COOKIE,
      data.accessToken,
      userCookieOptions(AT_MAX_AGE),
    );
  if (data.refreshToken)
    res.cookies.set(
      USER_RT_COOKIE,
      data.refreshToken,
      userCookieOptions(RT_MAX_AGE),
    );
  return res;
}
