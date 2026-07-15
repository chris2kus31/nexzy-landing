// Compact read-count formatting: 950 -> "950", 1200 -> "1.2k", 3_400_000 -> "3.4M".
export function formatCount(n: number): string {
  if (!n || n < 0) return "0";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/**
 * Split article markdown so a call-to-action can sit high in the read — right
 * after the opening hook (the "after the first paragraph" placement). Returns
 * `{ intro, rest }`: `intro` is any leading heading(s) plus the first prose
 * paragraph; `rest` is everything after. When the body is too short or can't be
 * cleanly split on a paragraph boundary, `rest` is "" and the caller renders
 * the body whole (so short posts don't get an awkward mid-CTA, and we never
 * split inside a list, table, or code block).
 */
export function splitAfterFirstParagraph(md: string): {
  intro: string;
  rest: string;
} {
  const text = (md || "").trim();
  if (!text) return { intro: "", rest: "" };
  const blocks = text.split(/\n{2,}/);
  // Need enough content below the fold for a mid-article CTA to make sense.
  if (blocks.length < 4) return { intro: text, rest: "" };
  // A "prose" block is a plain paragraph — not a heading, quote, list item,
  // ordered-list item, table row, or fenced code block.
  const isProse = (b: string): boolean =>
    !!b && !/^\s*(#|>|[-*+]\s|\d+\.\s|```|~~~|\|)/.test(b.trim());
  // Walk past any leading non-prose blocks (e.g. an H1/heading) so they stay
  // with the intro, then include the first real paragraph.
  let i = 0;
  while (i < blocks.length && !isProse(blocks[i])) i++;
  if (i >= blocks.length - 1) return { intro: text, rest: "" };
  const introEnd = i + 1;
  const intro = blocks.slice(0, introEnd).join("\n\n");
  const rest = blocks.slice(introEnd).join("\n\n").trim();
  if (!rest) return { intro: text, rest: "" };
  return { intro, rest };
}
