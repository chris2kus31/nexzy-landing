// Public Trends shapes (nexzy-api src/trends), shared by the /trends and /t/
// pages, the builder and the BFF. Client-safe: no server imports.

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

export interface TrendView extends Omit<TrendCard, "covers"> {
  id: string;
  status: "live" | "ended";
  joinable: boolean;
  startsAt: string | null;
  steps: { v: number; steps: TrendStep[] };
  source: { kind: TrendSourceKind };
  theme: { accent?: string; background?: string; card?: string };
  startedBy: string | null;
}

export interface TrendPick {
  gameId: string;
  name: string;
  slug: string | null;
  cover: string | null;
  count: number;
  percent: number;
}

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
    images: { portrait: string; tall: string; link: string } | null;
  } | null;
}

export interface TrendEntryPage {
  entry: TrendEntryRow;
  picks: Array<{
    id: string;
    name: string;
    slug: string | null;
    cover: string | null;
    badge: string | null;
    reason: string | null;
  }>;
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
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
