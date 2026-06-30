// Same-origin proxy so the client News explorer can search/filter/paginate the
// public newsroom API without CORS. Read-only, published content only.
import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  for (const key of ["q", "beat", "page", "pageSize"]) {
    const v = sp.get(key);
    if (v) qs.set(key, v);
  }

  try {
    const res = await fetch(
      `${API}/newsroom/public/posts${qs.toString() ? `?${qs}` : ""}`,
      { cache: "no-store" },
    );
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { items: [], total: 0, page: 1, pageSize: 12 },
      { status: 502 },
    );
  }
}
