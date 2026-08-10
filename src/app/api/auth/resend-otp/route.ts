// Resend the email verification OTP. Relays to nexzy-api /otp/resend.
import { NextRequest, NextResponse } from "next/server";
import { USER_API_URL, clientIp } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = body?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}/otp/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": clientIp(req),
      },
      body: JSON.stringify({ userId }),
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
