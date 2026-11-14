"use client";

// Admin -> Mega hubs -> Room lists (R4, mockup A1). One game's recommended
// lists: ready-made checklists a host loads into a room's List tab. A table
// (name, items, kinds, shown or hidden, rooms that used it) and a side editor
// (name, kinds, shown to hosts, one item per line, import from a guide
// checklist). Each list saves on its own (PUT .../lists/:key), so two people
// editing different lists never overwrite each other, and the Rooms tab's
// Save never touches lists.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { FiDownload, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import {
  ROOM_PROFILE_LIMITS as L,
  deleteRoomList,
  getRoomLists,
  saveRoomList,
  type RoomListRow,
  type RoomListsAdmin,
} from "@/lib/admin/client-rooms";
import {
  getEngineTemplate,
  listEngineEntries,
} from "@/lib/admin/client-hub-engine";
import type { HubChecklistDef } from "@/lib/hub-engine/types";

const C = {
  surface: "#222849",
  raised: "#2a3156",
  line: "rgba(255,255,255,0.08)",
  text: "#EDF2F7",
  muted: "#9AA3BF",
  faint: "#6B7394",
  good: "#7EE2A0",
  bad: "#FF8A80",
  gold: "#FFD700",
  ink: "#11152b",
};

const inputProps = {
  size: "sm" as const,
  bg: C.raised,
  color: C.text,
  borderColor: C.line,
};

/** Name -> a key the API accepts (^[a-z0-9_-]{1,24}$), unique in `taken`. */
function keyFor(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 21) || "list";
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n++) {
    const k = `${base}-${n}`;
    if (!taken.has(k)) return k;
  }
  return `${base}-${Date.now() % 1000}`;
}

/** Textarea -> items: trimmed, no blanks, no repeats (the server does the
 *  same; doing it here keeps the count honest). */
const parseItems = (text: string) => [
  ...new Set(
    text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  ),
];

interface Draft {
  /** null = a new list (key made from the name on save). */
  key: string | null;
  label: string;
  text: string;
  kinds: string[];
  enabled: boolean;
}

const EMPTY: Draft = {
  key: null,
  label: "",
  text: "",
  kinds: [],
  enabled: true,
};

const toDraft = (l: RoomListRow): Draft => ({
  key: l.key,
  label: l.label,
  text: l.items.join("\n"),
  kinds: l.kinds,
  enabled: l.enabled,
});

/** Guide checklists whose filter the admin entries list can match exactly
 *  (types and statuses only; tag and era filters need the full entry). */
type Importable = HubChecklistDef & { exact: boolean };

export default function RoomListsCard({
  gameId,
  gameName,
}: {
  gameId: string;
  gameName: string;
}) {
  const [data, setData] = useState<RoomListsAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  /** The list open in the editor, or null (nothing open). */
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [checklists, setChecklists] = useState<Importable[]>([]);
  const [importKey, setImportKey] = useState("");
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setData(await getRoomLists(gameId));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The guide's published checklists, for "Import from the guide". A game
  // without a guide simply has none (the control hides).
  useEffect(() => {
    let live = true;
    getEngineTemplate(gameId)
      .then((t) => {
        if (!live) return;
        const list = t.published?.checklists ?? [];
        setChecklists(
          list.map((c) => ({
            ...c,
            exact: !c.filter.tags.length && !c.filter.eras.length,
          })),
        );
      })
      .catch(() => live && setChecklists([]));
    return () => {
      live = false;
    };
  }, [gameId]);

  const kindLabel = useMemo(
    () => new Map((data?.kinds ?? []).map((k) => [k.key, k.label])),
    [data],
  );
  const saved = draft?.key
    ? (data?.lists.find((l) => l.key === draft.key) ?? null)
    : null;
  const items = useMemo(() => (draft ? parseItems(draft.text) : []), [draft]);
  const dirty = draft
    ? !saved ||
      JSON.stringify(toDraft(saved)) !==
        JSON.stringify({ ...draft, text: items.join("\n") })
    : false;

  const issues: string[] = [];
  if (draft) {
    if (draft.label.trim().length < 2) issues.push("Give the list a name.");
    if (draft.label.length > L.listName)
      issues.push(`Names are ${L.listName} characters max.`);
    if (!items.length) issues.push("Add at least one item.");
    if (items.length > L.listItems)
      issues.push(`${items.length} items: ${L.listItems} max.`);
    const long = items.filter((i) => i.length > L.listLabel).length;
    if (long)
      issues.push(
        `${long} item${long === 1 ? " is" : "s are"} over ${L.listLabel} characters.`,
      );
  }
  const full = !!data && data.lists.length >= data.max;

  const open = (d: Draft) => {
    setDraft(d);
    setConfirmDelete(false);
    setMsg(null);
    setImportKey("");
  };

  const save = async () => {
    if (!draft || !data || issues.length) return;
    setSaving(true);
    setMsg(null);
    const key =
      draft.key ?? keyFor(draft.label, new Set(data.lists.map((l) => l.key)));
    try {
      const next = await saveRoomList(gameId, key, {
        label: draft.label.trim(),
        items,
        kinds: draft.kinds,
        enabled: draft.enabled,
      });
      setData(next);
      const row = next.lists.find((l) => l.key === key);
      if (row) setDraft(toDraft(row));
      setMsg({ ok: true, text: "Saved. Hosts see it on their next load." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.key) return;
    setSaving(true);
    setMsg(null);
    try {
      setData(await deleteRoomList(gameId, draft.key));
      setDraft(null);
      setConfirmDelete(false);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  /** Append a guide checklist's entries (guide order), keeping what's typed. */
  const importChecklist = async () => {
    const c = checklists.find((x) => x.key === importKey);
    if (!c || !draft) return;
    setImporting(true);
    setMsg(null);
    try {
      const statuses = c.filter.statuses.length
        ? c.filter.statuses
        : ["confirmed", "unconfirmed"];
      const types = c.filter.types.length ? c.filter.types : [undefined];
      const rows: Array<{ title: string; sortOrder: number }> = [];
      for (const type of types) {
        let cursor: string | undefined;
        // Pages of the admin list; stop well past the 200-item cap.
        for (let page = 0; page < 20; page++) {
          const r = await listEngineEntries(gameId, { type, cursor });
          r.items
            .filter((e) => (statuses as string[]).includes(e.status))
            .forEach((e) =>
              rows.push({ title: e.title, sortOrder: e.sortOrder }),
            );
          if (!r.nextCursor || rows.length > L.listItems * 2) break;
          cursor = r.nextCursor;
        }
      }
      rows.sort((a, b) => a.sortOrder - b.sortOrder);
      const merged = parseItems(
        [draft.text, ...rows.map((r) => r.title)].join("\n"),
      );
      setDraft({
        ...draft,
        label: draft.label || c.title.slice(0, L.listName),
        text: merged.join("\n"),
      });
      setMsg({
        ok: true,
        text: `Added ${rows.length} from "${c.title}". Check the list, then Save.`,
      });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setImporting(false);
    }
  };

  if (loading && !data) {
    return (
      <Box bg={C.surface} borderRadius="14px" p={5}>
        <Spinner size="sm" color={C.muted} />
      </Box>
    );
  }

  return (
    <Box
      bg={C.surface}
      borderRadius="14px"
      p={5}
      border="1px solid"
      borderColor={C.line}
    >
      <Flex justify="space-between" align="start" gap={3} wrap="wrap" mb={4}>
        <Box>
          <Text fontWeight="700" color={C.text}>
            Recommended lists
          </Text>
          <Text fontSize="xs" color={C.muted} maxW="640px">
            Ready-made checklists hosts can load into a room&apos;s List tab for{" "}
            {gameName}. Tag a list with kinds to suggest it only there (none =
            every kind). Hidden lists stay here but hosts don&apos;t see them.
            Rooms that already loaded a list keep their copy.
          </Text>
        </Box>
        <HStack gap={2}>
          <Button
            size="sm"
            variant="ghost"
            color={C.muted}
            onClick={() => void load()}
            aria-label="Refresh"
          >
            <FiRefreshCw />
          </Button>
          <Button
            size="sm"
            bg={C.gold}
            color={C.ink}
            fontWeight="700"
            disabled={full}
            onClick={() => open(EMPTY)}
          >
            <FiPlus /> New list
          </Button>
        </HStack>
      </Flex>

      {err && (
        <Text fontSize="sm" color={C.bad} role="alert" mb={3}>
          {err}
        </Text>
      )}
      {data && !data.kinds.length && (
        <Text fontSize="sm" color={C.muted} mb={3}>
          Set up rooms for this game on the Rooms tab first (lists need its
          kinds).
        </Text>
      )}

      <Flex gap={4} direction={{ base: "column", lg: "row" }} align="start">
        {/* Table */}
        <Box flex="1" minW={0} w="100%">
          <Box
            display="grid"
            gridTemplateColumns="minmax(140px,2fr) 70px minmax(110px,1.5fr) 80px 70px"
            gap={2}
            px={3}
            py={2}
            borderBottom="1px solid"
            borderColor={C.line}
            fontSize="2xs"
            fontWeight="700"
            color={C.faint}
            textTransform="uppercase"
            letterSpacing="0.05em"
          >
            <Text>List</Text>
            <Text>Items</Text>
            <Text>For kinds</Text>
            <Text>Hosts</Text>
            <Text>Rooms</Text>
          </Box>
          {data?.lists.length === 0 && (
            <Text fontSize="sm" color={C.muted} px={3} py={4}>
              No lists yet. New list, or import one from the guide.
            </Text>
          )}
          {data?.lists.map((l) => {
            const active = draft?.key === l.key;
            return (
              <Box
                key={l.key}
                as="button"
                onClick={() => open(toDraft(l))}
                aria-pressed={active}
                display="grid"
                gridTemplateColumns="minmax(140px,2fr) 70px minmax(110px,1.5fr) 80px 70px"
                gap={2}
                px={3}
                py={2.5}
                w="100%"
                textAlign="left"
                alignItems="center"
                borderBottom="1px solid"
                borderColor={C.line}
                bg={active ? "rgba(255,215,0,0.08)" : "transparent"}
                _hover={{ bg: active ? undefined : C.raised }}
              >
                <Box minW={0}>
                  <Text fontSize="sm" color={C.text} fontWeight="600" truncate>
                    {l.label}
                  </Text>
                  <Text fontSize="2xs" fontFamily="mono" color={C.faint}>
                    {l.key}
                  </Text>
                </Box>
                <Text fontSize="sm" color={C.text}>
                  {l.items.length}
                </Text>
                <Text fontSize="xs" color={C.muted} truncate>
                  {l.kinds.length
                    ? l.kinds.map((k) => kindLabel.get(k) ?? k).join(", ")
                    : "All kinds"}
                </Text>
                <Box>
                  <Badge
                    size="sm"
                    bg={l.enabled ? "rgba(126,226,160,0.15)" : C.raised}
                    color={l.enabled ? C.good : C.faint}
                  >
                    {l.enabled ? "Shown" : "Hidden"}
                  </Badge>
                </Box>
                <Text fontSize="sm" color={C.muted}>
                  {l.rooms}
                </Text>
              </Box>
            );
          })}
          {data && (
            <Text fontSize="xs" color={C.faint} px={3} pt={2}>
              {data.lists.length} of {data.max} lists
            </Text>
          )}
        </Box>

        {/* Side editor */}
        {draft && (
          <Box
            w={{ base: "100%", lg: "400px" }}
            flexShrink={0}
            bg={C.raised}
            borderRadius="12px"
            p={4}
          >
            <Flex justify="space-between" align="center" mb={3}>
              <Text fontWeight="700" color={C.text}>
                {draft.key ? "Edit list" : "New list"}
              </Text>
              <Button
                size="xs"
                variant="ghost"
                color={C.muted}
                onClick={() => setDraft(null)}
              >
                Close
              </Button>
            </Flex>

            <Flex direction="column" gap={3}>
              <Box>
                <Text fontSize="xs" color={C.muted} mb={1}>
                  Name
                </Text>
                <Input
                  {...inputProps}
                  bg={C.surface}
                  maxLength={L.listName}
                  placeholder="e.g. Gold Skulltulas by area"
                  value={draft.label}
                  onChange={(e) =>
                    setDraft({ ...draft, label: e.target.value })
                  }
                />
                {draft.key && (
                  <Text fontSize="2xs" fontFamily="mono" color={C.faint} mt={1}>
                    {draft.key}
                  </Text>
                )}
              </Box>

              <Box>
                <Text fontSize="xs" color={C.muted} mb={1}>
                  Suggest for (none = every kind)
                </Text>
                <HStack gap={3} wrap="wrap">
                  {(data?.kinds ?? []).map((k) => (
                    <Checkbox.Root
                      key={k.key}
                      size="sm"
                      checked={draft.kinds.includes(k.key)}
                      onCheckedChange={(e) =>
                        setDraft({
                          ...draft,
                          kinds: e.checked
                            ? [...new Set([...draft.kinds, k.key])]
                            : draft.kinds.filter((x) => x !== k.key),
                        })
                      }
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label color={C.text} fontSize="sm">
                        {k.label}
                      </Checkbox.Label>
                    </Checkbox.Root>
                  ))}
                </HStack>
              </Box>

              <Checkbox.Root
                size="sm"
                checked={draft.enabled}
                onCheckedChange={(e) =>
                  setDraft({ ...draft, enabled: !!e.checked })
                }
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label color={C.text} fontSize="sm">
                  Shown to hosts
                </Checkbox.Label>
              </Checkbox.Root>

              <Box>
                <Flex justify="space-between" mb={1}>
                  <Text fontSize="xs" color={C.muted}>
                    Items, one per line
                  </Text>
                  <Text
                    fontSize="xs"
                    color={items.length > L.listItems ? C.bad : C.faint}
                  >
                    {items.length} / {L.listItems}
                  </Text>
                </Flex>
                <Textarea
                  {...inputProps}
                  bg={C.surface}
                  rows={12}
                  fontFamily="mono"
                  fontSize="xs"
                  placeholder={
                    "Kokiri Forest: Know-It-All Brothers' house\nLost Woods: Bean patch"
                  }
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                />
              </Box>

              {checklists.length > 0 && (
                <Box>
                  <Text fontSize="xs" color={C.muted} mb={1}>
                    Import from the guide (adds below what&apos;s here)
                  </Text>
                  <HStack gap={2}>
                    <NativeSelect.Root size="sm" flex="1">
                      <NativeSelect.Field
                        value={importKey}
                        onChange={(e) => setImportKey(e.target.value)}
                        bg={C.surface}
                        color={C.text}
                      >
                        <option value="">Pick a checklist</option>
                        {checklists.map((c) => (
                          <option key={c.key} value={c.key} disabled={!c.exact}>
                            {c.title}
                            {c.exact ? "" : " (filters by tag or era)"}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                    <Button
                      size="sm"
                      bg={C.surface}
                      color={C.text}
                      disabled={!importKey || importing}
                      loading={importing}
                      onClick={() => void importChecklist()}
                    >
                      <FiDownload /> Import
                    </Button>
                  </HStack>
                </Box>
              )}

              {issues.length > 0 && dirty && (
                <Box>
                  {issues.map((p) => (
                    <Text key={p} fontSize="xs" color={C.bad}>
                      {p}
                    </Text>
                  ))}
                </Box>
              )}
              {msg && (
                <Text
                  fontSize="sm"
                  color={msg.ok ? C.good : C.bad}
                  role={msg.ok ? undefined : "alert"}
                >
                  {msg.text}
                </Text>
              )}

              <Flex justify="space-between" align="center" gap={2} wrap="wrap">
                {draft.key ? (
                  confirmDelete ? (
                    <HStack gap={2}>
                      <Text fontSize="xs" color={C.bad}>
                        Delete for good?
                      </Text>
                      <Button
                        size="xs"
                        bg={C.bad}
                        color={C.ink}
                        loading={saving}
                        onClick={() => void remove()}
                      >
                        Delete
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        color={C.muted}
                        onClick={() => setConfirmDelete(false)}
                      >
                        Keep
                      </Button>
                    </HStack>
                  ) : (
                    <Button
                      size="xs"
                      variant="ghost"
                      color={C.bad}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <FiTrash2 /> Delete list
                    </Button>
                  )
                ) : (
                  <span />
                )}
                <Button
                  size="sm"
                  bg={C.gold}
                  color={C.ink}
                  fontWeight="700"
                  loading={saving}
                  disabled={!dirty || issues.length > 0 || (!draft.key && full)}
                  onClick={() => void save()}
                >
                  Save list
                </Button>
              </Flex>
            </Flex>
          </Box>
        )}
      </Flex>
    </Box>
  );
}
