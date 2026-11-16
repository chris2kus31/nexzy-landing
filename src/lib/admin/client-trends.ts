// Admin client for Trends (Phase 2): the Trends tab (list, editor with the
// server-rendered live preview, stats). Same-origin proxy via adminRequest.
// Shapes mirror nexzy-api src/trends (trends.service + trend-steps).
"use client";

import { adminRequest } from "@/lib/admin/client";

export type TrendStatus = "draft" | "live" | "ended" | "removed";
export type TrendShape = "portrait" | "tall" | "link";

export type TrendStep =
  | { kind: "pickGames"; min: number; max: number }
  | { kind: "rank" }
  | { kind: "tiers"; rows: string[] }
  | { kind: "reason"; per: "pick" | "entry"; maxLen: number; required: boolean }
  | { kind: "slider"; key: string; label: string; min: number; max: number }
  | { kind: "thisOrThat"; pairs: Array<[string, string]> };

export interface TrendSteps {
  v: 1;
  steps: TrendStep[];
}

export type TrendSource =
  | { kind: "any" }
  | { kind: "library" }
  | { kind: "wishlist" }
  | { kind: "list"; gameIds: string[] }
  | {
      kind: "filter";
      parentPlatform?: string;
      genre?: string;
      yearFrom?: number;
      yearTo?: number;
      query?: string;
    };

export interface TrendTheme {
  accent?: string;
  background?: string;
  card?: string;
  /** Up to 3 game ids for the drop's card on /drops until people pick. */
  cardGames?: string[];
}

export interface AdminTrend {
  id: string;
  slug: string;
  hashtag: string;
  hashtagDisplay: string;
  title: string;
  description: string;
  status: TrendStatus;
  origin: "official" | "user";
  startsAt: string | null;
  endsAt: string | null;
  featured: boolean;
  sortWeight: number;
  steps: TrendSteps;
  source: TrendSource;
  theme: TrendTheme;
  entryCount: number;
  entryCountToday: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTrendList {
  data: AdminTrend[];
  today: { posts: number; shares: number; visits: number };
}

export interface TrendGameLite {
  id: string;
  name: string;
  backgroundImage: string | null;
}

/** What the editor sends on create / update (the API validates all of it). */
export interface TrendInput {
  slug: string;
  hashtag: string;
  title: string;
  description: string;
  steps: TrendSteps;
  source: TrendSource;
  theme: TrendTheme;
  startsAt: string | null;
  endsAt: string | null;
  featured: boolean;
  sortWeight: number;
  status?: "draft" | "live";
}

export interface TrendStatDay {
  day: string;
  views: number;
  tryTaps: number;
  builds: number;
  posts: number;
  downloads: number;
  shares: Record<string, number>;
  visits: Record<string, number>;
}

export interface TrendCompareSide {
  posts: number;
  views: number;
  hearts: number;
  replies: number;
}

export interface AdminTrendStats {
  trend: AdminTrend;
  days: TrendStatDay[];
  engagement: {
    entries: number;
    people: number;
    hearts: number;
    replies: number;
    views: number;
  };
  picks: Array<TrendGameLite & { count: number }>;
  compare: { entries: TrendCompareSide; posts: TrendCompareSide };
}

const enc = encodeURIComponent;

export const listTrends = () => adminRequest<AdminTrendList>("trends");

export const getTrend = (id: string) =>
  adminRequest<{
    trend: AdminTrend;
    listGames: TrendGameLite[];
    cardGames?: TrendGameLite[];
  }>(`trends/${enc(id)}`);

export const createTrend = (body: TrendInput) =>
  adminRequest<AdminTrend>("trends", { method: "POST", body });

export const updateTrend = (id: string, body: Partial<TrendInput>) =>
  adminRequest<AdminTrend>(`trends/${enc(id)}`, { method: "PUT", body });

export const setTrendStatus = (id: string, status: TrendStatus) =>
  adminRequest<AdminTrend>(`trends/${enc(id)}/status`, {
    method: "POST",
    body: { status },
  });

export const getTrendStats = (id: string, days: number) =>
  adminRequest<AdminTrendStats>(`trends/${enc(id)}/stats?days=${days}`);

/** Server render of the trend's look with sample games (a data URL). */
export const previewTrend = (
  body: {
    shape: TrendShape;
    hashtag: string;
    title: string;
    slug: string;
    theme: TrendTheme;
    count: number;
    ranked: boolean;
  },
  signal?: AbortSignal,
) =>
  adminRequest<{ image: string }>("trends/preview", {
    method: "POST",
    body,
    signal,
  });
