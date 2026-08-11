// Same-origin proxy for the newsroom admin API. The browser calls
// /api/newsroom/admin/...; this handler injects the admin JWT from the
// httpOnly cookie as a Bearer token and forwards the real client IP, then
// relays to nexzy-api. No token ever touches client-side JS, and there is no
// cross-origin request from the browser.
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, NEWSROOM_API_URL, clientIp } from "@/lib/admin/server";

type Ctx = { params: Promise<{ path: string[] }> };

// Reject traversal/encoded-slash segments so the admin cookie can't be used to
// reach nexzy-api paths outside the intended /newsroom/ prefix via an encoded
// `../` in the catch-all. Admin routes are fixed keywords/ids only.
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
  const target = `${NEWSROOM_API_URL}/newsroom/${cleanPath}${search}`;

  const token = req.cookies.get(ADMIN_COOKIE)?.value;

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
    apiRes = await fetch(target, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the newsroom API" },
      { status: 502 },
    );
  }

  const text = await apiRes.text();
  return new NextResponse(text, {
    status: apiRes.status,
    headers: { "Content-Type": "application/json" },
  });
}

// Admin ops like backfill can run several seconds; give the proxy headroom.
export const maxDuration = 60;

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
