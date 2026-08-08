// Era-adaptive helpers for the Rewind pages. The page's accent + label shift
// with the year, and the THEN-vs-NOW segment only appears for physical-media
// launches. A light lookup for now — Phase 4 refines it into a fuller table.

export interface EraInfo {
  label: string;
  accent: string;
}

export function eraForYear(year: number | null | undefined): EraInfo {
  if (!year) return { label: "FROM THE VAULT", accent: "#f5b53d" };
  if (year <= 1989) return { label: "8/16-BIT ERA", accent: "#e8402a" };
  if (year <= 1999) return { label: "16/32-BIT ERA", accent: "#e8642a" };
  if (year <= 2005) return { label: "6TH-GEN ERA", accent: "#c0c4cc" };
  if (year <= 2012) return { label: "HD ERA", accent: "#5cc8ff" };
  return { label: "MODERN ERA", accent: "#28d3c8" };
}

export function yearsAgo(year: number | null | undefined): number | null {
  if (!year) return null;
  return new Date().getFullYear() - year;
}

/** The "vault" display device for the era — evolves from wood CRT to a panel. */
export type EraDevice = "crt-wood" | "crt-flat" | "modern";

export function deviceForYear(year: number | null | undefined): EraDevice {
  if (!year) return "crt-flat";
  if (year <= 1995) return "crt-wood"; // cartridge era — wood-grain tube TV
  if (year <= 2007) return "crt-flat"; // disc era — dark plastic CRT
  return "modern"; // download era — sleek panel
}

/** THEN vs NOW — a physical-media contrast, only for pre-2013 launches. */
export function thenNow(
  year: number | null | undefined,
  category: string | null | undefined,
): { then: string[]; now: string[] } | null {
  if (!year || year > 2012) return null;
  if (
    category !== "game_launch" &&
    category !== "hardware_launch" &&
    category !== "console"
  ) {
    return null;
  }
  const then =
    year <= 1995
      ? [
          "A printed manual + lore",
          "A fold-out map or poster",
          "Cheat codes on paper",
          "Blowing on the cartridge",
          "It was yours — forever",
        ]
      : [
          "A printed manual",
          "Cover art you framed",
          "A jewel-case disc",
          "No day-one patch",
          "It was yours — forever",
        ];
  return {
    then,
    now: [
      "A big download",
      "A day-one patch",
      '"Access," not ownership',
      "Gone when the license ends",
    ],
  };
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** "august-14" -> { month: 8, day: 14 }. Also accepts "8-14". Null if invalid. */
export function parseDateSlug(
  slug: string,
): { month: number; day: number } | null {
  const m = slug.toLowerCase().match(/^([a-z]+|\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const monthPart = m[1];
  const day = parseInt(m[2], 10);
  let month: number;
  if (/^\d+$/.test(monthPart)) month = parseInt(monthPart, 10);
  else month = MONTHS.indexOf(monthPart) + 1;
  if (!month || month < 1 || month > 12 || !day || day < 1 || day > 31) {
    return null;
  }
  return { month, day };
}

/** { month: 8, day: 14 } -> "august-14" (pretty, SEO-friendly day-hub slug). */
export function dateSlug(month: number, day: number): string {
  return `${MONTHS[month - 1] ?? month}-${day}`;
}

export function monthName(month: number): string {
  return (MONTHS[month - 1] ?? "").replace(/^./, (c) => c.toUpperCase());
}
