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
export const BAND_INFO: Record<PredictionBand, { score: string; label: string }> =
  {
    elite: { score: "9.5+", label: "Masterpiece" },
    great: { score: "8.5 - 9.4", label: "Great" },
    good: { score: "7 - 8.4", label: "Good, not GOAT" },
    low: { score: "Under 7", label: "Overhyped" },
  };

export const DAY_ONE_PLATFORMS = ["ps5", "xbox", "switch", "switch2", "pc"] as const;
export type DayOnePlatform = (typeof DAY_ONE_PLATFORMS)[number];

export const HUB_EDITORS = ["Chuy", "Eli", "Leslie"] as const;

export type PredictionTally = Record<PredictionBand, number> & { total: number };

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
  live: HubLive;
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
    ...(withTime ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" } : {}),
  });
}
