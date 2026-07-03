// Topic-tag helpers, shared by the article page, topic hubs, and sitemap.
// Pure functions only (no server-only import) so client components can use them.

/** Normalize a tag/label to a URL-safe slug: "GTA 6" -> "gta-6". Must match the
 *  API's slugifyTag so hub links resolve. */
export function slugifyTag(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A tag as returned by GET /newsroom/public/tags. */
export interface TagInfo {
  tag: string;
  slug: string;
  count: number;
}
