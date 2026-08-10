// Verify the email OTP from registration. Relays to nexzy-api /otp/verify, which
// marks the account verified and returns JWTs — we store them in httpOnly
// cookies so the freshly-verified user is immediately signed in.
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
  const { userId, otpCode } = body || {};
  const deviceId = body?.deviceId || "web";
  if (!userId || !otpCode) {
    return NextResponse.json(
      { error: "Missing userId or code" },
      { status: 400 },
    );
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}/otp/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": clientIp(req),
      },
      body: JSON.stringify({ userId, otpCode, deviceId }),
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
