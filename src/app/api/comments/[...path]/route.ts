// Same-origin proxy for reader comments. Forwards to nexzy-api /comments/*,
// injecting the reader's access-token cookie as a Bearer so writes (create /
// vote / delete) are authenticated without exposing the token to client JS.
// GET (listing) also forwards the token when present so each viewer gets their
// own `myVote`, but works fine unauthenticated.
import { NextRequest, NextResponse } from "next/server";
import { USER_API_URL, USER_AT_COOKIE, clientIp } from "@/lib/auth/server";

type Ctx = { params: Promise<{ path: string[] }> };

// Reject any segment that could climb out of the /comments/ prefix. Without
// this, an encoded `../` in the catch-all lets a logged-in reader reach other
// nexzy-api endpoints with their own cookie injected as a Bearer (confused
// deputy). Legit comment routes are only slugs, UUIDs, and the fixed keywords
// replies/vote/report — none contain these characters.
function safeSegments(path: string[]): boolean {
  return (
    Array.isArray(path) &&
    path.length > 0 &&
    path.every(
      (seg) =>
        seg.length > 0 &&
        !seg.includes("..") &&
        !seg.includes("/") &&
        !seg.includes("\\") &&
        !/%2f/i.test(seg) &&
        !/%5c/i.test(seg),
    )
  );
}

async function proxy(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  if (!safeSegments(path)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const search = req.nextUrl.search || "";
  const cleanPath = path.map(encodeURIComponent).join("/");
  const target = `${USER_API_URL}/comments/${cleanPath}${search}`;

  const token = req.cookies.get(USER_AT_COOKIE)?.value;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": clientIp(req),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.text() : undefined;

  let apiRes: Response;
  try {
    apiRes = await fetch(target, { method, headers, body, cache: "no-store" });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the comments API" },
      { status: 502 },
    );
  }

  const text = await apiRes.text();
  return new NextResponse(text, {
    status: apiRes.status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
