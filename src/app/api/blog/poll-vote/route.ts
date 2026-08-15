// Same-origin proxy for a reader poll vote. Forwards to the newsroom API with
// the client IP + country (from the CDN/edge headers) so the API can log a
// per-vote row with geo + a hashed-IP dedup signal. The anon visitor id rides
// in the body. Best-effort throughout — a missing header just means less data.
import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

/** The real client IP as seen by the edge (Netlify/Vercel/proxy headers). */
function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    ""
  );
}

/** 2-letter country from an edge geo header; "" when unavailable. */
function country(req: NextRequest): string {
  const direct =
    req.headers.get("x-country") ||
    req.headers.get("x-vercel-ip-country") ||
    "";
  if (direct) return direct;
  // Netlify ships geo as a base64 JSON blob in x-nf-geo.
  const geo = req.headers.get("x-nf-geo");
  if (geo) {
    try {
      const j = JSON.parse(Buffer.from(geo, "base64").toString("utf8"));
      if (j?.country?.code) return String(j.country.code);
    } catch {
      /* malformed header — ignore */
    }
  }
  return "";
}

export async function POST(req: NextRequest) {
  let slug = "";
  let optionIndex = -1;
  let anonId: string | undefined;
  try {
    ({ slug, optionIndex, anonId } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!slug || !Number.isInteger(optionIndex)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const ip = clientIp(req);
  const cc = country(req);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (ip) headers["x-forwarded-for"] = ip;
  if (cc) headers["x-client-country"] = cc;

  try {
    const res = await fetch(
      `${API}/newsroom/public/posts/${encodeURIComponent(slug)}/poll-vote`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ optionIndex, anonId }),
        cache: "no-store",
      },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
