// ============================================
// FILE: lib/blog/patch.ts
// One shape for every patch notes view ("Option B" board in
// components/blog/PatchBoard.tsx). Two inputs feed it:
//   - the inline `> [!PATCH]` article block (parsed in md-blocks.ts), and
//   - a patch_notes post's formatData.patch (the admin Patch editor / the AI
//     writer). Old posts (kind/name/detail only) still render fine.
//
// Line syntax (inline block and the editor's "Paste lines" box):
//   - [BUFF] Starter pistol damage: 40 -> 44 | Early missions get easier
//   - [NERF] Police heli spawns: Fewer | 3 stars and up
//   - [FIX] Saves not loading after chapter 2
// `### Weapons` headings (or the editor's Group field) group buffs/nerfs.
// ============================================

export type PatchKind =
  | "buff"
  | "nerf"
  | "rework"
  | "new"
  | "change"
  | "fix"
  | "known";

export const PATCH_KINDS: PatchKind[] = [
  "buff",
  "nerf",
  "new",
  "change",
  "rework",
  "fix",
  "known",
];

export type PatchImpact = "minor" | "medium" | "major";

export interface PatchItem {
  kind: PatchKind;
  name: string;
  group?: string | null;
  from?: string | null;
  to?: string | null;
  detail?: string | null;
}

export interface PatchBoardData {
  title?: string | null;
  version?: string | null;
  date?: string | null;
  platforms?: string | null;
  size?: string | null;
  impact?: PatchImpact | null;
  who?: string[];
  tldr?: string[];
  items: PatchItem[];
  metaNote?: string | null;
  changelogUrl?: string | null;
}

/** [TAG] -> kind. */
export const PATCH_TAG_KIND: Record<string, PatchKind> = {
  BUFF: "buff",
  NERF: "nerf",
  NEW: "new",
  ADDED: "new",
  CHANGE: "change",
  CHANGED: "change",
  BALANCE: "change",
  REMOVED: "change",
  REWORK: "rework",
  FIX: "fix",
  FIXED: "fix",
  KNOWN: "known",
};

const TAG_RE = /^\[([A-Za-z]+)\][ \t]*/;

/** "- [BUFF] Name: 40 -> 44 | detail" -> item (null if no known tag). */
export function parsePatchLine(
  raw: string,
  group?: string | null,
): PatchItem | null {
  const line = raw.replace(/^\s*[-*]\s*/, "").trim();
  const m = line.match(TAG_RE);
  const kind = m ? PATCH_TAG_KIND[m[1].toUpperCase()] : undefined;
  if (!m || !kind) return null;
  let rest = line.slice(m[0].length).trim();
  let detail: string | null = null;
  const bar = rest.indexOf(" | ");
  if (bar >= 0) {
    detail = rest.slice(bar + 3).trim() || null;
    rest = rest.slice(0, bar).trim();
  }
  let name = rest;
  let from: string | null = null;
  let to: string | null = null;
  const colon = rest.indexOf(": ");
  if (colon > 0) {
    name = rest.slice(0, colon).trim();
    const val = rest.slice(colon + 2).trim();
    const arrow = val.split(/\s*(?:->|→)\s*/);
    if (arrow.length === 2) {
      from = arrow[0] || null;
      to = arrow[1] || null;
    } else to = val || null;
  }
  if (!name) return null;
  return { kind, name, group: group || null, from, to, detail };
}

/** Header lines in the inline block: "Date: ...", "Impact: Medium", ... */
export function applyPatchMeta(d: PatchBoardData, raw: string): boolean {
  const m = raw
    .replace(/^\s*[-*]\s*/, "")
    .match(/^(Version|Date|Platforms|Size|Impact|Who)\s*:\s*(.+)$/i);
  if (!m) return false;
  const v = m[2].trim();
  switch (m[1].toLowerCase()) {
    case "version":
      d.version = v;
      break;
    case "date":
      d.date = v;
      break;
    case "platforms":
      d.platforms = v;
      break;
    case "size":
      d.size = v;
      break;
    case "impact": {
      const i = v.toLowerCase();
      d.impact = i === "minor" || i === "medium" || i === "major" ? i : null;
      break;
    }
    case "who":
      d.who = v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      break;
  }
  return true;
}

/** Bulk text (one line per change, `### Group` headings) -> items. */
export function parsePatchText(text: string): PatchItem[] {
  const out: PatchItem[] = [];
  let group: string | null = null;
  for (const line of text.split("\n")) {
    const h = line.match(/^\s*#{1,6}\s+(.+?)\s*$/);
    if (h) {
      group = h[1];
      continue;
    }
    const it = parsePatchLine(line, group);
    if (it) out.push(it);
  }
  return out;
}

/** Items -> the same line syntax (for the editor's text view). */
export function patchItemsToText(items: PatchItem[]): string {
  const TAG: Record<PatchKind, string> = {
    buff: "BUFF",
    nerf: "NERF",
    new: "NEW",
    change: "CHANGE",
    rework: "REWORK",
    fix: "FIX",
    known: "KNOWN",
  };
  let group: string | null = null;
  const lines: string[] = [];
  for (const it of items) {
    if ((it.group || null) !== group) {
      group = it.group || null;
      if (group) lines.push(`### ${group}`);
    }
    let s = `- [${TAG[it.kind]}] ${it.name}`;
    if (it.from && it.to) s += `: ${it.from} -> ${it.to}`;
    else if (it.to) s += `: ${it.to}`;
    if (it.detail) s += ` | ${it.detail}`;
    lines.push(s);
  }
  return lines.join("\n");
}

/** formatData.patch (any age) -> board data. Null when there is nothing. */
export function boardFromFormatData(
  p:
    | {
        title?: string | null;
        version?: string | null;
        date?: string | null;
        platforms?: string | null;
        size?: string | null;
        impact?: string | null;
        who?: string[] | null;
        tldr?: string[] | null;
        changes?: {
          kind?: string;
          name?: string;
          group?: string | null;
          from?: string | null;
          to?: string | null;
          detail?: string | null;
        }[];
        metaNote?: string | null;
        fullChangelogUrl?: string | null;
      }
    | null
    | undefined,
): PatchBoardData | null {
  if (!p) return null;
  const items: PatchItem[] = (p.changes ?? [])
    .filter((c) => c?.name)
    .map((c) => ({
      kind: (PATCH_KINDS as string[]).includes(String(c.kind))
        ? (c.kind as PatchKind)
        : "change",
      name: String(c.name),
      group: c.group || null,
      from: c.from || null,
      to: c.to || null,
      detail: c.detail || null,
    }));
  if (!items.length) return null;
  const impact = String(p.impact ?? "").toLowerCase();
  return {
    title: p.title || null,
    version: p.version || null,
    date: p.date || null,
    platforms: p.platforms || null,
    size: p.size || null,
    impact:
      impact === "minor" || impact === "medium" || impact === "major"
        ? impact
        : null,
    who: (p.who ?? []).filter(Boolean),
    tldr: (p.tldr ?? []).filter(Boolean),
    items,
    metaNote: p.metaNote || null,
    changelogUrl: p.fullChangelogUrl || null,
  };
}

/** "40" -> "44" = "+10%"; null when either side is not a number. */
export function patchDelta(from?: string | null, to?: string | null) {
  const num = (s?: string | null) => {
    const m = s?.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : null;
  };
  const a = num(from);
  const b = num(to);
  if (a === null || b === null || a === 0) return null;
  const pct = ((b - a) / Math.abs(a)) * 100;
  const r = Math.abs(pct) < 10 ? Math.round(pct * 10) / 10 : Math.round(pct);
  return `${r > 0 ? "+" : ""}${r}%`;
}
