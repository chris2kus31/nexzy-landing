/**
 * Per-writer verdict tiers — the PUBLIC face of a review's 1–10 score, in each
 * writer's voice. Mirrors the API's verdictFor (nexzy-api review-voice.ts) —
 * keep the two in sync (they collapse into one when verdicts move to the DB).
 * Bands: 9–10, 7–8, 5–6, 3–4, 1–2.
 */
const LADDERS: Record<
  string,
  readonly [string, string, string, string, string]
> = {
  Chuy: [
    "Worth the Late Fee",
    "Friday Night Pick",
    "Weekend Rental",
    "Wait for the Discount Bin",
    "Put It Back",
  ],
  Leslie: [
    "Instant Obsession",
    "Bump It Up Your List",
    "Cozy Night In",
    "Only If You're Bored",
    "Ghost It",
  ],
  Bana: [
    "Ain't No Way It's This Good",
    "Super Fun, Go For It",
    "Pretty Fun, Honestly",
    "Eh, It's Okay",
    "Maybe Sit This One Out",
  ],
};

/** Map a 1–10 rating to the author's signature verdict tier label. */
export function verdictTierFor(
  author: string | null | undefined,
  rating: number,
): string {
  const ladder = LADDERS[author ?? ""] ?? LADDERS.Chuy;
  const r = Math.max(1, Math.min(10, Math.round(Number(rating) || 0)));
  const idx = r >= 9 ? 0 : r >= 7 ? 1 : r >= 5 ? 2 : r >= 3 ? 3 : 4;
  return ladder[idx];
}
