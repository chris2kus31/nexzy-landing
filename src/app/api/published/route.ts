// Publish webhook — called by the API when an article is approved/published.
// Two jobs: (1) on-demand ISR revalidation so the new/updated article and the
// index/feeds go live in seconds instead of waiting out the 5-min window, and
// (2) an IndexNow ping so engines crawl the URL within hours.
//
// Auth: shared secret in the `x-webhook-secret` header (NEWSROOM_WEBHOOK_SECRET).
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pingIndexNow } from "@/lib/seo/indexnow";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://landing.nexzyapp.com";

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.NEWSROOM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let slug = "";
  try {
    const body = await req.json();
    slug = typeof body?.slug === "string" ? body.slug : "";
  } catch {
    // no body / bad JSON — still refresh the index + feeds below
  }

  // Refresh the affected pages + feeds.
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  revalidatePath("/news-sitemap.xml");
  revalidatePath("/rss.xml");

  // Nudge IndexNow (best-effort).
  const urls = [`${SITE_URL}/blog`];
  if (slug) urls.unshift(`${SITE_URL}/blog/${slug}`);
  const indexNowStatus = await pingIndexNow(urls);

  return NextResponse.json({ ok: true, revalidated: true, indexNowStatus });
}
