// Admin session management.
//   POST { token }  -> exchange a magic-link token for an admin JWT (via the
//                      API), store it in an httpOnly cookie. IP is forwarded so
//                      the API can bind the session to the real client.
//   DELETE          -> sign out (clear the cookie).
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  NEWSROOM_API_URL,
  adminCookieOptions,
  clientIp,
} from "@/lib/admin/server";

const EIGHT_HOURS = 8 * 60 * 60;

export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const token = (body.token || "").trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${NEWSROOM_API_URL}/newsroom/admin/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": clientIp(req),
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the newsroom API" },
      { status: 502 },
    );
  }

  if (!apiRes.ok) {
    const msg = await apiRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: msg?.message || "This login link is invalid or expired." },
      { status: apiRes.status },
    );
  }

  const data = (await apiRes.json()) as { token: string; email: string };
  const res = NextResponse.json({ ok: true, email: data.email });
  res.cookies.set(ADMIN_COOKIE, data.token, adminCookieOptions(EIGHT_HOURS));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", adminCookieOptions(0));
  return res;
}
