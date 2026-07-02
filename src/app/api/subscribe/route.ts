// ============================================
// FILE: app/api/subscribe/route.ts
// Launch-updates email capture endpoint.
//
// Persistence, in order of preference:
//   1. If SUBSCRIBE_FORWARD_URL is set, forward there (Mailchimp/ConvertKit/
//      Apps Script/etc.) — swap in any ESP without code changes.
//   2. Otherwise, save to the Nexzy newsroom subscriber store (the same list
//      that backs the weekly digest) via NEWSROOM_API_URL. This is the default
//      so launch-updates signups are persisted out of the box.
// ============================================
import { NextRequest, NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEWSROOM_API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const email = (body.email || "").trim().toLowerCase();
  const source = (body.source || "landing").slice(0, 64);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 422 },
    );
  }

  const forwardUrl = process.env.SUBSCRIBE_FORWARD_URL;

  try {
    if (forwardUrl) {
      // Custom ESP / webhook override.
      const res = await fetch(forwardUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SUBSCRIBE_FORWARD_TOKEN
            ? { Authorization: `Bearer ${process.env.SUBSCRIBE_FORWARD_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          email,
          source,
          capturedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`Forward failed: ${res.status}`);
    } else {
      // Default: persist to the newsroom subscriber store (weekly-digest list).
      const res = await fetch(`${NEWSROOM_API}/newsroom/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Newsroom subscribe failed: ${res.status}`);
    }
  } catch (err) {
    console.error("[subscribe] save error", err);
    return NextResponse.json(
      { error: "Could not save email" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
