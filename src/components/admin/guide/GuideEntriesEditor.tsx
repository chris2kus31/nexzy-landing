"use client";

// Admin -> Guides -> Entries: every location, collectible, mission... of the
// game. The form is built from the entry type's fields in the template, so a
// new type or field needs no code. New entries start as Draft (admins only).
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Flex,
  HStack,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiPlus, FiRefreshCw, FiTrash2, FiX } from "react-icons/fi";
import type {
  HubEntryType,
  HubFieldDef,
  HubImage,
  HubTemplateConfig,
} from "@/lib/hub-engine/types";
import {
  ENTRY_STATUSES,
  createEngineEntry,
  deleteEngineEntry,
  errorLines,
  fileToDataUrl,
  getEngineEntry,
  listEngineEntries,
  updateEngineEntry,
  uploadEngineImage,
  type EngineEntry,
  type EngineEntryRow,
  type EntryInput,
  type EntryStatus,
} from "@/lib/admin/client-hub-engine";
import {
  C,
  Card,
  Check,
  Gold,
  Labeled,
  LongIn,
  Pick,
  Plain,
  Problems,
  TextIn,
} from "@/components/admin/guide/ui";

const STATUS_COLOR: Record<EntryStatus, string> = {
  draft: C.faint,
  unconfirmed: C.warn,
  confirmed: C.good,
  hidden: C.bad,
};

export default function GuideEntriesEditor({
  gameId,
  config,
  onOpenOnMap,
}: {
  gameId: string;
  config: HubTemplateConfig;
  onOpenOnMap?: (entryId: string) => void;
}) {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<EngineEntryRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string[]>([]);
  const [editing, setEditing] = useState<EngineEntry | "new" | null>(null);

  const load = useCallback(
    async (more = false) => {
      setLoading(true);
      setErr([]);
      try {
        const r = await listEngineEntries(gameId, {
          type: type || undefined,
          status: status || undefined,
          search: search.trim() || undefined,
          cursor: more ? (cursor ?? undefined) : undefined,
        });
        setRows((prev) => (more ? [...prev, ...r.items] : r.items));
        setCursor(r.nextCursor);
      } catch (e) {
        setErr(errorLines(e));
      } finally {
        setLoading(false);
      }
    },
    [gameId, type, status, search, cursor],
  );

  useEffect(() => {
    const t = setTimeout(() => void load(false), search ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, type, status, search]);

  const open = async (id: string) => {
    setErr([]);
    try {
      setEditing(await getEngineEntry(gameId, id));
    } catch (e) {
      setErr(errorLines(e));
    }
  };

  if (editing)
    return (
      <EntryForm
        gameId={gameId}
        config={config}
        entry={editing === "new" ? null : editing}
        defaultType={type || config.types[0]?.key || ""}
        onClose={(changed) => {
          setEditing(null);
          if (changed) void load(false);
        }}
        onOpenOnMap={onOpenOnMap}
      />
    );

  const label = (k: string) =>
    config.types.find((t) => t.key === k)?.label ?? k;
  return (
    <Stack gap={3}>
      <Flex gap={2} wrap="wrap" align="center">
        <Box w="200px">
          <Pick
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: "", label: "All types" },
              ...config.types.map((t) => ({ value: t.key, label: t.plural })),
            ]}
          />
        </Box>
        <Box w="170px">
          <Pick
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Any status" },
              ...ENTRY_STATUSES.map((s) => ({ value: s.key, label: s.label })),
            ]}
          />
        </Box>
        <Box w="240px">
          <TextIn
            value={search}
            placeholder="Search title or slug"
            onChange={setSearch}
          />
        </Box>
        <Plain onClick={() => void load(false)}>
          <FiRefreshCw aria-label="Refresh" />
        </Plain>
        <Box flex="1" />
        <Gold onClick={() => setEditing("new")} disabled={!config.types.length}>
          <FiPlus aria-hidden /> New entry
        </Gold>
      </Flex>
      {!config.types.length && (
        <Text color={C.warn} fontSize="sm">
          Add entry types on the Setup tab first.
        </Text>
      )}
      <Problems lines={err} />
      <Stack gap={1}>
        {rows.map((r) => (
          <Flex
            key={r.id}
            as="button"
            onClick={() => void open(r.id)}
            textAlign="left"
            bg={C.surface}
            border="1px solid"
            borderColor={C.line}
            borderRadius="8px"
            p={3}
            gap={3}
            align="center"
            _hover={{ borderColor: C.gold }}
          >
            <Badge
              bg="transparent"
              border="1px solid"
              borderColor={STATUS_COLOR[r.status]}
              color={STATUS_COLOR[r.status]}
            >
              {r.status}
            </Badge>
            <Text color={C.text} fontWeight="600" flex="1">
              {r.title}
            </Text>
            <Text fontSize="xs" color={C.muted}>
              {label(r.type)}
            </Text>
            <Text fontSize="xs" color={C.faint}>
              {r.pins} pin{r.pins === 1 ? "" : "s"}
            </Text>
          </Flex>
        ))}
        {!rows.length && !loading && (
          <Text color={C.faint} fontSize="sm">
            No entries match.
          </Text>
        )}
        {loading && <Spinner color={C.gold} size="sm" />}
        {cursor && !loading && (
          <Plain onClick={() => void load(true)}>Load more</Plain>
        )}
      </Stack>
    </Stack>
  );
}

// ───────────────────────── form ─────────────────────────

function EntryForm({
  gameId,
  config,
  entry,
  defaultType,
  onClose,
  onOpenOnMap,
}: {
  gameId: string;
  config: HubTemplateConfig;
  entry: EngineEntry | null;
  defaultType: string;
  onClose: (changed: boolean) => void;
  onOpenOnMap?: (entryId: string) => void;
}) {
  const [v, setV] = useState<EntryInput>(() =>
    entry
      ? {
          typeKey: entry.typeKey,
          title: entry.title,
          slug: entry.slug,
          summary: entry.summary,
          status: entry.status,
          spoilerStage: entry.spoilerStage,
          eras: entry.eras,
          sortOrder: entry.sortOrder,
          fields: entry.fields,
          media: entry.media,
        }
      : {
          typeKey: defaultType,
          title: "",
          status: "draft",
          eras: [],
          sortOrder: 0,
          fields: {},
          media: [],
        },
  );
  const [refs, setRefs] = useState(entry?.linkRefs ?? []);
  const [err, setErr] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<EngineEntry | null>(entry);
  const type = config.types.find((t) => t.key === v.typeKey);
  const set = (p: Partial<EntryInput>) => setV((cur) => ({ ...cur, ...p }));
  const setField = (k: string, val: unknown) =>
    setV((cur) => ({ ...cur, fields: { ...(cur.fields ?? {}), [k]: val } }));

  const save = async () => {
    setBusy(true);
    setErr([]);
    try {
      const r = saved
        ? await updateEngineEntry(gameId, saved.id, v, saved.updatedAt)
        : await createEngineEntry(gameId, v);
      setSaved(r);
      setRefs(r.linkRefs);
      setV((cur) => ({ ...cur, slug: r.slug }));
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (
      !saved ||
      !window.confirm(
        `Delete "${saved.title}"? Its pins and everyone's ticks for it go too.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteEngineEntry(gameId, saved.id);
      onClose(true);
    } catch (e) {
      setErr(errorLines(e));
      setBusy(false);
    }
  };

  return (
    <Stack gap={4}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
        <Text color={C.text} fontWeight="800" fontSize="lg">
          {saved ? `Edit: ${saved.title}` : "New entry"}
        </Text>
        <HStack gap={2}>
          {saved && onOpenOnMap && type?.pinnable && (
            <Plain onClick={() => onOpenOnMap(saved.id)}>
              Place on map ({saved.pins.length})
            </Plain>
          )}
          {saved && (
            <Plain danger onClick={() => void remove()}>
              <FiTrash2 aria-hidden /> Delete
            </Plain>
          )}
          <Plain onClick={() => onClose(!!saved)}>
            <FiX aria-hidden /> Close
          </Plain>
          <Gold onClick={() => void save()} loading={busy}>
            {saved ? "Save" : "Create"}
          </Gold>
        </HStack>
      </Flex>
      <Problems lines={err} />
      <Card>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
          <Labeled label="Type">
            <Pick
              label="Type"
              value={v.typeKey}
              onChange={(k) => set({ typeKey: k })}
              options={config.types.map((t) => ({
                value: t.key,
                label: t.label,
              }))}
            />
          </Labeled>
          <Labeled label="Title">
            <TextIn
              value={v.title}
              maxLength={120}
              onChange={(t) => set({ title: t })}
            />
          </Labeled>
          <Labeled
            label="Slug"
            hint={
              saved
                ? "Changing it changes the page address"
                : "Leave empty to build it from the title"
            }
          >
            <TextIn
              value={v.slug ?? ""}
              maxLength={80}
              onChange={(t) => set({ slug: t || null })}
            />
          </Labeled>
          <Labeled label="Status">
            <Pick
              label="Status"
              value={v.status ?? "draft"}
              onChange={(s) => set({ status: s as EntryStatus })}
              options={ENTRY_STATUSES.map((s) => ({
                value: s.key,
                label: `${s.label}: ${s.hint}`,
              }))}
            />
          </Labeled>
          {config.spoilerStages.length > 0 && (
            <Labeled
              label="Spoiler stage"
              hint="Hidden until the reader is this far"
            >
              <Pick
                label="Spoiler stage"
                value={v.spoilerStage ?? ""}
                onChange={(s) => set({ spoilerStage: s || null })}
                options={[
                  { value: "", label: "Not a spoiler" },
                  ...config.spoilerStages.map((s) => ({
                    value: s.key,
                    label: s.label,
                  })),
                ]}
              />
            </Labeled>
          )}
          <Labeled
            label="Order"
            hint="Lower comes first in lists and checklists"
          >
            <TextIn
              type="number"
              value={String(v.sortOrder ?? 0)}
              onChange={(n) => set({ sortOrder: Math.round(Number(n) || 0) })}
            />
          </Labeled>
        </SimpleGrid>
        {config.eras.length > 0 && (
          <Box mt={3}>
            <Labeled label="Eras (none ticked = every era)">
              <Flex gap={4}>
                {config.eras.map((e) => (
                  <Check
                    key={e.key}
                    label={e.label}
                    checked={(v.eras ?? []).includes(e.key)}
                    onChange={(on) =>
                      set({
                        eras: on
                          ? [...(v.eras ?? []), e.key]
                          : (v.eras ?? []).filter((x) => x !== e.key),
                      })
                    }
                  />
                ))}
              </Flex>
            </Labeled>
          </Box>
        )}
        <Box mt={3}>
          <Labeled
            label="Summary (optional, 300 max)"
            hint="One or two sentences; used for search results and link previews."
          >
            <LongIn
              rows={2}
              maxLength={300}
              value={v.summary ?? ""}
              onChange={(s) => set({ summary: s || null })}
            />
          </Labeled>
        </Box>
      </Card>

      {type && (
        <Card title={`${type.label} fields`}>
          <Stack gap={4}>
            {type.fields.map((f) => (
              <FieldInput
                key={f.key}
                gameId={gameId}
                config={config}
                field={f}
                value={v.fields?.[f.key]}
                refs={refs}
                onRefs={setRefs}
                onChange={(val) => setField(f.key, val)}
              />
            ))}
            {!type.fields.length && (
              <Text fontSize="sm" color={C.faint}>
                This type has no fields. Add some on the Setup tab.
              </Text>
            )}
          </Stack>
        </Card>
      )}

      <Card title="Photos">
        <Gallery
          gameId={gameId}
          value={v.media ?? []}
          max={12}
          onChange={(m) => set({ media: m })}
        />
      </Card>
    </Stack>
  );
}

export function FieldInput({
  gameId,
  config,
  field: f,
  value,
  refs,
  onRefs,
  onChange,
}: {
  gameId: string;
  config: HubTemplateConfig;
  field: HubFieldDef;
  value: unknown;
  refs: { id: string; slug: string; title: string; type: string }[];
  onRefs: (
    r: { id: string; slug: string; title: string; type: string }[],
  ) => void;
  onChange: (v: unknown) => void;
}) {
  const label = `${f.label}${f.required ? " *" : ""}`;
  switch (f.kind) {
    case "text":
      return (
        <Labeled label={label}>
          <TextIn
            value={typeof value === "string" ? value : ""}
            maxLength={300}
            onChange={(s) => onChange(s || undefined)}
          />
        </Labeled>
      );
    case "longtext":
      return (
        <Labeled
          label={label}
          hint="**bold**, *italic*, [link](https://...), lines starting with - for a list"
        >
          <LongIn
            rows={5}
            maxLength={10000}
            value={typeof value === "string" ? value : ""}
            onChange={(s) => onChange(s || undefined)}
          />
        </Labeled>
      );
    case "number":
      return (
        <Labeled label={label}>
          <TextIn
            type="number"
            value={typeof value === "number" ? String(value) : ""}
            onChange={(s) => onChange(s === "" ? undefined : Number(s))}
          />
        </Labeled>
      );
    case "boolean":
      return (
        <Check
          label={f.label}
          checked={value === true}
          onChange={(b) => onChange(b)}
        />
      );
    case "select":
      return (
        <Labeled label={label}>
          <Pick
            label={f.label}
            value={typeof value === "string" ? value : ""}
            onChange={(s) => onChange(s || undefined)}
            options={[
              { value: "", label: "Not set" },
              ...(f.options ?? []).map((o) => ({
                value: o.key,
                label: o.label,
              })),
            ]}
          />
        </Labeled>
      );
    case "multiselect": {
      const cur = Array.isArray(value) ? (value as string[]) : [];
      return (
        <Labeled label={label}>
          <Flex gap={4} wrap="wrap">
            {(f.options ?? []).map((o) => (
              <Check
                key={o.key}
                label={o.label}
                checked={cur.includes(o.key)}
                onChange={(on) =>
                  onChange(
                    on ? [...cur, o.key] : cur.filter((x) => x !== o.key),
                  )
                }
              />
            ))}
          </Flex>
        </Labeled>
      );
    }
    case "image": {
      const img =
        value && typeof value === "object" ? (value as HubImage) : null;
      return (
        <Labeled label={label}>
          <Gallery
            gameId={gameId}
            value={img ? [img] : []}
            max={1}
            onChange={(m) => onChange(m[0])}
          />
        </Labeled>
      );
    }
    case "gallery":
      return (
        <Labeled label={label}>
          <Gallery
            gameId={gameId}
            value={Array.isArray(value) ? (value as HubImage[]) : []}
            max={f.maxItems ?? 12}
            onChange={(m) => onChange(m.length ? m : undefined)}
          />
        </Labeled>
      );
    case "video":
    case "url":
      return (
        <Labeled
          label={label}
          hint={
            f.kind === "video" ? "YouTube or Streamable link" : "https:// link"
          }
        >
          <TextIn
            value={typeof value === "string" ? value : ""}
            maxLength={500}
            onChange={(s) => onChange(s || undefined)}
          />
        </Labeled>
      );
    case "entries": {
      const ids = Array.isArray(value) ? (value as string[]) : [];
      return (
        <Labeled label={label}>
          <EntryPicker
            gameId={gameId}
            config={config}
            field={f}
            ids={ids}
            refs={refs}
            onRefs={onRefs}
            onChange={(n) => onChange(n.length ? n : undefined)}
          />
        </Labeled>
      );
    }
    default:
      return null;
  }
}

export function Gallery({
  gameId,
  value,
  max,
  onChange,
}: {
  gameId: string;
  value: HubImage[];
  max: number;
  onChange: (m: HubImage[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string[]>([]);
  const add = async (files: FileList) => {
    setBusy(true);
    setErr([]);
    const out = [...value];
    try {
      for (const file of Array.from(files).slice(0, max - value.length)) {
        const r = await uploadEngineImage(
          gameId,
          await fileToDataUrl(file),
          "photo",
        );
        out.push({ url: r.url, alt: null });
      }
      onChange(out);
    } catch (e) {
      setErr(errorLines(e));
      onChange(out);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Stack gap={2}>
      <Flex gap={2} wrap="wrap">
        {value.map((m, i) => (
          <Box key={m.url} w="160px" bg={C.raised} borderRadius="8px" p={2}>
            <img
              src={m.url}
              alt=""
              style={{
                width: "100%",
                height: 90,
                objectFit: "cover",
                borderRadius: 6,
              }}
            />
            <TextIn
              value={m.alt ?? ""}
              placeholder="Describe the photo"
              maxLength={160}
              onChange={(a) =>
                onChange(
                  value.map((x, j) => (j === i ? { ...x, alt: a || null } : x)),
                )
              }
            />
            <Plain
              danger
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              Remove
            </Plain>
          </Box>
        ))}
      </Flex>
      {value.length < max && (
        <label
          style={{
            fontSize: 13,
            color: C.text,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {busy ? "Uploading..." : "Add photo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            multiple={max > 1}
            hidden
            onChange={(e) => e.target.files && void add(e.target.files)}
          />
        </label>
      )}
      <Problems lines={err} />
    </Stack>
  );
}

function EntryPicker({
  gameId,
  config,
  field,
  ids,
  refs,
  onRefs,
  onChange,
}: {
  gameId: string;
  config: HubTemplateConfig;
  field: HubFieldDef;
  ids: string[];
  refs: { id: string; slug: string; title: string; type: string }[];
  onRefs: (
    r: { id: string; slug: string; title: string; type: string }[],
  ) => void;
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<EngineEntryRow[]>([]);
  const targets = field.targetTypes ?? [];
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await listEngineEntries(gameId, {
          search: s,
          type: targets.length === 1 ? targets[0] : undefined,
        });
        setHits(
          r.items
            .filter((x) => !targets.length || targets.includes(x.type))
            .slice(0, 8),
        );
      } catch {
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, gameId]);
  const label = (id: string) =>
    refs.find((r) => r.id === id)?.title ?? "Linked entry";
  const typeLabel = (k: string) =>
    config.types.find((t) => t.key === k)?.label ?? k;
  return (
    <Stack gap={2}>
      <Flex gap={2} wrap="wrap">
        {ids.map((id) => (
          <HStack
            key={id}
            bg={C.raised}
            borderRadius="999px"
            px={3}
            py={1}
            gap={2}
          >
            <Text fontSize="sm" color={C.text}>
              {label(id)}
            </Text>
            <Box
              as="button"
              onClick={() => onChange(ids.filter((x) => x !== id))}
              aria-label="Remove link"
              color={C.muted}
            >
              <FiX />
            </Box>
          </HStack>
        ))}
      </Flex>
      {(field.maxItems == null || ids.length < field.maxItems) && (
        <Box position="relative" maxW="360px">
          <TextIn
            value={q}
            placeholder="Search entries to link"
            onChange={setQ}
          />
          {hits.length > 0 && (
            <Box
              position="absolute"
              zIndex={3}
              top="100%"
              left={0}
              right={0}
              bg={C.surface}
              border="1px solid"
              borderColor={C.line}
              borderRadius="8px"
              mt={1}
            >
              {hits.map((h) => (
                <Flex
                  key={h.id}
                  as="button"
                  w="100%"
                  textAlign="left"
                  p={2}
                  gap={2}
                  _hover={{ bg: C.raised }}
                  onClick={() => {
                    if (!ids.includes(h.id)) {
                      onRefs([
                        ...refs,
                        {
                          id: h.id,
                          slug: h.slug,
                          title: h.title,
                          type: h.type,
                        },
                      ]);
                      onChange([...ids, h.id]);
                    }
                    setQ("");
                    setHits([]);
                  }}
                >
                  <Text fontSize="sm" color={C.text} flex="1">
                    {h.title}
                  </Text>
                  <Text fontSize="xs" color={C.muted}>
                    {typeLabel(h.type)}
                  </Text>
                </Flex>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Stack>
  );
}
