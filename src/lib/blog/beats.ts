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
];

export function beatLabel(key: string): string {
  return BEATS.find((b) => b.key === key)?.label ?? key;
}

export function beatPalette(key: string): string {
  return BEATS.find((b) => b.key === key)?.colorPalette ?? "blue";
}
