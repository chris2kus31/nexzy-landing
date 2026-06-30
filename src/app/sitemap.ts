// ============================================
// FILE: app/sitemap.ts
// Generates /sitemap.xml for search engines.
// ============================================
import type { MetadataRoute } from "next";
import { fetchPosts } from "@/lib/blog/api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://landing.nexzyapp.com";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = ["", "/privacy", "/terms", "/guidelines", "/blog"];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/blog" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/blog" ? 0.8 : 0.5,
  }));

  // Published articles (best-effort — never break the sitemap if the API is down).
  let articleEntries: MetadataRoute.Sitemap = [];
  try {
    const { items } = await fetchPosts({ pageSize: 50 });
    articleEntries = items.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    articleEntries = [];
  }

  return [...staticEntries, ...articleEntries];
}
