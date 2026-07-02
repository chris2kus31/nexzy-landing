// Live "Most read" data for the blog sidebar. Unlike the ISR-cached page
// render, this proxy is always fresh so the read counts reflect reality within
// seconds. Public, read-only.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit") || "5";
  try {
    const res = await fetch(
      `${API}/newsroom/public/trending?limit=${encodeURIComponent(limit)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
