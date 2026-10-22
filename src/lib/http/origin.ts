import { NextRequest } from "next/server";

// CSRF second layer on top of SameSite=Lax cookies: reject state-changing
// requests whose Origin header names another site. Browsers always attach
// Origin to POST/PUT/PATCH/DELETE; requests WITHOUT one (the API's webhooks,
// curl, server-to-server) pass — this guards browser-initiated CSRF only.
export function crossSiteBlocked(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS")
    return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.nextUrl.host;
  } catch {
    return true; // malformed Origin: treat as cross-site
  }
}
