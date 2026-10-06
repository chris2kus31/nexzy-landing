// Same-origin proxy for recording an article read. Forwards the real client IP
// so the API can dedupe per visitor. Always returns 204.
//
// Also forwards "who sent this" signals for Admin → Analytics → Who's reading
// (logged alongside the counters, never changing them):
//   x-nexzy-ua       the reader's real user-agent (the API otherwise only sees
//                    this server's fetch)
//   x-nexzy-ref      the article page's original document.referrer
//   x-nexzy-owner    "1" when the browser carries the admin session cookie
//   x-nexzy-country  Cloudflare's CF-IPCountry for the reader
//   x-nexzy-src      optional ?src= tag from the page URL
//   x-nexzy-proxy    marks the read as coming THROUGH the website (vs. a direct
//                    hit on the API counter); VIEW_PROXY_SECRET when set
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin/server";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

function clientIp(req: NextRequest): string {
  // Behind Cloudflare, CF-Connecting-IP is the true visitor IP.
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export async function POST(req: NextRequest) {
  let slug = "";
  let ref = "";
  let src = "";
  try {
    const body = (await req.json()) as {
      slug?: string;
      ref?: string;
      src?: string;
    };
    slug = body.slug ?? "";
    ref = typeof body.ref === "string" ? body.ref.slice(0, 500) : "";
    src = typeof body.src === "string" ? body.src.slice(0, 32) : "";
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!slug) return new NextResponse(null, { status: 204 });

  const headers: Record<string, string> = {
    "x-forwarded-for": clientIp(req),
    "x-nexzy-proxy": process.env.VIEW_PROXY_SECRET || "1",
    "x-nexzy-ua": (req.headers.get("user-agent") || "").slice(0, 400),
  };
  if (ref) headers["x-nexzy-ref"] = ref;
  if (src) headers["x-nexzy-src"] = src;
  const country = req.headers.get("cf-ipcountry");
  if (country) headers["x-nexzy-country"] = country.slice(0, 2);
  if (req.cookies.get(ADMIN_COOKIE)?.value) headers["x-nexzy-owner"] = "1";

  try {
    await fetch(
      `${API}/newsroom/public/posts/${encodeURIComponent(slug)}/view`,
      {
        method: "POST",
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
  } catch {
    /* best-effort — never block the reader */
  }
  return new NextResponse(null, { status: 204 });
}
