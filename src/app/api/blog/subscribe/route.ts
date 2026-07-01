// Same-origin proxy for the blog newsletter signup → nexzy-api.
import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let email = "";
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  email = (email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 422 });
  }

  try {
    const res = await fetch(`${API}/newsroom/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "blog" }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`api ${res.status}`);
  } catch {
    return NextResponse.json(
      { error: "Could not subscribe right now" },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
