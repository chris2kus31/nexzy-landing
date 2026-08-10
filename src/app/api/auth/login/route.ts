// Email + password login (env-gated on the client). Relays to nexzy-api
// /auth/login and stores the returned JWTs in httpOnly cookies. Same account
// system as the mobile app.
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
  const { email, password } = body || {};
  const deviceId = body?.deviceId || "web";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": clientIp(req),
      },
      body: JSON.stringify({ email, password, deviceId }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the auth API" },
      { status: 502 },
    );
  }

  const data = await apiRes.json().catch(() => ({}));
  if (!apiRes.ok) return NextResponse.json(data, { status: apiRes.status });

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
