// Nexzy Players ratings (Phase 2). Mirrors nexzy-api
// src/game-reviews/game-reviews.constants.ts + review-score.util.ts and the
// public shapes in game-reviews.service.ts. Keep in lockstep.

export const CRITERIA = [
  { key: "fun", label: "Fun", hint: "How fun is it to actually play?" },
  { key: "performance", label: "Performance", hint: "Frame rate, bugs, load times" },
  { key: "value", label: "Value", hint: "Worth what you paid?" },
  { key: "presentation", label: "Look and sound", hint: "Visuals, audio, style" },
  { key: "story", label: "Story", hint: "Skip it if the game has none" },
] as const;
export type CriterionKey = (typeof CRITERIA)[number]["key"];

const WEIGHTS: Record<CriterionKey, number> = {
  fun: 0.35,
  performance: 0.2,
  value: 0.15,
  presentation: 0.15,
  story: 0.15,
};

export const REVIEW_PLATFORMS = [
  { key: "ps5", label: "PS5" },
  { key: "xbox", label: "Xbox" },
  { key: "switch", label: "Switch" },
  { key: "switch2", label: "Switch 2" },
  { key: "pc", label: "PC" },
  { key: "other", label: "Other" },
] as const;
export type ReviewPlatform = (typeof REVIEW_PLATFORMS)[number]["key"];

export const HOURS_BUCKETS = [
  { key: "lt2", label: "Under 2h" },
  { key: "2to10", label: "2-10h" },
  { key: "10to30", label: "10-30h" },
  { key: "30plus", label: "30h+" },
] as const;
export type HoursBucket = (typeof HOURS_BUCKETS)[number]["key"];

export const REVIEW_BODY_MAX = 2000;
/** The API rejects a submit sooner than this after the form opened. */
export const MIN_FORM_MS = 8000;

export interface ReviewCriteria {
  fun: number;
  performance: number;
  value: number;
  presentation: number;
  story: number | null;
}

/** One review's 1..10 score (same math as the API; preview only). */
export function previewScore(c: ReviewCriteria): number {
  const toTen = (v: number) => 1 + ((v - 1) * 9) / 4;
  const w = { ...WEIGHTS };
  if (c.story == null) {
    w.fun += w.story;
    w.story = 0;
  }
  const total =
    w.fun * toTen(c.fun) +
    w.performance * toTen(c.performance) +
    w.value * toTen(c.value) +
    w.presentation * toTen(c.presentation) +
    (c.story == null ? 0 : w.story * toTen(c.story));
  return Math.round(total * 10) / 10;
}

export interface HubScores {
  open: boolean;
  opensAt: string | null;
  critics: { score: number | null; count: number | null; source: "IGDB" };
  players: {
    score: number | null;
    count: number;
    needed: number;
    distribution: number[];
    frozen: boolean;
    recommended: boolean;
    split: boolean;
  };
  settled: { score: number; at: string; band: string } | null;
}

export interface HubReview {
  id: string;
  score: number;
  criteria: ReviewCriteria;
  platform: ReviewPlatform;
  hours: HoursBucket;
  body: string | null;
  createdAt: string;
  edited: boolean;
  state: "counted" | "held" | "team";
  dayOne: boolean;
  author: { username: string; avatarUrl: string | null } | null;
}

export interface HubReviewPage {
  items: HubReview[];
  nextCursor: string | null;
}

export type ReviewBlockReason =
  | "not_open"
  | "not_verified"
  | "removed"
  | "account_too_new"
  | "not_in_library"
  | "scores_off";

export interface MyReviewState {
  review: (HubReview & { status: string; holdReason: string | null }) | null;
  canReview: boolean;
  reason: ReviewBlockReason | null;
  calledIt: boolean | null;
}

export const platformLabel = (k: string) =>
  REVIEW_PLATFORMS.find((p) => p.key === k)?.label ?? k;
export const hoursLabel = (k: string) =>
  HOURS_BUCKETS.find((h) => h.key === k)?.label ?? k;
