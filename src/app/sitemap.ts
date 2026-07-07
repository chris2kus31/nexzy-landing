// ============================================
// FILE: app/sitemap.ts
// Generates /sitemap.xml for search engines.
// ============================================
import type { MetadataRoute } from "next";
import { fetchPosts, fetchGuides, fetchLists, fetchTags } from "@/lib/blog/api";
import { MIN_TOPIC_ARTICLES } from "@/lib/blog/tags";
import { AUTHORS } from "@/lib/blog/authors";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const revalidate = 300;

// Safety cap so the sitemap can grow with the archive without an unbounded
// crawl of the API. 20 pages x 50 = up to 1,000 most-recent articles.
const MAX_PAGES = 20;
const PAGE_SIZE = 50;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = [
    "",
    "/about",
    "/privacy",
    "/terms",
    "/guidelines",
    "/how-we-use-ai",
    "/blog",
    "/guides",
    "/lists",
  ];

  const hubRoutes = new Set(["/blog", "/guides", "/lists"]);
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" || hubRoutes.has(path) ? "daily" : "monthly",
    priority: path === "" ? 1 : hubRoutes.has(path) ? 0.8 : 0.5,
  }));

  // Published articles (best-effort — never break the sitemap if the API is
  // down). Paginate so the whole archive stays listed as volume grows.
  const articleEntries: MetadataRoute.Sitemap = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { items, total } = await fetchPosts({ page, pageSize: PAGE_SIZE });
      for (const p of items) {
        articleEntries.push({
          url: `${SITE_URL}/blog/${p.slug}`,
          lastModified: p.updatedAt
            ? new Date(p.updatedAt)
            : p.publishedAt
              ? new Date(p.publishedAt)
              : now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
      if (items.length < PAGE_SIZE || articleEntries.length >= total) break;
    }
  } catch {
    // keep whatever we already collected
  }

  // Evergreen guides (/guides/[slug]) and lists (/lists/[slug]). Best-effort,
  // paginated, and each mapped to its own URL home so crawlers index them apart
  // from dated /blog articles.
  const evergreenEntries: MetadataRoute.Sitemap = [];
  const evergreen: {
    prefix: string;
    fetch: typeof fetchGuides;
  }[] = [
    { prefix: "/guides", fetch: fetchGuides },
    { prefix: "/lists", fetch: fetchLists },
  ];
  for (const { prefix, fetch } of evergreen) {
    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const { items, total } = await fetch({ page, pageSize: PAGE_SIZE });
        for (const p of items) {
          evergreenEntries.push({
            url: `${SITE_URL}${prefix}/${p.slug}`,
            lastModified: p.updatedAt
              ? new Date(p.updatedAt)
              : p.publishedAt
                ? new Date(p.publishedAt)
                : now,
            changeFrequency: "weekly",
            priority: 0.7,
          });
        }
        if (items.length < PAGE_SIZE || page * PAGE_SIZE >= total) break;
      }
    } catch {
      // keep whatever we already collected
    }
  }

  // Author pages (E-E-A-T) — stable, low-churn.
  const authorEntries: MetadataRoute.Sitemap = Object.values(AUTHORS).map(
    (a) => ({
      url: `${SITE_URL}/author/${a.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    }),
  );

  // Topic hubs — only the SUBSTANTIAL ones (>= MIN_TOPIC_ARTICLES). Thin,
  // single-article tags are noindex,follow and deliberately excluded here so we
  // don't advertise ~100 near-duplicate pages to Google. Best-effort so a
  // tags-API hiccup never breaks the sitemap.
  const topicEntries: MetadataRoute.Sitemap = [];
  try {
    const tags = await fetchTags(500);
    for (const t of tags) {
      if (t.count < MIN_TOPIC_ARTICLES) continue;
      topicEntries.push({
        url: `${SITE_URL}/blog/topic/${t.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // keep whatever we already collected
  }

  return [
    ...staticEntries,
    ...articleEntries,
    ...evergreenEntries,
    ...authorEntries,
    ...topicEntries,
  ];
}
