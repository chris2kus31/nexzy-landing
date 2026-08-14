// Server-side fetch helpers for the public newsroom API. These hit nexzy-api's
// unauthenticated /newsroom/public endpoints and are safe to call from server
// components (SSR/SEO).
import "server-only";
import type { TagInfo } from "./tags";

const API = process.env.NEWSROOM_API_URL || "http://localhost:3003";

/** One embedded video in an article's media gallery (multi-video support). */
export interface ArticleMedia {
  type: "youtube";
  url: string;
  videoId: string;
  title?: string | null;
  thumbnailUrl?: string | null;
  caption?: string | null;
  featured?: boolean;
  source?: "manual" | "auto-finder";
  order?: number;
}

export interface PublicPost {
  slug: string;
  title: string;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  bodyMarkdown?: string;
  // The answer-first lede ("the short version"). Null on legacy rows; the
  // article page renders the AnswerCapsule only when present.
  answerCapsule?: string | null;
  heroImageUrl: string | null;
  appImageUrl: string | null;
  imageAlt: string | null;
  imageCredit: string | null;
  youtubeUrl: string | null;
  // Full video list (detail views); falls back to a single youtubeUrl item.
  media?: ArticleMedia[];
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
  // Reviews only: the score + what's reviewed (star UI + Review JSON-LD).
  review?: {
    rating: number;
    ratingScale: number;
    verdictLine: string | null;
    itemReviewed: { type: string; name: string } | null;
    verdictTier?: string;
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

/** Reviews index (game adaptations — movies/TV — with a score). Newest first. */
export async function fetchReviews(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PostList> {
  return fetchPosts({ ...params, type: "review" });
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

export interface RelatedByGame {
  game: { name: string; slug: string } | null;
  items: PublicPost[];
}

export async function fetchRelatedByGame(
  slug: string,
  limit = 4,
): Promise<RelatedByGame> {
  // Cross-type "More on <game>" module: other Nexzy content for this post's
  // game(s) + the game for the heading/hub link. Pillar->cluster internal links.
  const res = await fetch(
    `${API}/newsroom/public/posts/${encodeURIComponent(slug)}/related-by-game?limit=${limit}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) return { game: null, items: [] };
  return res.json();
}

export interface AuthorProfile {
  name: string;
  slug: string;
  bio: string | null;
  title: string | null;
  avatarUrl: string | null;
  socials: Record<string, string> | null;
  nowPlaying: string[] | null;
  beats: string[] | null;
}

/** Public author profile from the DB persona (bio/role/now-playing/socials). */
export async function fetchAuthorProfile(
  slug: string,
): Promise<AuthorProfile | null> {
  try {
    const res = await fetch(
      `${API}/newsroom/public/authors/${encodeURIComponent(slug)}`,
      { next: { revalidate: REVALIDATE } },
    );
    if (!res.ok) return null;
    // The endpoint returns an empty body when there's no matching persona (or
    // before the nowPlaying migration runs) — tolerate that, don't crash.
    const text = await res.text();
    return text ? (JSON.parse(text) as AuthorProfile) : null;
  } catch {
    return null;
  }
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

// ---------- Rewind ("on this day" series) ----------

export interface RewindEpisode {
  slug: string;
  title: string;
  seoTitle: string | null;
  excerpt: string | null;
  seoDescription: string | null;
  bodyMarkdown?: string;
  heroImageUrl: string | null;
  imageAlt: string | null;
  imageCredit: string | null;
  author: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  tags: string[];
  youtubeUrl: string | null;
  videoUrls: string[];
  event: {
    year: number | null;
    month: number;
    day: number;
    category: string;
    region: string;
    canonicalTitle: string;
  } | null;
  spec?: {
    platforms: string[];
    genres: string[];
    esrb: string | null;
    gameSlug: string | null;
    released: string | null;
    screenshots: string[];
    publisher: string | null;
    developer: string | null;
    players: string | null;
    features: string[] | null;
    historicalNote: string | null;
  } | null;
}

export interface RewindTimelineItem {
  title: string;
  year: number | null;
  category: string;
  weight: number;
  verified: boolean;
  region: string;
  slug: string | null;
  image?: string | null;
}

export interface RewindDayHub {
  month: number;
  day: number;
  episodes: RewindEpisode[];
  timeline: RewindTimelineItem[];
}

export async function fetchRewindEpisode(
  slug: string,
): Promise<RewindEpisode | null> {
  const res = await fetch(
    `${API}/rewind/public/episode/${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as RewindEpisode) : null;
}

export async function fetchRewindDay(
  month: number,
  day: number,
): Promise<RewindDayHub | null> {
  const res = await fetch(`${API}/rewind/public/day/${month}/${day}`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as RewindDayHub) : null;
}

export interface RewindRecentItem {
  slug: string;
  title: string;
  excerpt: string | null;
  image: string | null;
  year: number | null;
  month: number | null;
  day: number | null;
}

export async function fetchRewindRecent(
  limit = 12,
): Promise<RewindRecentItem[]> {
  const res = await fetch(`${API}/rewind/public/recent?limit=${limit}`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return [];
  const text = await res.text();
  return text ? (JSON.parse(text) as RewindRecentItem[]) : [];
}

export async function fetchRewindToday(): Promise<RewindEpisode | null> {
  const res = await fetch(`${API}/rewind/public/today`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as RewindEpisode) : null;
}

export async function fetchRewindSlugs(): Promise<
  { slug: string; updatedAt: string | null }[]
> {
  const res = await fetch(`${API}/rewind/public/slugs`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return [];
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export async function fetchRewindDays(): Promise<
  { month: number; day: number }[]
> {
  const res = await fetch(`${API}/rewind/public/days`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return [];
  const text = await res.text();
  return text ? JSON.parse(text) : [];
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
export interface GameHubVideo {
  id: string | null;
  source: "nexzy" | "external" | "article" | "rawg";
  title: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
  thumbnailUrl: string | null;
  platformLinks: Record<string, string> | null;
  isShort: boolean;
  postSlug?: string | null;
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
  videos: GameHubVideo[];
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

/** Every game that has a public hub (>=1 published linked content). Full list
 *  (no paging) — used by the sitemap, which needs every game. */
export async function fetchGamesWithContent(): Promise<GameWithContent[]> {
  const res = await fetch(`${API}/newsroom/public/games`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return [];
  return res.json();
}

export interface GamesPage {
  items: GameWithContent[];
  total: number;
  page: number;
  pageSize: number;
}

/** A single page of game hubs (sorted by coverage) for the paginated /games grid. */
export async function fetchGamesPage(
  page = 1,
  pageSize = 60,
): Promise<GamesPage> {
  const res = await fetch(
    `${API}/newsroom/public/games?page=${page}&pageSize=${pageSize}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) return { items: [], total: 0, page, pageSize };
  return res.json();
}

// ---- Newsroom videos (Phase 5): standalone /videos hub + detail ----
export interface PublicVideo {
  slug: string;
  title: string;
  caption: string | null;
  thumbnailUrl: string | null;
  youtubeUrl: string | null;
  youtubeId: string | null;
  isShort: boolean;
  platformLinks: Record<string, string> | null;
  source: "nexzy" | "external";
  featured: boolean;
  tags: string[];
  viewCount: number;
  publishedAt: string | null;
  updatedAt: string | null;
  // Primary linked game (for the "For <game>" chip + hub link). null if none.
  game: { name: string; slug: string; backgroundImage: string | null } | null;
}

export interface VideoList {
  items: PublicVideo[];
  total: number;
  page: number;
  pageSize: number;
}

/** Published videos for the /videos hub. Nexzy-first, then newest. Paginated. */
export async function fetchVideos(params?: {
  page?: number;
  pageSize?: number;
  sort?: "latest" | "trending";
}): Promise<VideoList> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  if (params?.sort) q.set("sort", params.sort);
  const qs = q.toString();
  const res = await fetch(
    `${API}/newsroom/public/videos${qs ? `?${qs}` : ""}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok)
    return {
      items: [],
      total: 0,
      page: params?.page || 1,
      pageSize: params?.pageSize || 24,
    };
  return res.json();
}

/** A single published video by slug. null when not found/unpublished. */
export async function fetchVideo(slug: string): Promise<PublicVideo | null> {
  const res = await fetch(
    `${API}/newsroom/public/videos/${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

/**
 * Newest videos for the home "latest & featured" rail. The API already ranks
 * Nexzy content first, so this is Nexzy-first then newest.
 */
export async function fetchVideosLatest(limit = 3): Promise<PublicVideo[]> {
  const { items } = await fetchVideos({ page: 1, pageSize: limit });
  return items;
}

export interface VideoSitemapRef {
  slug: string;
  updatedAt: string | null;
}

/** Every published video slug + updatedAt, for the sitemap (one round-trip). */
export async function fetchVideosForSitemap(): Promise<VideoSitemapRef[]> {
  const res = await fetch(`${API}/newsroom/public/videos-sitemap`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return [];
  return res.json();
}
