// Same-origin follow/unfollow for signed-in readers (Who's playing on mega
// hubs). Forwards to nexzy-api POST/DELETE /users/:id/follow with the
// reader's access-token cookie as a Bearer; the token never reaches client JS.
import { NextRequest, NextResponse } from "next/server";
import { crossSiteBlocked } from "@/lib/http/origin";
import { USER_API_URL, USER_AT_COOKIE, clientIp } from "@/lib/auth/server";

type Ctx = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function proxy(req: NextRequest, ctx: Ctx) {
  if (crossSiteBlocked(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id ?? "")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const token = req.cookies.get(USER_AT_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}/users/${id}/follow`, {
      method: req.method.toUpperCase(),
      headers: {
        Authorization: `Bearer ${token}`,
        "x-forwarded-for": clientIp(req),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Nexzy" }, { status: 502 });
  }
  return new NextResponse(await apiRes.text(), {
    status: apiRes.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}

export const POST = proxy;
export const DELETE = proxy;
