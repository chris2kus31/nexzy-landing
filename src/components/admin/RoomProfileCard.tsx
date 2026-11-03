"use client";

// Admin -> Mega hubs -> Rooms card (Phase 3 Step 4). One game's Squad Rooms
// profile: whether the game has rooms at all, which room kinds people can
// open, tabs, Crew ID platforms, spoiler stages, list templates and the
// minimum age. Saved on its own (PUT newsroom/admin/room-profiles/:gameId),
// separate from the hub profile's Save bar.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { FiPlus, FiTrash2 } from "react-icons/fi";
import {
  CREW_PLATFORM_OPTIONS,
  EMPTY_ROOM_PROFILE,
  ROOM_PROFILE_LIMITS as L,
  ROOM_TAB_OPTIONS,
  getRoomProfile,
  saveRoomProfile,
  type RoomKindConfig,
  type RoomProfileInput,
} from "@/lib/admin/client-rooms";

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

/** Label -> a stable key the API accepts (^[a-z0-9_-]{1,24}$). */
const keyFrom = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "item";

/** Rows added in this editing session carry a client-only `_new` flag: only
 *  they get their key rebuilt from the label. Rows loaded from the server keep
 *  their key forever (rooms reference it), even if a new label collides. */
type Fresh = { _new?: true };
const isNew = (row: object) => !!(row as Fresh)._new;
/** Spread into a new row (typed `object` so it passes the row types). */
const FRESH: object = { _new: true };
const strip = <T extends object>(rows: T[]): T[] =>
  rows.map((r) => {
    const { _new, ...rest } = r as T & Fresh;
    void _new;
    return rest as T;
  });
function clean(d: RoomProfileInput): RoomProfileInput {
  return {
    ...d,
    kinds: strip(d.kinds),
    spoilerStages: strip(d.spoilerStages),
    listTemplates: strip(d.listTemplates),
  };
}

/** The single-player launch setup (GTA 6, Ocarina): no co-op kind. */
const LAUNCH_PRESET_KINDS: RoomKindConfig[] = [
  {
    key: "launch-night",
    label: "Launch Night",
    defaultSize: 200,
    maxSize: 200,
    staffOnly: true,
  },
  { key: "play-along", label: "Play-along", defaultSize: 8, maxSize: 20 },
  { key: "hunt", label: "Hunt", defaultSize: 8, maxSize: 20 },
  {
    key: "crew",
    label: "Crew",
    defaultSize: 50,
    maxSize: 50,
    persistent: true,
  },
];

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="xs" color={C.muted} mb={2}>
      {children}
    </Text>
  );
}

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <Box borderTop="1px solid" borderColor={C.line} pt={4}>
      <Text fontSize="sm" fontWeight="700" color={C.text}>
        {label}
      </Text>
      <Hint>{hint}</Hint>
      {children}
    </Box>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={(e) => onChange(!!e.checked)}
      size="sm"
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control />
      <Checkbox.Label color={C.text} fontSize="sm">
        {label}
      </Checkbox.Label>
    </Checkbox.Root>
  );
}

function problems(d: RoomProfileInput): string[] {
  const out: string[] = [];
  const dup = (what: string, keys: string[]) => {
    if (new Set(keys).size !== keys.length)
      out.push(`Two ${what} share a key.`);
  };
  if (d.kinds.length > L.kinds) out.push(`At most ${L.kinds} kinds.`);
  for (const k of d.kinds) {
    if (!L.keyRe.test(k.key))
      out.push(
        `Kind "${k.label || "?"}": key must be a-z, 0-9, - or _ (24 max).`,
      );
    if (k.label.trim().length < 2)
      out.push("Every kind needs a label (2+ characters).");
    if (!Number.isInteger(k.defaultSize) || !Number.isInteger(k.maxSize))
      out.push(`${k.label || "A kind"}: sizes must be whole numbers.`);
    if (k.label.length > 40)
      out.push(
        `Kind "${k.label.slice(0, 20)}...": label is 40 characters max.`,
      );
    if (k.defaultSize < 2 || k.maxSize > L.absoluteMaxSize)
      out.push(`${k.label || "A kind"}: sizes run 2 to ${L.absoluteMaxSize}.`);
    if (k.defaultSize > k.maxSize)
      out.push(`${k.label || "A kind"}: default size is above the max.`);
  }
  dup(
    "kinds",
    d.kinds.map((k) => k.key),
  );
  if (d.enabled && !d.kinds.some((k) => !k.staffOnly))
    out.push("Turn rooms on with at least one kind players can create.");
  if (d.spoilerStages.length > L.spoilerStages)
    out.push(`At most ${L.spoilerStages} spoiler stages.`);
  if (d.spoilerStages.some((s) => s.label.length > 60))
    out.push("Spoiler stage labels are 60 characters max.");
  if (d.spoilerStages.some((s) => !s.label.trim()))
    out.push("Every spoiler stage needs a label.");
  dup(
    "spoiler stages",
    d.spoilerStages.map((s) => s.key),
  );
  if (d.listTemplates.length > L.listTemplates)
    out.push(`At most ${L.listTemplates} list templates.`);
  for (const t of d.listTemplates) {
    if (t.label.length > 60)
      out.push("List template names are 60 characters max.");
    if (t.label.trim().length < 2)
      out.push("Every list template needs a label.");
    if (t.items.length > L.listItems)
      out.push(`${t.label}: at most ${L.listItems} items.`);
    if (t.items.some((i) => i.length > L.listLabel))
      out.push(`${t.label}: items are ${L.listLabel} characters max.`);
  }
  dup(
    "list templates",
    d.listTemplates.map((t) => t.key),
  );
  return [...new Set(out)];
}

export default function RoomProfileCard({
  gameId,
  gameName,
}: {
  gameId: string;
  gameName: string;
}) {
  const [saved, setSaved] = useState<RoomProfileInput | null>(null);
  const [draft, setDraft] = useState<RoomProfileInput | null>(null);
  const [updated, setUpdated] = useState<{
    at: string;
    by: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Templates' items are edited as one line per item.
  const [itemText, setItemText] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const r = await getRoomProfile(gameId);
      const p = r.profile;
      const input: RoomProfileInput = p
        ? {
            enabled: p.enabled,
            kinds: p.kinds ?? [],
            tabs: p.tabs ?? [],
            crewPlatforms: p.crewPlatforms ?? [],
            spoilerStages: p.spoilerStages ?? [],
            listTemplates: p.listTemplates ?? [],
            minAge: p.minAge ?? 18,
          }
        : EMPTY_ROOM_PROFILE;
      setSaved(input);
      setDraft(input);
      setItemText(
        Object.fromEntries(
          input.listTemplates.map((t, i) => [i, t.items.join("\n")]),
        ),
      );
      setUpdated(p ? { at: p.updatedAt, by: p.updatedBy } : null);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    void load();
  }, [load]);

  const issues = useMemo(() => (draft ? problems(draft) : []), [draft]);
  const dirty = useMemo(
    () => JSON.stringify(draft && clean(draft)) !== JSON.stringify(saved),
    [draft, saved],
  );

  if (loading || !draft) {
    return (
      <Box
        bg={C.surface}
        borderRadius="14px"
        p={5}
        border="1px solid"
        borderColor={C.line}
      >
        <Spinner size="sm" color={C.muted} />
      </Box>
    );
  }

  const set = <K extends keyof RoomProfileInput>(
    k: K,
    v: RoomProfileInput[K],
  ) => setDraft({ ...draft, [k]: v });
  const setKind = (i: number, patch: Partial<RoomKindConfig>) =>
    set(
      "kinds",
      draft.kinds.map((k, j) => (j === i ? { ...k, ...patch } : k)),
    );
  const toggleIn = (list: string[], v: string, on: boolean) =>
    on ? [...new Set([...list, v])] : list.filter((x) => x !== v);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await saveRoomProfile(gameId, clean(draft));
      await load();
      setMsg({
        ok: true,
        text: draft.enabled
          ? `Saved. Rooms are on for ${gameName}.`
          : "Saved. Rooms are off for this game.",
      });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      bg={C.surface}
      borderRadius="14px"
      p={5}
      border="1px solid"
      borderColor={C.line}
    >
      <Flex justify="space-between" align="start" gap={3} wrap="wrap">
        <Box>
          <Text fontWeight="700" color={C.text}>
            Rooms
          </Text>
          <Hint>
            Squad Rooms for this game (app only). Rooms show nowhere until this
            is on, and the server switch ROOMS_ENABLED still wins.
            {updated &&
              ` Last saved ${new Date(updated.at).toLocaleString("en-US", { timeZone: "America/Chicago" })} CT by ${updated.by ?? "unknown"}.`}
          </Hint>
        </Box>
        <Toggle
          checked={draft.enabled}
          onChange={(v) => set("enabled", v)}
          label={draft.enabled ? "Rooms on" : "Rooms off"}
        />
      </Flex>

      <Flex direction="column" gap={4} mt={2}>
        <Section
          label="Kinds"
          hint="The room types people can open. Stays open = Crew (never auto-ends). Staff only = only team accounts can create it (Launch Night). Never change a key once rooms use it."
        >
          {draft.kinds.length === 0 && (
            <Button
              size="xs"
              bg={C.raised}
              color={C.text}
              mb={2}
              onClick={() => set("kinds", LAUNCH_PRESET_KINDS)}
            >
              Use the single-player launch setup (Launch Night, Play-along,
              Hunt, Crew)
            </Button>
          )}
          {draft.kinds.map((k, i) => (
            <Flex key={i} gap={2} align="center" wrap="wrap" py={1}>
              <Input
                {...inputProps}
                w="160px"
                placeholder="Label"
                maxLength={40}
                value={k.label}
                onChange={(e) =>
                  setKind(i, {
                    label: e.target.value,
                    ...(isNew(k) ? { key: keyFrom(e.target.value) } : {}),
                  })
                }
              />
              <Text fontSize="xs" fontFamily="mono" color={C.faint} w="110px">
                {k.key}
              </Text>
              <Text fontSize="xs" color={C.muted}>
                size
              </Text>
              <Input
                {...inputProps}
                w="64px"
                type="number"
                value={k.defaultSize}
                onChange={(e) =>
                  setKind(i, { defaultSize: Number(e.target.value) || 0 })
                }
              />
              <Text fontSize="xs" color={C.muted}>
                max
              </Text>
              <Input
                {...inputProps}
                w="64px"
                type="number"
                value={k.maxSize}
                onChange={(e) =>
                  setKind(i, { maxSize: Number(e.target.value) || 0 })
                }
              />
              <Toggle
                checked={!!k.persistent}
                onChange={(v) => setKind(i, { persistent: v || undefined })}
                label="Stays open"
              />
              <Toggle
                checked={!!k.staffOnly}
                onChange={(v) => setKind(i, { staffOnly: v || undefined })}
                label="Staff only"
              />
              <Button
                size="xs"
                variant="ghost"
                color={C.bad}
                aria-label="Remove kind"
                onClick={() =>
                  set(
                    "kinds",
                    draft.kinds.filter((_, j) => j !== i),
                  )
                }
              >
                <FiTrash2 />
              </Button>
            </Flex>
          ))}
          {draft.kinds.length < L.kinds && (
            <Button
              size="xs"
              bg={C.raised}
              color={C.text}
              mt={1}
              onClick={() =>
                set("kinds", [
                  ...draft.kinds,
                  {
                    key: `kind-${draft.kinds.length + 1}`,
                    label: "",
                    ...FRESH,
                    defaultSize: 8,
                    maxSize: 20,
                  },
                ])
              }
            >
              <FiPlus /> Add a kind
            </Button>
          )}
        </Section>

        <Section
          label="Tabs"
          hint="Tabs a room shows besides Chat. Map arrives with the map engine (Phase 4)."
        >
          <HStack gap={4} wrap="wrap">
            {ROOM_TAB_OPTIONS.map((t) =>
              t.ready ? (
                <Toggle
                  key={t.key}
                  checked={draft.tabs.includes(t.key)}
                  onChange={(v) => set("tabs", toggleIn(draft.tabs, t.key, v))}
                  label={t.label}
                />
              ) : (
                <Text key={t.key} fontSize="sm" color={C.faint}>
                  {t.label} (later)
                </Text>
              ),
            )}
          </HStack>
        </Section>

        <Section
          label="Crew platforms"
          hint="Which gamer IDs the Crew tab asks members for. Pick the platforms the game is on."
        >
          <HStack gap={4} wrap="wrap">
            {CREW_PLATFORM_OPTIONS.map((p) => (
              <Toggle
                key={p.key}
                checked={draft.crewPlatforms.includes(p.key)}
                onChange={(v) =>
                  set("crewPlatforms", toggleIn(draft.crewPlatforms, p.key, v))
                }
                label={p.label}
              />
            ))}
          </HStack>
        </Section>

        <Section
          label="Spoiler stages"
          hint="Progress points people pick so messages past their stage stay blurred. In story order."
        >
          {draft.spoilerStages.map((s, i) => (
            <Flex key={i} gap={2} align="center" py={1}>
              <Input
                {...inputProps}
                w="240px"
                placeholder="e.g. Adult Link"
                maxLength={60}
                value={s.label}
                onChange={(e) =>
                  set(
                    "spoilerStages",
                    draft.spoilerStages.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            label: e.target.value,
                            key: isNew(x) ? keyFrom(e.target.value) : x.key,
                          }
                        : x,
                    ),
                  )
                }
              />
              <Text fontSize="xs" fontFamily="mono" color={C.faint}>
                {s.key}
              </Text>
              <Button
                size="xs"
                variant="ghost"
                color={C.bad}
                aria-label="Remove stage"
                onClick={() =>
                  set(
                    "spoilerStages",
                    draft.spoilerStages.filter((_, j) => j !== i),
                  )
                }
              >
                <FiTrash2 />
              </Button>
            </Flex>
          ))}
          {draft.spoilerStages.length < L.spoilerStages && (
            <Button
              size="xs"
              bg={C.raised}
              color={C.text}
              mt={1}
              onClick={() =>
                set("spoilerStages", [
                  ...draft.spoilerStages,
                  {
                    key: `stage-${draft.spoilerStages.length + 1}`,
                    label: "",
                    ...FRESH,
                  },
                ])
              }
            >
              <FiPlus /> Add a stage
            </Button>
          )}
        </Section>

        <Section
          label="List templates"
          hint="Ready-made checklists a host can load into the List tab (one item per line, 200 max). Example: Gold Skulltulas by area."
        >
          {draft.listTemplates.map((t, i) => (
            <Box key={i} py={2}>
              <Flex gap={2} align="center" mb={1}>
                <Input
                  {...inputProps}
                  w="240px"
                  placeholder="Template name"
                  maxLength={60}
                  value={t.label}
                  onChange={(e) =>
                    set(
                      "listTemplates",
                      draft.listTemplates.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              label: e.target.value,
                              key: isNew(x) ? keyFrom(e.target.value) : x.key,
                            }
                          : x,
                      ),
                    )
                  }
                />
                <Text fontSize="xs" color={C.muted}>
                  {t.items.length} items
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  color={C.bad}
                  aria-label="Remove template"
                  onClick={() => {
                    set(
                      "listTemplates",
                      draft.listTemplates.filter((_, j) => j !== i),
                    );
                    setItemText((prev) => {
                      const next: Record<number, string> = {};
                      Object.entries(prev).forEach(([k, v]) => {
                        const n = Number(k);
                        if (n < i) next[n] = v;
                        else if (n > i) next[n - 1] = v;
                      });
                      return next;
                    });
                  }}
                >
                  <FiTrash2 />
                </Button>
              </Flex>
              <Textarea
                {...inputProps}
                rows={4}
                placeholder="One item per line"
                value={itemText[i] ?? ""}
                onChange={(e) => {
                  const text = e.target.value;
                  setItemText((prev) => ({ ...prev, [i]: text }));
                  set(
                    "listTemplates",
                    draft.listTemplates.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            items: text
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          }
                        : x,
                    ),
                  );
                }}
              />
            </Box>
          ))}
          {draft.listTemplates.length < L.listTemplates && (
            <Button
              size="xs"
              bg={C.raised}
              color={C.text}
              mt={1}
              onClick={() =>
                set("listTemplates", [
                  ...draft.listTemplates,
                  {
                    key: `list-${draft.listTemplates.length + 1}`,
                    label: "",
                    items: [],
                    ...FRESH,
                  },
                ])
              }
            >
              <FiPlus /> Add a template
            </Button>
          )}
        </Section>

        <Section
          label="Minimum age"
          hint="Who can join rooms for this game. 18 at launch (the app asks once and keeps it private)."
        >
          <NativeSelect.Root size="sm" w="120px">
            <NativeSelect.Field
              value={String(draft.minAge)}
              onChange={(e) => set("minAge", Number(e.target.value))}
              bg={C.raised}
              color={C.text}
            >
              {[18, 19, 20, 21].map((a) => (
                <option key={a} value={a}>
                  {a}+
                </option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Section>

        {issues.length > 0 && (
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
        <HStack gap={2} justify="flex-end">
          <Button
            size="sm"
            variant="ghost"
            color={C.muted}
            disabled={!dirty || saving}
            onClick={() => {
              setDraft(saved);
              setItemText(
                Object.fromEntries(
                  (saved?.listTemplates ?? []).map((t, i) => [
                    i,
                    t.items.join("\n"),
                  ]),
                ),
              );
            }}
          >
            Discard
          </Button>
          <Button
            size="sm"
            bg={C.gold}
            color={C.ink}
            fontWeight="700"
            onClick={() => void save()}
            loading={saving}
            disabled={!dirty || issues.length > 0}
          >
            Save rooms
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}
