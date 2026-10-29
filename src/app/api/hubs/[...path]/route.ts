// Same-origin proxy for the mega hub reader actions. Forwards to nexzy-api
// /game-hubs/<slug>/<action>, injecting the reader's access-token cookie as a
// Bearer so Day One, predictions and ratings are tied to the account without
// exposing the token to client JS. Only the exact routes below pass: anything
// else is rejected before it reaches the API (no confused-deputy paths).
//
// Writes also carry the visitor's IP, signed with NEWSROOM_WEBHOOK_SECRET
// (x-nexzy-client-ip + x-nexzy-client-sig). Every web request reaches the API
// from Netlify, so without it the API's per-IP review rules would see one IP
// for all web users. The API trusts the header only with a valid signature.
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { crossSiteBlocked } from "@/lib/http/origin";
import { USER_API_URL, USER_AT_COOKIE, clientIp } from "@/lib/auth/server";

type Ctx = { params: Promise<{ path: string[] }> };
/** auth: token required. optionalAuth: token forwarded when present (the
 *  API tailors the answer to the viewer; never publicly cached). */
type Rule = {
  auth: boolean;
  optionalAuth?: boolean;
  publicCache?: boolean;
  signIp?: boolean;
  query?: "cursor";
};

const SLUG_RE = /^[a-z0-9-]{1,200}$/;
const CURSOR_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z?\|[0-9a-f-]{36}$/i;
const MAX_BODY = 16 * 1024;

/** "<action> <METHOD>" -> rule. Public reads never forward the token. */
const ROUTES: Record<string, Rule> = {
  "live GET": { auth: false, publicCache: true },
  "me GET": { auth: true },
  "day-one PUT": { auth: true },
  "day-one DELETE": { auth: true },
  "prediction PUT": { auth: true },
  "scores GET": { auth: false, publicCache: true },
  "reviews GET": { auth: false, publicCache: true, query: "cursor" },
  "reviews/me GET": { auth: true },
  "reviews/start POST": { auth: true },
  "reviews PUT": { auth: true, signIp: true },
  "reviews DELETE": { auth: true },
  "thread GET": { auth: false, optionalAuth: true, query: "cursor" },
  "thread/comments POST": { auth: true },
  "players GET": { auth: false, optionalAuth: true, query: "cursor" },
};

async function proxy(req: NextRequest, ctx: Ctx) {
  const method = req.method.toUpperCase();
  if (method !== "GET" && crossSiteBlocked(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { path } = await ctx.params;
  const parts = Array.isArray(path) ? path : [];
  const [slug, ...rest] = parts;
  const action = rest.join("/");
  const rule = ROUTES[`${action} ${method}`];
  if (parts.length < 2 || parts.length > 3 || !SLUG_RE.test(slug ?? "") || !rule) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Only paged reads take a query (their keyset cursor).
  let query = "";
  if (rule.query === "cursor") {
    const cursor = req.nextUrl.searchParams.get("cursor");
    if (cursor) {
      if (!CURSOR_RE.test(cursor)) {
        return NextResponse.json({ error: "Bad request" }, { status: 400 });
      }
      query = `?cursor=${encodeURIComponent(cursor)}`;
    }
  }

  const token = req.cookies.get(USER_AT_COOKIE)?.value;
  if (rule.auth && !token) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const ip = clientIp(req);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": ip,
  };
  if ((rule.auth || rule.optionalAuth) && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (rule.signIp) {
    const secret = process.env.NEWSROOM_WEBHOOK_SECRET;
    if (!secret) {
      // Fail closed: without the signed IP every web rating would share
      // Netlify's IP and trip the API's velocity hold.
      console.error("[hubs] NEWSROOM_WEBHOOK_SECRET is not set; ratings disabled");
      return NextResponse.json(
        { error: "Ratings are unavailable right now." },
        { status: 503 },
      );
    }
    headers["x-nexzy-client-ip"] = ip;
    headers["x-nexzy-client-sig"] = createHmac("sha256", secret)
      .update(ip)
      .digest("hex");
  }

  let body: string | undefined;
  if (method === "PUT" || method === "POST") {
    body = await req.text();
    if (body.length > MAX_BODY) {
      return NextResponse.json({ error: "Too large" }, { status: 413 });
    }
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}/game-hubs/${slug}/${action}${query}`, {
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
        rule.publicCache && apiRes.ok
          ? "public, max-age=15, s-maxage=30"
          : "private, no-store",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
