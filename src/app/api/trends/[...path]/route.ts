// Same-origin proxy for the Drops pages (/drops/<slug>). Forwards to nexzy-api
// /trends/*, only for the exact routes below (no confused-deputy paths).
//
// Every request carries the visitor's IP signed with NEWSROOM_WEBHOOK_SECRET
// (x-nexzy-client-ip + x-nexzy-client-sig): all web traffic reaches the API
// from Netlify, so without it every visitor would share one rate-limit
// bucket. The reader's access-token cookie is forwarded as a Bearer where a
// route needs (or can use) the account: posting an entry, asking for a game,
// library / wishlist choices. The image preview is relayed as bytes.
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { crossSiteBlocked } from "@/lib/http/origin";
import { USER_API_URL, USER_AT_COOKIE, clientIp } from "@/lib/auth/server";
import { SLUG_RE } from "@/lib/trends/types";

type Ctx = { params: Promise<{ path: string[] }> };
type Rule = {
  /** required: sign in first; optional: forwarded when present. */
  auth: "required" | "optional" | "none";
  /** Query params passed through, each checked by its own pattern. */
  query?: Record<string, RegExp>;
  binary?: boolean;
};

const MAX_BODY = 8 * 1024;
const TIMEOUT_MS = 12_000;

/** "<action> <METHOD>" -> rule; action is what follows the slug. */
const SLUG_ROUTES: Record<string, Rule> = {
  "entries GET": {
    auth: "optional",
    query: {
      tab: /^(top|new|following)$/,
      cursor: /^[A-Za-z0-9_-]{1,300}$/,
      limit: /^([1-9]|[12][0-9]|30)$/,
    },
  },
  "entries POST": { auth: "required" },
  "choices GET": { auth: "optional", query: { q: /^[^\n\r]{1,60}$/ } },
  "events POST": { auth: "optional" },
  "preview POST": { auth: "none", binary: true },
  "builds POST": { auth: "none" },
  "matches GET": {
    auth: "optional",
    query: {
      code: /^[A-Za-z0-9]{6,12}$/,
      entry: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    },
  },
};
/** Routes with no slug. */
const ROOT_ROUTES: Record<string, Rule> = {
  "request-game POST": { auth: "required" },
};

function signedIp(ip: string): Record<string, string> | null {
  const secret = process.env.NEWSROOM_WEBHOOK_SECRET;
  if (!secret || !ip || ip.length > 64) return null;
  return {
    "x-nexzy-client-ip": ip,
    "x-nexzy-client-sig": createHmac("sha256", secret).update(ip).digest("hex"),
  };
}

async function proxy(req: NextRequest, ctx: Ctx) {
  const method = req.method.toUpperCase();
  if (method !== "GET" && crossSiteBlocked(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { path } = await ctx.params;
  const parts = Array.isArray(path) ? path : [];

  let apiPath: string;
  let rule: Rule | undefined;
  if (parts.length === 1) {
    rule = ROOT_ROUTES[`${parts[0]} ${method}`];
    apiPath = `/trends/${parts[0]}`;
  } else if (
    parts.length === 2 &&
    SLUG_RE.test(parts[0]) &&
    parts[0].length <= 60
  ) {
    rule = SLUG_ROUTES[`${parts[1]} ${method}`];
    apiPath = `/trends/${parts[0]}/${parts[1]}`;
  } else {
    apiPath = "";
  }
  if (!rule) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const params = new URLSearchParams();
  for (const [k, re] of Object.entries(rule.query ?? {})) {
    const v = req.nextUrl.searchParams.get(k);
    if (v === null || v === "") continue;
    if (!re.test(v)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    params.set(k, v);
  }
  const query = params.toString() ? `?${params.toString()}` : "";

  const token = req.cookies.get(USER_AT_COOKIE)?.value;
  if (rule.auth === "required" && !token) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const ip = clientIp(req);
  const signed = signedIp(ip);
  if (!signed) {
    // Fail closed: unsigned, every web visitor would share Netlify's bucket.
    console.error("[trends] NEWSROOM_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Trends are unavailable right now." },
      { status: 503 },
    );
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": ip,
    ...signed,
  };
  const withToken = rule.auth !== "none" && !!token;
  if (withToken) headers["Authorization"] = `Bearer ${token}`;

  let body: string | undefined;
  if (method === "POST") {
    body = await req.text();
    if (body.length > MAX_BODY) {
      return NextResponse.json({ error: "Too large" }, { status: 413 });
    }
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}${apiPath}${query}`, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach Nexzy" },
      { status: 502 },
    );
  }

  if (rule.binary && apiRes.ok) {
    const bytes = await apiRes.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": apiRes.headers.get("content-type") || "image/webp",
        "Cache-Control": "private, no-store",
      },
    });
  }
  // Never CDN-cached: these routes can answer per reader (likes, library
  // choices), and a CDN keyed on the URL alone would mix readers up. The
  // API caches the shared parts itself.
  const text = await apiRes.text();
  return new NextResponse(text, {
    status: apiRes.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
