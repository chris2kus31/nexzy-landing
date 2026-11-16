// Drops look (approved mockups, boards 21-22): Nexzy navy, yellow for the
// action, blue for what's coming and app-only things, Chakra Petch (the
// "title" font token) for drop tags and numbers.
export const D = {
  base: "#10132E",
  panel: "#1A1F47",
  line: "#2C3370",
  yellow: "#FFD24A",
  blue: "#3B6BFF",
  blueSoft: "#9DB4FF",
  white: "#F4F5FA",
  muted: "#8E95C2",
  dim: "#B8BEDB",
  green: "#5BE08A",
} as const;

export const num = (n: number) => n.toLocaleString("en-US");

/** "Ends Dec 14" / "Drops Dec 1" in US Central (the newsroom's clock). */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}
