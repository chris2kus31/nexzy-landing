// ============================================
// FILE: app/api/subscribe/route.ts
// Launch-updates email capture endpoint.
//
// By default this validates the email and forwards it to a backend
// you control via the SUBSCRIBE_FORWARD_URL env var (e.g. a Nexzy API
// endpoint, a Google Apps Script webhook, Mailchimp/ConvertKit, etc.).
// If that env var is not set, it accepts the email and logs it so the
// UI works immediately during development — wire up a real store before
// launch so addresses are actually persisted.
// ============================================
import { NextRequest, NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const source = (body.source || "landing").slice(0, 64);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 422 });
  }

  const forwardUrl = process.env.SUBSCRIBE_FORWARD_URL;

  if (forwardUrl) {
    try {
      const res = await fetch(forwardUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SUBSCRIBE_FORWARD_TOKEN
            ? { Authorization: `Bearer ${process.env.SUBSCRIBE_FORWARD_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({ email, source, capturedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`Forward failed: ${res.status}`);
    } catch (err) {
      console.error("[subscribe] forward error", err);
      return NextResponse.json({ error: "Could not save email" }, { status: 502 });
    }
  } else {
    // No store configured yet — log so the flow works end-to-end in dev.
    console.warn(
      `[subscribe] SUBSCRIBE_FORWARD_URL not set. Captured (not persisted): ${email} (source: ${source})`,
    );
  }

  return NextResponse.json({ ok: true });
}
