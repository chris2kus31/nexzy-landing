// Page titles that fit search results. The root layout adds " | Nexzy"
// (8 chars), and Bing flags titles over 70, so the page part stays at 62.
// Tries each option in order (longest, most descriptive first) and returns
// the first that fits; if none fits, cuts the last one on a whole word.
export const TITLE_MAX = 62;

export function fitTitle(options: string[], max = TITLE_MAX): string {
  const list = options.map((s) => s.trim()).filter(Boolean);
  const fit = list.find((s) => s.length <= max);
  if (fit) return fit;
  const s = list[list.length - 1] ?? "";
  const cut = s.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  const out = at > max * 0.6 ? cut.slice(0, at) : s.slice(0, max);
  return out.replace(/[\s\-\u2013\u2014:|,(]+$/, "");
}
