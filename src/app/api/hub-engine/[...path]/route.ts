// Same-origin proxy for the mega hub engine (guide map, lists, entries,
// checklists, "found it" progress). Forwards to nexzy-api
// /game-hubs/<slug>/engine/..., only for the exact routes below.
//
// Every request carries the visitor's IP signed with NEWSROOM_WEBHOOK_SECRET:
// the API rate-limits per visitor, and without the signature every web
// visitor would share Netlify's IP (one bot could block the map for all).
// Public reads are edge-cached; progress forwards the reader's token and is
// never cached.
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { crossSiteBlocked } from "@/lib/http/origin";
import { USER_API_URL, USER_AT_COOKIE, clientIp } from "@/lib/auth/server";

type Ctx = { params: Promise<{ path: string[] }> };

const SLUG_RE = /^[a-z0-9-]{1,200}$/;
const KEY_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const ENTRY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAG_RE = /^[a-z0-9][a-z0-9_-]{0,31}:[a-z0-9][a-z0-9_-]{0,31}$/;
const CURSOR_RE = /^-?\d{1,9}:[0-9a-f-]{36}$/i;
const MAX_BODY = 96 * 1024; // sync: up to 2,000 ids

type Route = { path: string; auth: boolean; publicCache: boolean };

/** Resolve the request to an allowed API path, or null. */
function resolve(parts: string[], method: string): Route | null {
  const [slug, ...rest] = parts;
  if (!slug || !SLUG_RE.test(slug)) return null;
  const base = `/game-hubs/${slug}/engine`;
  const pub = (p: string): Route => ({
    path: p,
    auth: false,
    publicCache: true,
  });
  const me = (p: string): Route => ({
    path: p,
    auth: true,
    publicCache: false,
  });
  const [a, b, c] = rest;
  if (method === "GET") {
    if (rest.length === 0) return pub(base);
    if (a === "maps" && rest.length === 3 && KEY_RE.test(b) && c === "pins")
      return pub(`${base}/maps/${b}/pins`);
    if (a === "entries" && rest.length === 1) return pub(`${base}/entries`);
    if (
      a === "entries" &&
      rest.length === 2 &&
      ENTRY_RE.test(b) &&
      b.length <= 80
    )
      return pub(`${base}/entries/${b}`);
    if (a === "checklists" && rest.length === 2 && KEY_RE.test(b))
      return pub(`${base}/checklists/${b}`);
    if (a === "progress" && rest.length === 1) return me(`${base}/progress`);
  }
  if (
    (method === "PUT" || method === "DELETE") &&
    a === "progress" &&
    rest.length === 2 &&
    UUID_RE.test(b)
  )
    return me(`${base}/progress/${b}`);
  if (
    method === "POST" &&
    a === "progress" &&
    b === "sync" &&
    rest.length === 2
  )
    return me(`${base}/progress/sync`);
  return null;
}

/** Only the list endpoint takes a query, and only these keys. */
function listQuery(req: NextRequest): string | null {
  const sp = req.nextUrl.searchParams;
  const out = new URLSearchParams();
  const type = sp.get("type");
  if (type) {
    if (!KEY_RE.test(type)) return null;
    out.set("type", type);
  }
  const tags = sp.getAll("tag");
  if (tags.length > 10 || tags.some((t) => !TAG_RE.test(t))) return null;
  tags.forEach((t) => out.append("tag", t));
  const era = sp.get("era");
  if (era) {
    if (!KEY_RE.test(era)) return null;
    out.set("era", era);
  }
  const q = sp.get("q");
  if (q) {
    if (q.length < 2 || q.length > 60) return null;
    out.set("q", q);
  }
  const cursor = sp.get("cursor");
  if (cursor) {
    if (!CURSOR_RE.test(cursor)) return null;
    out.set("cursor", cursor);
  }
  const limit = sp.get("limit");
  if (limit) {
    if (!/^\d{1,2}$/.test(limit)) return null;
    out.set("limit", limit);
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

async function proxy(req: NextRequest, ctx: Ctx) {
  const method = req.method.toUpperCase();
  if (method !== "GET" && crossSiteBlocked(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { path } = await ctx.params;
  const parts = Array.isArray(path) ? path : [];
  const route = parts.length <= 4 ? resolve(parts, method) : null;
  if (!route)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  let query = "";
  if (route.path.endsWith("/entries")) {
    const q = listQuery(req);
    if (q === null)
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    query = q;
  }

  const token = req.cookies.get(USER_AT_COOKIE)?.value;
  if (route.auth && !token) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const secret = process.env.NEWSROOM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[hub-engine] NEWSROOM_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  // Sign only something IP-shaped. clientIp trusts platform headers, but if
  // this ever runs where none is set (or someone reaches the function host
  // directly), the fallback must not let a typed header value - above all
  // the API's own "site-server" identity, which skips the per-IP throttle -
  // get signed as if it were a visitor.
  const raw = clientIp(req);
  const ip = /^[0-9a-f.:]{3,45}$/i.test(raw) ? raw : "0.0.0.0";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-nexzy-client-ip": ip,
    "x-nexzy-client-sig": createHmac("sha256", secret).update(ip).digest("hex"),
  };
  if (route.auth && token) headers["Authorization"] = `Bearer ${token}`;

  let body: string | undefined;
  if (method === "POST") {
    // Refuse oversized uploads before buffering them (Content-Length first;
    // the post-read check still covers chunked bodies).
    const len = Number(req.headers.get("content-length"));
    if (Number.isFinite(len) && len > MAX_BODY) {
      return NextResponse.json({ error: "Too large" }, { status: 413 });
    }
    body = await req.text();
    if (body.length > MAX_BODY) {
      return NextResponse.json({ error: "Too large" }, { status: 413 });
    }
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}${route.path}${query}`, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach Nexzy" },
      { status: 502 },
    );
  }
  const text = await apiRes.text();
  return new NextResponse(text, {
    status: apiRes.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control":
        route.publicCache && apiRes.ok
          ? "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
          : "private, no-store",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
