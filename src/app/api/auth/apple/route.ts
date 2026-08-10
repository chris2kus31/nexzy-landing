// Same-origin token exchange for web Sign in with Apple. The browser gets an
// Apple identity token via Sign in with Apple JS and POSTs it here; we relay it
// to nexzy-api /auth/apple. Apple's `sub` is team-scoped, so the web Services ID
// and the native App ID resolve to the SAME user as the mobile app.
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
  const identityToken = body?.identityToken;
  const deviceId = body?.deviceId || "web";
  if (!identityToken) {
    return NextResponse.json(
      { error: "Missing identityToken" },
      { status: 400 },
    );
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}/auth/apple`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": clientIp(req),
      },
      body: JSON.stringify({
        identityToken,
        deviceId,
        nonce: body?.nonce,
        firstName: body?.firstName,
        lastName: body?.lastName,
      }),
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
