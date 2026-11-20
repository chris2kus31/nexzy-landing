// Publish webhook — called by the API when an article is published, and (since
// the long cache windows) also when a live article changes: unpublish, feature,
// byline, review rating, hero image, game links.
// Two jobs: (1) on-demand revalidation so the article AND every page that lists
// it (home, its index, game hubs, author + topic pages, feeds) update in seconds
// instead of waiting out their cache window, and (2) on PUBLISH only, an
// IndexNow + WebSub ping so engines crawl the URL within hours.
//
// Body: { slug, type, indexable, event?, path?, parentPath? } — event is
// "publish" (default when omitted, so older API builds keep today's behavior),
// "update" or "unpublish". `path` is the content's FULL public path when the
// API knows it (a walkthrough chapter lives at /walkthroughs/<parent>/<slug>,
// which type+slug alone cannot reconstruct); `parentPath` is an extra page to
// refresh (a chapter's parent overview). Both optional — older callers without
// them keep the type+slug behavior.
//
// Auth: shared secret in the `x-webhook-secret` header (NEWSROOM_WEBHOOK_SECRET).
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { pingIndexNow } from "@/lib/seo/indexnow";
import { pingWebSub } from "@/lib/seo/websub";
import { publicPathForType } from "@/lib/blog/publicPath";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.NEWSROOM_WEBHOOK_SECRET;
  // Constant-time compare so the secret can't be guessed byte-by-byte from
  // response timing. Length check first: timingSafeEqual throws on mismatch.
  const given = req.headers.get("x-webhook-secret") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret || "");
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let slug = "";
  let type = "article";
  // Default true: an omitted flag (older API, or a manual call) still gets pinged.
  let indexable = true;
  // "publish" (default) pings engines; "update"/"unpublish" only revalidate.
  let event: "publish" | "update" | "unpublish" = "publish";
  // Full public path from the API (chapter-aware); must be a safe local path.
  let path = "";
  let parentPath = "";
  // Bulk imports (hub entries/guide pages) send every public page they touched
  // so ONE IndexNow ping covers them all, even on an "update" event.
  let indexPaths: string[] = [];
  const localPath = (v: unknown): string =>
    typeof v === "string" &&
    // "_" is allowed: hub type and checklist keys may contain it.
    /^\/[a-z0-9_\-/]+$/i.test(v) &&
    !v.includes("//")
      ? v.replace(/\/+$/, "")
      : "";
  try {
    const body = await req.json();
    slug = typeof body?.slug === "string" ? body.slug : "";
    path = localPath(body?.path);
    parentPath = localPath(body?.parentPath);
    if (Array.isArray(body?.indexPaths))
      indexPaths = [
        ...new Set(
          (body.indexPaths as unknown[])
            .map(localPath)
            .filter((p): p is string => !!p),
        ),
      ].slice(0, 1000);
    if (
      body?.type === "guide" ||
      body?.type === "list" ||
      body?.type === "walkthrough" ||
      body?.type === "review" ||
      body?.type === "rewind"
    )
      type = body.type;
    if (body?.indexable === false) indexable = false;
    if (body?.event === "update" || body?.event === "unpublish")
      event = body.event;
  } catch {
    // no body / bad JSON — still refresh the index + feeds below
  }

  // Content type → its own URL home, so we revalidate + ping the RIGHT path
  // (a guide lives at /guides/<slug>, a review at /reviews/<slug>, not /blog).
  const base = publicPathForType(type);

  // Refresh the affected page + its index + feeds. The API's own `path` wins
  // over the type+slug guess (a chapter's real URL is nested under its parent);
  // `parentPath` additionally refreshes the page that lists it (the overview).
  const pagePath = path || (slug ? `${base}/${slug}` : "");

  // Mega hub notifies (engine/profile edits; their paths live under /games/)
  // only change their own game's pages. Refresh those plus the sitemap and
  // STOP — never the article surfaces (home, /blog, authors, topics, feeds),
  // or one entry edit marks most of the site stale. Hub subpages (guide,
  // map, lists) self-heal inside their 5-min window; the hub root caches
  // 6 h, so it is always refreshed here explicitly.
  const hubPaths = [pagePath, ...indexPaths].filter((p) =>
    p.startsWith("/games/"),
  );
  if (hubPaths.length) {
    const refresh = new Set<string>(hubPaths);
    for (const p of hubPaths) refresh.add(`/games/${p.split("/")[2]}`);
    if (parentPath) refresh.add(parentPath);
    for (const p of refresh) revalidatePath(p);
    revalidatePath("/games");
    revalidatePath("/sitemap.xml");
  } else {
    if (pagePath) revalidatePath(pagePath);
    if (parentPath) revalidatePath(parentPath);
    revalidatePath(base);
    revalidatePath("/sitemap.xml");
    revalidatePath("/news-sitemap.xml");
    revalidatePath("/rss.xml");
    // Every other page that can show this content. These now cache for 30 min to
    // 24 h, so they must be refreshed here or a new/changed article would not
    // appear on them until their window ran out. Dynamic patterns ("…/[slug]",
    // "page") refresh every page of that route, since the webhook doesn't carry
    // the linked games/author/tags.
    revalidatePath("/"); // homepage rails + Top Story hero
    revalidatePath("/blog"); // Top Story hero shows the featured post of ANY type
    revalidatePath("/games");
    revalidatePath("/games/[slug]", "page"); // game hubs list linked content
    revalidatePath("/author/[slug]", "page");
    revalidatePath("/blog/topic/[tag]", "page");
    if (type === "walkthrough") {
      revalidatePath("/walkthroughs/[slug]/[chapter]", "page");
    }
    if (type === "rewind") {
      revalidatePath("/rewind/on-this-day/[date]", "page");
    }
  }

  // IndexNow best practice: submit ONLY the specific URL that changed, and only
  // if it's indexable. We deliberately do NOT ping the stable hub page (/blog,
  // /guides) on every publish — re-submitting an unchanged URL is noise that can
  // trigger rate-limiting; the hub is discovered via crawl + sitemap. Noindex
  // pages (deals/patch beats) are skipped entirely — asking Bing to crawl a page
  // we mark noindex is off-spec. WebSub still pings Google's feed hub regardless
  // (a single feed-level freshness nudge, not per-URL spam).
  // Pings only on publish: an update/unpublish isn't a new URL for engines.
  if (event !== "publish") {
    // Bulk-import pages are new or changed URLs: submit them (one request).
    const indexNowStatus = indexPaths.length
      ? await pingIndexNow(indexPaths.map((p) => `${SITE_URL}${p}`))
      : undefined;
    return NextResponse.json({
      ok: true,
      revalidated: true,
      event,
      ...(indexNowStatus !== undefined ? { indexNowStatus } : {}),
    });
  }
  // Rewind episode stubs (/rewind/<slug>) are noindex on purpose; their day
  // hub is found via the sitemap, so never submit the stub itself.
  const urls =
    pagePath && indexable && type !== "rewind"
      ? [`${SITE_URL}${pagePath}`]
      : [];
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
