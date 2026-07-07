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

/**
 * Minimum number of articles a topic hub needs before it's worth indexing.
 * Hubs below this are thin (often a single article, so a near-duplicate of that
 * article) — we render them for humans but mark them noindex,follow and keep
 * them out of the sitemap, so Google doesn't judge the site on ~100 near-empty
 * tag pages. Self-healing: a tag crosses the threshold and becomes indexable
 * again as soon as it has enough coverage.
 */
export const MIN_TOPIC_ARTICLES = 3;
