// Same-origin proxy for reading the signed-in reader's own poll pick for an
// article, so PollBlock can open straight to results (and their chosen option)
// on any device where they're logged in. Forwards the httpOnly session cookie
// as a Bearer token; anonymous callers just get { optionIndex: null }.
import { NextRequest, NextResponse } from "next/server";
import { USER_AT_COOKIE } from "@/lib/auth/server";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  if (!slug) {
    return NextResponse.json({ optionIndex: null }, { status: 200 });
  }
  const headers: Record<string, string> = {};
  const token = req.cookies.get(USER_AT_COOKIE)?.value;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(
      `${API}/newsroom/public/posts/${encodeURIComponent(slug)}/my-poll-vote`,
      { method: "GET", headers, cache: "no-store" },
    );
    const data = await res.json().catch(() => ({ optionIndex: null }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    // Best-effort — a read failure just means they see the pre-vote state.
    return NextResponse.json({ optionIndex: null }, { status: 200 });
  }
}
