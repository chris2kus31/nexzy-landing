// Same-origin proxy for the website game search (header and /games).
// Forwards to nexzy-api GET /games/web-search with the visitor's IP signed
// (per-visitor throttle, like the hub engine proxy). Answers are public and
// edge-cached for 5 minutes, so repeated searches never reach the function
// or the API. The query is normalized first so "Zelda", " zelda " and
// "ZELDA" share one cache entry.
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { USER_API_URL, clientIp } from "@/lib/auth/server";

/** Same folding the API's search uses (lowercase, no accents, single spaces). */
function normalizeGameQuery(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 60);
}

export async function GET(req: NextRequest) {
  const q = normalizeGameQuery(req.nextUrl.searchParams.get("q") ?? "");
  if (q.length < 3)
    return NextResponse.json(
      { items: [] },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
    );
  const secret = process.env.NEWSROOM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[games/search] NEWSROOM_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  const raw = clientIp(req);
  const ip = /^[0-9a-f.:]{3,45}$/i.test(raw) ? raw : "0.0.0.0";
  let res: Response;
  try {
    res = await fetch(
      `${USER_API_URL}/games/web-search?q=${encodeURIComponent(q)}`,
      {
        headers: {
          "x-nexzy-client-ip": ip,
          "x-nexzy-client-sig": createHmac("sha256", secret)
            .update(ip)
            .digest("hex"),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not reach Nexzy" },
      { status: 502 },
    );
  }
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": res.ok
        ? "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
        : "private, no-store",
    },
  });
}
