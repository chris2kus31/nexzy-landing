// Email + password registration (env-gated on the client). Relays to nexzy-api
// /auth/register, which creates the account and emails an OTP. No tokens are
// issued yet — the user must verify the OTP (see /api/auth/verify-otp) before
// they can post. Returns { user, otpSent } so the UI can move to the code step.
import { NextRequest, NextResponse } from "next/server";
import { USER_API_URL, clientIp } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": clientIp(req),
      },
      body: JSON.stringify({
        firstName: body?.firstName,
        lastName: body?.lastName,
        email: body?.email,
        password: body?.password,
        confirmPassword: body?.confirmPassword,
        username: body?.username,
        agreedToTerms: true,
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
  return NextResponse.json(data, { status: apiRes.status });
}
