// Map groups: maps that share a `group` are ONE map with floors (a dungeon),
// shown as floor tabs in the order the template lists them. Shared by the
// map page, map blocks, mini maps and the admin so they always agree.
import type { HubMapDef, HubTemplateConfig } from "@/lib/hub-engine/types";

const groupKey = (m: HubMapDef) => m.group?.trim().toLowerCase() || null;

/** The floors of the map's group (just the map itself outside a group). */
export function floorsOf(
  config: Pick<HubTemplateConfig, "maps">,
  map: HubMapDef,
): HubMapDef[] {
  const g = groupKey(map);
  if (!g) return [map];
  const floors = config.maps.filter((m) => groupKey(m) === g);
  return floors.length ? floors : [map];
}

/** Reader-facing name: the group for a floor, else the map's own name. */
export const mapTitle = (m: HubMapDef) => m.group?.trim() || m.name;

/** Admin label: "Inside the Deku Tree: B1" for a floor. */
export const mapLabel = (m: HubMapDef) =>
  m.group?.trim() ? `${m.group.trim()}: ${m.floor ?? m.name}` : m.name;

/** One choice per standalone map or group (opens on the group's first floor). */
export function mapChoices(
  config: Pick<HubTemplateConfig, "maps">,
): { key: string; label: string }[] {
  const seen = new Set<string>();
  const out: { key: string; label: string }[] = [];
  for (const m of config.maps) {
    const g = groupKey(m);
    if (g) {
      if (seen.has(g)) continue;
      seen.add(g);
    }
    out.push({ key: m.key, label: mapTitle(m) });
  }
  return out;
}

export type MapSection = {
  label: string;
  items: { key: string; label: string }[];
};

/** The map picker, grouped: the world map(s) first, then one section per
 *  entry type that owns maps (in template type order: Regions, Dungeons...),
 *  then anything left. `entryTypes` = entry slug -> type key, read off the
 *  world map's pins (only entries pinned there get a typed section). */
export function mapSections(
  config: Pick<HubTemplateConfig, "maps" | "types">,
  entryTypes: Record<string, string>,
): MapSection[] {
  const world: MapSection["items"] = [];
  const other: MapSection["items"] = [];
  const byType = new Map<string, MapSection["items"]>();
  for (const c of mapChoices(config)) {
    const first = config.maps.find((m) => m.key === c.key);
    if (!first) continue;
    // A group's entry is set on one floor only (the entrance floor).
    const entry = floorsOf(config, first)
      .map((m) => m.entry)
      .find(Boolean);
    if (!entry && !first.group) {
      world.push(c);
      continue;
    }
    const t = (entry && entryTypes[entry]) || null;
    if (!t) other.push(c);
    else byType.set(t, [...(byType.get(t) ?? []), c]);
  }
  const out: MapSection[] = [];
  if (world.length) out.push({ label: "World", items: world });
  for (const t of config.types) {
    const items = byType.get(t.key);
    if (items?.length) out.push({ label: t.plural, items });
  }
  // A type the template no longer lists still shows; nothing is dropped.
  for (const [t, items] of byType)
    if (!config.types.some((x) => x.key === t)) out.push({ label: t, items });
  if (other.length) out.push({ label: "More maps", items: other });
  return out;
}

/** The map an entry belongs to ("Open map" on a dungeon): its first floor. */
export function mapForEntry(
  config: Pick<HubTemplateConfig, "maps">,
  entrySlug: string,
): HubMapDef | null {
  return config.maps.find((m) => m.entry === entrySlug) ?? null;
}

/** Which of an entry's pins to show: a floor of a dungeon map (the precise
 *  spot) beats the overworld marker; otherwise the first pin on a known map. */
export function bestPin<P extends { map: string }>(
  config: Pick<HubTemplateConfig, "maps">,
  pins: P[],
): P | undefined {
  const known = pins.filter((p) => config.maps.some((m) => m.key === p.map));
  return (
    known.find((p) => config.maps.find((m) => m.key === p.map)?.group) ??
    known[0]
  );
}

/** Where an entry is in the world: its pin on a standalone map (the
 *  overworld) beats a dungeon floor; used for "where do I go" mini maps. */
export function worldPin<P extends { map: string }>(
  config: Pick<HubTemplateConfig, "maps">,
  pins: P[],
): P | undefined {
  const known = pins.filter((p) => config.maps.some((m) => m.key === p.map));
  return (
    known.find((p) => !config.maps.find((m) => m.key === p.map)?.group) ??
    known[0]
  );
}
