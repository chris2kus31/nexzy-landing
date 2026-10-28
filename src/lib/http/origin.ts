import { NextRequest } from "next/server";

// CSRF second layer on top of SameSite=Lax cookies: reject state-changing
// requests whose Origin header names another site. Browsers always attach
// Origin to cross-site POST/PUT/PATCH/DELETE; requests WITHOUT one (the API's
// webhooks, curl, server-to-server) pass — this guards browser-initiated CSRF
// only. Auth (admin JWT / user session) remains the first layer regardless.
//
// The target origin comes from CONFIG (NEXT_PUBLIC_SITE_URL), per OWASP
// guidance for apps behind proxies/CDNs. Request-derived values are not
// trusted for this comparison:
//  - req.nextUrl.host proved unreliable on Netlify (2026-10-28 it
//    intermittently reported the internal deploy-permalink host, which
//    rejected every same-site admin write), and
//  - x-forwarded-host is NOT a browser-forbidden header, so a hostile page
//    could set it on a fetch to mirror its own origin into an allowlist.
// Config is deterministic and unspoofable on both counts.

function configuredHosts(): Set<string> {
  const hosts = new Set<string>();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      const host = new URL(site).host.toLowerCase();
      hosts.add(host);
      // The apex and www forms are the same site; accept the sibling so a
      // request from either spelling of our own domain is never rejected.
      if (host.startsWith("www.")) hosts.add(host.slice(4));
      else hosts.add(`www.${host}`);
    } catch {
      // Malformed config: leave the set empty; the caller falls back below.
    }
  }
  return hosts;
}

export function crossSiteBlocked(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS")
    return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return true; // malformed Origin (incl. "null"): treat as cross-site
  }

  // Local dev: next dev serves on localhost with an arbitrary port.
  if (
    process.env.NODE_ENV !== "production" &&
    /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(originHost)
  ) {
    return false;
  }

  const allowed = configuredHosts();
  if (allowed.size === 0) {
    // No usable config: degrade to the previous runtime-host comparison
    // rather than failing open (allow all) or shut (block all).
    return originHost !== req.nextUrl.host.toLowerCase();
  }
  return !allowed.has(originHost);
}
