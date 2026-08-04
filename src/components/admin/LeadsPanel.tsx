"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Badge,
  Link,
  Spinner,
  Textarea,
} from "@chakra-ui/react";
import {
  getVideoLeads,
  generateFromLead,
  skipContentSuggestion,
  getWriterNames,
  getAudienceProfile,
  type AudienceProfile,
  type ContentSuggestion,
} from "@/lib/admin/client";

const LANE_COLOR: Record<string, string> = {
  deal: "orange",
  news: "blue",
  guide: "cyan",
};

const FORMATS: { key: string; label: string }[] = [
  { key: "short", label: "Short" },
  { key: "long", label: "Long-form" },
  { key: "image", label: "Image" },
  { key: "text_post", label: "Text post" },
  { key: "none", label: "No video" },
];

const X_FORMATS: { key: string; label: string }[] = [
  { key: "hot_take", label: "Hot take" },
  { key: "thread", label: "Thread" },
  { key: "poll", label: "Poll" },
  { key: "image", label: "Image" },
  { key: "clip", label: "Clip" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// General best posting windows per platform (grounded in our growth guides),
// as local-clock target hours. The fallback when we have no real data yet.
const GUIDE_WINDOWS: Record<string, number[]> = {
  x: [9, 12, 19],
  threads: [9, 12],
  instagram: [12, 19],
  reels: [12, 19],
  facebook: [13, 19],
  youtube: [15],
  tiktok: [8, 13, 19],
};
const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  threads: "Threads",
  instagram: "Instagram",
  reels: "Reels",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
};

function fmtSlot(at: Date, now: Date): string {
  const a = new Date(at);
  a.setHours(0, 0, 0, 0);
  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  const diff = Math.round((a.getTime() - n.getTime()) / 86400000);
  const time = at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diff === 0) return `today ${time}`;
  if (diff === 1) return `tomorrow ${time}`;
  return `${at.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

/**
 * Now-aware "when to post" for one platform, in the viewer's local time. Uses
 * real per-platform data (UTC hour by weekday) when present, else the general
 * growth-guide windows. Returns null when we have neither.
 */
function nextPostSlot(
  platform: string,
  now: Date,
  real?: Record<string, { hour: number; n: number; source: string }>,
): { text: string; src: string } | null {
  const windows = GUIDE_WINDOWS[platform];
  const hasReal = !!real && Object.keys(real).length > 0;
  if (!windows && !hasReal) return null;
  const DAY = 86400000;
  const cands: { at: Date; src: string }[] = [];
  for (let i = 0; i <= 8; i++) {
    const day = new Date(now.getTime() + i * DAY);
    if (hasReal) {
      const rd = real![DAY_NAMES[day.getUTCDay()]];
      if (rd) {
        cands.push({
          at: new Date(
            Date.UTC(
              day.getUTCFullYear(),
              day.getUTCMonth(),
              day.getUTCDate(),
              rd.hour,
              0,
              0,
            ),
          ),
          src: `your data (${rd.n})`,
        });
      }
    }
    if (windows) {
      for (const h of windows) {
        const c = new Date(day);
        c.setHours(h, 0, 0, 0);
        cands.push({ at: c, src: "general" });
      }
    }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a.at.getTime() - b.at.getTime());
  const nowMs = now.getTime();
  const past = cands.filter((c) => c.at.getTime() <= nowMs);
  const active = past.length ? past[past.length - 1] : null;
  if (active && nowMs - active.at.getTime() <= 90 * 60000) {
    return { text: `Post now (${fmtSlot(active.at, now)})`, src: active.src };
  }
  const next = cands.find((c) => c.at.getTime() > nowMs);
  if (!next) return null;
  return { text: `Post ${fmtSlot(next.at, now)}`, src: next.src };
}

function topEntry(m?: Record<string, number>): [string, number] | null {
  const e = Object.entries(m || {}).sort((a, b) => b[1] - a[1]);
  return e.length ? e[0] : null;
}
function peakHours(hours?: number[]): string {
  if (!Array.isArray(hours) || !hours.some((n) => n > 0)) return "";
  return hours
    .map((n, h) => ({ n, h }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((x) => `${String(x.h).padStart(2, "0")}:00`)
    .join(", ");
}

function fmtLabel(key?: string): string {
  return FORMATS.find((f) => f.key === key)?.label ?? key ?? "Short";
}

/** One video lead: pick writer + format, then Generate (spends tokens). */
function LeadCard({
  s,
  writers,
  isOwner,
  onDone,
  reload,
  audienceByDay,
  audienceByPlatformDay,
}: {
  s: ContentSuggestion;
  writers: string[];
  isOwner: boolean;
  onDone: (id: string) => void;
  reload: () => void | Promise<void>;
  audienceByDay?: Record<string, string>;
  audienceByPlatformDay?: Record<
    string,
    Record<string, { hour: number; n: number; source: string }>
  >;
}) {
  const lead = s.payload?.lead;
  const [writer, setWriter] = useState(
    lead?.suggestedWriter || s.author || "Chuy",
  );
  const [format, setFormat] = useState(lead?.suggestedFormat || "short");
  const [busy, setBusy] = useState<"gen" | "skip" | null>(null);
  const [steer, setSteer] = useState("");
  const [xFormat, setXFormat] = useState(lead?.xFormat || "hot_take");
  const now = useMemo(() => new Date(), []);
  const postSlots = useMemo(() => {
    const plats = lead?.platforms ?? [];
    return plats
      .map((p) => {
        const realKey = p === "reels" ? "instagram" : p;
        const slot = nextPostSlot(p, now, audienceByPlatformDay?.[realKey]);
        return slot
          ? { platform: p, label: PLATFORM_LABEL[p] ?? p, ...slot }
          : null;
      })
      .filter(
        (x): x is { platform: string; label: string; text: string; src: string } =>
          x !== null,
      );
  }, [lead?.platforms, audienceByPlatformDay, now]);
  const generating = !!s.payload?.generating;
  const lastError = s.payload?.lastError;

  const writerOptions =
    writers.length > 0
      ? Array.from(new Set([writer, ...writers]))
      : [writer, "Chuy", "Leslie", "Bana"].filter(
          (v, i, a) => a.indexOf(v) === i,
        );

  const generate = async () => {
    setBusy("gen");
    try {
      await generateFromLead(
        s.id,
        writer,
        format,
        steer.trim() || undefined,
        xFormat,
      );
      await reload(); // pick up the queued 'generating' state (or removal)
    } catch {
      /* leave the lead in place so you can retry */
    } finally {
      setBusy(null);
    }
  };
  const skip = async () => {
    setBusy("skip");
    try {
      await skipContentSuggestion(s.id);
      onDone(s.id);
    } catch {
      setBusy(null);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <Flex justify="space-between" align="flex-start" gap={3} mb={2}>
        <HStack gap={2} wrap="wrap" flex={1} minW={0}>
          <Badge
            colorPalette={LANE_COLOR[s.lane ?? ""] || "gray"}
            variant="solid"
          >
            {(s.lane ?? "news").toUpperCase()}
          </Badge>
          <Badge colorPalette="purple" variant="subtle">
            suggests: {fmtLabel(lead?.suggestedFormat)}
          </Badge>
          {lead?.xFormat && (
            <Badge colorPalette="cyan" variant="subtle">
              X: {lead.xFormat.replace(/_/g, " ")}
            </Badge>
          )}
          {lead?.when && (
            <Badge
              colorPalette={
                lead.when === "now"
                  ? "green"
                  : lead.when === "pre_event"
                    ? "orange"
                    : "blue"
              }
              variant="subtle"
            >
              {lead.when === "now"
                ? "POST NOW"
                : lead.when === "pre_event"
                  ? "PRE-EVENT"
                  : "SCHEDULE"}
            </Badge>
          )}
          <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
            {s.title}
          </Text>
        </HStack>
      </Flex>

      {lead?.summary && (
        <Text color="nexzy.gray.100" fontSize="sm" mb={2}>
          {lead.summary}
        </Text>
      )}
      {lead?.timing && (
        <Text color="nexzy.lightBlue" fontSize="xs" mb={2}>
          🕒 {lead.timing}
        </Text>
      )}

      {postSlots.length > 0 && (
        <Box mb={2}>
          <Text
            color="whiteAlpha.600"
            fontSize="10px"
            fontWeight="700"
            mb={0.5}
          >
            📅 WHEN TO POST (your local time)
          </Text>
          <Flex direction="column" gap={0.5}>
            {postSlots.map((ps) => (
              <Text key={ps.platform} color="nexzy.gray.100" fontSize="xs">
                <Text as="span" color="nexzy.white" fontWeight="700">
                  {ps.label}
                </Text>{" "}
                {ps.text}{" "}
                <Text as="span" color="whiteAlpha.500">
                  · {ps.src}
                </Text>
              </Text>
            ))}
          </Flex>
        </Box>
      )}

      {audienceByDay && Object.keys(audienceByDay).length > 0 && (
        <Box mb={2}>
          <Text
            color="whiteAlpha.600"
            fontSize="10px"
            fontWeight="700"
            mb={0.5}
          >
            📅 BEST TIMES TO POST (by day)
          </Text>
          <Flex gap={3} wrap="wrap">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
              .filter((d) => audienceByDay[d])
              .map((d) => (
                <Text key={d} color="nexzy.gray.100" fontSize="xs">
                  <Text as="span" color="nexzy.white" fontWeight="700">
                    {d}
                  </Text>{" "}
                  {audienceByDay[d]}
                </Text>
              ))}
          </Flex>
        </Box>
      )}
      {lead?.reason && (
        <Text color="nexzy.gray.100" fontSize="xs" mb={3} fontStyle="italic">
          Why: {lead.reason}
        </Text>
      )}

      {lastError && (
        <Text color="red.300" fontSize="xs" mb={3}>
          ⚠ Last generation failed: {lastError}. Adjust and retry.
        </Text>
      )}

      {/* Writer picker */}
      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Writer / voice
      </Text>
      <HStack gap={1} wrap="wrap" mb={3}>
        {writerOptions.map((w) => (
          <Button
            key={w}
            size="xs"
            variant={writer === w ? "solid" : "outline"}
            bg={writer === w ? "nexzy.blue" : "transparent"}
            color={writer === w ? "white" : "nexzy.gray.100"}
            borderColor="whiteAlpha.300"
            _hover={{ bg: writer === w ? "nexzy.blue" : "whiteAlpha.100" }}
            onClick={() => setWriter(w)}
          >
            {w}
          </Button>
        ))}
      </HStack>

      {/* Format picker */}
      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Format
      </Text>
      <HStack gap={1} wrap="wrap" mb={4}>
        {FORMATS.map((f) => (
          <Button
            key={f.key}
            size="xs"
            variant={format === f.key ? "solid" : "outline"}
            bg={format === f.key ? "nexzy.blue" : "transparent"}
            color={format === f.key ? "white" : "nexzy.gray.100"}
            borderColor="whiteAlpha.300"
            _hover={{ bg: format === f.key ? "nexzy.blue" : "whiteAlpha.100" }}
            onClick={() => setFormat(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </HStack>

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        X format{lead?.xFormat ? ` · suggested: ${lead.xFormat.replace(/_/g, " ")}` : ""}
      </Text>
      <HStack gap={1} wrap="wrap" mb={4}>
        {X_FORMATS.map((f) => (
          <Button
            key={f.key}
            size="xs"
            variant={xFormat === f.key ? "solid" : "outline"}
            bg={xFormat === f.key ? "nexzy.blue" : "transparent"}
            color={xFormat === f.key ? "white" : "nexzy.gray.100"}
            borderColor="whiteAlpha.300"
            _hover={{ bg: xFormat === f.key ? "nexzy.blue" : "whiteAlpha.100" }}
            onClick={() => setXFormat(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </HStack>

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Notes / steer (optional — factored into the generated video)
      </Text>
      <Textarea
        value={steer}
        onChange={(e) => setSteer(e.target.value)}
        rows={2}
        mb={4}
        bg="whiteAlpha.50"
        color="nexzy.white"
        borderColor="whiteAlpha.300"
        fontSize="sm"
        placeholder="e.g. sound excited; note it's a sequel; keep it tight"
      />

      <Flex justify="space-between" align="center" gap={2}>
        {s.url ? (
          <Link
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            color="nexzy.lightBlue"
            fontSize="xs"
          >
            Article ↗
          </Link>
        ) : (
          <Box />
        )}
        <HStack gap={2}>
          {isOwner && (
            <Button
              size="sm"
              colorPalette="green"
              onClick={generate}
              loading={busy === "gen" || generating}
              loadingText="Generating…"
              disabled={generating}
            >
              {lastError ? "🎬 Retry" : "🎬 Generate"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            color="nexzy.gray.100"
            _hover={{ bg: "whiteAlpha.100", color: "red.300" }}
            onClick={skip}
            loading={busy === "skip"}
            loadingText="…"
          >
            Skip
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}

const PLATFORMS_SHOWN = [
  "x",
  "threads",
  "instagram",
  "facebook",
  "youtube",
  "tiktok",
];

function relTime(d: Date): string {
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Best posting time(s) for a SPECIFIC day — real data if we have it, else the
 *  general growth-guide windows. Returns null when neither applies. */
function slotForDay(
  platform: string,
  target: Date,
  real?: Record<string, { hour: number; n: number; source: string }>,
): { time: string; src: string; isReal: boolean } | null {
  const dnUTC = DAY_NAMES[target.getUTCDay()];
  if (real && real[dnUTC]) {
    const rd = real[dnUTC];
    const at = new Date(
      Date.UTC(
        target.getUTCFullYear(),
        target.getUTCMonth(),
        target.getUTCDate(),
        rd.hour,
        0,
        0,
      ),
    );
    return {
      time: at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      src: `your data (${rd.n})`,
      isReal: true,
    };
  }
  const windows = GUIDE_WINDOWS[platform];
  if (!windows || !windows.length) return null;
  const times = windows.map((h) => {
    const c = new Date(target);
    c.setHours(h, 0, 0, 0);
    return c.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  });
  return { time: times.join(", "), src: "general", isReal: false };
}

/** Rich, day-selectable audience + best-times stats hub for the Leads header. */
export function AudiencePanel({
  audience,
  isOwner,
  onRefresh,
  busy,
}: {
  audience: AudienceProfile | null;
  isOwner: boolean;
  onRefresh: () => void;
  busy: boolean;
}) {
  const dayOptions = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base.getTime() + i * 86400000);
      const label =
        i === 0
          ? "Today"
          : i === 1
            ? "Tomorrow"
            : d.toLocaleDateString([], { weekday: "short" });
      return { i, date: d, label };
    });
  }, []);
  const [dayIdx, setDayIdx] = useState(0);
  const sel = dayOptions[Math.min(dayIdx, dayOptions.length - 1)];

  const has = !!audience?.dominantAge;
  const byPlat = audience?.bestTimes?.byPlatformDay;
  const pull = audience?.bestTimes?.pull;
  const anyReal = !!byPlat && Object.keys(byPlat).length > 0;
  const ages = Object.entries(audience?.ageBrackets || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const gTop = topEntry(audience?.gender);
  const countries = Object.entries(audience?.topCountries || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const updated = audience?.fetchedAt ? relTime(new Date(audience.fetchedAt)) : "";
  const rows = PLATFORMS_SHOWN.map((p) => {
    const slot = slotForDay(p, sel.date, byPlat?.[p]);
    return slot ? { p, label: PLATFORM_LABEL[p] ?? p, ...slot } : null;
  }).filter(
    (
      x,
    ): x is {
      p: string;
      label: string;
      time: string;
      src: string;
      isReal: boolean;
    } => x !== null,
  );
  const realRows = rows.filter((r) => r.isReal);
  const generalRows = rows.filter((r) => !r.isReal);
  const renderRow = (r: {
    p: string;
    label: string;
    time: string;
    src: string;
    isReal: boolean;
  }) => (
    <Flex key={r.p} align="center" gap={2}>
      <Text
        fontSize="xs"
        color="nexzy.white"
        fontWeight="600"
        w="72px"
        flexShrink={0}
      >
        {r.label}
      </Text>
      <Text fontSize="xs" color="nexzy.gray.100" flex="1" minW={0}>
        {r.time}
      </Text>
      {r.isReal && (
        <Text fontSize="10px" fontWeight="700" color="green.300" flexShrink={0}>
          ● {r.src}
        </Text>
      )}
    </Flex>
  );

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      px={4}
      py={3}
    >
      <Flex justify="space-between" align="center" gap={2} wrap="wrap" mb={has ? 3 : 1}>
        <Text color="nexzy.white" fontSize="sm" fontWeight="700">
          👥 Audience &amp; best times
          {has && updated ? (
            <Text as="span" color="whiteAlpha.500" fontWeight="400">
              {"  ·  updated " + updated}
            </Text>
          ) : has ? null : (
            <Text as="span" color="whiteAlpha.500" fontWeight="400">
              {"  — not pulled yet"}
            </Text>
          )}
        </Text>
        {isOwner && (
          <Button
            size="sm"
            bg="nexzy.blue"
            color="white"
            fontWeight="700"
            _hover={{ bg: "nexzy.lightBlue" }}
            _active={{ bg: "nexzy.lightBlue" }}
            onClick={onRefresh}
            loading={busy}
            loadingText="Pulling…"
          >
            ↻ Refresh
          </Button>
        )}
      </Flex>

      {has ? (
        <>
          <Flex gap={1} wrap="wrap" mb={2}>
            {dayOptions.map((o) => (
              <Button
                key={o.i}
                size="xs"
                variant={o.i === dayIdx ? "solid" : "outline"}
                bg={o.i === dayIdx ? "nexzy.blue" : "transparent"}
                color={o.i === dayIdx ? "white" : "nexzy.gray.100"}
                borderColor="whiteAlpha.300"
                _hover={{ bg: o.i === dayIdx ? "nexzy.blue" : "whiteAlpha.100" }}
                onClick={() => setDayIdx(o.i)}
              >
                {o.label}
              </Button>
            ))}
          </Flex>

          <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={1}>
            ⏰ BEST TIME TO POST — {sel.label.toUpperCase()} (your local time)
          </Text>
          {realRows.length > 0 && (
            <Box mb={2}>
              <Text color="green.300" fontSize="10px" fontWeight="700" mb={1}>
                ✅ FROM YOUR REAL DATA
              </Text>
              <VStack align="stretch" gap={1}>
                {realRows.map(renderRow)}
              </VStack>
            </Box>
          )}
          <Box mb={3}>
            <Text color="whiteAlpha.500" fontSize="10px" fontWeight="700" mb={1}>
              📊 GENERAL · BEST PRACTICE
              {realRows.length === 0 ? " (no post history yet)" : ""}
            </Text>
            <VStack align="stretch" gap={1}>
              {generalRows.map(renderRow)}
            </VStack>
          </Box>

          <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={1}>
            👥 WHO{audience?.sources?.length ? ` · from ${audience.sources.join(", ")}` : ""}
          </Text>
          <VStack align="stretch" gap={1} mb={2}>
            {ages.map(([k, v]) => (
              <Flex key={k} align="center" gap={2}>
                <Text
                  w="52px"
                  fontSize="10px"
                  color="nexzy.gray.100"
                  flexShrink={0}
                >
                  {k}
                </Text>
                <Box
                  flex="1"
                  h="6px"
                  bg="whiteAlpha.200"
                  borderRadius="full"
                  overflow="hidden"
                >
                  <Box
                    h="100%"
                    w={`${Math.min(100, Math.max(2, v))}%`}
                    bg="nexzy.blue"
                  />
                </Box>
                <Text
                  w="34px"
                  fontSize="10px"
                  color="nexzy.white"
                  textAlign="right"
                  flexShrink={0}
                >
                  {v}%
                </Text>
              </Flex>
            ))}
          </VStack>
          <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
            {[
              gTop ? `${gTop[1]}% ${gTop[0]}` : "",
              countries.length
                ? `top: ${countries.map(([c, p]) => `${c} ${p}%`).join(", ")}`
                : "",
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </Text>

          <Text color="whiteAlpha.500" fontSize="10px" mt={1}>
            {anyReal
              ? "● = your real post data. Others are best-practice windows until that platform has post history."
              : "Times are best-practice windows for now — publish + Refresh and they switch to your real numbers per platform."}
          </Text>

          {pull && Object.keys(pull).length > 0 && (
            <Box mt={3} pt={2} borderTop="1px solid" borderColor="whiteAlpha.100">
              <Text
                color="whiteAlpha.600"
                fontSize="10px"
                fontWeight="700"
                mb={1}
              >
                🔌 DATA SOURCES — what Refresh actually pulled
              </Text>
              <VStack align="stretch" gap={0.5}>
                {["instagram", "facebook", "threads", "youtube", "x"].map((p) => {
                  const st = pull[p];
                  if (!st) return null;
                  const ok = st.withReach > 0;
                  const color = st.error
                    ? "orange.300"
                    : ok
                      ? "green.300"
                      : "whiteAlpha.500";
                  const txt = st.error
                    ? st.error
                    : `${st.listed} post${st.listed === 1 ? "" : "s"} pulled · ${st.withReach} with reach`;
                  return (
                    <Flex key={p} align="center" gap={2}>
                      <Text
                        fontSize="10px"
                        color="nexzy.gray.100"
                        fontWeight="600"
                        w="72px"
                        flexShrink={0}
                      >
                        {PLATFORM_LABEL[p] ?? p}
                      </Text>
                      <Text fontSize="10px" color={color} minW={0}>
                        {ok ? "● " : st.error ? "⚠️ " : ""}
                        {txt}
                      </Text>
                    </Flex>
                  );
                })}
              </VStack>
            </Box>
          )}
        </>
      ) : (
        <Text color="nexzy.gray.100" fontSize="xs">
          Pull IG + YouTube demographics to tailor leads — audience age, gender,
          countries, and best posting times. (IG online-hours need ~100
          followers.)
        </Text>
      )}

      {audience?.errors && Object.keys(audience.errors).length > 0 && (
        <Text color="orange.300" fontSize="10px" mt={2}>
          {Object.entries(audience.errors)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")}
        </Text>
      )}
    </Box>
  );
}

/**
 * Leads — every published article lands here as a zero-heavy-token video lead
 * with a suggested writer + format. Pick, then Generate → the real card is
 * written (in that voice) and appears under Suggestions.
 */
export default function LeadsPanel({ isOwner }: { isOwner: boolean }) {
  const [leads, setLeads] = useState<ContentSuggestion[] | null>(null);
  const [writers, setWriters] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState<AudienceProfile | null>(null);

  const load = useCallback(async () => {
    try {
      const [l, w] = await Promise.all([
        getVideoLeads(),
        getWriterNames().catch(() => []),
      ]);
      setLeads(l);
      setWriters(w);
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Failed to load leads.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getAudienceProfile()
      .then(setAudience)
      .catch(() => setAudience(null));
  }, []);

  // While any lead is generating (a queued job is running), poll so the board
  // updates when it finishes (card appears in Suggestions) or fails.
  useEffect(() => {
    if (!leads?.some((l) => l.payload?.generating)) return;
    const t = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(t);
  }, [leads, load]);

  const remove = (id: string) =>
    setLeads((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));

  if (error) {
    return (
      <Text color="red.300" fontSize="sm">
        {error}
      </Text>
    );
  }
  if (!leads) {
    return (
      <Flex justify="center" py={12}>
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }

  return (
    <VStack align="stretch" gap={4}>
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Video leads
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          Each published article lands here first. Pick the writer and format,
          then Generate — nothing heavy runs until you do.
        </Text>
      </Box>

      {leads.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          No open leads right now.
        </Text>
      ) : (
        leads.map((s) => (
          <LeadCard
            key={s.id}
            s={s}
            writers={writers}
            isOwner={isOwner}
            onDone={remove}
            reload={load}
            audienceByDay={audience?.bestTimes?.byDay}
            audienceByPlatformDay={audience?.bestTimes?.byPlatformDay}
          />
        ))
      )}
    </VStack>
  );
}
