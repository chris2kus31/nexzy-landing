// Same-origin proxy for one-click unsubscribe → nexzy-api.
import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

export async function POST(req: NextRequest) {
  let token = "";
  try {
    ({ token } = await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const res = await fetch(`${API}/newsroom/newsletter/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({ ok: false }))) as {
      ok?: boolean;
    };
    return NextResponse.json({ ok: !!data.ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
