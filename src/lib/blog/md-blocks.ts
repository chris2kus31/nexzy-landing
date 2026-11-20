// ============================================
// FILE: lib/blog/md-blocks.ts
// Article blocks: plain-markdown shortcuts that components/blog/Markdown.tsx
// renders as Nexzy components (ArticleBlocks.tsx). Everything is normal
// markdown, so a human, the AI writer and the editor all write the same text,
// and an unknown or broken block just falls back to a quote / link.
//
// Blocks are quotes that start with a marker, with an optional title after it:
//   > [!TIP] Optional title
//   > Body text, lists, etc.
// Kinds: see BLOCK_KINDS. Media is a link on its own line (see embedOf).
// Full cheat sheet: Project doc build/NEXZY_ARTICLE_BLOCKS.md.
// ============================================
import { youtubeId, isYoutubeShort } from "@/lib/blog/youtube";
import { streamableId } from "@/lib/blog/media";
import {
  applyPatchMeta,
  parsePatchLine,
  type PatchBoardData,
} from "@/lib/blog/patch";

export const BLOCK_KINDS = [
  "TIP",
  "NOTE",
  "WARNING",
  "KEY",
  "UPDATE",
  "CORRECTION",
  "QUOTE",
  "VERDICT",
  "PROS",
  "CONS",
  "STEPS",
  "FACTS",
  "TIMELINE",
  "PATCH",
  "SPOILER",
  "FAQ",
  "READ",
  "COMPARE",
] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

type MdNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  depth?: number;
  children?: MdNode[];
  data?: Record<string, unknown>;
};

// [!KIND] or [!KIND|Custom label]; the rest of the line is the title.
const MARKER = /^\[!([A-Za-z]+)(?:\|([^\]\n]{1,40}))?\][ \t]*([^\n]*)\n?/;

const textOf = (n: MdNode): string =>
  n.type === "text" || n.type === "inlineCode"
    ? (n.value ?? "")
    : (n.children ?? []).map(textOf).join("");

const el = (
  hName: string,
  props: Record<string, unknown>,
  children: MdNode[] = [],
): MdNode => ({
  type: "nxEl",
  data: { hName, hProperties: props },
  children,
});

/**
 * Block props skip react-markdown's own URL sanitizing, so every URL a block
 * carries goes through here: only http(s) and site-relative "/" paths survive.
 */
export function safeUrl(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

// ---- media on its own line -------------------------------------------------

export type Embed =
  | { kind: "frame"; src: string; portrait: boolean; host: string }
  | { kind: "social"; platform: string; handle: string; url: string };

/** "90", "1m30s", "1h2m3s" -> seconds. */
function seconds(t: string | null): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m
    ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
    : 0;
}

/** A pasted URL -> an embeddable player or a social post card. Null = a normal link. */
export function embedOf(raw: string): Embed | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  // Shape override: "#short" / "#vertical" = portrait, "#wide" = 16:9.
  const force = /^#(short|vertical)$/i.test(u.hash)
    ? true
    : /^#wide$/i.test(u.hash)
      ? false
      : null;
  const yt = youtubeId(raw);
  if (yt && /youtube\.com|youtu\.be|youtube-nocookie\.com/.test(host)) {
    const start = seconds(
      u.searchParams.get("t") ?? u.searchParams.get("start"),
    );
    return {
      kind: "frame",
      host: "youtube",
      portrait: force ?? isYoutubeShort(raw),
      src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0${start ? `&start=${start}` : ""}`,
    };
  }
  if (host === "streamable.com") {
    const id = streamableId(raw);
    return id
      ? {
          kind: "frame",
          host: "streamable",
          portrait: force ?? false,
          src: `https://streamable.com/e/${id}`,
        }
      : null;
  }
  if (host === "tiktok.com") {
    const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
    return id
      ? {
          kind: "frame",
          host: "tiktok",
          portrait: force ?? true,
          src: `https://www.tiktok.com/player/v1/${id}?music_info=1&description=1&rel=0`,
        }
      : null;
  }
  const seg = u.pathname.split("/").filter(Boolean);
  if ((host === "x.com" || host === "twitter.com") && seg[1] === "status")
    return { kind: "social", platform: "x", handle: `@${seg[0]}`, url: u.href };
  if (host === "bsky.app" && seg[0] === "profile" && seg[2] === "post")
    return {
      kind: "social",
      platform: "bluesky",
      handle: `@${seg[1]}`,
      url: u.href,
    };
  if (host.endsWith("reddit.com") && seg[0] === "r" && seg[2] === "comments")
    return {
      kind: "social",
      platform: "reddit",
      handle: `r/${seg[1]}`,
      url: u.href,
    };
  if (host === "instagram.com" && (seg[0] === "p" || seg[0] === "reel"))
    return {
      kind: "social",
      platform: "instagram",
      handle: "Instagram",
      url: u.href,
    };
  if (
    (host === "threads.net" || host === "threads.com") &&
    seg[0]?.startsWith("@")
  )
    return { kind: "social", platform: "threads", handle: seg[0], url: u.href };
  return null;
}

/** Paragraph = a bare link on the first line (+ optional caption lines). */
function toMedia(p: MdNode): boolean {
  const [first, ...rest] = p.children ?? [];
  if (!first || first.type !== "link" || !first.url) return false;
  if (textOf(first).trim() !== first.url.trim()) return false;
  const tail = rest.map(textOf).join("");
  if (tail && !/^\s*\n/.test(tail)) return false; // link sits inside a sentence
  const embed = embedOf(first.url);
  if (!embed) return false;
  p.data = {
    hName: "nxmedia",
    hProperties: { dataEmbed: JSON.stringify(embed), dataCaption: tail.trim() },
  };
  p.children = [];
  return true;
}

/** Paragraph made only of 2+ images -> gallery grid. */
function toGallery(p: MdNode): boolean {
  const kids = p.children ?? [];
  const imgs = kids.filter((k) => k.type === "image");
  if (imgs.length < 2) return false;
  if (
    kids.some(
      (k) =>
        k.type !== "image" &&
        !(k.type === "break" || (k.type === "text" && !k.value?.trim())),
    )
  )
    return false;
  p.data = {
    hName: "nxgallery",
    hProperties: { dataCount: String(imgs.length) },
  };
  p.children = imgs;
  return true;
}

// ---- blocks ------------------------------------------------------------------

/** "Label: value" or "**Label** value" -> [label el, ...value]. */
function labelize(item: MdNode): void {
  const p = item.children?.[0];
  if (!p || p.type !== "paragraph" || !p.children?.length) return;
  const first = p.children[0];
  if (first.type === "strong") {
    p.children.shift();
    const next = p.children[0];
    if (next?.type === "text" && next.value)
      next.value = next.value.replace(/^\s*[:\-–]\s*/, "");
    const label = textOf(first).replace(/:\s*$/, "");
    p.children.unshift(el("nxlabel", {}, [{ type: "text", value: label }]));
    return;
  }
  if (first.type === "text" && first.value) {
    const i = first.value.indexOf(":");
    if (i > 0 && i < 40) {
      const label = first.value.slice(0, i).trim();
      first.value = first.value.slice(i + 1).replace(/^\s+/, "");
      p.children.unshift(el("nxlabel", {}, [{ type: "text", value: label }]));
    }
  }
}

function eachItem(block: MdNode, fn: (li: MdNode) => void): void {
  for (const k of block.children ?? [])
    if (k.type === "list") for (const li of k.children ?? []) fn(li);
}

// FACTS layout limits (characters of value text).
const LEAD_MAX = 24;
const SUB_MAX = 20;

const isLabel = (n?: MdNode) =>
  n?.type === "nxEl" && (n.data as { hName?: string })?.hName === "nxlabel";

/**
 * FACTS list -> lead stat + chips (ArticleBlocks renders them).
 * The first fact becomes the big "lead" when it is a labeled plain value whose
 * main part (before the first comma) is short; the rest after the comma is the
 * small line under it ("Update: 1.21 Florin, free" -> "1.21 Florin" / "free").
 * Every other one-line fact is a chip; a fact with extra paragraphs or lists
 * stays a row. Same markdown as before, so existing posts just re-lay out.
 */
function toFacts(list: MdNode): MdNode {
  const facts = (list.children ?? []).map((li) => {
    const kids = li.children ?? [];
    const single = kids.length === 1 && kids[0].type === "paragraph";
    let value = single ? [...(kids[0].children ?? [])] : kids;
    let label = "";
    if (single && isLabel(value[0])) {
      label = textOf(value[0]).trim();
      value = value.slice(1);
    }
    const text = value.map(textOf).join("").trim();
    return { single, label, value, text };
  });

  const first = facts[0];
  let lead: { label: string; main: string; sub: string } | null = null;
  if (
    first?.label &&
    first.single &&
    first.value.every((n) => n.type === "text")
  ) {
    // Split only for a short single tail ("1.21 Florin, free"), never a list
    // ("PS5, Xbox Series X|S, PC" stays whole and is too long to lead).
    const i = first.text.indexOf(",");
    const tail = i > 0 ? first.text.slice(i + 1).trim() : "";
    const split = !!tail && tail.length <= SUB_MAX && !tail.includes(",");
    const main = (split ? first.text.slice(0, i) : first.text).trim();
    const sub = split ? tail : "";
    if (main.length <= LEAD_MAX) lead = { label: first.label, main, sub };
  }
  const rest = lead ? facts.slice(1) : facts;
  const chips = rest.filter((f) => f.single);
  const rows = rest.filter((f) => !f.single);
  const fact = (role: string, f: (typeof facts)[number]) =>
    el("nxfact", { dataRole: role, dataLabel: f.label }, f.value);

  const body: MdNode[] = [];
  if (chips.length)
    body.push(
      el(
        "nxfactchips",
        {},
        chips.map((f) => fact("chip", f)),
      ),
    );
  if (rows.length)
    body.push(
      el(
        "nxfactrows",
        {},
        rows.map((f) => fact("row", f)),
      ),
    );
  const out: MdNode[] = [];
  if (lead)
    out.push(
      el(
        "nxfact",
        {
          dataRole: "lead",
          dataLabel: lead.label,
          dataSub: lead.sub,
          dataSolo: body.length ? "" : "1",
        },
        [{ type: "text", value: lead.main }],
      ),
    );
  if (body.length) out.push(el("nxfactbody", {}, body));
  return el("nxfacts", {}, out);
}

function toBlock(q: MdNode): MdNode | null {
  const first = q.children?.[0];
  const text = first?.type === "paragraph" ? first.children?.[0] : undefined;
  if (!first || text?.type !== "text" || !text.value) return null;
  const m = text.value.match(MARKER);
  if (!m) return null;
  const kind = m[1].toUpperCase() as BlockKind;
  if (!BLOCK_KINDS.includes(kind)) return null;
  text.value = text.value.slice(m[0].length);
  if (!text.value) first.children!.shift();
  if (!first.children!.length) q.children!.shift();
  const title = m[3].trim();
  const props: Record<string, unknown> = {
    dataKind: kind,
    dataTitle: title,
    dataName: (m[2] ?? "").trim(),
  };

  if (kind === "FACTS" || kind === "TIMELINE") eachItem(q, labelize);
  if (kind === "FACTS")
    q.children = (q.children ?? []).map((k) => {
      if (k.type !== "list" || !k.children?.length) return k;
      props.dataFacts = "1";
      return toFacts(k);
    });

  // PATCH -> patch board data (lib/blog/patch.ts): "### Group" headings,
  // "- [TAG] Name: old -> new | detail" lines, "- Date: ..." header lines,
  // plain paragraphs become the "What it means" note.
  if (kind === "PATCH") {
    const data: PatchBoardData = { title: title || null, items: [], tldr: [] };
    let group: string | null = null;
    const notes: string[] = [];
    for (const k of q.children ?? []) {
      if (k.type === "heading") group = textOf(k).trim() || null;
      else if (k.type === "list")
        for (const li of k.children ?? []) {
          const line = textOf(li).trim();
          if (applyPatchMeta(data, line)) continue;
          const it = parsePatchLine(line, group);
          if (it) data.items.push(it);
          else data.tldr!.push(line);
        }
      else if (k.type === "paragraph")
        for (const line of textOf(k).split("\n"))
          if (line.trim() && !applyPatchMeta(data, line))
            notes.push(line.trim());
    }
    // No tagged lines: keep it as a plain "Patch notes" card (never raw text).
    if (data.items.length) {
      if (notes.length) data.metaNote = notes.join(" ");
      props.dataPatch = JSON.stringify(data);
      q.children = [];
    }
  }

  if (kind === "FAQ") {
    const out: MdNode[] = [];
    let cur: MdNode | null = null;
    for (const k of q.children ?? []) {
      if (k.type === "heading") {
        cur = el("nxfaq", {}, [el("nxfaqq", {}, k.children ?? [])]);
        out.push(cur);
      } else if (cur) cur.children!.push(k);
      else out.push(k);
    }
    q.children = out;
  }

  if (kind === "READ") {
    let href = "";
    let label = "";
    for (const p of q.children ?? []) {
      const i = (p.children ?? []).findIndex((k) => k.type === "link");
      if (i < 0) continue;
      const link = p.children![i];
      // An unsafe link (javascript: etc.) stays in the text as a plain label.
      if (!safeUrl(link.url)) break;
      href = link.url ?? "";
      label = textOf(link);
      p.children!.splice(i, 1);
      break;
    }
    q.children = (q.children ?? []).filter((p) => textOf(p).trim());
    // No usable link: falls back to a plain card with the remaining text.
    if (safeUrl(href)) {
      props.dataHref = safeUrl(href);
      props.dataLabel = label;
    }
  }

  if (kind === "COMPARE") {
    const imgs: { src: string; alt: string }[] = [];
    const find = (n: MdNode) => {
      if (n.type === "image" && safeUrl(n.url))
        imgs.push({ src: safeUrl(n.url), alt: n.alt ?? "" });
      (n.children ?? []).forEach(find);
    };
    find(q);
    // Fewer than 2 images: plain card, the images render as normal figures.
    if (imgs.length >= 2) {
      props.dataImages = JSON.stringify(imgs.slice(0, 2));
      q.children = [];
    }
  }

  q.data = { hName: "nxblock", hProperties: props };
  return q;
}

/** Wrap an adjacent PROS + CONS pair (either order) in a side-by-side grid. */
function pairProsCons(parent: MdNode): void {
  const kids = parent.children ?? [];
  const kindOf = (n?: MdNode) =>
    (n?.data?.hProperties as Record<string, unknown> | undefined)?.dataKind;
  for (let i = 0; i < kids.length - 1; i++) {
    const a = kindOf(kids[i]);
    const b = kindOf(kids[i + 1]);
    if ((a === "PROS" && b === "CONS") || (a === "CONS" && b === "PROS"))
      kids.splice(i, 2, el("nxpair", {}, [kids[i], kids[i + 1]]));
  }
}

function walk(node: MdNode): void {
  for (const k of node.children ?? []) {
    if (k.type === "blockquote") toBlock(k);
    else if (k.type === "paragraph") toMedia(k) || toGallery(k);
    walk(k);
  }
  pairProsCons(node);
}

export const remarkArticleBlocks = () => (tree: unknown) =>
  walk(tree as MdNode);

/** Plain-text helpers (JSON-LD, word counts): drop block markers. */
export function stripBlockMarkers(md: string): string {
  return md.replace(/\[!([A-Za-z]+)(?:\|[^\]\n]*)?\]/g, " ");
}

// ---- tables (rehype) -----------------------------------------------------------

/**
 * Copies each column's header text onto its body cells as `data-label` and
 * marks 3+ column tables `data-stack`, so on phones each row becomes a small
 * card ("PRICE  $69.99"). 2-column tables stay a grid everywhere.
 */
type HNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
};
const hText = (n: HNode): string =>
  n.type === "text" ? (n.value ?? "") : (n.children ?? []).map(hText).join("");
const hKids = (n: HNode, tag: string): HNode[] =>
  (n.children ?? []).filter((k) => k.type === "element" && k.tagName === tag);
function labelTable(table: HNode): void {
  const head = hKids(table, "thead")[0];
  const headRow = head ? hKids(head, "tr")[0] : undefined;
  const labels = headRow
    ? hKids(headRow, "th").map((th) => hText(th).trim())
    : [];
  if (!labels.length) return;
  if (labels.length >= 3)
    table.properties = { ...table.properties, dataStack: "true" };
  for (const body of hKids(table, "tbody"))
    for (const tr of hKids(body, "tr"))
      hKids(tr, "td").forEach((td, i) => {
        if (labels[i])
          td.properties = { ...td.properties, dataLabel: labels[i] };
      });
}
function walkTables(n: HNode): void {
  if (n.type === "element" && n.tagName === "table") labelTable(n);
  for (const k of n.children ?? []) walkTables(k);
}
export const rehypeTableLabels = () => (tree: unknown) =>
  walkTables(tree as HNode);
