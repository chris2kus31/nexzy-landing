// Public Trends shapes (nexzy-api src/trends), shared by the /drops pages,
// the builder and the BFF. The product calls a trend a "drop" and what a
// person makes "a build"; the API keeps the word trend. Client-safe: no
// server imports.

export type TrendStep =
  | { kind: "pickGames"; min: number; max: number }
  | { kind: "rank" }
  | { kind: "tiers"; rows: string[] }
  | { kind: "reason"; per: "pick" | "entry"; maxLen: number; required: boolean }
  | { kind: "slider"; key: string; label: string; min: number; max: number }
  | { kind: "thisOrThat"; pairs: Array<[string, string]> };

export type TrendSourceKind =
  | "any"
  | "library"
  | "wishlist"
  | "list"
  | "filter";

export interface TrendCard {
  slug: string;
  hashtag: string;
  title: string;
  description: string;
  origin: string;
  featured: boolean;
  entryCount: number;
  entryCountToday: number;
  endsAt: string | null;
  covers: string[];
}

/** A card on /drops (GET /trends?surface=drops). */
export interface DropCard extends TrendCard {
  number: number;
  pickSize: number | null;
  startsAt: string | null;
  buildCount: number;
  phase: "live" | "soon" | "past";
}

export interface DropsPage {
  live: DropCard[];
  soon: DropCard[];
  past: DropCard[];
  totals: { builds: number; shares: number; matched: number };
  /** Player drops Admin put on the website (older APIs: absent). */
  players?: Array<DropCard & { startedBy: string | null }>;
}

/** A game page's "On 44% of #GameDNA builds". */
export interface GameDropShare {
  slug: string;
  hashtag: string;
  title: string;
  percent: number;
}

/** Who shares the picks of a build or an entry. `people` only when signed in. */
export interface DropMatches {
  picks: number;
  threshold: number;
  count: number;
  best: number;
  people: Array<{
    username: string;
    avatarUrl: string | null;
    overlap: number;
    postId: string;
    following: boolean;
  }>;
}

export interface BuildPick {
  id: string;
  name: string;
  slug: string | null;
  cover: string | null;
  badge: string | null;
  reason: string | null;
  hasPage?: boolean;
}

/** The site link of a picked game, only when the site has its page. */
export const gameHref = (g: { slug: string | null; hasPage?: boolean }) =>
  g.slug && g.hasPage ? `/games/${g.slug}` : null;

/** A website build saved for sharing (/drops/<slug>/b/<code>). */
export interface DropBuildPage {
  build: {
    code: string;
    images: { portrait?: string; tall?: string; link?: string } | null;
    createdAt: string;
  };
  picks: BuildPick[];
}

export interface TrendView extends Omit<TrendCard, "covers"> {
  id: string;
  /** Website builds saved for sharing (no account). */
  buildCount?: number;
  status: "live" | "ended";
  joinable: boolean;
  startsAt: string | null;
  steps: { v: number; steps: TrendStep[] };
  source: { kind: TrendSourceKind };
  theme: {
    accent?: string;
    background?: string;
    card?: string;
    cardGames?: string[];
  };
  startedBy: string | null;
  /** Player drops: on the website (listed and indexed). Older APIs: absent,
   *  read as on. */
  webVisible?: boolean;
  /** Share copy: {title}/{hashtag} filled in, {link} for the client. Older
   *  APIs: absent. */
  share?: { text: string; cta: string };
}

export interface TrendPick {
  gameId: string;
  name: string;
  slug: string | null;
  cover: string | null;
  count: number;
  percent: number;
  /** The site has a page for it (/games/<slug>); only then link it. */
  hasPage?: boolean;
}

/** The newest Nexzy piece for one game (Drops "Inside their 9"). */
export interface GameStory {
  title: string;
  /** Site path, e.g. /guides/<slug> or /games/<slug>/guide/<page>. */
  path: string;
  type: string;
  image: string | null;
  publishedAt: string | null;
}

/** Label shown above a story. */
export const STORY_LABEL: Record<string, string> = {
  article: "News",
  guide: "Guide",
  walkthrough: "Walkthrough",
  list: "List",
  review: "Review",
  rewind: "Rewind",
};

export interface TrendChoice {
  id: string;
  name: string;
  slug: string | null;
  cover: string | null;
  released: string | null;
}

/** A feed post row as the API returns it (only what the site uses). */
export interface TrendEntryRow {
  id: string;
  publishedAt: string;
  content: string;
  author: { id: string; username: string; avatarUrl: string | null };
  likeCount: number;
  commentCount: number;
  trend: {
    slug: string;
    hashtag: string;
    /** feed: 720 px for cards (newer entries); portrait: the 1080 px share
     *  file; link: the crawler preview. */
    images: {
      feed?: string;
      portrait: string;
      tall: string;
      link: string;
    } | null;
  } | null;
}

export interface TrendEntryPage {
  entry: TrendEntryRow;
  picks: BuildPick[];
}

/** What the web builder can do itself: pick games, optionally ranked. Any
 *  other step (tiers, this or that, sliders, a required reason) is app-only. */
export function webBuildable(t: TrendView): boolean {
  const steps = t.steps?.steps ?? [];
  return (
    steps.some((s) => s.kind === "pickGames") &&
    steps.every(
      (s) =>
        s.kind === "pickGames" ||
        s.kind === "rank" ||
        (s.kind === "reason" && !s.required),
    )
  );
}

export const pickRange = (t: TrendView) => {
  const p = t.steps.steps.find((s) => s.kind === "pickGames");
  return p && p.kind === "pickGames"
    ? { min: p.min, max: p.max }
    : { min: 1, max: 9 };
};

export const isRanked = (t: TrendView) =>
  t.steps.steps.some((s) => s.kind === "rank");

/** Share platforms and the visit tag each link carries (?s=). Must match
 *  SHARE_PLATFORMS / VISIT_SOURCES in nexzy-api trend-stats.service. */
export const VISIT_TAG: Record<string, string> = {
  instagram: "ig",
  tiktok: "tt",
  x: "x",
  facebook: "fb",
  threads: "th",
  copy: "link",
  other: "other",
};
export const VISIT_SOURCES = ["ig", "tt", "x", "fb", "th", "link", "other"];

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** A saved build's public code (nexzy-api trend-builds.service CODE_RE). */
export const BUILD_CODE_RE = /^[A-Za-z0-9]{6,12}$/;

/** Site paths for drops. */
export const dropPath = (slug: string) => `/drops/${slug}`;
export const buildPath = (slug: string, code: string) =>
  `/drops/${slug}/b/${code}`;
export const entryPath = (slug: string, postId: string) =>
  `/drops/${slug}/${postId}`;
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
