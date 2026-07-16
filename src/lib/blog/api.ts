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
  faq?: { q: string; a: string }[] | null;
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

/**
 * Newest published guides + walkthroughs + lists, merged newest-first, for the
 * home "From the library" rail. Combined so the rail looks full while each type
 * is still small; graduates into its own section as the library grows.
 */
export async function fetchLibraryLatest(limit = 3): Promise<PublicPost[]> {
  const [guides, lists, walkthroughs] = await Promise.all([
    fetchGuides({ pageSize: limit }),
    fetchLists({ pageSize: limit }),
    fetchWalkthroughs({ pageSize: limit }),
  ]);
  const all = [...guides.items, ...lists.items, ...walkthroughs.items];
  all.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
  return all.slice(0, limit);
}

// ---- Daily "Gaming Nostalgia" spotlight (from the personalization system) ----
export interface NostalgiaSpotlight {
  gameName: string;
  content: string;
  image: string | null;
}

/**
 * Today's nostalgia fact for the home newsroom lead. Public endpoint on the
 * games API; returns null when there's no fact for today (the block then falls
 * back to the featured article). Kept out of the newsroom path on purpose.
 */
export async function fetchNostalgia(): Promise<NostalgiaSpotlight | null> {
  try {
    const res = await fetch(`${API}/games/nostalgia/today`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const fact = json?.data;
    if (!fact || !fact.content) return null;
    return {
      gameName: fact.game?.name ?? "",
      content: fact.content,
      image: fact.game?.backgroundImage ?? null,
    };
  } catch {
    return null;
  }
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

// ---- Walkthroughs (Phase 7b) ----
export interface WalkthroughChapterRef {
  slug: string;
  chapterSlug: string;
  title: string;
  order: number;
}
export interface WalkthroughOverview {
  walkthrough: PublicPost;
  chapters: WalkthroughChapterRef[];
}
export interface WalkthroughChapterResponse {
  walkthrough: { slug: string; title: string };
  chapter: PublicPost;
  chapters: WalkthroughChapterRef[];
  prev: WalkthroughChapterRef | null;
  next: WalkthroughChapterRef | null;
}

/** Walkthrough hub — published overviews, newest first. */
export async function fetchWalkthroughs(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PostList> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  const qs = q.toString();
  const res = await fetch(
    `${API}/newsroom/public/walkthroughs${qs ? `?${qs}` : ""}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok)
    return {
      items: [],
      total: 0,
      page: params?.page || 1,
      pageSize: params?.pageSize || 18,
    };
  return res.json();
}

/** A walkthrough overview + its ordered chapter list. */
export async function fetchWalkthrough(
  slug: string,
): Promise<WalkthroughOverview | null> {
  const res = await fetch(
    `${API}/newsroom/public/walkthroughs/${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) return null;
  return res.json();
}

/** A single walkthrough chapter + prev/next + the sibling list. */
export async function fetchChapter(
  slug: string,
  chapterSlug: string,
): Promise<WalkthroughChapterResponse | null> {
  const res = await fetch(
    `${API}/newsroom/public/walkthroughs/${encodeURIComponent(slug)}/${encodeURIComponent(chapterSlug)}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) return null;
  return res.json();
}

export interface WalkthroughChapterSitemapRef {
  path: string;
  updatedAt: string | null;
}

/** Flat list of every walkthrough chapter URL, for the sitemap (one round-trip). */
export async function fetchWalkthroughChapters(): Promise<
  WalkthroughChapterSitemapRef[]
> {
  const res = await fetch(`${API}/newsroom/public/walkthrough-chapters`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return [];
  return res.json();
}

// ---- Game hubs ----
export interface GameHubItem {
  slug: string;
  title: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  type: string;
  publishedAt: string | null;
  path: string;
}
export interface GameHub {
  game: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    backgroundImage: string | null;
    released: string | null;
    esrbRating: string | null;
    platforms: string[];
    genres: string[];
    clipUrl: string | null;
    screenshots: string[];
  };
  content: {
    news: GameHubItem[];
    guides: GameHubItem[];
    walkthroughs: GameHubItem[];
    lists: GameHubItem[];
  };
  counts: {
    guides: number;
    walkthroughs: number;
    lists: number;
    news: number;
    total: number;
  };
}
export interface GameWithContent {
  slug: string;
  name: string;
  backgroundImage: string | null;
  released: string | null;
  count: number;
  updatedAt: string | null;
}

/** A game's public hub (basics + all its published content). null if none. */
export async function fetchGameHub(slug: string): Promise<GameHub | null> {
  const res = await fetch(
    `${API}/newsroom/public/games/${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) return null;
  return res.json();
}

/** Every game that has a public hub (>=1 published linked content). */
export async function fetchGamesWithContent(): Promise<GameWithContent[]> {
  const res = await fetch(`${API}/newsroom/public/games`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return [];
  return res.json();
}
