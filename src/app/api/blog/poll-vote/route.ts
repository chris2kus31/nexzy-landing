// Same-origin proxy for a reader poll vote. Forwards to the newsroom API and
// returns the fresh tallies. Best-effort; per-visitor dedup is client-side.
import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

export async function POST(req: NextRequest) {
  let slug = "";
  let optionIndex = -1;
  try {
    ({ slug, optionIndex } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!slug || !Number.isInteger(optionIndex)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${API}/newsroom/public/posts/${encodeURIComponent(slug)}/poll-vote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex }),
        cache: "no-store",
      },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
