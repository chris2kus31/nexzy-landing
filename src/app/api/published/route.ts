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
  // Default true: an omitted flag (older API, or a manual call) still gets pinged.
  let indexable = true;
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
    if (body?.indexable === false) indexable = false;
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

  // IndexNow best practice: submit ONLY the specific URL that changed, and only
  // if it's indexable. We deliberately do NOT ping the stable hub page (/blog,
  // /guides) on every publish — re-submitting an unchanged URL is noise that can
  // trigger rate-limiting; the hub is discovered via crawl + sitemap. Noindex
  // pages (deals/patch beats) are skipped entirely — asking Bing to crawl a page
  // we mark noindex is off-spec. WebSub still pings Google's feed hub regardless
  // (a single feed-level freshness nudge, not per-URL spam).
  const urls = slug && indexable ? [`${SITE_URL}${base}/${slug}`] : [];
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
