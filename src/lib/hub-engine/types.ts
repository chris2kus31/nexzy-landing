// Mega hub engine (Phase 4): public shapes, mirrored from nexzy-api
// src/hub-engine/hub-engine.types.ts. Every game's guide (entry types,
// fields, maps, checklists, sections) is DATA from the API; nothing here may
// name a game, an entry type or a field.

export type FieldKind =
  | "text"
  | "longtext"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "image"
  | "gallery"
  | "video"
  | "url"
  | "entries";

export type SectionStyle = "map" | "cards" | "list" | "checklist" | "featured";

export interface HubOption {
  key: string;
  label: string;
}

export interface HubFieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  onCard: boolean;
  options?: HubOption[];
  min?: number | null;
  max?: number | null;
  targetTypes?: string[];
  maxItems?: number | null;
}

export interface HubEntryType {
  key: string;
  label: string;
  plural: string;
  color: string;
  icon: string | null;
  pinnable: boolean;
  page: boolean;
  fields: HubFieldDef[];
}

export interface HubMapDef {
  key: string;
  name: string;
  /** "image": one picture at `url`. "tiles": a 512px Web Mercator tile
   *  pyramid at `url` ({z}/{x}/{y}), cut so its top zoom is the art at 1:1
   *  (coords.ts baseZoom); width/height stay the art's pixel size for pins. */
  kind: "image" | "tiles";
  url: string;
  width: number;
  height: number;
  minZoom: number;
  maxZoom: number;
  artVersion: number;
  /** Maps with the same group are one map with floor tabs (a dungeon). */
  group?: string | null;
  /** Floor tab label inside its group ("B1"). */
  floor?: string | null;
  /** Entry slug this map belongs to (the dungeon): its details offer "Open map". */
  entry?: string | null;
  /** Admins only (Admin > Setup > Maps): hidden from readers until unticked
   *  and published. Public reads never include staged maps. */
  staged?: boolean;
}

export interface HubFilter {
  types: string[];
  tags: string[];
  eras: string[];
  statuses: Array<"unconfirmed" | "confirmed">;
}

export interface HubChecklistDef {
  key: string;
  title: string;
  description: string | null;
  filter: HubFilter;
  /** Story walkthrough: ordered steps (Step X of N, Previous / Next). Older
   *  APIs omit it; isStory() falls back to the old key "walkthrough". */
  story?: boolean;
}

export interface HubSectionDef {
  key: string;
  title: string;
  style: SectionStyle;
  filter: HubFilter;
  mapKey: string | null;
  checklistKey: string | null;
  entrySlug: string | null;
  limit: number;
  sort: "order" | "newest" | "title";
}

export interface HubTemplateConfig {
  features: {
    eraSwitch: boolean;
    spoilers: boolean;
    search: boolean;
    unconfirmedLabel: string;
  };
  eras: HubOption[];
  spoilerStages: HubOption[];
  types: HubEntryType[];
  maps: HubMapDef[];
  checklists: HubChecklistDef[];
  sections: HubSectionDef[];
}

export interface HubImage {
  url: string;
  alt: string | null;
}

export interface HubCard {
  id: string;
  slug: string;
  type: string;
  title: string;
  summary: string | null;
  image: HubImage | null;
  status: "unconfirmed" | "confirmed";
  spoilerStage: string | null;
  eras: string[];
  fields: Record<string, unknown>;
  updatedAt: string;
}

export interface HubLinkRef {
  id: string;
  slug: string;
  type: string;
  title: string;
}

export interface HubEntryFull extends HubCard {
  /** A guide page about this entry (a walkthrough step). */
  guidePage?: { slug: string; title: string } | null;
  media: HubImage[];
  linkedFrom: Array<{ type: string; field: string; entries: HubLinkRef[] }>;
  pins: Array<{ id: string; map: string; x: number; y: number }>;
}

export interface HubResolvedSection {
  key: string;
  title: string;
  style: SectionStyle;
  mapKey: string | null;
  checklistKey: string | null;
  items: HubCard[];
  total: number | null;
}

export interface HubEnginePage {
  enabled: boolean;
  contentVersion: number;
  config: HubTemplateConfig | null;
  sections: HubResolvedSection[];
  /** Public entries per type (API 2026-11-05+; older APIs omit it). */
  typeCounts?: Record<string, number>;
  /** Published guide pages (table of contents). Older APIs omit it. */
  pages?: HubPageNode[];
}

/** [pinId, entryId, typeKey, x, y, title, confirmed, spoilerStage, eras,
 *  entrySlug]. The API only ever appends values. */
export type HubPinRow = [
  string,
  string,
  string,
  number,
  number,
  string,
  0 | 1,
  string | null,
  string[],
  string,
];

export interface HubChecklistPage {
  key: string;
  title: string;
  description: string | null;
  items: HubCard[];
}

/** Is this checklist the story walkthrough (shown as steps)? The template's
 *  Story switch; configs from before the switch used the key "walkthrough".
 *  Plain module (server-safe). */
export const isStory = (c: { key: string; story?: boolean }) =>
  typeof c.story === "boolean" ? c.story : c.key === "walkthrough";

/** Web path of a guide page. */
export const guidePath = (gameSlug: string, pageSlug: string) =>
  `/games/${gameSlug}/guide/${pageSlug}`;

export const typeOf = (c: HubTemplateConfig, key: string) =>
  c.types.find((t) => t.key === key);

/** Web path of an entry page (only for types with page: true). */
export const entryPath = (gameSlug: string, type: string, slug: string) =>
  `/games/${gameSlug}/${type}/${slug}`;

/** Spoiler filter: is this stage visible for the chosen limit? null limit =
 *  no spoilers (hide anything that has a stage). "all" = show everything. */
export function spoilerVisible(
  stages: HubOption[],
  stage: string | null,
  limit: string | null,
): boolean {
  if (!stage) return true;
  if (limit === "all") return true;
  if (limit == null) return false;
  const i = stages.findIndex((s) => s.key === stage);
  const j = stages.findIndex((s) => s.key === limit);
  return i >= 0 && j >= 0 && i <= j;
}

export const eraVisible = (eras: string[], era: string | null) =>
  !era || eras.length === 0 || eras.includes(era);

// ───────────────────────── guide pages + blocks ─────────────────────────

export interface HubPageNode {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  spoilerStage: string | null;
  eras: string[];
  /** Short name for lists and breadcrumbs (older APIs omit: use title). */
  label?: string;
  /** Story walkthrough page: its children are the chapters (`chaptered`)
   *  or the steps, and the hub strip shows the steps (older APIs omit). */
  story?: boolean;
  /** Story page that holds chapters (Walkthrough > Chapter > Step). */
  chaptered?: boolean;
  /** A chapter of the story walkthrough (its children are steps). */
  chapter?: boolean;
  /** Its children are walkthrough steps (a chapter, the story page without
   *  chapters, or a Steps page). */
  steps?: boolean;
  /** A story step's number across the whole walkthrough. */
  step?: number | null;
  /** The entry this page is about (a step's mission), public only. */
  entry?: HubCard | null;
  children: HubPageNode[];
}

/** A page's short name (falls back to its title). */
export const labelOf = (p: { title: string; label?: string }) =>
  p.label || p.title;

/** Every page of the tree, parents first (any depth). */
export function allPages(pages: HubPageNode[]): HubPageNode[] {
  const out: HubPageNode[] = [];
  const walk = (list: HubPageNode[]) =>
    list.forEach((p) => {
      out.push(p);
      walk(p.children);
    });
  walk(pages);
  return out;
}

export const findPage = (pages: HubPageNode[], slug: string) =>
  allPages(pages).find((p) => p.slug === slug) ?? null;

export interface WalkStep {
  node: HubPageNode;
  /** Number across the whole story. */
  n: number;
  chapter: WalkChapter | null;
  /** Number inside its chapter (= n without chapters). */
  inChapter: number;
}
export interface WalkChapter {
  node: HubPageNode;
  /** Chapter number (1-based). */
  n: number;
  steps: WalkStep[];
}

/** The story walkthrough of any game, one shape for every view: chapters
 *  (optional) and every step in reading order. Without chapters the story
 *  page's sub-pages are the steps; with chapters, a story sub-page that is
 *  not a chapter (e.g. Missables) is listed in `extras`, not a step. */
export function walkOf(pages: HubPageNode[]): {
  story: HubPageNode | null;
  chapters: WalkChapter[];
  steps: WalkStep[];
  extras: HubPageNode[];
} {
  const story = pages.find((p) => p.story) ?? null;
  if (!story) return { story, chapters: [], steps: [], extras: [] };
  const steps: WalkStep[] = [];
  if (!story.chaptered) {
    story.children.forEach((c, i) =>
      steps.push({ node: c, n: i + 1, chapter: null, inChapter: i + 1 }),
    );
    return { story, chapters: [], steps, extras: [] };
  }
  const chapters: WalkChapter[] = story.children
    .filter((c) => c.chapter)
    .map((c, i) => ({ node: c, n: i + 1, steps: [] }));
  for (const ch of chapters)
    ch.node.children.forEach((c, i) => {
      const s = { node: c, n: steps.length + 1, chapter: ch, inChapter: i + 1 };
      ch.steps.push(s);
      steps.push(s);
    });
  return {
    story,
    chapters,
    steps,
    extras: story.children.filter((c) => !c.chapter),
  };
}

export interface HubPageRef {
  slug: string;
  title: string;
  label?: string;
}

export interface HubCaptionedImage extends HubImage {
  caption: string | null;
}

export type BlockKind =
  | "text"
  | "image"
  | "gallery"
  | "video"
  | "table"
  | "dropdown"
  | "tip"
  | "map"
  | "checklist"
  | "entries"
  | "steps";

interface BlockBase {
  id: string;
  spoilerStage: string | null;
  eras: string[];
}

export type HubBlock = BlockBase &
  (
    | { kind: "text"; markdown: string }
    | { kind: "image"; image: HubCaptionedImage; entrySlug: string | null }
    | { kind: "gallery"; images: HubCaptionedImage[] }
    | {
        kind: "video";
        url: string;
        start: number | null;
        caption: string | null;
      }
    | {
        kind: "table";
        title: string | null;
        mode: "manual";
        columns: string[];
        rows: string[][];
      }
    | {
        kind: "table";
        title: string | null;
        mode: "entries";
        filter: HubFilter;
        columns: string[];
        complete: boolean;
      }
    | { kind: "dropdown"; title: string; open: boolean; blocks: HubBlock[] }
    | { kind: "tip"; style: "tip" | "warning" | "spoiler"; markdown: string }
    | {
        kind: "map";
        mapKey: string;
        filter: HubFilter;
        focusEntry: string | null;
      }
    | { kind: "checklist"; checklistKey: string }
    | {
        kind: "entries";
        title: string | null;
        filter: HubFilter;
        style: "cards" | "list";
        limit: number;
        sort: "order" | "newest" | "title";
      }
    | {
        /** This page's sub-pages as walkthrough steps. */
        kind: "steps";
        title: string | null;
        show: "next" | "all";
      }
  );

export interface HubTableRow {
  id: string;
  slug: string;
  type: string;
  title: string;
  status: "unconfirmed" | "confirmed";
  spoilerStage: string | null;
  eras: string[];
  cells: Record<string, string>;
}

/** A block as readers get it: entry-driven blocks carry their data. */
export type HubResolvedBlock = HubBlock & {
  rows?: HubTableRow[] | string[][];
  columnLabels?: string[];
  items?: HubCard[];
  checklistTitle?: string;
  total?: number;
  entryType?: string | null;
};

export interface HubGuidePage {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  spoilerStage: string | null;
  eras: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
  /** Short name (older APIs omit these: use title / parent). */
  label?: string;
  parent: HubPageRef | null;
  /** Every page above this one, top first (Walkthrough, Chapter 2). */
  crumbs?: HubPageRef[];
  /** A story step's Previous / Next cross chapters. */
  prev: HubPageRef | null;
  next: HubPageRef | null;
  position: number;
  siblings: number;
  children: Array<{
    slug: string;
    title: string;
    label?: string;
    summary: string | null;
  }>;
  blocks: HubResolvedBlock[];
  /** This page is the story walkthrough (older APIs omit these). */
  story?: boolean;
  /** The story page holds chapters. */
  chaptered?: boolean;
  /** A chapter of the story walkthrough. */
  chapter?: boolean;
  /** Its sub-pages are walkthrough steps. */
  steps?: boolean;
  /** The parent's sub-pages are steps: this page is a step. */
  isStep?: boolean;
  /** A story step: its place in the whole walkthrough and its chapter. */
  walk?: {
    position: number;
    total: number;
    chapter: (HubPageRef & { position: number; total: number }) | null;
  } | null;
  entry?: HubCard | null;
  pins?: Array<{ id: string; map: string; x: number; y: number }>;
}

/** YouTube / Streamable link -> privacy embed URL (null = not playable). */
export function videoEmbed(
  url: string,
  start?: number | null,
): { src: string; thumb: string | null } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const m = /^\/(?:shorts|embed)\/([\w-]{6,})/.exec(u.pathname);
        id = m ? m[1] : null;
      }
    }
    const t =
      start ?? (Number(u.searchParams.get("t")?.replace(/s$/, "")) || null);
    if (id && /^[\w-]{6,20}$/.test(id))
      return {
        src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${t ? `&start=${Math.floor(t)}` : ""}`,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    if (host === "streamable.com") {
      const m = /^\/(?:e\/)?(\w{3,})/.exec(u.pathname);
      if (m)
        return {
          src: `https://streamable.com/e/${m[1]}?autoplay=1${t ? `&t=${Math.floor(t)}` : ""}`,
          thumb: null,
        };
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/** A live mega hub for site promos (home banner, guides rail). */
export interface HubLiveCard {
  slug: string;
  name: string;
  image: string | null;
  liveAt: string;
  hasMap: boolean;
  /** Steps under the story walkthrough page. */
  steps: number;
  pages: number;
  /** Biggest public lists, e.g. { label: "Gold Skulltulas", count: 100 }. */
  highlights: Array<{ type: string; label: string; count: number }>;
}

/** "11-step walkthrough · Interactive map · 100 Gold Skulltulas". */
export function hubParts(
  h: Pick<HubLiveCard, "steps" | "hasMap" | "highlights">,
  max = 3,
): string[] {
  const out: string[] = [];
  if (h.steps > 0) out.push(`${h.steps}-step walkthrough`);
  if (h.hasMap) out.push("Interactive map");
  for (const x of h.highlights) {
    if (out.length >= max) break;
    out.push(`${x.count} ${x.label}`);
  }
  return out.slice(0, max);
}
