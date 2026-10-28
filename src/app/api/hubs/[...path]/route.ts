// Same-origin proxy for the mega hub reader actions (Phase 1). Forwards to
// nexzy-api /game-hubs/<slug>/<action>, injecting the reader's access-token
// cookie as a Bearer so Day One + predictions are tied to the account without
// exposing the token to client JS. Only the exact routes below pass: anything
// else is rejected before it reaches the API (no confused-deputy paths).
import { NextRequest, NextResponse } from "next/server";
import { crossSiteBlocked } from "@/lib/http/origin";
import { USER_API_URL, USER_AT_COOKIE, clientIp } from "@/lib/auth/server";

type Ctx = { params: Promise<{ path: string[] }> };

const SLUG_RE = /^[a-z0-9-]{1,200}$/;
const ALLOWED: Record<string, string[]> = {
  live: ["GET"],
  me: ["GET"],
  "day-one": ["PUT", "DELETE"],
  prediction: ["PUT"],
};

async function proxy(req: NextRequest, ctx: Ctx) {
  const method = req.method.toUpperCase();
  if (method !== "GET" && crossSiteBlocked(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { path } = await ctx.params;
  const [slug, action] = Array.isArray(path) ? path : [];
  if (
    !Array.isArray(path) ||
    path.length !== 2 ||
    !SLUG_RE.test(slug ?? "") ||
    !ALLOWED[action ?? ""]?.includes(method)
  ) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const token = req.cookies.get(USER_AT_COOKIE)?.value;
  if (action !== "live" && !token) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": clientIp(req),
  };
  if (token && action !== "live") headers["Authorization"] = `Bearer ${token}`;

  const body = method === "PUT" ? await req.text() : undefined;
  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}/game-hubs/${slug}/${action}`, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Nexzy" }, { status: 502 });
  }
  const text = await apiRes.text();
  return new NextResponse(text, {
    status: apiRes.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control":
        action === "live" && apiRes.ok
          ? "public, max-age=15, s-maxage=30"
          : "private, no-store",
    },
  });
}

export const GET = proxy;
export const PUT = proxy;
export const DELETE = proxy;
