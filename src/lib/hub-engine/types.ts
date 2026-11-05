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
  kind: "image";
  url: string;
  width: number;
  height: number;
  minZoom: number;
  maxZoom: number;
  artVersion: number;
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

/** A checklist with this key is the story walkthrough: the hub shows it as
 *  steps and the page bar links to it. Plain module (server-safe). */
export const WALKTHROUGH_KEY = "walkthrough";

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
