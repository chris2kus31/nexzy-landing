// ============================================
// FILE: app/sitemap.ts
// Generates /sitemap.xml for search engines.
// ============================================
import type { MetadataRoute } from "next";
import { fetchPosts } from "@/lib/blog/api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://landing.nexzyapp.com";

export const revalidate = 300;

// Safety cap so the sitemap can grow with the archive without an unbounded
// crawl of the API. 20 pages x 50 = up to 1,000 most-recent articles.
const MAX_PAGES = 20;
const PAGE_SIZE = 50;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = [
    "",
    "/privacy",
    "/terms",
    "/guidelines",
    "/how-we-use-ai",
    "/blog",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/blog" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/blog" ? 0.8 : 0.5,
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

  return [...staticEntries, ...articleEntries];
}
