// ============================================
// FILE: app/get/route.ts
// Smart "get the app" redirect. Used by the desktop QR code (and any /get link):
// a phone that scans the code lands here and is sent straight to the right store
// by its user-agent. Desktop/unknown falls back to the homepage download band
// (which shows both stores). Keeps ONE shareable URL for "get the Nexzy app".
// ============================================
import { NextResponse, type NextRequest } from "next/server";
import { APP_STORE_URL, googlePlayUrl } from "@/lib/storeUrls";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest): NextResponse {
  const ua = req.headers.get("user-agent") || "";
  // Attribution: /get?src=app_share_menu flows into the Play install referrer
  // so shared installs are attributable. Bad/missing src falls back to "qr"
  // (the historical default, so existing QR codes are unchanged).
  const raw = req.nextUrl.searchParams.get("src") ?? "";
  const src = /^[a-z0-9_-]{1,40}$/i.test(raw) ? raw : "qr";

  if (/android/i.test(ua)) {
    return NextResponse.redirect(googlePlayUrl(src));
  }
  if (/iphone|ipad|ipod/i.test(ua)) {
    return NextResponse.redirect(APP_STORE_URL);
  }
  // Desktop / unknown device — send to the homepage download band (both stores).
  return NextResponse.redirect(new URL("/#download", req.url));
}
