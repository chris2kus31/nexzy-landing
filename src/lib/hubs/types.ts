// Phase 1 mega hub shapes (mirror nexzy-api src/game-profile/game-profile.types.ts).

export const HUB_MODULES = [
  "countdown",
  "dayOne",
  "trailers",
  "scores",
  "facts",
  "predict",
  "editions",
  "faq",
] as const;
export type HubModule = (typeof HUB_MODULES)[number];
export type HubModules = Record<HubModule, boolean>;

// Lifecycle: pre-launch / launch window / evergreen. The API decides the
// phase and what shows in it (profile.phase / profile.show); this site only
// renders it. Mirrors game-profile.types.ts (keep in lockstep).
export const HUB_PHASES = ["pre", "launch", "evergreen"] as const;
export type HubPhase = (typeof HUB_PHASES)[number];

export const HUB_SECTIONS = [
  ...HUB_MODULES,
  "thread",
  "shortVersion",
  "rooms",
  "players",
] as const;
export type HubSection = (typeof HUB_SECTIONS)[number];

/** The app's hub tiles, in their default order (Admin can reorder). */
export const HUB_TILES = [
  "rooms",
  "thread",
  "predict",
  "scores",
  "shortVersion",
  "players",
] as const;
export type HubTile = (typeof HUB_TILES)[number];

export interface HubLifecycle {
  windowDays: number;
  override: HubPhase | null;
  statusLine: string | null;
  tileOrder: HubTile[];
  phases: Record<HubSection, HubPhase[]>;
}

export const FACT_SECTIONS = [
  "release",
  "platforms",
  "price",
  "setting",
  "story",
  "characters",
  "gameplay",
  "multiplayer",
  "other",
] as const;
export type FactSection = (typeof FACT_SECTIONS)[number];

export const FACT_STATUSES = ["confirmed", "reported", "leaked"] as const;
export type FactStatus = (typeof FACT_STATUSES)[number];

export interface HubFact {
  id: string;
  section: FactSection;
  label: string;
  value: string;
  status: FactStatus;
  sourceName: string;
  sourceUrl: string;
  updatedOn?: string;
}
export interface HubFaq {
  id: string;
  q: string;
  a: string;
}
export interface HubEdition {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  includes: string[];
  url: string | null;
}
export interface HubLink {
  label: string;
  url: string;
}

export const PREDICTION_BANDS = ["elite", "great", "good", "low"] as const;
export type PredictionBand = (typeof PREDICTION_BANDS)[number];
export const BAND_INFO: Record<
  PredictionBand,
  { score: string; label: string }
> = {
  elite: { score: "9.5+", label: "Masterpiece" },
  great: { score: "8.5 - 9.4", label: "Great" },
  good: { score: "7 - 8.4", label: "Good, not GOAT" },
  low: { score: "Under 7", label: "Overhyped" },
};

export const DAY_ONE_PLATFORMS = [
  "ps5",
  "xbox",
  "switch",
  "switch2",
  "pc",
] as const;
export type DayOnePlatform = (typeof DAY_ONE_PLATFORMS)[number];

export const HUB_EDITORS = ["Chuy", "Eli", "Leslie"] as const;

export type PredictionTally = Record<PredictionBand, number> & {
  total: number;
};

export interface HubLive {
  dayOne: number;
  predictions: PredictionTally;
  locked: boolean;
}
export interface HubMe {
  dayOne: boolean;
  platform: DayOnePlatform | null;
  prediction: PredictionBand | null;
}

/** Admin "Look and colors", resolved by the API (every field filled).
 *  Only the fields the website paints are typed; the app uses more. */
export interface HubThemeColors {
  accent: string;
  onAccent: string;
  accentSoft: string;
  accentLine: string;
  glow: string;
  live: string;
  onLive: string;
}

export interface HubProfile {
  headline: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  summary: string | null;
  aliases: string[];
  publisher: string | null;
  officialLinks: HubLink[];
  editor: string | null;
  launchAt: string | null;
  launchNote: string | null;
  modules: HubModules;
  facts: HubFact[];
  faqs: HubFaq[];
  editions: HubEdition[];
  factsUpdatedAt: string | null;
  /** Pinned @nexzyofficial launch-night post (null = none). */
  launchThreadPostId: string | null;
  live: HubLive;
  /** null / absent = the Nexzy gold look (every component's fallback). */
  theme?: HubThemeColors | null;
  /** Lifecycle (absent on an older API: render as before, from modules). */
  lifecycle?: HubLifecycle;
  phase?: HubPhase;
  phaseEndsAt?: string | null;
  /** What shows in the current phase (module switch + phase). */
  show?: Record<HubSection, boolean>;
}

/** What this hub shows right now. The API's `show` (phase-aware); an older
 *  API without it falls back to the module switches, i.e. today's page. */
export function hubShows(p: HubProfile): Record<HubSection, boolean> {
  if (p.show) return p.show;
  return {
    ...p.modules,
    thread: !!p.launchThreadPostId,
    shortVersion: !!p.summary?.trim(),
    rooms: true,
    players: true,
  };
}

/** Section -> the question heading readers (and AI answers) ask. */
export function sectionQuestion(section: FactSection, game: string): string {
  switch (section) {
    case "release":
      return `When does ${game} come out?`;
    case "platforms":
      return `What platforms is ${game} on?`;
    case "price":
      return `How much does ${game} cost?`;
    case "setting":
      return `Where is ${game} set?`;
    case "story":
      return `What is ${game} about?`;
    case "characters":
      return `Who are the characters in ${game}?`;
    case "gameplay":
      return `What's new in ${game} gameplay?`;
    case "multiplayer":
      return `Does ${game} have multiplayer or co-op?`;
    default:
      return `What else do we know about ${game}?`;
  }
}

/** Hub dates are Eastern Time (US launches), on the server and in the
 *  browser alike, so a midnight-ET launch never reads as the day before and
 *  hydration never mismatches. */
export const HUB_TZ = "America/New_York";

export function fmtHubDate(iso: string, withTime = false): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: HUB_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime
      ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" }
      : {}),
  });
}
