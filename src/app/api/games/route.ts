// Same-origin proxy for the public games list, so the client "Load more" on
// /games can fetch subsequent pages without a cross-origin call to nexzy-api.
import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get("page") || "1";
  const pageSize = req.nextUrl.searchParams.get("pageSize") || "60";
  let res: Response;
  try {
    res = await fetch(
      `${API}/newsroom/public/games?page=${encodeURIComponent(
        page,
      )}&pageSize=${encodeURIComponent(pageSize)}`,
      { cache: "no-store" },
    );
  } catch {
    return NextResponse.json(
      { error: "Upstream unavailable" },
      { status: 502 },
    );
  }
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
