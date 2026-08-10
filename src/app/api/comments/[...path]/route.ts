// Same-origin proxy for reader comments. Forwards to nexzy-api /comments/*,
// injecting the reader's access-token cookie as a Bearer so writes (create /
// vote / delete) are authenticated without exposing the token to client JS.
// GET (listing) also forwards the token when present so each viewer gets their
// own `myVote`, but works fine unauthenticated.
import { NextRequest, NextResponse } from "next/server";
import { USER_API_URL, USER_AT_COOKIE, clientIp } from "@/lib/auth/server";

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const search = req.nextUrl.search || "";
  const target = `${USER_API_URL}/comments/${path.join("/")}${search}`;

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
export const DELETE = proxy;
