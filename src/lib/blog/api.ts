// Server-side fetch helpers for the public newsroom API. These hit nexzy-api's
// unauthenticated /newsroom/public endpoints and are safe to call from server
// components (SSR/SEO).
import "server-only";

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
  beat: string;
  tags: string[];
  sources: { name: string; url: string }[];
  author: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  viewCount: number;
  featured: boolean;
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
}): Promise<PostList> {
  const q = new URLSearchParams();
  if (params?.beat) q.set("beat", params.beat);
  if (params?.q) q.set("q", params.q);
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  const qs = q.toString();

  const res = await fetch(`${API}/newsroom/public/posts${qs ? `?${qs}` : ""}`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) {
    return { items: [], total: 0, page: 1, pageSize: 20 };
  }
  return res.json();
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
