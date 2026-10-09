"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  Badge,
  Input,
  Link,
  Textarea,
} from "@chakra-ui/react";
import {
  FiCheck,
  FiExternalLink,
  FiPlus,
  FiTrash2,
  FiRefreshCw,
} from "react-icons/fi";
import type { ContentSuggestion } from "@/lib/admin/client";
import {
  POST_KINDS,
  POST_LOG_PLATFORMS,
  addPostLog,
  ctInputToIso,
  deletePostLog,
  fmtCt,
  isoToCtInput,
  listPostLog,
  setPostMeta,
  updatePostLog,
  type PostLogEntry,
  type PostLogMetrics,
  type PostLogPlatform,
  type PostMeta,
} from "@/lib/admin/client-postlog";

/**
 * POSTS LOG on a Suggestions card: the labels only we know (what it is, where
 * it came from, the clip, gut rating...) + where and when it actually went out
 * on each platform, + numbers typed in for platforms with no API. Feeds Post
 * Lab's "by content type" split. Mounted only when its section is opened.
 */

const SELECT_STYLE: React.CSSProperties = {
  appearance: "none",
  background: "#0f1626",
  color: "#eef2f8",
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: "8px",
  padding: "5px 10px",
  font: "inherit",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
};

const fld = {
  size: "sm" as const,
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
};

const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  POST_LOG_PLATFORMS.map((p) => [p.id, p.label]),
);

const ORIGINS: [string, string][] = [
  ["suggestion", "From a lead"],
  ["manual", "My own idea"],
  ["social", "Seen on social"],
];
const ANGLES: [string, string][] = [
  ["breaking", "Breaking news"],
  ["leak", "Leak"],
  ["rumor", "Rumor"],
  ["anniversary", "Anniversary"],
  ["nostalgia", "Nostalgia"],
  ["review", "Review"],
  ["deal", "Deal"],
  ["guide", "Guide"],
  ["other", "Other"],
];
const SIZES: [string, string][] = [
  ["mega", "Mega franchise"],
  ["aaa", "AAA"],
  ["indie", "Indie / niche"],
];
const FIRST: [string, string][] = [
  ["early", "Early (before most)"],
  ["with_pack", "With the pack"],
  ["late", "Late"],
];
const HOOKS: [string, string][] = [
  ["question", "Question"],
  ["stat", "Stat / number"],
  ["hot_take", "Hot take"],
  ["reveal", "Reveal"],
  ["callback", "Callback / nostalgia"],
  ["other", "Other"],
];
const MUSIC: [string, string][] = [
  ["trending_sound", "Trending sound"],
  ["elevenlabs", "ElevenLabs music"],
  ["library", "Library track"],
  ["none", "No music"],
];
const THUMBS: [string, string][] = [
  ["custom", "Custom thumbnail"],
  ["frame", "Picked frame"],
  ["none", "Default"],
];

/** Numbers asked for per platform (hand-typed). */
const METRIC_FIELDS: Record<string, [keyof PostLogMetrics, string][]> = {
  tiktok: [
    ["views", "Views"],
    ["likes", "Likes"],
    ["comments", "Comments"],
    ["shares", "Shares"],
    ["saves", "Saves"],
    ["completionPct", "Completion %"],
    ["avgWatchSec", "Avg watch (s)"],
    ["follows", "New follows"],
  ],
  reddit: [
    ["views", "Views"],
    ["score", "Score"],
    ["comments", "Comments"],
    ["shares", "Shares"],
  ],
  default: [
    ["views", "Views"],
    ["likes", "Likes"],
    ["comments", "Comments"],
    ["shares", "Shares"],
    ["saves", "Saves"],
    ["follows", "New follows"],
  ],
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text color="whiteAlpha.700" fontSize="10px" fontWeight="700" mb={1}>
      {children}
    </Text>
  );
}

function Pick({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: [string, string][];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <Box flex="1 1 150px">
      <Label>{label}</Label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        style={SELECT_STYLE}
      >
        <option value="">—</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Box>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  flex = "1 1 150px",
}: {
  label: string;
  value: string | number | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
  flex?: string;
}) {
  return (
    <Box flex={flex}>
      <Label>{label}</Label>
      <Input
        {...fld}
        value={value ?? ""}
        inputMode={numeric ? "decimal" : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </Box>
  );
}

const numOrUndef = (v: string): number | undefined => {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

/** Default kind from the card's format, when no label is saved yet. */
function defaultKind(card: ContentSuggestion): string | undefined {
  const f = card.payload?.format;
  if (f === "meme") return "video_meme";
  if (f === "long") return "long_form";
  if (f === "quick" || f === "text_post") return "text_post";
  if (f === "image" || f === "image_card" || f === "carousel")
    return "image_post";
  if (f === "logged") return card.payload?.loggedKind;
  return "voice_short";
}

// ---------------------------------------------------------------- labels

function LabelsForm({
  card,
  onUpdate,
}: {
  card: ContentSuggestion;
  onUpdate: (c: ContentSuggestion) => void;
}) {
  const saved = card.payload?.postMeta;
  const [m, setM] = useState<PostMeta>(() => ({
    kind: defaultKind(card),
    origin: card.sourceType === "manual" ? "manual" : "suggestion",
    ...(saved ?? {}),
  }));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof PostMeta>(k: K, v: PostMeta[K]) =>
    setM((p) => ({ ...p, [k]: v }));
  const isMeme = m.kind === "video_meme";

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await setPostMeta(card.id, m);
      onUpdate(r.card);
      setMsg({ ok: true, text: "Labels saved." });
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Save failed.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
        Fill these once per card. They are what the platforms never tell us, so
        Post Lab can compare memes vs shorts, franchises and hooks by time slot.
      </Text>
      <Flex gap={3} wrap="wrap" mb={3}>
        <Pick
          label="WHAT IT IS"
          value={m.kind}
          options={POST_KINDS.map((k) => [k.id, k.label])}
          onChange={(v) => set("kind", v)}
        />
        <Pick
          label="WHERE THE IDEA CAME FROM"
          value={m.origin}
          options={ORIGINS}
          onChange={(v) => set("origin", v as PostMeta["origin"])}
        />
        <Pick
          label="ANGLE"
          value={m.angle}
          options={ANGLES}
          onChange={(v) => set("angle", v)}
        />
      </Flex>
      <Flex gap={3} wrap="wrap" mb={3}>
        <Field
          label="FRANCHISE"
          value={m.franchise}
          onChange={(v) => set("franchise", v)}
          placeholder="GTA"
        />
        <Pick
          label="FRANCHISE SIZE"
          value={m.franchiseSize}
          options={SIZES}
          onChange={(v) => set("franchiseSize", v as PostMeta["franchiseSize"])}
        />
        <Field
          label="STORY AGE WHEN POSTED (HOURS)"
          value={m.storyAgeHours}
          onChange={(v) => set("storyAgeHours", numOrUndef(v))}
          placeholder="6"
          numeric
        />
        <Pick
          label="FIRST TO POST?"
          value={m.firstToPost}
          options={FIRST}
          onChange={(v) => set("firstToPost", v as PostMeta["firstToPost"])}
        />
      </Flex>
      <Flex gap={3} wrap="wrap" mb={3}>
        <Field
          label="HEADLINE (CARD)"
          value={m.headline}
          onChange={(v) => set("headline", v)}
          flex="1 1 260px"
        />
        <Field
          label={isMeme ? "OVERLAY TEXT (CLIP)" : "ON-SCREEN HOOK"}
          value={m.overlay}
          onChange={(v) => set("overlay", v)}
          flex="1 1 260px"
        />
      </Flex>
      {isMeme && (
        <Flex gap={3} wrap="wrap" mb={3}>
          <Field
            label="MOVIE"
            value={m.movie}
            onChange={(v) => set("movie", v)}
            placeholder="Home Alone"
          />
          <Field
            label="CLIP LINE"
            value={m.clipLine}
            onChange={(v) => set("clipLine", v)}
            flex="2 1 240px"
          />
          <Field
            label="CLIP LENGTH (S)"
            value={m.clipSeconds}
            onChange={(v) => set("clipSeconds", numOrUndef(v))}
            numeric
          />
        </Flex>
      )}
      <Flex gap={3} wrap="wrap" mb={3}>
        <Field
          label="VIDEO LENGTH (S)"
          value={m.lengthSeconds}
          onChange={(v) => set("lengthSeconds", numOrUndef(v))}
          numeric
        />
        <Pick
          label="HOOK STYLE"
          value={m.hookStyle}
          options={HOOKS}
          onChange={(v) => set("hookStyle", v)}
        />
        <Pick
          label="VOICE"
          value={m.voice == null ? undefined : m.voice ? "yes" : "no"}
          options={[
            ["yes", "Voice"],
            ["no", "No voice"],
          ]}
          onChange={(v) => set("voice", v == null ? undefined : v === "yes")}
        />
        <Pick
          label="MUSIC"
          value={m.music}
          options={MUSIC}
          onChange={(v) => set("music", v as PostMeta["music"])}
        />
        <Pick
          label="THUMBNAIL"
          value={m.thumbnail}
          options={THUMBS}
          onChange={(v) => set("thumbnail", v as PostMeta["thumbnail"])}
        />
      </Flex>
      <Flex gap={3} wrap="wrap" mb={3} align="flex-end">
        <Box flex="1 1 200px">
          <Label>GUT RATING BEFORE POSTING</Label>
          <HStack gap={1}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                size="xs"
                variant={m.gutRating === n ? "solid" : "outline"}
                bg={m.gutRating === n ? "nexzy.gold" : undefined}
                color={m.gutRating === n ? "#0f1626" : "nexzy.gray.100"}
                borderColor="whiteAlpha.300"
                onClick={() =>
                  set("gutRating", m.gutRating === n ? undefined : n)
                }
              >
                {n}
              </Button>
            ))}
          </HStack>
        </Box>
        <Field
          label="EFFORT (MINUTES)"
          value={m.effortMinutes}
          onChange={(v) => set("effortMinutes", numOrUndef(v))}
          numeric
        />
        <Field
          label="ANYTHING BIG THAT DAY?"
          value={m.bigDay}
          onChange={(v) => set("bigDay", v)}
          placeholder="Nintendo Direct at 9 AM"
          flex="2 1 240px"
        />
      </Flex>
      <Box mb={3}>
        <Label>WHAT HAPPENED (FILL AFTER 7 DAYS)</Label>
        <Textarea
          {...fld}
          rows={2}
          value={m.outcomeNote ?? ""}
          onChange={(e) => set("outcomeNote", e.target.value)}
          placeholder="Shares spiked on TikTok, flat on Instagram"
        />
      </Box>
      <HStack gap={3}>
        <Button
          size="sm"
          bg="nexzy.blue"
          color="white"
          _hover={{ opacity: 0.9 }}
          loading={busy}
          onClick={() => void save()}
        >
          Save labels
        </Button>
        {msg && (
          <Text fontSize="xs" color={msg.ok ? "green.300" : "red.300"}>
            {msg.text}
          </Text>
        )}
      </HStack>
    </Box>
  );
}

// ---------------------------------------------------------------- entries

export function MetricsEditor({
  entry,
  onSaved,
}: {
  entry: PostLogEntry;
  onSaved: (e: PostLogEntry) => void;
}) {
  const ageH = (Date.now() - new Date(entry.postedAt).getTime()) / 3600000;
  const [win, setWin] = useState<"h24" | "d7">(
    ageH >= 24 * 7 && entry.metrics?.h24 ? "d7" : "h24",
  );
  const fields = METRIC_FIELDS[entry.platform] ?? METRIC_FIELDS.default;
  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => {
    const cur = entry.metrics?.[win] ?? {};
    setVals(
      Object.fromEntries(
        fields.map(([k]) => [k, cur[k] != null ? String(cur[k]) : ""]),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win, entry.id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setErr(null);
    const metrics: PostLogMetrics = {};
    for (const [k] of fields) {
      const n = numOrUndef(vals[k] ?? "");
      if (n != null) (metrics as Record<string, number>)[k] = n;
    }
    try {
      onSaved(
        await updatePostLog(entry.id, {
          metricsWindow: win,
          metrics: Object.keys(metrics).length ? metrics : null,
        }),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box mt={2} p={2} borderRadius="md" bg="whiteAlpha.50">
      <HStack gap={2} mb={2}>
        {(["h24", "d7"] as const).map((w) => (
          <Button
            key={w}
            size="xs"
            variant={win === w ? "solid" : "outline"}
            bg={win === w ? "nexzy.blue" : undefined}
            color={win === w ? "white" : "nexzy.gray.100"}
            borderColor="whiteAlpha.300"
            onClick={() => setWin(w)}
          >
            {w === "h24" ? "At 24 hours" : "At 7 days"}
          </Button>
        ))}
      </HStack>
      <Flex gap={2} wrap="wrap">
        {fields.map(([k, label]) => (
          <Field
            key={k}
            label={label.toUpperCase()}
            value={vals[k]}
            onChange={(v) => setVals((p) => ({ ...p, [k]: v }))}
            numeric
            flex="1 1 100px"
          />
        ))}
      </Flex>
      <HStack mt={2} gap={2}>
        <Button
          size="xs"
          bg="nexzy.blue"
          color="white"
          loading={busy}
          onClick={() => void save()}
        >
          Save numbers
        </Button>
        {err && (
          <Text color="red.300" fontSize="xs">
            {err}
          </Text>
        )}
      </HStack>
    </Box>
  );
}

const TIMING: Record<string, { label: string; color: string }> = {
  early: { label: "Early", color: "blue" },
  on_time: { label: "On time", color: "green" },
  late: { label: "Late", color: "orange" },
};

function EntryRow({
  entry,
  onChange,
  onRemove,
}: {
  entry: PostLogEntry;
  onChange: (e: PostLogEntry) => void;
  onRemove: (id: string) => void;
}) {
  const [showNums, setShowNums] = useState(false);
  const [busy, setBusy] = useState<"reply" | "del" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const t = entry.timing ? TIMING[entry.timing] : null;
  const has = (w: "h24" | "d7") => !!entry.metrics?.[w];

  const toggleReply = async () => {
    setBusy("reply");
    setErr(null);
    try {
      onChange(
        await updatePostLog(entry.id, {
          repliedFirstHour: !entry.repliedFirstHour,
        }),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    setBusy("del");
    setErr(null);
    try {
      await deletePostLog(entry.id);
      onRemove(entry.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed.");
      setBusy(null);
    }
  };

  return (
    <Box
      p={2}
      borderRadius="md"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <Flex gap={2} align="center" wrap="wrap">
        <Badge colorPalette="blue" variant="solid">
          {PLATFORM_LABEL[entry.platform] ?? entry.platform}
        </Badge>
        <Text color="nexzy.white" fontSize="sm">
          {fmtCt(entry.postedAt)} CT
        </Text>
        {t && (
          <Badge colorPalette={t.color} variant="subtle">
            {t.label}
          </Badge>
        )}
        {entry.postedVia === "in_app" && (
          <Badge colorPalette="purple" variant="subtle">
            Posted in-app
          </Badge>
        )}
        {has("h24") && (
          <Badge colorPalette="green" variant="subtle">
            24h numbers
          </Badge>
        )}
        {has("d7") && (
          <Badge colorPalette="green" variant="subtle">
            7d numbers
          </Badge>
        )}
        {entry.url && (
          <Link
            href={entry.url}
            target="_blank"
            rel="noreferrer"
            color="nexzy.lightBlue"
            fontSize="xs"
          >
            Open <FiExternalLink aria-hidden />
          </Link>
        )}
        <Box flex={1} />
        <Button
          size="xs"
          variant="outline"
          borderColor="whiteAlpha.300"
          color={entry.repliedFirstHour ? "green.300" : "nexzy.gray.100"}
          loading={busy === "reply"}
          onClick={() => void toggleReply()}
          title="Did you reply to comments in the first hour?"
        >
          {entry.repliedFirstHour ? <FiCheck aria-hidden /> : null} Replied in
          1st hour
        </Button>
        <Button
          size="xs"
          variant="outline"
          borderColor="whiteAlpha.300"
          color="nexzy.gray.100"
          onClick={() => setShowNums((v) => !v)}
        >
          Numbers
        </Button>
        <Button
          size="xs"
          variant="ghost"
          color="nexzy.gray.100"
          _hover={{ color: "red.300", bg: "whiteAlpha.100" }}
          loading={busy === "del"}
          onClick={() => void remove()}
          aria-label="Remove this logged post"
          title="Remove"
        >
          <FiTrash2 aria-hidden />
        </Button>
      </Flex>
      {err && (
        <Text color="red.300" fontSize="xs" mt={1}>
          {err}
        </Text>
      )}
      {showNums && <MetricsEditor entry={entry} onSaved={onChange} />}
    </Box>
  );
}

function guessPlatform(url: string): PostLogPlatform | "" {
  const s = url.toLowerCase();
  if (s.includes("tiktok.com/")) return "tiktok";
  if (s.includes("instagram.com/")) return "instagram";
  if (s.includes("facebook.com/") || s.includes("fb.watch/")) return "facebook";
  if (s.includes("youtube.com/") || s.includes("youtu.be/")) return "youtube";
  if (s.includes("threads.net/") || s.includes("threads.com/"))
    return "threads";
  if (s.includes("x.com/") || s.includes("twitter.com/")) return "x";
  if (s.includes("reddit.com/") || s.includes("redd.it/")) return "reddit";
  return "";
}

function AddForm({
  cardId,
  onAdded,
}: {
  cardId: string;
  onAdded: (e: PostLogEntry) => void;
}) {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<PostLogPlatform | "">("");
  const [postedAt, setPostedAt] = useState(() =>
    isoToCtInput(new Date().toISOString()),
  );
  const [plannedAt, setPlannedAt] = useState("");
  const [replied, setReplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const detected = guessPlatform(url);
  const effective = platform || detected;

  const add = async () => {
    setErr(null);
    if (!effective) {
      setErr("Pick the platform (it could not be read from the link).");
      return;
    }
    const posted = ctInputToIso(postedAt);
    if (!posted) {
      setErr("Set when it went out.");
      return;
    }
    setBusy(true);
    try {
      const e = await addPostLog(cardId, {
        platform: effective,
        ...(url.trim() ? { url: url.trim() } : {}),
        postedAt: posted,
        plannedAt: plannedAt ? ctInputToIso(plannedAt) : null,
        repliedFirstHour: replied,
      });
      onAdded(e);
      setUrl("");
      setPlatform("");
      setPlannedAt("");
      setReplied(false);
      setPostedAt(isoToCtInput(new Date().toISOString()));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't log it.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      p={2}
      borderRadius="md"
      border="1px dashed"
      borderColor="whiteAlpha.300"
    >
      <Flex gap={2} wrap="wrap" align="flex-end">
        <Box flex="3 1 260px">
          <Label>POST LINK</Label>
          <Input
            {...fld}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@nexzy/video/…"
          />
        </Box>
        <Box flex="1 1 130px">
          <Label>PLATFORM</Label>
          <select
            value={platform || detected}
            onChange={(e) => setPlatform(e.target.value as PostLogPlatform)}
            style={SELECT_STYLE}
          >
            <option value="">Pick…</option>
            {POST_LOG_PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Box>
        <Box flex="1 1 180px">
          <Label>WENT OUT (CT)</Label>
          <Input
            {...fld}
            type="datetime-local"
            value={postedAt}
            onChange={(e) => setPostedAt(e.target.value)}
          />
        </Box>
        <Box flex="1 1 180px">
          <Label>PLANNED FOR (CT, OPTIONAL)</Label>
          <Input
            {...fld}
            type="datetime-local"
            value={plannedAt}
            onChange={(e) => setPlannedAt(e.target.value)}
          />
        </Box>
      </Flex>
      <HStack mt={2} gap={3} wrap="wrap">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(255,255,255,0.8)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={replied}
            onChange={(e) => setReplied(e.target.checked)}
          />
          Replied to comments in the first hour
        </label>
        <Box flex={1} />
        <Button
          size="sm"
          bg="nexzy.blue"
          color="white"
          _hover={{ opacity: 0.9 }}
          loading={busy}
          onClick={() => void add()}
        >
          <FiPlus aria-hidden /> Log this post
        </Button>
      </HStack>
      {err && (
        <Text color="red.300" fontSize="xs" mt={1}>
          {err}
        </Text>
      )}
      <Text color="whiteAlpha.500" fontSize="xs" mt={1}>
        One row per platform. Posts published from this card in-app are logged
        automatically. The link ties it to the platform&apos;s own numbers.
      </Text>
    </Box>
  );
}

export default function PostLogBox({
  card,
  onUpdate,
}: {
  card: ContentSuggestion;
  onUpdate: (c: ContentSuggestion) => void;
}) {
  const [entries, setEntries] = useState<PostLogEntry[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(!card.payload?.postMeta?.kind);

  const load = async () => {
    setLoadErr(null);
    try {
      setEntries(await listPostLog(card.id));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Couldn't load posts.");
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  const upsert = (e: PostLogEntry) =>
    setEntries((prev) => {
      const list = prev ?? [];
      const i = list.findIndex((x) => x.id === e.id);
      const next =
        i >= 0 ? list.map((x) => (x.id === e.id ? e : x)) : [...list, e];
      return next.sort((a, b) => (a.postedAt < b.postedAt ? -1 : 1));
    });

  const kind = card.payload?.postMeta?.kind;

  return (
    <VStack align="stretch" gap={3}>
      <Box>
        <Flex align="center" gap={2} mb={2}>
          <Text color="nexzy.white" fontWeight="700" fontSize="sm">
            Labels
          </Text>
          {kind ? (
            <Badge colorPalette="green" variant="subtle">
              {POST_KINDS.find((k) => k.id === kind)?.label ?? kind}
            </Badge>
          ) : (
            <Badge colorPalette="yellow" variant="subtle">
              Not labeled yet
            </Badge>
          )}
          <Box flex={1} />
          <Button
            size="xs"
            variant="ghost"
            color="nexzy.gray.100"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => setShowLabels((v) => !v)}
          >
            {showLabels ? "Hide" : "Edit labels"}
          </Button>
        </Flex>
        {showLabels && <LabelsForm card={card} onUpdate={onUpdate} />}
      </Box>

      <Box>
        <Flex align="center" gap={2} mb={2}>
          <Text color="nexzy.white" fontWeight="700" fontSize="sm">
            Where it went
          </Text>
          {entries && (
            <Badge colorPalette="gray" variant="subtle">
              {entries.length} logged
            </Badge>
          )}
          <Box flex={1} />
          <Button
            size="xs"
            variant="ghost"
            color="nexzy.gray.100"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => void load()}
            aria-label="Reload logged posts"
            title="Reload"
          >
            <FiRefreshCw aria-hidden />
          </Button>
        </Flex>
        {loadErr && (
          <HStack mb={2}>
            <Text color="red.300" fontSize="xs">
              {loadErr}
            </Text>
            <Button size="xs" variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          </HStack>
        )}
        {!entries && !loadErr && (
          <VStack align="stretch" gap={2} mb={2}>
            {[0, 1].map((i) => (
              <Box
                key={i}
                h="38px"
                borderRadius="md"
                bg="whiteAlpha.100"
                opacity={0.6}
              />
            ))}
          </VStack>
        )}
        {entries && entries.length === 0 && (
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            Nothing logged yet. Paste each platform&apos;s link after it goes
            out.
          </Text>
        )}
        {entries && entries.length > 0 && (
          <VStack align="stretch" gap={2} mb={2}>
            {entries.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                onChange={upsert}
                onRemove={(id) =>
                  setEntries((p) => (p ?? []).filter((x) => x.id !== id))
                }
              />
            ))}
          </VStack>
        )}
        <AddForm cardId={card.id} onAdded={upsert} />
      </Box>
    </VStack>
  );
}
