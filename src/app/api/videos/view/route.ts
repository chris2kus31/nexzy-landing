// Same-origin proxy for recording a video view. Forwards the client IP so the
// API can dedupe per visitor. Always returns 204. Mirrors /api/blog/view.
import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export async function POST(req: NextRequest) {
  let slug = "";
  try {
    ({ slug } = await req.json());
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!slug) return new NextResponse(null, { status: 204 });

  try {
    await fetch(
      `${API}/newsroom/public/videos/${encodeURIComponent(slug)}/view`,
      {
        method: "POST",
        headers: { "x-forwarded-for": clientIp(req) },
        cache: "no-store",
      },
    );
  } catch {
    /* best-effort — never block the viewer */
  }
  return new NextResponse(null, { status: 204 });
}
