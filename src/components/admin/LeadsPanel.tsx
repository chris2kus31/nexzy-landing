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
import Paginated from "@/components/admin/Paginated";
import YouTubePerformance, {
  type YtSource,
} from "@/components/admin/YouTubePerformance";

const LANE_COLOR: Record<string, string> = {
  deal: "orange",
  news: "blue",
  guide: "cyan",
};

// Per-platform format options: [value, label, asset-bucket]. The BUCKET is what
// actually gets built — platforms that share a bucket ship as ONE card, so the
// plan below turns directly into "you'll generate N cards".
const PLAT_OPTS: Record<string, [string, string, string][]> = {
  youtube: [
    ["short", "Short", "video"],
    ["long", "Long-form", "long"],
    ["skip", "Skip", "skip"],
  ],
  instagram: [
    ["reel", "Reel", "video"],
    ["carousel", "Carousel", "carousel"],
    ["image", "Image", "image"],
    ["skip", "Skip", "skip"],
  ],
  tiktok: [
    ["video", "Video", "video"],
    ["photo", "Photo (TikTok)", "photo"],
    ["skip", "Skip", "skip"],
  ],
  facebook: [
    ["reel", "Reel", "video"],
    ["album", "Album (FB)", "album"],
    ["image", "Image", "image"],
    ["skip", "Skip", "skip"],
  ],
  threads: [
    ["text", "Text take", "video"],
    ["image", "Image", "image"],
    ["carousel", "Carousel", "carousel"],
    ["skip", "Skip", "skip"],
  ],
  x: [
    ["hot_take", "Hot take", "video"],
    ["thread", "Thread", "video"],
    ["poll", "Poll", "video"],
    ["clip", "Clip", "video"],
    ["image", "Image", "image"],
    ["skip", "Skip", "skip"],
  ],
};
const PLAN_ROWS: [string, string, string][] = [
  ["youtube", "YouTube", ""],
  ["instagram", "Instagram", ""],
  ["tiktok", "TikTok", ""],
  ["facebook", "Facebook", ""],
  ["threads", "Threads", ""],
  ["x", "X", "post shape"],
];
const BUCKET_ORDER = ["video", "long", "carousel", "photo", "album", "image"];

function planBucket(pf: string, v: string): string {
  const o = PLAT_OPTS[pf]?.find((x) => x[0] === v);
  return o ? o[2] : "skip";
}
function planOptLabel(pf: string, v: string): string {
  const o = PLAT_OPTS[pf]?.find((x) => x[0] === v);
  return o ? o[1] : v;
}
// The analyst's per-platform recommendation → a valid option for that surface.
function normFmt(pf: string, v?: string): string {
  if (v === "none") return "skip";
  if (v && PLAT_OPTS[pf].some((o) => o[0] === v)) return v;
  return PLAT_OPTS[pf][0][0];
}
function bucketLabel(b: string, lane?: string): string {
  if (b === "image") return lane === "deal" ? "Deal image" : "Image post";
  return (
    {
      video: "Short video",
      long: "Long-form video",
      carousel: "Carousel",
      photo: "Photo deck",
      album: "Album",
    }[b] ?? b
  );
}

const SELECT_STYLE: React.CSSProperties = {
  appearance: "none",
  background: "#0f1626",
  color: "#eef2f8",
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: "8px",
  padding: "7px 12px",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
  minWidth: "210px",
};

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
  const time = at.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  if (diff === 0) return `today ${time}`;
  if (diff === 1) return `tomorrow ${time}`;
  return `${at.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

/**
 * Now-aware "when to post" for one platform, in the owner's local time. Uses
 * real per-platform data (owner-local hour by weekday) when present, else the
 * general growth-guide windows. Returns null when we have neither.
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
      const rd = real![DAY_NAMES[day.getDay()]];
      if (rd) {
        const c = new Date(day);
        c.setHours(rd.hour, 0, 0, 0);
        cands.push({ at: c, src: `your data (${rd.n})` });
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

/** One video lead: collapsible; set the per-platform plan, then Generate. */
function LeadCard({
  s,
  writers,
  isOwner,
  open,
  onToggle,
  onDone,
  reload,
  audienceByDay,
  audienceByPlatformDay,
}: {
  s: ContentSuggestion;
  writers: string[];
  isOwner: boolean;
  open: boolean;
  onToggle: () => void;
  onDone: (id: string) => void;
  reload: () => void | Promise<void>;
  audienceByDay?: Record<string, string>;
  audienceByPlatformDay?: Record<
    string,
    Record<string, { hour: number; n: number; source: string }>
  >;
}) {
  const lead = s.payload?.lead;
  // The lead row's author is canonical (it persists the last chosen writer);
  // the payload suggestion is only the analyst's initial pick.
  const [writer, setWriter] = useState(
    s.author || lead?.suggestedWriter || "Chuy",
  );
  const [busy, setBusy] = useState<"gen" | "skip" | null>(null);
  const [steer, setSteer] = useState("");

  // The analyst's recommended plan (platformFormats + xFormat), normalized to
  // valid per-surface options — this pre-fills the pickers and marks "changed".
  const rec = useMemo<Record<string, string>>(
    () => ({
      youtube: normFmt("youtube", lead?.platformFormats?.youtube),
      instagram: normFmt("instagram", lead?.platformFormats?.instagram),
      tiktok: normFmt("tiktok", lead?.platformFormats?.tiktok),
      facebook: normFmt("facebook", lead?.platformFormats?.facebook),
      threads: normFmt("threads", lead?.platformFormats?.threads),
      x: normFmt("x", lead?.platformFormats?.x ?? lead?.xFormat),
    }),
    [lead],
  );
  const [plan, setPlan] = useState<Record<string, string>>(rec);
  const setP = (pf: string, v: string) => setPlan((p) => ({ ...p, [pf]: v }));

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
        (
          x,
        ): x is {
          platform: string;
          label: string;
          text: string;
          src: string;
        } => x !== null,
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

  // Group the six picks into the assets they build (platforms sharing a format
  // share a card) — this drives the live "You'll generate" preview.
  const groups = useMemo(() => {
    const m: Record<string, string[]> = {};
    PLAN_ROWS.forEach(([pf]) => {
      const b = planBucket(pf, plan[pf]);
      if (b === "skip") return;
      (m[b] = m[b] || []).push(pf);
    });
    return m;
  }, [plan]);
  const activeBuckets = BUCKET_ORDER.filter((b) => groups[b]);
  const cardCount = activeBuckets.length;
  const lane = s.lane ?? "news";

  const generate = async () => {
    setBusy("gen");
    try {
      await generateFromLead(
        s.id,
        writer,
        undefined,
        steer.trim() || undefined,
        undefined,
        plan,
      );
      await reload();
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

  const whenBadge = lead?.when;
  const summaryChip = cardCount
    ? `${writer} · ${cardCount} card${cardCount > 1 ? "s" : ""} · ${activeBuckets
        .map((b) => bucketLabel(b, lane))
        .join(", ")}`
    : `${writer} · nothing selected`;

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      overflow="hidden"
    >
      {/* Header — always visible; click to expand/collapse */}
      <Flex
        align="center"
        gap={3}
        p={4}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ bg: "whiteAlpha.50" }}
      >
        <Text
          color="nexzy.gray.100"
          fontSize="sm"
          transform={open ? "rotate(90deg)" : "none"}
          transition="transform .15s"
        >
          ▶
        </Text>
        <Badge colorPalette={LANE_COLOR[lane] || "gray"} variant="solid">
          {lane.toUpperCase()}
        </Badge>
        {whenBadge && (
          <Badge
            colorPalette={
              whenBadge === "now"
                ? "green"
                : whenBadge === "pre_event"
                  ? "orange"
                  : "blue"
            }
            variant="subtle"
          >
            {whenBadge === "now"
              ? "POST NOW"
              : whenBadge === "pre_event"
                ? "PRE-EVENT"
                : "SCHEDULE"}
          </Badge>
        )}
        <Text
          color="nexzy.white"
          fontWeight="700"
          lineClamp={1}
          flex={1}
          minW={0}
        >
          {s.title}
        </Text>
        {generating && <Spinner size="xs" color="nexzy.blue" />}
        <Text
          color="nexzy.gray.100"
          fontSize="xs"
          whiteSpace="nowrap"
          display={{ base: "none", md: "block" }}
        >
          {summaryChip}
        </Text>
      </Flex>

      {open && (
        <Box px={4} pb={4}>
          {lead?.summary && (
            <Text color="nexzy.gray.100" fontSize="sm" mb={2}>
              {lead.summary}
            </Text>
          )}
          {lead?.timing && (
            <Text color="nexzy.lightBlue" fontSize="xs" mb={3}>
              {lead.timing}
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
                WHEN TO POST (your local time)
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
                BEST TIMES TO POST (by day)
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
            <Text
              color="nexzy.gray.100"
              fontSize="xs"
              mb={3}
              fontStyle="italic"
            >
              Why: {lead.reason}
            </Text>
          )}

          {lastError && (
            <Text color="red.300" fontSize="xs" mb={3}>
              Last generation failed: {lastError}. Adjust and retry.
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

          {/* Per-platform plan */}
          <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
            Per-platform plan{" "}
            <Text as="span" color="whiteAlpha.500">
              — the format each surface gets. Pre-filled by the analyst; change
              any of them.
            </Text>
          </Text>
          <Box
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="lg"
            overflow="hidden"
          >
            {PLAN_ROWS.map(([pf, label, sub], i) => {
              const v = plan[pf];
              const isSkip = v === "skip";
              const isMod = v !== rec[pf];
              // Hint follows the SELECTED format (v) so it updates on switch:
              // "<Format> <used>/<target> <window> · <Platform> <total> <window>".
              const cad = lead?.cadence?.[pf];
              const ff = cad?.formats?.[v];
              const atQuota = !!ff && ff.target > 0 && ff.used >= ff.target;
              let cadHint = "";
              if (isSkip && cad) {
                // A skipped row MUST say why — a bare "Skip — recommended" with
                // no counter reads as broken rather than deliberate.
                if (cad.reason === "daily-cap") {
                  cadHint = `at daily cap · ${cad.dayTotal ?? 0}/${cad.dailyCap} today — resets tomorrow`;
                } else if (cad.reason === "quota-full") {
                  const tw = cad.window === "daily" ? "today" : "this wk";
                  cadHint = `quota full · ${cad.total.used}/${cad.total.target} ${tw}`;
                } else if (cad.reason === "analyst-skip") {
                  cadHint = "analyst says this story doesn't fit here";
                }
              } else if (ff && ff.target > 0) {
                const fw = ff.window === "daily" ? "today" : "this wk";
                cadHint = `${planOptLabel(pf, v)} ${ff.used}/${ff.target} ${fw}`;
                // Platform total (skip YouTube — its short/long mix has no single total).
                if (cad && cad.total.target > 0 && pf !== "youtube") {
                  const tw = cad.window === "daily" ? "today" : "this wk";
                  cadHint += ` · ${PLATFORM_LABEL[pf] ?? pf} ${cad.total.used}/${cad.total.target} ${tw}`;
                }
              } else if (cad && cad.total.target > 0 && pf !== "youtube") {
                // Untracked format still shows the platform total, so the
                // at-quota warning can't vanish on a format switch.
                const tw = cad.window === "daily" ? "today" : "this wk";
                cadHint = `${PLATFORM_LABEL[pf] ?? pf} ${cad.total.used}/${cad.total.target} ${tw}`;
              }
              return (
                <Flex
                  key={pf}
                  align="center"
                  gap={3}
                  px={3}
                  py={2}
                  borderTop={i === 0 ? "none" : "1px solid"}
                  borderColor="whiteAlpha.100"
                  opacity={isSkip ? 0.55 : 1}
                >
                  <Box w="120px" flexShrink={0}>
                    <Text color="nexzy.white" fontWeight="700" fontSize="sm">
                      {label}
                    </Text>
                    {sub && (
                      <Text color="nexzy.gray.100" fontSize="10px">
                        {sub}
                      </Text>
                    )}
                    {cadHint && (
                      <Text
                        color={
                          atQuota || isSkip ? "orange.300" : "whiteAlpha.500"
                        }
                        fontSize="10px"
                      >
                        {atQuota && !isSkip ? "at quota · " : ""}
                        {cadHint}
                      </Text>
                    )}
                  </Box>
                  <Box flex={1} minW={0}>
                    <select
                      value={v}
                      onChange={(e) => setP(pf, e.target.value)}
                      style={{
                        ...SELECT_STYLE,
                        borderColor: isMod
                          ? "#2f6bff"
                          : "rgba(255,255,255,0.22)",
                      }}
                    >
                      {PLAT_OPTS[pf].map((o) => (
                        <option key={o[0]} value={o[0]}>
                          {o[1]}
                          {o[0] === rec[pf] ? " — recommended" : ""}
                        </option>
                      ))}
                    </select>
                  </Box>
                  <Badge
                    colorPalette={isSkip ? "gray" : isMod ? "yellow" : "green"}
                    variant="subtle"
                    fontSize="10px"
                    flexShrink={0}
                  >
                    {isSkip ? "skipped" : isMod ? "changed" : "recommended"}
                  </Badge>
                </Flex>
              );
            })}
          </Box>
          <Flex
            justify="space-between"
            align="center"
            mt={2}
            mb={4}
            gap={2}
            wrap="wrap"
          >
            <Text color="nexzy.gray.100" fontSize="11px" flex={1} minW="240px">
              Same format across platforms = one card. A different format (e.g.
              a carousel) = its own card. “Image” = a deal graphic on deal
              leads, an image post you design otherwise.
            </Text>
            <Button
              size="xs"
              variant="ghost"
              color="nexzy.lightBlue"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() => setPlan(rec)}
            >
              Reset to recommended
            </Button>
          </Flex>

          {/* Steer */}
          <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
            Notes / steer (optional — factored into every asset generated)
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

          {/* You'll generate */}
          <Box
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="lg"
            p={3}
            mb={4}
          >
            <Flex justify="space-between" align="baseline" mb={1}>
              <Text
                color="whiteAlpha.700"
                fontSize="10px"
                fontWeight="700"
                letterSpacing="wide"
              >
                YOU&apos;LL GENERATE
              </Text>
              {cardCount > 0 && (
                <Text color="green.300" fontSize="10px" fontWeight="700">
                  {cardCount} card{cardCount > 1 ? "s" : ""}
                </Text>
              )}
            </Flex>
            <Text color="whiteAlpha.600" fontSize="11px" mb={2}>
              Exactly what&apos;s selected above. Reel, Video, Text take &amp;
              Short are the same short-video asset under each platform&apos;s
              name — they ship together as one card.
            </Text>
            {cardCount === 0 ? (
              <Text color="nexzy.gray.100" fontSize="xs">
                Every platform is skipped — nothing to generate.
              </Text>
            ) : (
              activeBuckets.map((b) => (
                <Flex
                  key={b}
                  gap={3}
                  py={1}
                  align="baseline"
                  borderTop="1px dashed"
                  borderColor="whiteAlpha.100"
                  _first={{ borderTop: "none" }}
                >
                  <Text
                    color="nexzy.white"
                    fontWeight="700"
                    fontSize="sm"
                    minW="120px"
                    flexShrink={0}
                  >
                    {bucketLabel(b, lane)}
                  </Text>
                  <Text color="nexzy.gray.100" fontSize="xs">
                    {groups[b]
                      .map(
                        (pf) =>
                          `${PLATFORM_LABEL[pf] ?? pf} (${planOptLabel(
                            pf,
                            plan[pf],
                          )})`,
                      )
                      .join(" · ")}
                  </Text>
                </Flex>
              ))
            )}
          </Box>

          {/* Actions */}
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
                  disabled={generating || cardCount === 0}
                >
                  {lastError
                    ? "Retry"
                    : `Generate ${cardCount} card${cardCount > 1 ? "s" : ""}`}
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
      )}
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
  const dn = DAY_NAMES[target.getDay()];
  if (real && real[dn]) {
    const rd = real[dn];
    const at = new Date(target);
    at.setHours(rd.hour, 0, 0, 0);
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
  const updated = audience?.fetchedAt
    ? relTime(new Date(audience.fetchedAt))
    : "";
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
      <Flex
        justify="space-between"
        align="center"
        gap={2}
        wrap="wrap"
        mb={has ? 3 : 1}
      >
        <Text color="nexzy.white" fontSize="sm" fontWeight="700">
          Audience &amp; best times
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
                _hover={{
                  bg: o.i === dayIdx ? "nexzy.blue" : "whiteAlpha.100",
                }}
                onClick={() => setDayIdx(o.i)}
              >
                {o.label}
              </Button>
            ))}
          </Flex>

          <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={1}>
            BEST TIME TO POST — {sel.label.toUpperCase()} (your local time)
          </Text>
          {realRows.length > 0 && (
            <Box mb={2}>
              <Text color="green.300" fontSize="10px" fontWeight="700" mb={1}>
                FROM YOUR REAL DATA
              </Text>
              <VStack align="stretch" gap={1}>
                {realRows.map(renderRow)}
              </VStack>
            </Box>
          )}
          <Box mb={3}>
            <Text
              color="whiteAlpha.500"
              fontSize="10px"
              fontWeight="700"
              mb={1}
            >
              GENERAL · BEST PRACTICE
              {realRows.length === 0 ? " (no post history yet)" : ""}
            </Text>
            <VStack align="stretch" gap={1}>
              {generalRows.map(renderRow)}
            </VStack>
          </Box>

          <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={1}>
            WHO
            {audience?.sources?.length
              ? ` · from ${audience.sources.join(", ")}`
              : ""}
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
            <Box
              mt={3}
              pt={2}
              borderTop="1px solid"
              borderColor="whiteAlpha.100"
            >
              <Text
                color="whiteAlpha.600"
                fontSize="10px"
                fontWeight="700"
                mb={1}
              >
                DATA SOURCES — what Refresh actually pulled
              </Text>
              <VStack align="stretch" gap={0.5}>
                {["instagram", "facebook", "threads", "youtube", "x"].map(
                  (p) => {
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
                          {ok ? "● " : st.error ? "! " : ""}
                          {txt}
                        </Text>
                      </Flex>
                    );
                  },
                )}
              </VStack>
            </Box>
          )}

          {audience?.raw?.youtubePerformance ? (
            <Box mt={3}>
              <YouTubePerformance
                src={audience.raw.youtubePerformance as YtSource}
              />
            </Box>
          ) : null}
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
 * with a per-platform plan. Set the plan, then Generate → the real card(s) are
 * written (in that voice) and appear under Suggestions. Cards are collapsible so
 * you can scan the whole board.
 */
export default function LeadsPanel({ isOwner }: { isOwner: boolean }) {
  const [leads, setLeads] = useState<ContentSuggestion[] | null>(null);
  const [writers, setWriters] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState<AudienceProfile | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  // Filter the board by the lead's writer (null = all).
  const [writerFilter, setWriterFilter] = useState<string | null>(null);

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

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const expandAll = () => setOpenIds(new Set((leads ?? []).map((l) => l.id)));
  const collapseAll = () => setOpenIds(new Set());

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

  // Writer chips: every known writer plus any name present on the board (so a
  // renamed/paused writer with open leads is still filterable).
  const writerChips = Array.from(
    new Set([...writers, ...leads.map((l) => l.author).filter(Boolean)]),
  ) as string[];
  const visibleLeads = writerFilter
    ? leads.filter((l) => (l.author || "") === writerFilter)
    : leads;

  return (
    <VStack align="stretch" gap={4}>
      <Flex justify="space-between" align="flex-start" gap={2} wrap="wrap">
        <Box>
          <Heading size="md" color="nexzy.white" mb={1}>
            Video leads
          </Heading>
          <Text color="nexzy.gray.100" fontSize="sm">
            Each published article lands here first. Set the plan per platform,
            then Generate — nothing heavy runs until you do.
          </Text>
        </Box>
        {leads.length > 0 && (
          <HStack gap={2} flexShrink={0}>
            <Button
              size="xs"
              variant="ghost"
              color="nexzy.lightBlue"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={expandAll}
            >
              Expand all
            </Button>
            <Button
              size="xs"
              variant="ghost"
              color="nexzy.gray.100"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={collapseAll}
            >
              Collapse all
            </Button>
          </HStack>
        )}
      </Flex>

      {leads.length > 0 && writerChips.length > 1 && (
        <HStack gap={2} wrap="wrap">
          <Button
            size="xs"
            variant={writerFilter === null ? "solid" : "outline"}
            bg={writerFilter === null ? "nexzy.blue" : "transparent"}
            color={writerFilter === null ? "white" : "nexzy.gray.100"}
            borderColor="whiteAlpha.300"
            _hover={{
              bg: writerFilter === null ? "nexzy.blue" : "whiteAlpha.100",
            }}
            onClick={() => setWriterFilter(null)}
          >
            All writers
          </Button>
          {writerChips.map((w) => (
            <Button
              key={w}
              size="xs"
              variant={writerFilter === w ? "solid" : "outline"}
              bg={writerFilter === w ? "nexzy.blue" : "transparent"}
              color={writerFilter === w ? "white" : "nexzy.gray.100"}
              borderColor="whiteAlpha.300"
              _hover={{
                bg: writerFilter === w ? "nexzy.blue" : "whiteAlpha.100",
              }}
              onClick={() => setWriterFilter((f) => (f === w ? null : w))}
            >
              {w}
            </Button>
          ))}
        </HStack>
      )}

      {leads.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          No open leads right now.
        </Text>
      ) : visibleLeads.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          No open leads for {writerFilter}.
        </Text>
      ) : (
        <Paginated items={visibleLeads} pageSize={20}>
          {(pageLeads) =>
            pageLeads.map((s) => (
              <LeadCard
                key={s.id}
                s={s}
                writers={writers}
                isOwner={isOwner}
                open={openIds.has(s.id)}
                onToggle={() => toggle(s.id)}
                onDone={remove}
                reload={load}
                audienceByDay={audience?.bestTimes?.byDay}
                audienceByPlatformDay={audience?.bestTimes?.byPlatformDay}
              />
            ))
          }
        </Paginated>
      )}
    </VStack>
  );
}
