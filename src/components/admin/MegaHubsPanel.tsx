"use client";

// Admin -> Mega hubs (Phase 1). Pick a game, switch its hub modules on, and
// keep "Everything we know" current: every fact needs a source link and a
// status (confirmed / reported / leaked). Saving a reader-facing change
// stamps "Last updated", revalidates the page and pings IndexNow.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Text,
  Textarea,
} from "@chakra-ui/react";
import {
  FiArrowDown,
  FiArrowUp,
  FiExternalLink,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import {
  createHubThread,
  getGameProfile,
  getHubThreadAdmin,
  listGameProfiles,
  pinHubThread,
  unpinHubThread,
  listHubGames,
  saveGameProfile,
  type GameProfileDetail,
  type GameProfileInput,
  type GameProfileRow,
  type HubGameRow,
  type HubThreadAdmin,
} from "@/lib/admin/client";
import {
  FACT_SECTIONS,
  FACT_STATUSES,
  HUB_EDITORS,
  HUB_MODULES,
  type HubEdition,
  type HubFact,
  type HubFaq,
  type HubModule,
} from "@/lib/hubs/types";

const C = {
  surface: "#222849",
  raised: "#2a3156",
  line: "rgba(255,255,255,0.08)",
  text: "#EDF2F7",
  muted: "#9AA3BF",
  faint: "#6B7394",
  good: "#7EE2A0",
  bad: "#FF8A80",
  warn: "#FFB86B",
  accent: "#4DA3FF",
  gold: "#FFD700",
};

const MODULE_LABEL: Record<HubModule, string> = {
  countdown: "Countdown",
  dayOne: "Day One (I'm in)",
  trailers: "Trailers",
  scores: "Critics vs Players (ratings)",
  facts: "Everything we know",
  predict: "Predict the score",
  editions: "Editions and price",
  faq: "FAQ",
};

const newId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** ISO -> value for <input type="datetime-local"> in the admin's own zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Card({
  title,
  hint,
  children,
  right,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Box bg={C.surface} borderRadius="14px" p={5} border="1px solid" borderColor={C.line}>
      <Flex justify="space-between" align="start" gap={3} mb={hint ? 1 : 4} wrap="wrap">
        <Text fontWeight="700" color={C.text}>
          {title}
        </Text>
        {right}
      </Flex>
      {hint && (
        <Text fontSize="xs" color={C.muted} mb={4}>
          {hint}
        </Text>
      )}
      {children}
    </Box>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Flex justify="space-between" mb={1} gap={2}>
        <Text fontSize="xs" color={C.muted} fontWeight="600">
          {label}
        </Text>
        {hint && (
          <Text fontSize="xs" color={C.faint}>
            {hint}
          </Text>
        )}
      </Flex>
      {children}
    </Box>
  );
}

const inputProps = {
  size: "sm" as const,
  bg: C.raised,
  borderColor: C.line,
  color: C.text,
  _placeholder: { color: C.faint },
};

function Sel({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <NativeSelect.Root size="sm">
      <NativeSelect.Field
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        bg={C.raised}
        borderColor={C.line}
        color={C.text}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#1a1f3a" }}>
            {o.label}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}

function Counter({ n, max, min }: { n: number; max: number; min?: number }) {
  const color = n > max ? C.bad : min && n < min ? C.warn : C.faint;
  return <span style={{ color }}>{min ? `${n} (aim ${min}-${max})` : `${n}/${max}`}</span>;
}

function RowTools({
  onUp,
  onDown,
  onDelete,
}: {
  onUp?: () => void;
  onDown?: () => void;
  onDelete: () => void;
}) {
  return (
    <HStack gap={1}>
      <Button size="xs" variant="ghost" color={C.muted} onClick={onUp} disabled={!onUp} aria-label="Move up">
        <FiArrowUp />
      </Button>
      <Button size="xs" variant="ghost" color={C.muted} onClick={onDown} disabled={!onDown} aria-label="Move down">
        <FiArrowDown />
      </Button>
      <Button size="xs" variant="ghost" color={C.bad} onClick={onDelete} aria-label="Delete">
        <FiTrash2 />
      </Button>
    </HStack>
  );
}

function move<T>(arr: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Client-side checks that mirror the API, so errors show before saving. */
function problems(d: GameProfileInput): string[] {
  const out: string[] = [];
  const https = (u: string) => /^https:\/\/[^\s]+\.[^\s]+/.test(u);
  if (d.seoTitle && d.seoTitle.length > 60) out.push("SEO title is over 60 characters.");
  if (d.seoDescription && d.seoDescription.length > 160)
    out.push("Meta description is over 160 characters.");
  d.facts.forEach((f, i) => {
    if (!f.label.trim() || !f.value.trim()) out.push(`Fact ${i + 1}: label and text are required.`);
    if (!f.sourceName.trim() || !https(f.sourceUrl))
      out.push(`Fact ${i + 1}: needs a source name and an https link.`);
  });
  d.faqs.forEach((f, i) => {
    if (f.q.trim().length < 5 || f.a.trim().length < 5)
      out.push(`FAQ ${i + 1}: question and answer are required.`);
  });
  d.editions.forEach((e, i) => {
    if (!e.name.trim()) out.push(`Edition ${i + 1}: name is required.`);
    if (e.url && !https(e.url)) out.push(`Edition ${i + 1}: link must be https.`);
  });
  d.officialLinks.forEach((l, i) => {
    if (!l.label.trim() || !https(l.url)) out.push(`Official link ${i + 1}: label and https link.`);
  });
  return out;
}

/** Launch-night thread: write-and-pin as @nexzyofficial, or pin a recent
 *  official post about this game. Separate from Save (takes effect now). */
function LaunchThreadCard({
  gameId,
  gameSlug,
  saved,
  onDetail,
}: {
  gameId: string;
  gameSlug: string;
  saved: boolean;
  onDetail: (d: GameProfileDetail) => void;
}) {
  const [data, setData] = useState<HubThreadAdmin | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getHubThreadAdmin(gameId));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }, [gameId]);
  useEffect(() => {
    setData(null);
    setText("");
    setMsg(null);
    void load();
  }, [load]);

  const run = async (fn: () => Promise<GameProfileDetail>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      onDetail(await fn());
      setMsg({ ok: true, text: ok });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const pinned = data?.candidates.find((c) => c.id === data.pinnedId) ?? null;

  return (
    <Card
      title="Launch-night thread"
      hint="Pinned at the top of the hub. Replies are normal feed comments, so they also show in the app. Changes here take effect right away (no Save needed)."
    >
      {!saved ? (
        <Text fontSize="sm" color={C.muted}>
          Save the hub once, then you can pin a thread.
        </Text>
      ) : !data ? (
        <Spinner size="sm" color={C.muted} />
      ) : !data.officialConfigured ? (
        <Text fontSize="sm" color={C.warn}>
          The official account isn&apos;t configured on the API (NEXZY_OFFICIAL_USER_ID).
        </Text>
      ) : (
        <Flex direction="column" gap={4}>
          {data.pinnedId ? (
            <Box bg={C.raised} borderRadius="10px" p={3} border="1px solid" borderColor={C.gold}>
              <Flex justify="space-between" gap={3} wrap="wrap" align="start">
                <Box minW={0} flex="1">
                  <Text fontSize="xs" color={C.gold} fontWeight="700" mb={1}>
                    PINNED
                  </Text>
                  <Text fontSize="sm" color={C.text} whiteSpace="pre-wrap">
                    {pinned ? pinned.content : "Pinned post (older than the 10 most recent)"}
                  </Text>
                  {pinned && (
                    <Text fontSize="xs" color={C.muted} mt={1}>
                      {pinned.comments.toLocaleString()} replies
                    </Text>
                  )}
                </Box>
                <HStack gap={2}>
                  <a href={`/games/${gameSlug}#launch-thread`} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 13 }}>
                    View <FiExternalLink style={{ display: "inline", verticalAlign: "-2px" }} />
                  </a>
                  <Button
                    size="xs"
                    bg="transparent"
                    color={C.bad}
                    border="1px solid"
                    borderColor={C.bad}
                    disabled={busy}
                    onClick={() => void run(() => unpinHubThread(gameId), "Unpinned.")}
                  >
                    Unpin
                  </Button>
                </HStack>
              </Flex>
            </Box>
          ) : (
            <Text fontSize="sm" color={C.muted}>
              Nothing pinned.
            </Text>
          )}

          <Field label="New post as @nexzyofficial" hint={<Counter n={text.length} max={2000} />}>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 2000))}
              placeholder="It's out. How's it running for you? Tell us your platform."
              rows={3}
              bg={C.raised}
              color={C.text}
              borderColor={C.line}
            />
          </Field>
          <Box>
            <Button
              size="sm"
              bg={C.gold}
              color="#0b0e1d"
              fontWeight="700"
              disabled={busy || !text.trim()}
              onClick={() =>
                void run(async () => {
                  const d = await createHubThread(gameId, text.trim());
                  setText("");
                  return d;
                }, "Posted as @nexzyofficial and pinned.")
              }
            >
              Post and pin
            </Button>
          </Box>

          {data.candidates.length > 0 && (
            <Box>
              <Text fontSize="xs" color={C.muted} fontWeight="600" mb={2}>
                Or pin a recent @nexzyofficial post about this game
              </Text>
              <Flex direction="column" gap={2}>
                {data.candidates.map((c) => (
                  <Flex key={c.id} gap={3} align="start" justify="space-between" bg={C.raised} borderRadius="10px" p={3}>
                    <Box minW={0} flex="1">
                      <Text fontSize="sm" color={C.text} lineClamp={2}>
                        {c.content}
                      </Text>
                      <Text fontSize="xs" color={C.muted}>
                        {new Date(c.createdAt).toLocaleString()} · {c.comments.toLocaleString()} replies
                      </Text>
                    </Box>
                    {c.id === data.pinnedId ? (
                      <Text fontSize="xs" color={C.gold} fontWeight="700">
                        Pinned
                      </Text>
                    ) : (
                      <Button
                        size="xs"
                        bg={C.raised}
                        color={C.text}
                        border="1px solid"
                        borderColor={C.line}
                        disabled={busy}
                        onClick={() => void run(() => pinHubThread(gameId, c.id), "Pinned.")}
                      >
                        Pin
                      </Button>
                    )}
                  </Flex>
                ))}
              </Flex>
            </Box>
          )}
          {msg && (
            <Text fontSize="sm" color={msg.ok ? C.good : C.bad}>
              {msg.text}
            </Text>
          )}
        </Flex>
      )}
    </Card>
  );
}

export default function MegaHubsPanel() {
  const [rows, setRows] = useState<GameProfileRow[] | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<HubGameRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState<GameProfileDetail | null>(null);
  const [draft, setDraft] = useState<GameProfileInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadRows = useCallback(async () => {
    try {
      setRows(await listGameProfiles());
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      setRows([]);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const open = useCallback(async (gameId: string) => {
    setLoading(true);
    setMsg(null);
    try {
      const d = await getGameProfile(gameId);
      setDetail(d);
      const { factsUpdatedAt: _f, ...input } = d.profile;
      setDraft(input);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  async function search() {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const r = await listHubGames({ q: q.trim(), limit: 8 });
      setResults(r.items);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSearching(false);
    }
  }

  const original = useMemo(() => {
    if (!detail) return "";
    const { factsUpdatedAt: _f, ...input } = detail.profile;
    return JSON.stringify(input);
  }, [detail]);
  const dirty = !!draft && JSON.stringify(draft) !== original;
  const issues = draft ? problems(draft) : [];

  const set = <K extends keyof GameProfileInput>(k: K, v: GameProfileInput[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  async function save() {
    if (!detail || !draft || issues.length) return;
    setSaving(true);
    setMsg(null);
    try {
      const d = await saveGameProfile(detail.game.id, draft);
      setDetail(d);
      const { factsUpdatedAt: _f, ...input } = d.profile;
      setDraft(input);
      setMsg({ ok: true, text: "Saved. The hub page refreshes in a few seconds." });
      loadRows();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const updFact = (i: number, patch: Partial<HubFact>) =>
    set("facts", draft!.facts.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const updFaq = (i: number, patch: Partial<HubFaq>) =>
    set("faqs", draft!.faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const updEd = (i: number, patch: Partial<HubEdition>) =>
    set("editions", draft!.editions.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  return (
    <Box color={C.text} pb={24}>
      <Flex gap={6} direction={{ base: "column", xl: "row" }} align="start">
        {/* Left: hubs + add */}
        <Box w={{ base: "full", xl: "300px" }} flexShrink={0} display="flex" flexDirection="column" gap={4}>
          <Card title="Mega hubs" hint="Games with a hub profile. Off = plain hub.">
            {rows === null ? (
              <Spinner size="sm" />
            ) : rows.length === 0 ? (
              <Text fontSize="sm" color={C.muted}>
                None yet. Find a game below.
              </Text>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {rows.map((r) => (
                  <Box
                    key={r.gameId}
                    as="button"
                    textAlign="left"
                    onClick={() => open(r.gameId)}
                    bg={detail?.game.id === r.gameId ? C.raised : "transparent"}
                    border="1px solid"
                    borderColor={detail?.game.id === r.gameId ? C.accent : C.line}
                    borderRadius="10px"
                    p={3}
                    _hover={{ bg: C.raised }}
                  >
                    <HStack justify="space-between" gap={2}>
                      <Text fontWeight="600" fontSize="sm" lineClamp={1}>
                        {r.name}
                      </Text>
                      <Badge colorPalette={r.enabled ? "green" : "gray"} variant="subtle">
                        {r.enabled ? "Live" : "Off"}
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color={C.muted} mt={1}>
                      {r.dayOne.toLocaleString()} day one · {r.predictions.toLocaleString()} picks ·{" "}
                      {r.factCount} facts
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
          </Card>
          <Card title="Add a game">
            <HStack gap={2}>
              <Input
                {...inputProps}
                placeholder="Search games"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
              <Button size="sm" onClick={search} loading={searching} bg={C.accent} color="white">
                <FiSearch />
              </Button>
            </HStack>
            <Box display="flex" flexDirection="column" gap={1} mt={3}>
              {results.map((g) => (
                <Box
                  key={g.id}
                  as="button"
                  textAlign="left"
                  onClick={() => {
                    setResults([]);
                    open(g.id);
                  }}
                  p={2}
                  borderRadius="8px"
                  _hover={{ bg: C.raised }}
                >
                  <Text fontSize="sm">{g.name}</Text>
                  <Text fontSize="xs" color={C.faint}>
                    {g.slug}
                    {g.released ? ` · ${g.released}` : ""}
                  </Text>
                </Box>
              ))}
            </Box>
          </Card>
        </Box>

        {/* Right: editor */}
        <Box flex="1" minW={0} display="flex" flexDirection="column" gap={4} w="full">
          {loading && <Spinner />}
          {!loading && !draft && (
            <Box bg={C.surface} borderRadius="14px" p={8} textAlign="center" color={C.muted}>
              Pick a hub on the left, or add a game.
            </Box>
          )}
          {!loading && draft && detail && (
            <>
              <Card
                title={detail.game.name}
                right={
                  <HStack gap={3}>
                    <a
                      href={`/games/${detail.game.slug}`}
                      target="_blank"
                      rel="noopener"
                      style={{ color: C.accent, fontSize: 13, display: "inline-flex", gap: 4, alignItems: "center" }}
                    >
                      View hub <FiExternalLink />
                    </a>
                  </HStack>
                }
              >
                <Flex gap={6} wrap="wrap" align="center">
                  <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      onChange={(e) => set("enabled", e.target.checked)}
                      style={{ accentColor: C.good, width: 18, height: 18 }}
                    />
                    <Text fontWeight="600">{draft.enabled ? "Hub is live" : "Hub is off"}</Text>
                  </label>
                  <Text fontSize="sm" color={C.muted}>
                    {detail.live.dayOne.toLocaleString()} day one · {detail.live.predictions.total.toLocaleString()}{" "}
                    predictions
                  </Text>
                  <Text fontSize="sm" color={C.muted}>
                    Last updated:{" "}
                    {detail.profile.factsUpdatedAt
                      ? new Date(detail.profile.factsUpdatedAt).toLocaleString()
                      : "never"}
                    {detail.updatedBy ? ` · saved by ${detail.updatedBy}` : ""}
                  </Text>
                </Flex>
              </Card>

              <Card title="Modules" hint="Turn sections on or off for this game.">
                <Flex gap={5} wrap="wrap">
                  {HUB_MODULES.map((k) => (
                    <label key={k} style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer", fontSize: 14 }}>
                      <input
                        type="checkbox"
                        checked={draft.modules[k]}
                        onChange={(e) => set("modules", { ...draft.modules, [k]: e.target.checked })}
                        style={{ accentColor: C.accent, width: 16, height: 16 }}
                      />
                      {MODULE_LABEL[k]}
                    </label>
                  ))}
                </Flex>
              </Card>

              <Card title="Launch" hint="The exact launch moment drives the countdown and locks predictions. Entered in your local time.">
                <Flex gap={4} wrap="wrap">
                  <Box flex="1" minW="220px">
                    <Field label="Launch date and time">
                      <Input
                        {...inputProps}
                        type="datetime-local"
                        value={toLocalInput(draft.launchAt)}
                        onChange={(e) =>
                          set("launchAt", e.target.value ? new Date(e.target.value).toISOString() : null)
                        }
                      />
                    </Field>
                  </Box>
                  <Box flex="2" minW="260px">
                    <Field label="Launch note" hint={<Counter n={(draft.launchNote ?? "").length} max={160} />}>
                      <Input
                        {...inputProps}
                        placeholder="Midnight local time on PS5 and Xbox Series X|S"
                        value={draft.launchNote ?? ""}
                        onChange={(e) => set("launchNote", e.target.value)}
                      />
                    </Field>
                  </Box>
                </Flex>
              </Card>

              <LaunchThreadCard
                gameId={detail.game.id}
                gameSlug={detail.game.slug}
                saved={!!detail.updatedAt}
                onDetail={(d) => {
                  setDetail(d);
                  // Keep unsaved edits; only the pin moved.
                  setDraft((prev) =>
                    prev
                      ? ({ ...prev, launchThreadPostId: d.profile.launchThreadPostId ?? null } as GameProfileInput)
                      : prev,
                  );
                }}
              />

              <Card
                title="Search and answer engines"
                hint="Short version = the 30 to 45 word direct answer at the top. Name the game in it. AI answers quote this."
              >
                <Box display="grid" gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <Field label="Page H1 (blank = game name)">
                    <Input {...inputProps} value={draft.headline ?? ""} onChange={(e) => set("headline", e.target.value)} />
                  </Field>
                  <Field label="Other names (comma separated)" hint="First one is used in titles">
                    <Input
                      {...inputProps}
                      placeholder="GTA 6, GTA VI"
                      value={draft.aliases.join(", ")}
                      onChange={(e) =>
                        set(
                          "aliases",
                          e.target.value.split(",").map((s) => s.trimStart()).slice(0, 8),
                        )
                      }
                      onBlur={() => set("aliases", draft.aliases.map((s) => s.trim()).filter(Boolean))}
                    />
                  </Field>
                  <Field label="SEO title (blank = auto)" hint={<Counter n={(draft.seoTitle ?? "").length} max={60} />}>
                    <Input
                      {...inputProps}
                      placeholder="GTA 6: Release Date, Price & Everything We Know"
                      value={draft.seoTitle ?? ""}
                      onChange={(e) => set("seoTitle", e.target.value)}
                    />
                  </Field>
                  <Field label="Meta description" hint={<Counter n={(draft.seoDescription ?? "").length} max={160} />}>
                    <Input
                      {...inputProps}
                      value={draft.seoDescription ?? ""}
                      onChange={(e) => set("seoDescription", e.target.value)}
                    />
                  </Field>
                </Box>
                <Box mt={4}>
                  <Field label="The short version" hint={<Counter n={words(draft.summary ?? "")} max={45} min={30} />}>
                    <Textarea
                      {...inputProps}
                      rows={3}
                      value={draft.summary ?? ""}
                      onChange={(e) => set("summary", e.target.value)}
                    />
                  </Field>
                </Box>
                <Box display="grid" gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mt={4}>
                  <Field label="Publisher">
                    <Input {...inputProps} value={draft.publisher ?? ""} onChange={(e) => set("publisher", e.target.value)} />
                  </Field>
                  <Field label="Byline">
                    <Sel
                      value={draft.editor ?? ""}
                      onChange={(v) => set("editor", v || null)}
                      options={[{ value: "", label: "None" }, ...HUB_EDITORS.map((e) => ({ value: e, label: e }))]}
                    />
                  </Field>
                </Box>
                <Box mt={4}>
                  <Field label="Official links (publisher, store pages). Real pages only.">
                    <Box display="flex" flexDirection="column" gap={2}>
                      {draft.officialLinks.map((l, i) => (
                        <HStack key={i} gap={2}>
                          <Input
                            {...inputProps}
                            maxW="180px"
                            placeholder="Rockstar Games"
                            value={l.label}
                            onChange={(e) =>
                              set("officialLinks", draft.officialLinks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                            }
                          />
                          <Input
                            {...inputProps}
                            placeholder="https://"
                            value={l.url}
                            onChange={(e) =>
                              set("officialLinks", draft.officialLinks.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                            }
                          />
                          <Button
                            size="xs"
                            variant="ghost"
                            color={C.bad}
                            onClick={() => set("officialLinks", draft.officialLinks.filter((_, j) => j !== i))}
                            aria-label="Remove link"
                          >
                            <FiTrash2 />
                          </Button>
                        </HStack>
                      ))}
                      {draft.officialLinks.length < 8 && (
                        <Button
                          size="xs"
                          variant="outline"
                          color={C.text}
                          borderColor={C.line}
                          alignSelf="start"
                          onClick={() => set("officialLinks", [...draft.officialLinks, { label: "", url: "" }])}
                        >
                          <FiPlus /> Add link
                        </Button>
                      )}
                    </Box>
                  </Field>
                </Box>
              </Card>

              <Card
                title={`Everything we know (${draft.facts.length})`}
                hint="One fact per row. Confirmed = official source. Reported = credible outlet. Leaked = unverified (never link leaked footage). Grouped on the page by section."
                right={
                  <Button
                    size="xs"
                    bg={C.accent}
                    color="white"
                    disabled={draft.facts.length >= 80}
                    onClick={() =>
                      set("facts", [
                        ...draft.facts,
                        {
                          id: newId("f"),
                          section: "release",
                          label: "",
                          value: "",
                          status: "confirmed",
                          sourceName: "",
                          sourceUrl: "",
                        },
                      ])
                    }
                  >
                    <FiPlus /> Add fact
                  </Button>
                }
              >
                <Box display="flex" flexDirection="column" gap={3}>
                  {draft.facts.map((f, i) => (
                    <Box key={f.id} bg={C.raised} borderRadius="10px" p={3}>
                      <Flex gap={2} wrap="wrap" mb={2} align="center">
                        <Box w="140px">
                          <Sel
                            value={f.section}
                            onChange={(v) => updFact(i, { section: v as HubFact["section"] })}
                            options={FACT_SECTIONS.map((s) => ({ value: s, label: s }))}
                          />
                        </Box>
                        <Box w="130px">
                          <Sel
                            value={f.status}
                            onChange={(v) => updFact(i, { status: v as HubFact["status"] })}
                            options={FACT_STATUSES.map((s) => ({ value: s, label: s }))}
                          />
                        </Box>
                        <Input
                          {...inputProps}
                          flex="1"
                          minW="160px"
                          placeholder="Label, e.g. Release date"
                          value={f.label}
                          onChange={(e) => updFact(i, { label: e.target.value })}
                        />
                        {f.updatedOn && (
                          <Text fontSize="xs" color={C.faint}>
                            {f.updatedOn}
                          </Text>
                        )}
                        <RowTools
                          onUp={i > 0 ? () => set("facts", move(draft.facts, i, -1)) : undefined}
                          onDown={i < draft.facts.length - 1 ? () => set("facts", move(draft.facts, i, 1)) : undefined}
                          onDelete={() => set("facts", draft.facts.filter((_, j) => j !== i))}
                        />
                      </Flex>
                      <Textarea
                        {...inputProps}
                        rows={2}
                        placeholder="What we know, in one or two sentences with the hard numbers."
                        value={f.value}
                        onChange={(e) => updFact(i, { value: e.target.value })}
                      />
                      <Flex gap={2} mt={2} wrap="wrap">
                        <Input
                          {...inputProps}
                          maxW="200px"
                          placeholder="Source name"
                          value={f.sourceName}
                          onChange={(e) => updFact(i, { sourceName: e.target.value })}
                        />
                        <Input
                          {...inputProps}
                          flex="1"
                          minW="200px"
                          placeholder="https:// source link"
                          value={f.sourceUrl}
                          onChange={(e) => updFact(i, { sourceUrl: e.target.value })}
                        />
                      </Flex>
                    </Box>
                  ))}
                </Box>
              </Card>

              <Card
                title={`Editions and price (${draft.editions.length})`}
                right={
                  <Button
                    size="xs"
                    bg={C.accent}
                    color="white"
                    disabled={draft.editions.length >= 8}
                    onClick={() =>
                      set("editions", [
                        ...draft.editions,
                        { id: newId("e"), name: "", price: null, currency: "USD", includes: [], url: null },
                      ])
                    }
                  >
                    <FiPlus /> Add edition
                  </Button>
                }
              >
                <Box display="flex" flexDirection="column" gap={3}>
                  {draft.editions.map((e, i) => (
                    <Box key={e.id} bg={C.raised} borderRadius="10px" p={3}>
                      <Flex gap={2} wrap="wrap" align="center">
                        <Input
                          {...inputProps}
                          flex="1"
                          minW="160px"
                          placeholder="Standard Edition"
                          value={e.name}
                          onChange={(ev) => updEd(i, { name: ev.target.value })}
                        />
                        <Input
                          {...inputProps}
                          w="110px"
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={e.price ?? ""}
                          onChange={(ev) => updEd(i, { price: ev.target.value === "" ? null : Number(ev.target.value) })}
                        />
                        <Input
                          {...inputProps}
                          w="80px"
                          value={e.currency}
                          onChange={(ev) => updEd(i, { currency: ev.target.value.toUpperCase().slice(0, 3) })}
                        />
                        <RowTools
                          onUp={i > 0 ? () => set("editions", move(draft.editions, i, -1)) : undefined}
                          onDown={i < draft.editions.length - 1 ? () => set("editions", move(draft.editions, i, 1)) : undefined}
                          onDelete={() => set("editions", draft.editions.filter((_, j) => j !== i))}
                        />
                      </Flex>
                      <Flex gap={2} mt={2} wrap="wrap">
                        <Input
                          {...inputProps}
                          flex="2"
                          minW="200px"
                          placeholder="What's included, separated by ;"
                          value={e.includes.join("; ")}
                          onChange={(ev) =>
                            updEd(i, { includes: ev.target.value.split(";").map((s) => s.trimStart()).slice(0, 12) })
                          }
                          onBlur={() => updEd(i, { includes: e.includes.map((s) => s.trim()).filter(Boolean) })}
                        />
                        <Input
                          {...inputProps}
                          flex="1"
                          minW="180px"
                          placeholder="https:// store link (optional)"
                          value={e.url ?? ""}
                          onChange={(ev) => updEd(i, { url: ev.target.value || null })}
                        />
                      </Flex>
                    </Box>
                  ))}
                </Box>
              </Card>

              <Card
                title={`FAQ (${draft.faqs.length})`}
                hint="Real questions people search. Answer in the first sentence."
                right={
                  <Button
                    size="xs"
                    bg={C.accent}
                    color="white"
                    disabled={draft.faqs.length >= 20}
                    onClick={() => set("faqs", [...draft.faqs, { id: newId("q"), q: "", a: "" }])}
                  >
                    <FiPlus /> Add question
                  </Button>
                }
              >
                <Box display="flex" flexDirection="column" gap={3}>
                  {draft.faqs.map((f, i) => (
                    <Box key={f.id} bg={C.raised} borderRadius="10px" p={3}>
                      <Flex gap={2} align="center" mb={2}>
                        <Input
                          {...inputProps}
                          flex="1"
                          placeholder="When does GTA 6 come out?"
                          value={f.q}
                          onChange={(e) => updFaq(i, { q: e.target.value })}
                        />
                        <RowTools
                          onUp={i > 0 ? () => set("faqs", move(draft.faqs, i, -1)) : undefined}
                          onDown={i < draft.faqs.length - 1 ? () => set("faqs", move(draft.faqs, i, 1)) : undefined}
                          onDelete={() => set("faqs", draft.faqs.filter((_, j) => j !== i))}
                        />
                      </Flex>
                      <Textarea
                        {...inputProps}
                        rows={2}
                        value={f.a}
                        onChange={(e) => updFaq(i, { a: e.target.value })}
                      />
                    </Box>
                  ))}
                </Box>
              </Card>
            </>
          )}
          {msg && !dirty && (
            <Text fontSize="sm" color={msg.ok ? C.good : C.bad}>
              {msg.text}
            </Text>
          )}
        </Box>
      </Flex>

      {dirty && (
        <Box
          position="fixed"
          left={0}
          right={0}
          bottom={0}
          zIndex={50}
          bg="#1a1f3a"
          borderTop="1px solid"
          borderColor={C.line}
          px={6}
          py={3}
        >
          <Flex maxW="1200px" mx="auto" justify="space-between" align="center" gap={4} wrap="wrap">
            <Box>
              {issues.length ? (
                <Text fontSize="sm" color={C.warn}>
                  {issues[0]}
                  {issues.length > 1 ? ` (+${issues.length - 1} more)` : ""}
                </Text>
              ) : (
                <Text fontSize="sm" color={C.muted}>
                  Unsaved changes
                </Text>
              )}
              {msg && !msg.ok && (
                <Text fontSize="sm" color={C.bad}>
                  {msg.text}
                </Text>
              )}
            </Box>
            <HStack gap={2}>
              <Button
                size="sm"
                variant="ghost"
                color={C.muted}
                onClick={() => {
                  if (!detail) return;
                  const { factsUpdatedAt: _f, ...input } = detail.profile;
                  setDraft(input);
                }}
              >
                Discard
              </Button>
              <Button
                size="sm"
                bg={C.gold}
                color="#11152b"
                fontWeight="700"
                onClick={save}
                loading={saving}
                disabled={issues.length > 0}
              >
                Save
              </Button>
            </HStack>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
