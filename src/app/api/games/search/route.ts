// Old query-string form of the website game search. Kept so nothing 404s,
// but NOT edge-cached: the Netlify cache ignores query strings on Next
// routes. The site uses /api/games/search/<query> instead.
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  // Absolute on the public site (req.url is the internal deploy host).
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
  const url = new URL(`/api/games/search/${encodeURIComponent(q)}`, site);
  return NextResponse.redirect(url, {
    status: 308,
    headers: { "Cache-Control": "private, no-store" },
  });
}
