// Shared beat metadata for the News page (labels + accent colors).
export interface Beat {
  key: string;
  label: string;
  colorPalette: string; // Chakra colorPalette
}

export const BEATS: Beat[] = [
  { key: "game_news", label: "Game News", colorPalette: "blue" },
  { key: "console_hardware", label: "Hardware", colorPalette: "purple" },
  { key: "game_movies_tv", label: "Movies & TV", colorPalette: "pink" },
  { key: "deals", label: "Deals", colorPalette: "green" },
  { key: "patch_notes", label: "Patch Notes", colorPalette: "orange" },
  { key: "reviews", label: "Reviews", colorPalette: "teal" },
];

/**
 * The beats the newsroom pipeline can actually research (Run pipeline,
 * Commission -> News). Mirrors the API's NEWSROOM_BEATS (researcher.service.ts
 * BEAT_QUERIES) — Patch Notes / Reviews are display beats only and would 400.
 */
const PIPELINE_BEAT_KEYS = [
  "game_news",
  "console_hardware",
  "game_movies_tv",
  "deals",
] as const;

export const PIPELINE_BEATS: Beat[] = BEATS.filter((b) =>
  (PIPELINE_BEAT_KEYS as readonly string[]).includes(b.key),
);

export function beatLabel(key: string): string {
  return BEATS.find((b) => b.key === key)?.label ?? key;
}

export function beatPalette(key: string): string {
  return BEATS.find((b) => b.key === key)?.colorPalette ?? "blue";
}
