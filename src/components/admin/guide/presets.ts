// Starter templates for the guide engine. They are only a fast start: every
// type, field, list and section can be renamed, changed or removed in the
// editor before publishing. Nothing here is special-cased anywhere else.
import type {
  HubEntryType,
  HubFieldDef,
  HubTemplateConfig,
} from "@/lib/hub-engine/types";

const f = (
  key: string,
  label: string,
  kind: HubFieldDef["kind"],
  extra: Partial<HubFieldDef> = {},
): HubFieldDef => ({
  key,
  label,
  kind,
  required: false,
  onCard: false,
  ...extra,
});

const t = (
  key: string,
  label: string,
  plural: string,
  color: string,
  fields: HubFieldDef[],
  extra: Partial<HubEntryType> = {},
): HubEntryType => ({
  key,
  label,
  plural,
  color,
  icon: null,
  pinnable: true,
  page: true,
  fields,
  ...extra,
});

/** Generic types any game can start from. */
export const TYPE_PRESETS: HubEntryType[] = [
  t("location", "Location", "Locations", "#90a4ae", [
    f("about", "About", "longtext", { onCard: true }),
  ]),
  t("collectible", "Collectible", "Collectibles", "#e0b400", [
    f("how", "How to get it", "longtext", { onCard: true, required: true }),
  ]),
  t("mission", "Mission", "Missions", "#ef5350", [
    f("about", "What happens", "longtext"),
    f("reward", "Reward", "text", { onCard: true }),
    f("where", "Where", "entries", { targetTypes: ["location"] }),
  ]),
  t("item", "Item", "Items", "#7ee2a0", [
    f("how", "How to get it", "longtext", { onCard: true }),
    f("use", "What it does", "longtext"),
  ]),
  t(
    "character",
    "Character",
    "Characters",
    "#ffb86b",
    [f("about", "About", "longtext")],
    { pinnable: false },
  ),
  t("activity", "Activity", "Activities", "#4fc3f7", [
    f("about", "About", "longtext", { onCard: true }),
    f("reward", "Reward", "text"),
  ]),
];

/**
 * Ocarina of Time starter. Facts are the original game's well-known
 * structure (areas, dungeon order, two ages); content is entered by the team.
 * The map section is added only once map art has been uploaded.
 */
export function ocarinaPreset(current: HubTemplateConfig): HubTemplateConfig {
  const region = (label = "Region") =>
    f("region", label, "entries", { targetTypes: ["region"], maxItems: 1 });
  const types: HubEntryType[] = [
    t("region", "Region", "Regions", "#607d8b", [
      f("about", "About", "longtext", { onCard: true }),
    ]),
    t("dungeon", "Dungeon", "Dungeons", "#ef5350", [
      region(),
      f("boss", "Boss", "text", { onCard: true }),
      f("reward", "Reward", "text", { onCard: true }),
      f("about", "Walkthrough notes", "longtext"),
    ]),
    t("gold-skulltula", "Gold Skulltula", "Gold Skulltulas", "#e0b400", [
      f("how", "How to get it", "longtext", { onCard: true, required: true }),
      f("when", "When", "select", {
        onCard: true,
        options: [
          { key: "night", label: "Night only" },
          { key: "any", label: "Any time" },
        ],
      }),
      region(),
      f("needs", "Items needed", "entries", { targetTypes: ["item"] }),
    ]),
    t("heart-piece", "Piece of Heart", "Pieces of Heart", "#ff5a7a", [
      f("how", "How to get it", "longtext", { onCard: true, required: true }),
      region(),
      f("needs", "Items needed", "entries", { targetTypes: ["item"] }),
    ]),
    t("great-fairy", "Great Fairy", "Great Fairies", "#c77dff", [
      f("reward", "Reward", "text", { onCard: true }),
      f("how", "How to get there", "longtext"),
      region(),
    ]),
    t("song", "Song", "Songs", "#4fc3f7", [
      f("effect", "What it does", "text", { onCard: true }),
      f("teacher", "Learned from", "text"),
      f("how", "How to learn it", "longtext"),
    ]),
    t("item", "Item", "Items", "#7ee2a0", [
      f("how", "How to get it", "longtext", { onCard: true }),
      f("use", "What it does", "longtext"),
    ]),
    t("grotto", "Grotto", "Grottos", "#a1887f", [
      f("inside", "What's inside", "text", { onCard: true }),
      f("how", "How to open it", "longtext"),
      region(),
    ]),
    t(
      "character",
      "Character",
      "Characters",
      "#ffb86b",
      [f("about", "About", "longtext"), region("Found in")],
      {
        pinnable: false,
      },
    ),
  ];
  const all = (keys: string[]) => ({
    types: keys,
    tags: [],
    eras: [],
    statuses: [] as Array<"unconfirmed" | "confirmed">,
  });
  const map = current.maps[0];
  return {
    features: {
      eraSwitch: true,
      spoilers: true,
      search: true,
      unconfirmedLabel:
        "From the 1998 version, not yet confirmed in the remake",
    },
    eras: [
      { key: "child", label: "Young Link" },
      { key: "adult", label: "Adult Link" },
    ],
    spoilerStages: [
      { key: "deku-tree", label: "Inside the Deku Tree" },
      { key: "dodongos-cavern", label: "Dodongo's Cavern" },
      { key: "jabu-jabu", label: "Jabu-Jabu's Belly" },
      { key: "forest-temple", label: "Forest Temple" },
      { key: "fire-temple", label: "Fire Temple" },
      { key: "water-temple", label: "Water Temple" },
      { key: "shadow-temple", label: "Shadow Temple" },
      { key: "spirit-temple", label: "Spirit Temple" },
      { key: "ganons-castle", label: "Ganon's Castle" },
    ],
    types,
    maps: current.maps,
    checklists: [
      {
        key: "gold-skulltulas",
        title: "Gold Skulltulas",
        description: null,
        filter: all(["gold-skulltula"]),
      },
      {
        key: "pieces-of-heart",
        title: "Pieces of Heart",
        description: null,
        filter: all(["heart-piece"]),
      },
      {
        key: "great-fairies",
        title: "Great Fairies",
        description: null,
        filter: all(["great-fairy"]),
      },
      {
        key: "songs",
        title: "Songs",
        description: null,
        filter: all(["song"]),
      },
    ],
    sections: [
      ...(map
        ? [
            {
              key: "map",
              title: "Interactive map",
              style: "map" as const,
              filter: all([]),
              mapKey: map.key,
              checklistKey: null,
              entrySlug: null,
              limit: 8,
              sort: "order" as const,
            },
          ]
        : []),
      {
        key: "skulltulas",
        title: "Gold Skulltula tracker",
        style: "checklist",
        filter: all([]),
        mapKey: null,
        checklistKey: "gold-skulltulas",
        entrySlug: null,
        limit: 8,
        sort: "order",
      },
      {
        key: "hearts",
        title: "Pieces of Heart tracker",
        style: "checklist",
        filter: all([]),
        mapKey: null,
        checklistKey: "pieces-of-heart",
        entrySlug: null,
        limit: 8,
        sort: "order",
      },
      {
        key: "new",
        title: "Newest finds",
        style: "cards",
        filter: all(["gold-skulltula", "heart-piece", "great-fairy", "grotto"]),
        mapKey: null,
        checklistKey: null,
        entrySlug: null,
        limit: 6,
        sort: "newest",
      },
      {
        key: "dungeons",
        title: "Dungeons",
        style: "list",
        filter: all(["dungeon"]),
        mapKey: null,
        checklistKey: null,
        entrySlug: null,
        limit: 12,
        sort: "order",
      },
    ],
  };
}

export const EMPTY_TEMPLATE: HubTemplateConfig = {
  features: {
    eraSwitch: false,
    spoilers: false,
    search: true,
    unconfirmedLabel: "Unconfirmed",
  },
  eras: [],
  spoilerStages: [],
  types: [],
  maps: [],
  checklists: [],
  sections: [],
};
