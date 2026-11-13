// Old query-string form of the website game search. Kept so nothing 404s,
// but NOT edge-cached: the Netlify cache ignores query strings on Next
// routes. The site uses /api/games/search/<query> instead.
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const url = new URL(`/api/games/search/${encodeURIComponent(q)}`, req.url);
  return NextResponse.redirect(url, {
    status: 308,
    headers: { "Cache-Control": "private, no-store" },
  });
}
