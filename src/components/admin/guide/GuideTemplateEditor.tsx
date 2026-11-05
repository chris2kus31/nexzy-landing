"use client";

// Admin -> Guides -> Setup: the game's template. Edits stay in a draft until
// Publish. Every change is checked by the API on save; problems are listed by
// where they are (types[2].fields[1].options: ...). Nothing here is special
// to a game: Ocarina and GTA 6 are both just templates.
import { useState } from "react";
import { Box, Flex, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { FiArrowDown, FiArrowUp, FiTrash2 } from "react-icons/fi";
import type {
  FieldKind,
  HubChecklistDef,
  HubEntryType,
  HubFieldDef,
  HubFilter,
  HubMapDef,
  HubOption,
  HubSectionDef,
  HubTemplateConfig,
  SectionStyle,
} from "@/lib/hub-engine/types";
import {
  errorLines,
  fileToDataUrl,
  uploadEngineImage,
} from "@/lib/admin/client-hub-engine";
import {
  C,
  Card,
  Check,
  SubTabs,
  Gold,
  Labeled,
  LongIn,
  Pick,
  Plain,
  Problems,
  TextIn,
  keyify,
} from "@/components/admin/guide/ui";
import { TYPE_PRESETS, ocarinaPreset } from "@/components/admin/guide/presets";

const KINDS: { value: FieldKind; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "longtext", label: "Long text (bold, italic, links, lists)" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / no" },
  { value: "select", label: "Pick one (becomes a filter)" },
  { value: "multiselect", label: "Pick many (becomes a filter)" },
  { value: "image", label: "Photo" },
  { value: "gallery", label: "Photo gallery" },
  { value: "video", label: "Video link (YouTube, Streamable)" },
  { value: "url", label: "Web link" },
  { value: "entries", label: "Link to other entries" },
];
const STYLES: { value: SectionStyle; label: string }[] = [
  { value: "map", label: "Map" },
  { value: "cards", label: "Cards" },
  { value: "list", label: "List" },
  { value: "checklist", label: "Checklist" },
  { value: "featured", label: "Featured entry" },
];
const EMPTY_FILTER: HubFilter = { types: [], tags: [], eras: [], statuses: [] };

function move<T>(arr: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const optsToText = (o: HubOption[] = []) =>
  o.map((x) => `${x.key}: ${x.label}`).join("\n");
const textToOpts = (s: string): HubOption[] =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      const label = (i >= 0 ? l.slice(i + 1) : l).trim();
      const key =
        (i >= 0 ? keyify(l.slice(0, i)) : keyify(label)) || keyify(label);
      return { key, label };
    });

function RowTools({
  onUp,
  onDown,
  onRemove,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <HStack gap={1}>
      <Plain onClick={onUp}>
        <FiArrowUp aria-label="Move up" />
      </Plain>
      <Plain onClick={onDown}>
        <FiArrowDown aria-label="Move down" />
      </Plain>
      <Plain danger onClick={onRemove}>
        <FiTrash2 aria-label="Remove" />
      </Plain>
    </HStack>
  );
}

export default function GuideTemplateEditor({
  gameId,
  draft,
  onChange,
}: {
  gameId: string;
  draft: HubTemplateConfig;
  onChange: (c: HubTemplateConfig) => void;
}) {
  const set = (patch: Partial<HubTemplateConfig>) =>
    onChange({ ...draft, ...patch });
  const typeOpts = draft.types.map((t) => ({
    value: t.key,
    label: t.plural || t.key,
  }));
  const tagOpts = draft.types.flatMap((t) =>
    t.fields
      .filter((f) => f.kind === "select" || f.kind === "multiselect")
      .flatMap((f) =>
        (f.options ?? []).map((o) => ({
          value: `${f.key}:${o.key}`,
          label: `${t.label} / ${f.label}: ${o.label}`,
        })),
      ),
  );

  const [tab, setTab] = useState<SetupTab>("basics");

  return (
    <Stack gap={4}>
      <SubTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "basics", label: "Basics" },
          { key: "types", label: "Entry types", count: draft.types.length },
          {
            key: "maps",
            label: "Maps",
            count: draft.maps.length,
            warn: draft.maps.some((m) => !m.url),
          },
          {
            key: "checklists",
            label: "Checklists",
            count: draft.checklists.length,
          },
          {
            key: "sections",
            label: "Hub sections",
            count: draft.sections.length,
          },
        ]}
      />

      {tab === "basics" && (
        <>
          <Card
            title="Quick start"
            aside={
              <HStack gap={2} wrap="wrap">
                <Plain onClick={() => onChange(ocarinaPreset(draft))}>
                  Ocarina of Time starter
                </Plain>
              </HStack>
            }
          >
            <Text fontSize="sm" color={C.muted}>
              Fills in entry types, checklists and sections for a fast start.
              Everything stays editable. It replaces the current draft (maps you
              uploaded are kept), so use it before you customize.
            </Text>
          </Card>

          <Card title="Switches">
            <Stack gap={3}>
              <Flex gap={5} wrap="wrap">
                <Check
                  label="Era switch (for example Young / Adult)"
                  checked={draft.features.eraSwitch}
                  onChange={(v) =>
                    set({ features: { ...draft.features, eraSwitch: v } })
                  }
                />
                <Check
                  label="Spoiler control"
                  checked={draft.features.spoilers}
                  onChange={(v) =>
                    set({ features: { ...draft.features, spoilers: v } })
                  }
                />
                <Check
                  label="Search"
                  checked={draft.features.search}
                  onChange={(v) =>
                    set({ features: { ...draft.features, search: v } })
                  }
                />
              </Flex>
              <Labeled
                label="Label on unconfirmed entries"
                hint="Shown on cards, pins and pages of entries marked Unconfirmed."
              >
                <TextIn
                  value={draft.features.unconfirmedLabel}
                  maxLength={80}
                  onChange={(v) =>
                    set({
                      features: { ...draft.features, unconfirmedLabel: v },
                    })
                  }
                />
              </Labeled>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                <Labeled
                  label="Eras (one per line, key: Label)"
                  hint="Up to 6. Entries can belong to one or more eras."
                >
                  <LongIn
                    rows={3}
                    value={optsToText(draft.eras)}
                    onChange={(v) => set({ eras: textToOpts(v) })}
                    placeholder={"child: Young Link\nadult: Adult Link"}
                  />
                </Labeled>
                <Labeled
                  label="Spoiler stages, in story order (key: Label)"
                  hint="Readers pick how far they are; later stages stay hidden."
                >
                  <LongIn
                    rows={3}
                    value={optsToText(draft.spoilerStages)}
                    onChange={(v) => set({ spoilerStages: textToOpts(v) })}
                    placeholder={"forest-temple: Forest Temple"}
                  />
                </Labeled>
              </SimpleGrid>
            </Stack>
          </Card>
        </>
      )}

      {tab === "types" && (
        <TypesEditor
          gameId={gameId}
          types={draft.types}
          onChange={(types) => set({ types })}
        />
      )}
      {tab === "maps" && (
        <MapsEditor
          gameId={gameId}
          maps={draft.maps}
          onChange={(maps) => set({ maps })}
        />
      )}

      {tab === "checklists" && (
        <Card
          title={`Checklists (${draft.checklists.length})`}
          aside={
            <Plain
              onClick={() =>
                set({
                  checklists: [
                    ...draft.checklists,
                    {
                      key: "",
                      title: "",
                      description: null,
                      filter: { ...EMPTY_FILTER },
                    },
                  ],
                })
              }
            >
              Add checklist
            </Plain>
          }
        >
          <Stack gap={3}>
            {draft.checklists.map((c, i) => (
              <ChecklistRow
                key={i}
                c={c}
                typeOpts={typeOpts}
                tagOpts={tagOpts}
                onChange={(n) =>
                  set({
                    checklists: draft.checklists.map((x, j) =>
                      j === i ? n : x,
                    ),
                  })
                }
                tools={
                  <RowTools
                    onUp={() =>
                      set({ checklists: move(draft.checklists, i, -1) })
                    }
                    onDown={() =>
                      set({ checklists: move(draft.checklists, i, 1) })
                    }
                    onRemove={() =>
                      set({
                        checklists: draft.checklists.filter((_, j) => j !== i),
                      })
                    }
                  />
                }
              />
            ))}
            {!draft.checklists.length && (
              <Text fontSize="sm" color={C.faint}>
                No checklists yet. A checklist is a filter (for example all Gold
                Skulltulas) that readers tick off.
              </Text>
            )}
          </Stack>
        </Card>
      )}

      {tab === "sections" && (
        <Card
          title={`Hub sections (${draft.sections.length}), shown in this order`}
          aside={
            <Plain
              onClick={() =>
                set({
                  sections: [
                    ...draft.sections,
                    {
                      key: "",
                      title: "",
                      style: "cards",
                      filter: { ...EMPTY_FILTER },
                      mapKey: null,
                      checklistKey: null,
                      entrySlug: null,
                      limit: 8,
                      sort: "order",
                    },
                  ],
                })
              }
            >
              Add section
            </Plain>
          }
        >
          <Stack gap={3}>
            {draft.sections.map((s, i) => (
              <SectionRow
                key={i}
                s={s}
                draft={draft}
                typeOpts={typeOpts}
                tagOpts={tagOpts}
                onChange={(n) =>
                  set({
                    sections: draft.sections.map((x, j) => (j === i ? n : x)),
                  })
                }
                tools={
                  <RowTools
                    onUp={() => set({ sections: move(draft.sections, i, -1) })}
                    onDown={() => set({ sections: move(draft.sections, i, 1) })}
                    onRemove={() =>
                      set({
                        sections: draft.sections.filter((_, j) => j !== i),
                      })
                    }
                  />
                }
              />
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

type SetupTab = "basics" | "types" | "maps" | "checklists" | "sections";

// ───────────────────────── types + fields ─────────────────────────

function TypesEditor({
  gameId,
  types,
  onChange,
}: {
  gameId: string;
  types: HubEntryType[];
  onChange: (t: HubEntryType[]) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [preset, setPreset] = useState("");
  const add = (t: HubEntryType) => {
    onChange([...types, t]);
    setOpen(types.length);
  };
  return (
    <Card
      title={`Entry types (${types.length})`}
      aside={
        <HStack gap={2}>
          <Pick
            label="Add from preset"
            value={preset}
            onChange={(v) => {
              setPreset("");
              const p = TYPE_PRESETS.find((x) => x.key === v);
              if (p) add(JSON.parse(JSON.stringify(p)));
            }}
            options={[
              { value: "", label: "Add from preset..." },
              ...TYPE_PRESETS.map((p) => ({ value: p.key, label: p.label })),
            ]}
          />
          <Plain
            onClick={() =>
              add({
                key: "",
                label: "",
                plural: "",
                color: "#90a4ae",
                icon: null,
                pinnable: true,
                page: true,
                fields: [],
              })
            }
          >
            Add blank type
          </Plain>
        </HStack>
      }
    >
      <Stack gap={2}>
        {types.map((t, i) => (
          <Box
            key={i}
            border="1px solid"
            borderColor={C.line}
            borderRadius="10px"
            bg={C.raised}
          >
            <Flex
              p={3}
              align="center"
              gap={3}
              cursor="pointer"
              // Not a <button>: the row holds the RowTools buttons, and
              // buttons can't nest. Keyboard support is added by hand.
              role="button"
              tabIndex={0}
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? null : i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen(open === i ? null : i);
                }
              }}
            >
              <Box w="12px" h="12px" borderRadius="full" bg={t.color} />
              <Text color={C.text} fontWeight="700" flex="1">
                {t.label || "New type"}{" "}
                <Text as="span" color={C.faint} fontWeight="400">
                  ({t.key || "no key"}) · {t.fields.length} fields
                </Text>
              </Text>
              <Box onClick={(e) => e.stopPropagation()}>
                <RowTools
                  onUp={() => onChange(move(types, i, -1))}
                  onDown={() => onChange(move(types, i, 1))}
                  onRemove={() => onChange(types.filter((_, j) => j !== i))}
                />
              </Box>
            </Flex>
            {open === i && (
              <Box p={3} pt={0}>
                <TypeForm
                  gameId={gameId}
                  t={t}
                  allTypes={types}
                  onChange={(n) =>
                    onChange(types.map((x, j) => (j === i ? n : x)))
                  }
                />
              </Box>
            )}
          </Box>
        ))}
        {!types.length && (
          <Text fontSize="sm" color={C.faint}>
            No entry types yet. A type is a kind of thing in the game (location,
            collectible, mission...). Start from a preset.
          </Text>
        )}
      </Stack>
    </Card>
  );
}

function TypeForm({
  gameId,
  t,
  allTypes,
  onChange,
}: {
  gameId: string;
  t: HubEntryType;
  allTypes: HubEntryType[];
  onChange: (t: HubEntryType) => void;
}) {
  const [err, setErr] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<HubEntryType>) => onChange({ ...t, ...p });
  const uploadIcon = async (file: File) => {
    setBusy(true);
    setErr([]);
    try {
      const r = await uploadEngineImage(
        gameId,
        await fileToDataUrl(file),
        "icon",
      );
      set({ icon: r.url });
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Stack gap={3}>
      <SimpleGrid columns={{ base: 1, md: 4 }} gap={3}>
        <Labeled label="Name">
          <TextIn
            value={t.label}
            maxLength={40}
            onChange={(v) => set({ label: v })}
            onBlur={() => !t.key && set({ key: keyify(t.label) })}
          />
        </Labeled>
        <Labeled label="Plural">
          <TextIn
            value={t.plural}
            maxLength={40}
            onChange={(v) => set({ plural: v })}
          />
        </Labeled>
        <Labeled
          label="Key"
          hint="Used in page addresses. Don't change after entries exist."
        >
          <TextIn
            value={t.key}
            maxLength={32}
            onChange={(v) => set({ key: keyify(v) })}
          />
        </Labeled>
        <Labeled label="Pin color">
          <TextIn
            type="color"
            value={t.color}
            onChange={(v) => set({ color: v })}
          />
        </Labeled>
      </SimpleGrid>
      <Flex gap={5} wrap="wrap" align="center">
        <Check
          label="Can go on the map"
          checked={t.pinnable}
          onChange={(v) => set({ pinnable: v })}
        />
        <Check
          label="Each entry gets its own page"
          checked={t.page}
          onChange={(v) => set({ page: v })}
        />
        <HStack gap={2}>
          {t.icon && <img src={t.icon} alt="" width={24} height={24} />}
          <label
            style={{
              fontSize: 13,
              color: C.text,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {busy
              ? "Uploading..."
              : t.icon
                ? "Replace icon"
                : "Upload pin icon (optional)"}
            <input
              type="file"
              accept="image/png,image/svg+xml,image/webp"
              hidden
              onChange={(e) =>
                e.target.files?.[0] && uploadIcon(e.target.files[0])
              }
            />
          </label>
          {t.icon && (
            <Plain onClick={() => set({ icon: null })}>Remove icon</Plain>
          )}
        </HStack>
      </Flex>
      <Problems lines={err} />
      <Text fontSize="sm" color={C.muted} fontWeight="700">
        Fields
      </Text>
      {t.fields.map((f, i) => (
        <FieldForm
          key={i}
          f={f}
          allTypes={allTypes}
          onChange={(n) =>
            set({ fields: t.fields.map((x, j) => (j === i ? n : x)) })
          }
          tools={
            <RowTools
              onUp={() => set({ fields: move(t.fields, i, -1) })}
              onDown={() => set({ fields: move(t.fields, i, 1) })}
              onRemove={() =>
                set({ fields: t.fields.filter((_, j) => j !== i) })
              }
            />
          }
        />
      ))}
      <Box>
        <Plain
          onClick={() =>
            set({
              fields: [
                ...t.fields,
                {
                  key: "",
                  label: "",
                  kind: "text",
                  required: false,
                  onCard: false,
                },
              ],
            })
          }
        >
          Add field
        </Plain>
      </Box>
    </Stack>
  );
}

function FieldForm({
  f,
  allTypes,
  onChange,
  tools,
}: {
  f: HubFieldDef;
  allTypes: HubEntryType[];
  onChange: (f: HubFieldDef) => void;
  tools: React.ReactNode;
}) {
  const set = (p: Partial<HubFieldDef>) => onChange({ ...f, ...p });
  return (
    <Box
      bg={C.surface}
      borderRadius="8px"
      p={3}
      border="1px solid"
      borderColor={C.line}
    >
      <SimpleGrid columns={{ base: 1, md: 4 }} gap={3} alignItems="end">
        <Labeled label="Field name">
          <TextIn
            value={f.label}
            maxLength={40}
            onChange={(v) => set({ label: v })}
            onBlur={() =>
              !f.key && set({ key: keyify(f.label).replace(/-/g, "_") })
            }
          />
        </Labeled>
        <Labeled label="Key">
          <TextIn
            value={f.key}
            maxLength={32}
            onChange={(v) => set({ key: keyify(v).replace(/-/g, "_") })}
          />
        </Labeled>
        <Labeled label="Kind">
          <Pick
            label="Field kind"
            value={f.kind}
            onChange={(v) => set({ kind: v as FieldKind })}
            options={KINDS}
          />
        </Labeled>
        <Flex justify="flex-end">{tools}</Flex>
      </SimpleGrid>
      <Flex gap={5} mt={2} wrap="wrap">
        <Check
          label="Required"
          checked={f.required}
          onChange={(v) => set({ required: v })}
        />
        {f.kind !== "entries" && (
          <Check
            label="Show on cards and pin popups"
            checked={f.onCard}
            onChange={(v) => set({ onCard: v })}
          />
        )}
      </Flex>
      {(f.kind === "select" || f.kind === "multiselect") && (
        <Box mt={2}>
          <Labeled
            label="Options (one per line, key: Label)"
            hint="Each option becomes a filter chip."
          >
            <LongIn
              rows={3}
              value={optsToText(f.options)}
              onChange={(v) => set({ options: textToOpts(v) })}
            />
          </Labeled>
        </Box>
      )}
      {f.kind === "number" && (
        <SimpleGrid columns={2} gap={3} mt={2}>
          <Labeled label="Min (optional)">
            <TextIn
              type="number"
              value={f.min == null ? "" : String(f.min)}
              onChange={(v) => set({ min: v === "" ? null : Number(v) })}
            />
          </Labeled>
          <Labeled label="Max (optional)">
            <TextIn
              type="number"
              value={f.max == null ? "" : String(f.max)}
              onChange={(v) => set({ max: v === "" ? null : Number(v) })}
            />
          </Labeled>
        </SimpleGrid>
      )}
      {f.kind === "entries" && (
        <Box mt={2}>
          <Labeled label="Can link to (none ticked = any type)">
            <Flex gap={4} wrap="wrap">
              {allTypes
                .filter((t) => t.key)
                .map((t) => (
                  <Check
                    key={t.key}
                    label={t.plural || t.key}
                    checked={(f.targetTypes ?? []).includes(t.key)}
                    onChange={(on) =>
                      set({
                        targetTypes: on
                          ? [...(f.targetTypes ?? []), t.key]
                          : (f.targetTypes ?? []).filter((x) => x !== t.key),
                      })
                    }
                  />
                ))}
            </Flex>
          </Labeled>
        </Box>
      )}
    </Box>
  );
}

// ───────────────────────── maps ─────────────────────────

function MapsEditor({
  gameId,
  maps,
  onChange,
}: {
  gameId: string;
  maps: HubMapDef[];
  onChange: (m: HubMapDef[]) => void;
}) {
  const [busy, setBusy] = useState<number | "new" | null>(null);
  const [err, setErr] = useState<string[]>([]);
  const upload = async (file: File, i: number | "new") => {
    setBusy(i);
    setErr([]);
    try {
      const r = await uploadEngineImage(
        gameId,
        await fileToDataUrl(file),
        "map",
        4096,
      );
      if (i === "new") {
        const n = maps.length + 1;
        onChange([
          ...maps,
          {
            key: n === 1 ? "overworld" : `map-${n}`,
            name: n === 1 ? "Overworld" : `Map ${n}`,
            kind: "image",
            url: r.url,
            width: r.width,
            height: r.height,
            minZoom: -2,
            maxZoom: 2,
            artVersion: 1,
          },
        ]);
      } else {
        const m = maps[i];
        if (m.width !== r.width || m.height !== r.height)
          setErr([
            `New art is ${r.width}x${r.height}, the old one was ${m.width}x${m.height}. Pins stay at the same pixels, so check them on the Map tab after publishing.`,
          ]);
        onChange(
          maps.map((x, j) =>
            j === i
              ? {
                  ...x,
                  url: r.url,
                  width: r.width,
                  height: r.height,
                  artVersion: x.artVersion + 1,
                }
              : x,
          ),
        );
      }
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card
      title={`Maps (${maps.length})`}
      aside={
        <label
          style={{
            fontSize: 13,
            color: C.ink,
            background: C.gold,
            fontWeight: 700,
            borderRadius: 6,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          {busy === "new" ? "Uploading..." : "Upload map art"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            hidden
            onChange={(e) =>
              e.target.files?.[0] && upload(e.target.files[0], "new")
            }
          />
        </label>
      }
    >
      <Stack gap={3}>
        <Text fontSize="sm" color={C.muted}>
          Our own art only (never the game's map or another site's). SVG is
          converted to a sharp 4096px image. Keep files under 4 MB.
        </Text>
        <Problems lines={err} />
        {maps.map((m, i) => (
          <Flex
            key={i}
            gap={3}
            align="flex-start"
            bg={C.raised}
            p={3}
            borderRadius="10px"
            wrap="wrap"
          >
            <img src={m.url} alt="" width={120} style={{ borderRadius: 6 }} />
            <SimpleGrid columns={{ base: 1, md: 4 }} gap={3} flex="1">
              <Labeled label="Name">
                <TextIn
                  value={m.name}
                  maxLength={60}
                  onChange={(v) =>
                    onChange(
                      maps.map((x, j) => (j === i ? { ...x, name: v } : x)),
                    )
                  }
                />
              </Labeled>
              <Labeled label="Key">
                <TextIn
                  value={m.key}
                  maxLength={32}
                  onChange={(v) =>
                    onChange(
                      maps.map((x, j) =>
                        j === i ? { ...x, key: keyify(v) } : x,
                      ),
                    )
                  }
                />
              </Labeled>
              <Labeled label="Zoom out / in" hint="-2 to 2 is a good range">
                <HStack>
                  <TextIn
                    type="number"
                    value={String(m.minZoom)}
                    onChange={(v) =>
                      onChange(
                        maps.map((x, j) =>
                          j === i ? { ...x, minZoom: Number(v) } : x,
                        ),
                      )
                    }
                  />
                  <TextIn
                    type="number"
                    value={String(m.maxZoom)}
                    onChange={(v) =>
                      onChange(
                        maps.map((x, j) =>
                          j === i ? { ...x, maxZoom: Number(v) } : x,
                        ),
                      )
                    }
                  />
                </HStack>
              </Labeled>
              <Box>
                <Text fontSize="xs" color={C.faint}>
                  {m.width} x {m.height} px · art v{m.artVersion}
                </Text>
                <HStack mt={1} gap={2}>
                  <label
                    style={{
                      fontSize: 13,
                      color: C.text,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {busy === i ? "Uploading..." : "Replace art"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      hidden
                      onChange={(e) =>
                        e.target.files?.[0] && upload(e.target.files[0], i)
                      }
                    />
                  </label>
                  <Plain
                    danger
                    onClick={() => onChange(maps.filter((_, j) => j !== i))}
                  >
                    <FiTrash2 aria-label="Remove map" />
                  </Plain>
                </HStack>
              </Box>
            </SimpleGrid>
          </Flex>
        ))}
      </Stack>
    </Card>
  );
}

// ───────────────────────── checklists + sections ─────────────────────────

function MultiCheck({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string[];
  options: { value: string; label: string }[];
  onChange: (v: string[]) => void;
}) {
  return (
    <Labeled label={label}>
      <Flex gap={3} wrap="wrap">
        {options.map((o) => (
          <Check
            key={o.value}
            label={o.label}
            checked={value.includes(o.value)}
            onChange={(on) =>
              onChange(
                on ? [...value, o.value] : value.filter((x) => x !== o.value),
              )
            }
          />
        ))}
        {!options.length && (
          <Text fontSize="xs" color={C.faint}>
            None available yet
          </Text>
        )}
      </Flex>
    </Labeled>
  );
}

function ChecklistRow({
  c,
  typeOpts,
  tagOpts,
  onChange,
  tools,
}: {
  c: HubChecklistDef;
  typeOpts: { value: string; label: string }[];
  tagOpts: { value: string; label: string }[];
  onChange: (c: HubChecklistDef) => void;
  tools: React.ReactNode;
}) {
  return (
    <Box bg={C.raised} p={3} borderRadius="10px">
      <SimpleGrid columns={{ base: 1, md: 4 }} gap={3} alignItems="end">
        <Labeled label="Title">
          <TextIn
            value={c.title}
            maxLength={80}
            onChange={(v) => onChange({ ...c, title: v })}
            onBlur={() => !c.key && onChange({ ...c, key: keyify(c.title) })}
          />
        </Labeled>
        <Labeled label="Key" hint="Page address: /checklist/<key>">
          <TextIn
            value={c.key}
            maxLength={32}
            onChange={(v) => onChange({ ...c, key: keyify(v) })}
          />
        </Labeled>
        <Labeled label="Description (optional)">
          <TextIn
            value={c.description ?? ""}
            maxLength={300}
            onChange={(v) => onChange({ ...c, description: v || null })}
          />
        </Labeled>
        <Flex justify="flex-end">{tools}</Flex>
      </SimpleGrid>
      <Stack gap={2} mt={2}>
        <MultiCheck
          label="Entry types in this list"
          value={c.filter.types}
          options={typeOpts}
          onChange={(types) =>
            onChange({ ...c, filter: { ...c.filter, types } })
          }
        />
        {tagOpts.length > 0 && (
          <MultiCheck
            label="Only entries with all of these (optional)"
            value={c.filter.tags}
            options={tagOpts}
            onChange={(tags) =>
              onChange({ ...c, filter: { ...c.filter, tags } })
            }
          />
        )}
      </Stack>
    </Box>
  );
}

function SectionRow({
  s,
  draft,
  typeOpts,
  tagOpts,
  onChange,
  tools,
}: {
  s: HubSectionDef;
  draft: HubTemplateConfig;
  typeOpts: { value: string; label: string }[];
  tagOpts: { value: string; label: string }[];
  onChange: (s: HubSectionDef) => void;
  tools: React.ReactNode;
}) {
  return (
    <Box bg={C.raised} p={3} borderRadius="10px">
      <SimpleGrid columns={{ base: 1, md: 4 }} gap={3} alignItems="end">
        <Labeled label="Title">
          <TextIn
            value={s.title}
            maxLength={80}
            onChange={(v) => onChange({ ...s, title: v })}
            onBlur={() => !s.key && onChange({ ...s, key: keyify(s.title) })}
          />
        </Labeled>
        <Labeled label="Style">
          <Pick
            label="Section style"
            value={s.style}
            onChange={(v) => onChange({ ...s, style: v as SectionStyle })}
            options={STYLES}
          />
        </Labeled>
        <Labeled label="Key">
          <TextIn
            value={s.key}
            maxLength={32}
            onChange={(v) => onChange({ ...s, key: keyify(v) })}
          />
        </Labeled>
        <Flex justify="flex-end">{tools}</Flex>
      </SimpleGrid>
      <Box mt={2}>
        {s.style === "map" && (
          <Labeled label="Map">
            <Pick
              label="Map"
              value={s.mapKey ?? ""}
              onChange={(v) => onChange({ ...s, mapKey: v || null })}
              options={[
                { value: "", label: "Pick a map" },
                ...draft.maps.map((m) => ({ value: m.key, label: m.name })),
              ]}
            />
          </Labeled>
        )}
        {s.style === "checklist" && (
          <Labeled label="Checklist">
            <Pick
              label="Checklist"
              value={s.checklistKey ?? ""}
              onChange={(v) => onChange({ ...s, checklistKey: v || null })}
              options={[
                { value: "", label: "Pick a checklist" },
                ...draft.checklists.map((c) => ({
                  value: c.key,
                  label: c.title,
                })),
              ]}
            />
          </Labeled>
        )}
        {s.style === "featured" && (
          <Labeled
            label="Entry slug"
            hint="The entry's page address ending, for example kakariko-village"
          >
            <TextIn
              value={s.entrySlug ?? ""}
              maxLength={80}
              onChange={(v) => onChange({ ...s, entrySlug: v || null })}
            />
          </Labeled>
        )}
        {(s.style === "cards" || s.style === "list") && (
          <Stack gap={2}>
            <MultiCheck
              label="Entry types (none = all)"
              value={s.filter.types}
              options={typeOpts}
              onChange={(types) =>
                onChange({ ...s, filter: { ...s.filter, types } })
              }
            />
            {tagOpts.length > 0 && (
              <MultiCheck
                label="Only entries with all of these (optional)"
                value={s.filter.tags}
                options={tagOpts}
                onChange={(tags) =>
                  onChange({ ...s, filter: { ...s.filter, tags } })
                }
              />
            )}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              <Labeled label="How many (1-24)">
                <TextIn
                  type="number"
                  value={String(s.limit)}
                  onChange={(v) =>
                    onChange({
                      ...s,
                      limit: Math.max(1, Math.min(24, Number(v) || 1)),
                    })
                  }
                />
              </Labeled>
              <Labeled label="Order">
                <Pick
                  label="Order"
                  value={s.sort}
                  onChange={(v) =>
                    onChange({ ...s, sort: v as HubSectionDef["sort"] })
                  }
                  options={[
                    { value: "order", label: "Your order" },
                    { value: "newest", label: "Newest first" },
                    { value: "title", label: "A to Z" },
                  ]}
                />
              </Labeled>
            </SimpleGrid>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
