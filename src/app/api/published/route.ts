// Publish webhook — called by the API when an article is approved/published.
// Two jobs: (1) on-demand ISR revalidation so the new/updated article and the
// index/feeds go live in seconds instead of waiting out the 5-min window, and
// (2) an IndexNow ping so engines crawl the URL within hours.
//
// Auth: shared secret in the `x-webhook-secret` header (NEWSROOM_WEBHOOK_SECRET).
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pingIndexNow } from "@/lib/seo/indexnow";
import { pingWebSub } from "@/lib/seo/websub";
import { publicPathForType } from "@/lib/blog/publicPath";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.NEWSROOM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let slug = "";
  let type = "article";
  try {
    const body = await req.json();
    slug = typeof body?.slug === "string" ? body.slug : "";
    if (
      body?.type === "guide" ||
      body?.type === "list" ||
      body?.type === "walkthrough" ||
      body?.type === "review" ||
      body?.type === "rewind"
    )
      type = body.type;
  } catch {
    // no body / bad JSON — still refresh the index + feeds below
  }

  // Content type → its own URL home, so we revalidate + ping the RIGHT path
  // (a guide lives at /guides/<slug>, a review at /reviews/<slug>, not /blog).
  const base = publicPathForType(type);

  // Refresh the affected page + its index + feeds.
  if (slug) revalidatePath(`${base}/${slug}`);
  revalidatePath(base);
  revalidatePath("/sitemap.xml");
  revalidatePath("/news-sitemap.xml");
  revalidatePath("/rss.xml");

  // Nudge IndexNow (best-effort) with the correct URLs, and ping Google's
  // WebSub hub that the RSS feed has fresh content (freshness discovery).
  const urls = [`${SITE_URL}${base}`];
  if (slug) urls.unshift(`${SITE_URL}${base}/${slug}`);
  const [indexNowStatus, webSubStatus] = await Promise.all([
    pingIndexNow(urls),
    pingWebSub(),
  ]);

  return NextResponse.json({
    ok: true,
    revalidated: true,
    indexNowStatus,
    webSubStatus,
  });
}
