// Same-origin image proxy for Card Studio. When a card is prefilled from a
// published article, its heroImageUrl lives on S3/CDN — fetching it directly
// into a <canvas> for PNG export would taint the canvas (CORS). Routing the
// image through here makes it same-origin so html-to-image can export cleanly.
// Locked to https + an allowlisted host set (no open proxy / SSRF), and to a
// signed-in admin (the admin session cookie), so the public can't use it to
// pull arbitrary images through our Netlify function (compute + bandwidth).
// Default hosts are OUR media only: the CDN, our bucket, and the site itself
// (a host also matches its subdomains). Override with CARD_IMAGE_PROXY_HOSTS.
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, NEWSROOM_API_URL } from "@/lib/admin/server";

const ALLOW = (
  process.env.CARD_IMAGE_PROXY_HOSTS ||
  "cdn.nexzyapp.com,nexzy-newsroom-media.s3.us-east-1.amazonaws.com,nexzy-newsroom-media.s3.amazonaws.com,nexzyapp.com"
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return new NextResponse("unauthorized", { status: 401 });
  // The cookie's PRESENCE is caller-controlled, so verify the JWT against the
  // API before proxying — otherwise anyone who sets a dummy cookie can burn
  // Netlify compute/bandwidth through this route.
  try {
    const me = await fetch(`${NEWSROOM_API_URL}/newsroom/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!me.ok) return new NextResponse("unauthorized", { status: 401 });
  } catch {
    return new NextResponse("auth check failed", { status: 502 });
  }
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
    const res = await fetch(u.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
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
