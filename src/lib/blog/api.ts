// Server-side fetch helpers for the public newsroom API. These hit nexzy-api's
// unauthenticated /newsroom/public endpoints and are safe to call from server
// components (SSR/SEO).
import "server-only";
import type { TagInfo } from "./tags";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

export interface PublicPost {
  slug: string;
  title: string;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  bodyMarkdown?: string;
  heroImageUrl: string | null;
  appImageUrl: string | null;
  imageAlt: string | null;
  imageCredit: string | null;
  youtubeUrl: string | null;
  beat: string;
  type?: string;
  tags: string[];
  sources: { name: string; url: string }[];
  author: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  viewCount: number;
  featured: boolean;
  // Guides only: is this game in the Nexzy library? Drives the app CTA.
  appGame?: { inDb: boolean; name: string } | null;
  // The primary DB game linked to this post (powers the game card).
  game?: {
    id: string;
    name: string;
    slug: string;
    backgroundImage: string | null;
    released: string | null;
    platforms: string[];
    genres: string[];
  } | null;
}

export interface PostList {
  items: PublicPost[];
  total: number;
  page: number;
  pageSize: number;
}

// Revalidate published content periodically (ISR-friendly).
const REVALIDATE = 300; // 5 min

export async function fetchPosts(params?: {
  beat?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  author?: string;
  tag?: string;
  type?: string;
}): Promise<PostList> {
  const q = new URLSearchParams();
  if (params?.beat) q.set("beat", params.beat);
  if (params?.q) q.set("q", params.q);
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  if (params?.author) q.set("author", params.author);
  if (params?.tag) q.set("tag", params.tag);
  // Content type: omit for news (API defaults to 'article'); 'guide' for /guides.
  if (params?.type) q.set("type", params.type);
  // Web opts into featured-first ordering so a pinned story wins the hero. The
  // mobile app omits this and keeps strict newest-first.
  q.set("hero", "1");
  const qs = q.toString();

  const res = await fetch(`${API}/newsroom/public/posts${qs ? `?${qs}` : ""}`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) {
    return { items: [], total: 0, page: 1, pageSize: 20 };
  }
  return res.json();
}

/** Evergreen guides index ("how to beat X"). Newest first, paginated. */
export async function fetchGuides(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PostList> {
  return fetchPosts({ ...params, type: "guide" });
}

/** Evergreen lists index ("upcoming" + "new this week"). Newest first. */
export async function fetchLists(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PostList> {
  return fetchPosts({ ...params, type: "list" });
}

export async function fetchTrending(
  limit = 5,
  sort: "hot" | "reads" = "hot",
): Promise<PublicPost[]> {
  // ISR-cached: the popularity rail can be a few minutes stale — fine, and much
  // faster. sort=hot = time-decayed trending; sort=reads = lifetime "Most read".
  const res = await fetch(
    `${API}/newsroom/public/trending?limit=${limit}&sort=${sort}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) return [];
  return res.json();
}

export async function fetchRelated(
  slug: string,
  limit = 3,
): Promise<PublicPost[]> {
  // Tag-aware related articles (shared tag first, then same beat) — the
  // "Keep reading" rail + internal linking for topical authority.
  const res = await fetch(
    `${API}/newsroom/public/posts/${encodeURIComponent(slug)}/related?limit=${limit}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTags(limit = 200): Promise<TagInfo[]> {
  // Distinct published tags + counts, for the topic-hub index and sitemap.
  const res = await fetch(`${API}/newsroom/public/tags?limit=${limit}`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchPost(slug: string): Promise<PublicPost | null> {
  // ISR-cached so article pages serve fast/static to crawlers; the read count
  // may be up to REVALIDATE seconds stale (the increment itself still fires via
  // the client ViewPing).
  const res = await fetch(
    `${API}/newsroom/public/posts/${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}
