// Same-origin image proxy for Card Studio. When a card is prefilled from a
// published article, its heroImageUrl lives on S3/CDN — fetching it directly
// into a <canvas> for PNG export would taint the canvas (CORS). Routing the
// image through here makes it same-origin so html-to-image can export cleanly.
// Locked to https + an allowlisted host set (no open proxy / SSRF).
import { NextRequest, NextResponse } from "next/server";

const ALLOW = (
  process.env.CARD_IMAGE_PROXY_HOSTS ||
  "amazonaws.com,cloudfront.net,nexzyapp.com"
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return new NextResponse("missing url", { status: 400 });

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (u.protocol !== "https:")
    return new NextResponse("https only", { status: 400 });

  const host = u.hostname.toLowerCase();
  const ok = ALLOW.some((a) => host === a || host.endsWith("." + a));
  if (!ok) return new NextResponse("host not allowed", { status: 403 });

  try {
    const res = await fetch(u.toString(), { cache: "no-store" });
    if (!res.ok) return new NextResponse("upstream error", { status: 502 });
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/"))
      return new NextResponse("not an image", { status: 415 });
    const buf = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
