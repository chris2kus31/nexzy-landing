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
  Input,
} from "@chakra-ui/react";
import {
  getVideoLeads,
  generateFromLead,
  generateQuickAnnounce,
  skipContentSuggestion,
  getWriterNames,
  getAudienceProfile,
  type AudienceProfile,
  type ContentSuggestion,
  type LongFormVerdict,
  type LongFormChapter,
} from "@/lib/admin/client";
import Paginated from "@/components/admin/Paginated";
import YouTubePerformance, {
  type YtSource,
} from "@/components/admin/YouTubePerformance";
import CrossPlatformPerformance, {
  type PlatformStat,
} from "@/components/admin/CrossPlatformPerformance";

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
  x: [9, 12, 15], // 2026: morning→afternoon (evenings underperform on X); day-specific map overrides
  threads: [9, 12],
  instagram: [12, 19],
  reels: [12, 19],
  facebook: [12, 19], // 2026: midday-anchored per Sprout
  youtube: [18], // 2026: Shorts evening; day-specific maps override
  tiktok: [19, 20, 13], // 2026: evening peak; day-specific map overrides
};

// YouTube SHORTS best-practice windows PER WEEKDAY, in the owner's local time
// (Central). COMBINED across all 2026 sources — Buffer (UTC heatmap converted to
// CST → late-morning/midday), Hopper (chart: morning 6–9am + midday), Hollyland
// (7–9am commute + 11am–2pm + 6–9pm), Viraly, SocialPilot — not any single one.
// The consensus center is late-morning→midday (~11am–1pm CST) with a morning
// (8–9am) and an evening (6–8pm) wing. Your own post data (≥3 posts in a slot)
// still overrides these. 0 = Sun … 6 = Sat.
const YT_SHORTS_BY_DAY: Record<number, number[]> = {
  // MULTI-SOURCE 2026 (Buffer 1.8M format-specific + Metricool + SocialPilot +
  // Hopper). Tier 1 = afternoon 1pm + evening 7pm (the union Buffer[evening] and
  // Metricool/SocialPilot/Hopper[2–6pm] both support); Tier 2 fills midday/late-
  // afternoon. Fri 4pm is uniquely strong (Buffer). Never mornings. CST, best->worst.
  // MEDIUM confidence (afternoon-vs-evening genuinely splits across studies).
  0: [17, 13, 19], // Sun
  1: [13, 19, 12], // Mon
  2: [12, 19, 15], // Tue
  3: [13, 19, 12], // Wed
  4: [13, 18, 20], // Thu
  5: [16, 18, 12], // Fri — 4pm single best slot (Buffer)
  6: [14, 17, 19], // Sat
};
// YouTube LONG-FORM windows PER WEEKDAY (CST). Long-form peaks OPPOSITE to Shorts
// — mornings + early-afternoon (Buffer: Sun 10am / Tue / Mon mornings; Viraly &
// Hollyland: weekdays 12–4pm, weekends 9–11am; SocialPilot gaming: 2–4pm).
const YT_LONGFORM_BY_DAY: Record<number, number[]> = {
  // MULTI-SOURCE 2026 (Buffer 1.8M[AM 8–11] + Metricool[10am–4pm] + SocialPilot
  // [1–3pm] + Sprout[publish-to-mature]). Tier 1 = late-morning→early-afternoon
  // (11am–1pm) publish so the video matures before evening/weekend viewing; Tier 2
  // = 9am / 3pm. Weekends strong (Sun/Sat AM). CST, best->worst. MEDIUM-HIGH.
  0: [11, 9, 13], // Sun — strong day
  1: [12, 10, 15], // Mon
  2: [11, 13, 9], // Tue
  3: [12, 10, 15], // Wed
  4: [11, 13, 9], // Thu
  5: [11, 9, 13], // Fri
  6: [10, 13, 9], // Sat
};
function ytShortsWindows(target: Date): number[] {
  return YT_SHORTS_BY_DAY[target.getDay()] ?? GUIDE_WINDOWS.youtube;
}

// FACEBOOK (Reels-adjacent) best-practice windows PER WEEKDAY, in local time
// (Central). COMBINED across all 2026 sources — Buffer (14M posts, mornings win),
// Sprout (2B engagements, midday→evening 12–8pm Tue–Thu wins), SocialPilot
// (50k accounts, spread) — plus SocialPilot's gaming-industry lean (3pm/7pm/9pm).
// FB has broad all-day engagement; these are the strongest overlapping clusters
// per day: a morning, a midday, and an evening. Your post data still overrides.
const FB_BY_DAY: Record<number, number[]> = {
  // MULTI-SOURCE 2026, HEDGED (Buffer 14M[mornings 6–11am] + Sprout 2B[midday 9am–3pm]
  // + SocialPilot[9am–3pm] for feed; Buffer[Reels evening 7–9pm]). Studies conflict on
  // feed AM-vs-midday and feed differs from Reels, so each day carries a morning, a
  // midday, and an evening (Reels) slot to test. Best day mid-week (Wed/Thu). Weekends
  // weak. CST, best->worst. MED confidence — let your own Insights break the tie.
  0: [13, 19, 11], // Sun — weak day
  1: [10, 13, 19], // Mon
  2: [10, 13, 19], // Tue
  3: [9, 12, 19], // Wed — best day
  4: [9, 12, 20], // Thu — Buffer's week peak = 9am; +evening Reels
  5: [11, 13, 19], // Fri
  6: [11, 20, 13], // Sat — weak day
};
function fbWindows(target: Date): number[] {
  return FB_BY_DAY[target.getDay()] ?? GUIDE_WINDOWS.facebook;
}

// INSTAGRAM (Reels-relevant) best-practice windows PER WEEKDAY, in local time
// (Central). COMBINED across all 2026 sources — Buffer (9.6M posts: evenings
// 6–11pm win, except Thu mornings; Wed/Thu/Tue best), Sprout (2B engagements:
// midday→evening, Tue 1–7pm / Wed 12–9pm), Hopper (reported in EST → converted
// −1hr to CST: morning + midday + evening) — leaning to the evening/gaming
// audience. Consensus clusters: midday (12–2pm) + evening (6–8pm); Thursday is
// the morning exception. Your post data still overrides. 0=Sun … 6=Sat.
const IG_BY_DAY: Record<number, number[]> = {
  // MULTI-SOURCE 2026 (Buffer 9.6M + Sprout 2B + Later + Metricool 24.4M). Three
  // large studies converge: Tier 1 = midweek EVENING 6–8pm (Wed/Thu lead); Tier 2
  // = midday 12pm + Buffer's Thu/Wed 9am. NOTE: this is the study fallback — IG's
  // real online_followers pull overrides it once the account clears 100 followers.
  // CST, best->worst. HIGH confidence.
  0: [19, 12, 11], // Sun
  1: [19, 12, 9], // Mon
  2: [18, 12, 9], // Tue
  3: [18, 12, 9], // Wed
  4: [18, 9, 12], // Thu — 9am is Buffer's overall #1 IG slot
  5: [12, 18, 9], // Fri
  6: [11, 19, 12], // Sat
};
function igWindows(target: Date): number[] {
  return IG_BY_DAY[target.getDay()] ?? GUIDE_WINDOWS.instagram;
}

// THREADS best-practice windows PER WEEKDAY, in local time (Central). Threads is
// a text-first, MORNING platform (Buffer heatmap + day-chart: dark cluster
// 8-11am Tue-Thu, tapering after noon; weekends weak). No gaming-industry split
// exists for Threads, so no gaming weighting. Your post data still overrides.
const THREADS_BY_DAY: Record<number, number[]> = {
  // MULTI-SOURCE 2026 (Buffer 2.5M primary + Later + MeetEdgar/Postory corroborate).
  // Tier 1 = weekday mornings 9–11am, midweek (Wed/Thu); Tier 2 = noon + 8am.
  // Evenings disputed (Buffer says avoid, Later says 6–8pm) → a single cautious
  // Sun 6pm test slot only. CST, best->worst. MEDIUM (no independent large 2nd study).
  0: [11, 9, 18], // Sun — morning; lone evening test (Later)
  1: [9, 12, 8], // Mon
  2: [9, 11, 12], // Tue
  3: [9, 12, 15], // Wed — best day
  4: [9, 11, 12], // Thu — single best slot 9am
  5: [9, 12, 8], // Fri
  6: [10, 12, 8], // Sat — weak day
};
function threadsWindows(target: Date): number[] {
  return THREADS_BY_DAY[target.getDay()] ?? GUIDE_WINDOWS.threads;
}
// X (Twitter) — Buffer (mornings 9–11am) + Sprout 2026 (midday/afternoon 12–6pm)
// blend. Both agree Tue–Thu are best days and weekends are weak; they disagree on
// hour-of-day, so this spreads morning→afternoon. Dropped the old flat 7pm
// (evenings underperform on X per both). CST, best->worst. (2026 — now day-specific.)
const X_BY_DAY: Record<number, number[]> = {
  // MULTI-SOURCE 2026 (Buffer 8.7M[AM 9–11] + Sprout 2B[12–6pm] + Metricool[9pm]).
  // Least-converged platform — three studies, three peaks. Tier 1 = midweek late-
  // AM→noon (Buffer↔Sprout overlap); Tier 2 = 3pm (Sprout) + a 8pm news slot
  // (Metricool, defensible for a news brand). Tue–Thu best, Sat worst. CST, best->worst.
  // MEDIUM. NOTE: for breaking news, post reactively regardless of the clock.
  0: [11, 20, 14], // Sun
  1: [10, 12, 15], // Mon
  2: [9, 12, 15], // Tue — best day
  3: [9, 11, 15], // Wed — best day
  4: [10, 12, 20], // Thu — +evening news slot
  5: [9, 12, 15], // Fri
  6: [11, 20, 14], // Sat — weak day
};
function xWindows(target: Date): number[] {
  return X_BY_DAY[target.getDay()] ?? GUIDE_WINDOWS.x;
}
// TikTok — Metricool 2026 (2.3M posts, 8pm peak) + Buffer (evenings 6–11pm).
// Weekend-FRIENDLY (unlike the others): Metricool's peak day is Sunday, Buffer's
// is Saturday — keep weekend evening slots live. Dropped the old flat 8am (early
// morning is a dead zone). CST, best->worst. (2026 — now day-specific.)
const TIKTOK_BY_DAY: Record<number, number[]> = {
  // MULTI-SOURCE 2026 (Buffer 7.1M + Metricool 2.3M + Sprout 2B + Later + SocialPilot).
  // Strong convergence: Tier 1 = evening 6–8pm + weekend afternoons; Tier 2 = 2–4pm
  // (Sprout/Later) + noon. Weekends (Sat/Sun) are STRONG here (the exception vs other
  // platforms) — matches the 25–34 male gamer audience. CST, best->worst. HIGH.
  0: [13, 18], // Sun — weekend afternoon + evening
  1: [18, 13, 20], // Mon
  2: [18, 15, 12], // Tue
  3: [19, 15, 12], // Wed
  4: [18, 15, 11], // Thu
  5: [18, 20, 15], // Fri
  6: [16, 18], // Sat — strong day; weekend afternoon→evening
};
function tiktokWindows(target: Date): number[] {
  return TIKTOK_BY_DAY[target.getDay()] ?? GUIDE_WINDOWS.tiktok;
}
function ytLongWindows(target: Date): number[] {
  return YT_LONGFORM_BY_DAY[target.getDay()] ?? GUIDE_WINDOWS.youtube;
}
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
  real?: Record<string, { hour: number; n: number; source: string }[]>,
): { text: string; src: string } | null {
  const flatWindows = GUIDE_WINDOWS[platform];
  const hasReal = !!real && Object.keys(real).length > 0;
  if (!flatWindows && platform !== "youtube" && !hasReal) return null;
  const DAY = 86400000;
  const cands: { at: Date; src: string }[] = [];
  for (let i = 0; i <= 8; i++) {
    const day = new Date(now.getTime() + i * DAY);
    if (hasReal) {
      const rawReal = real![DAY_NAMES[day.getDay()]] as
        | { hour: number; n: number; source: string }
        | { hour: number; n: number; source: string }[]
        | undefined;
      const ranked = Array.isArray(rawReal)
        ? rawReal
        : rawReal
          ? [rawReal]
          : [];
      for (const rd of ranked) {
        const c = new Date(day);
        c.setHours(rd.hour, 0, 0, 0);
        cands.push({ at: c, src: `your data (${rd.n})` });
      }
    }
    const dayWindows =
      platform === "youtube"
        ? ytShortsWindows(day)
        : platform === "facebook"
          ? fbWindows(day)
          : platform === "instagram"
            ? igWindows(day)
            : platform === "threads"
              ? threadsWindows(day)
              : platform === "x"
                ? xWindows(day)
                : platform === "tiktok"
                  ? tiktokWindows(day)
                  : flatWindows;
    if (dayWindows) {
      for (const h of dayWindows) {
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

/** mm:ss from a seconds count (long-form target length). */
function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

const LF_VERDICT_COLOR: Record<string, string> = {
  enough: "green",
  "needs-notes": "yellow",
  thin: "red",
};

/**
 * LONG-FORM decision block on a video lead (flag-gated — only renders when the
 * lead carries a longForm verdict). Shows: recommend/against + why, the
 * grounding readout, the target length + hook, and the EDITABLE chapter
 * timeline. The "Generate long-form" action is wired in Phase 3; here it's shown
 * disabled so the plan is visible first. Purely additive — no effect elsewhere.
 */
function LongFormBlock({
  lf,
  chapters,
  setChapters,
  onGenerate,
  busy,
  generating,
}: {
  lf: LongFormVerdict;
  chapters: LongFormChapter[];
  setChapters: (c: LongFormChapter[]) => void;
  onGenerate: () => void;
  busy: boolean;
  generating: boolean;
}) {
  const editCh = (i: number, patch: Partial<LongFormChapter>) =>
    setChapters(chapters.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= chapters.length) return;
    const next = chapters.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setChapters(next);
  };
  const remove = (i: number) => setChapters(chapters.filter((_, j) => j !== i));
  const total = chapters.reduce((s, c) => s + (c.seconds || 0), 0) + 25;

  return (
    <Box
      border="1px solid"
      borderColor={lf.recommended ? "purple.400" : "whiteAlpha.200"}
      bg="whiteAlpha.50"
      borderRadius="lg"
      p={3}
      mb={3}
    >
      <Flex align="center" gap={2} mb={1} wrap="wrap">
        <Text
          color="nexzy.white"
          fontSize="11px"
          fontWeight="800"
          letterSpacing="0.06em"
        >
          LONG-FORM VIDEO
        </Text>
        <Badge
          colorPalette={lf.recommended ? "purple" : "gray"}
          variant="solid"
          fontSize="10px"
        >
          {lf.recommended ? "Recommended" : "Not recommended"}
        </Badge>
        <Badge colorPalette="gray" variant="subtle" fontSize="10px">
          {lf.confidence} confidence
        </Badge>
        <Badge
          colorPalette={LF_VERDICT_COLOR[lf.grounding.verdict] ?? "gray"}
          variant="subtle"
          fontSize="10px"
        >
          grounding: {lf.grounding.verdict}
        </Badge>
        <Text color="whiteAlpha.600" fontSize="10px">
          ~{fmtDuration(lf.targetSeconds)} target
        </Text>
      </Flex>

      {lf.why && (
        <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
          {lf.why}
        </Text>
      )}
      <Text color="whiteAlpha.600" fontSize="10px" mb={2}>
        Grounding readout: {lf.grounding.factsFound} facts ·{" "}
        {lf.grounding.datedFacts} dated · {lf.grounding.sections} sections
      </Text>

      {lf.hook && (
        <Box mb={2}>
          <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700">
            COLD-OPEN HOOK
          </Text>
          <Text color="nexzy.gray.100" fontSize="xs">
            {lf.hook}
          </Text>
        </Box>
      )}

      <Flex align="center" justify="space-between" mb={1}>
        <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700">
          CHAPTER TIMELINE — edit / reorder before you generate
        </Text>
        <Text color="whiteAlpha.500" fontSize="10px">
          {chapters.length} chapters · ~{fmtDuration(total)}
        </Text>
      </Flex>

      <VStack align="stretch" gap={1.5}>
        {chapters.map((c, i) => (
          <Box
            key={i}
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="md"
            p={2}
          >
            <Flex align="center" gap={1} mb={1}>
              <Text color="whiteAlpha.500" fontSize="10px" w="16px">
                {i + 1}
              </Text>
              <Input
                size="xs"
                value={c.title}
                placeholder="Chapter title"
                bg="whiteAlpha.100"
                borderColor="whiteAlpha.200"
                color="nexzy.white"
                onChange={(e) => editCh(i, { title: e.target.value })}
              />
              <Input
                size="xs"
                w="52px"
                type="number"
                value={c.seconds}
                bg="whiteAlpha.100"
                borderColor="whiteAlpha.200"
                color="nexzy.white"
                onChange={(e) =>
                  editCh(i, { seconds: Number(e.target.value) || 0 })
                }
              />
              <Button
                size="xs"
                variant="ghost"
                color="whiteAlpha.700"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
              >
                ↑
              </Button>
              <Button
                size="xs"
                variant="ghost"
                color="whiteAlpha.700"
                onClick={() => move(i, 1)}
                disabled={i === chapters.length - 1}
                aria-label="Move down"
              >
                ↓
              </Button>
              <Button
                size="xs"
                variant="ghost"
                color="red.300"
                onClick={() => remove(i)}
                aria-label="Remove chapter"
              >
                ✕
              </Button>
            </Flex>
            <Textarea
              size="xs"
              value={c.covers}
              placeholder="What this chapter covers (grounded in the article)"
              bg="whiteAlpha.100"
              borderColor="whiteAlpha.200"
              color="nexzy.gray.100"
              rows={1}
              onChange={(e) => editCh(i, { covers: e.target.value })}
            />
          </Box>
        ))}
      </VStack>

      <Button
        size="xs"
        mt={2}
        colorPalette="purple"
        variant="solid"
        loading={busy}
        disabled={busy || generating || chapters.length === 0}
        onClick={onGenerate}
      >
        {generating ? "Generating…" : "Generate long-form"}
      </Button>
      <Text color="whiteAlpha.500" fontSize="10px" mt={1}>
        Builds the full narrated long-form from this timeline, in the chosen
        voice — it lands under Suggestions. Editing the timeline above is
        applied when you generate.
      </Text>
    </Box>
  );
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
    Record<string, { hour: number; n: number; source: string }[]>
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
  // Quick Announcement (X + Threads only) — its own per-platform steers.
  const [xSteer, setXSteer] = useState("");
  const [threadsSteer, setThreadsSteer] = useState("");
  const [quickErr, setQuickErr] = useState<string | null>(null);
  const [quickOk, setQuickOk] = useState(false);

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

  // LONG-FORM (flag-gated): the verdict rides the lead payload. The proposed
  // chapter timeline is editable locally so the operator can tweak it before
  // generating (generation wiring lands in Phase 3). Absent → nothing renders.
  const longForm = lead?.longForm;
  const [lfChapters, setLfChapters] = useState<LongFormChapter[]>(
    longForm?.chapters ?? [],
  );

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
  // Generate a LONG-FORM video from the (edited) chapter timeline. Separate from
  // the per-platform "Generate N cards" path — no plan, format 'long', and it
  // passes the reviewed chapters so the writer follows them exactly.
  const generateLong = async () => {
    setBusy("gen");
    try {
      await generateFromLead(
        s.id,
        writer,
        "long",
        steer.trim() || undefined,
        undefined,
        undefined,
        lfChapters,
      );
      await reload();
    } catch {
      /* leave the lead in place so you can retry */
    } finally {
      setBusy(null);
    }
  };
  // Generate a QUICK ANNOUNCEMENT (X + Threads only). Independent of the
  // per-platform and long-form paths — skips both, each platform its own steer.
  const generateQuick = async () => {
    setBusy("gen");
    setQuickErr(null);
    setQuickOk(false);
    try {
      await generateQuickAnnounce(
        s.id,
        writer,
        xSteer.trim() || undefined,
        threadsSteer.trim() || undefined,
      );
      setQuickOk(true);
      await reload();
    } catch (e) {
      setQuickErr(
        e instanceof Error ? e.message : "Quick announcement request failed.",
      );
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

          {longForm && (
            <LongFormBlock
              lf={longForm}
              chapters={lfChapters}
              setChapters={setLfChapters}
              onGenerate={generateLong}
              busy={busy === "gen"}
              generating={generating}
            />
          )}

          {/* Quick Announcement (X + Threads only) — independent path; skips the
              per-platform and long-form generation entirely. */}
          <Box
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="md"
            p={3}
            mb={3}
          >
            <Text color="nexzy.white" fontSize="sm" fontWeight="700" mb={1}>
              ⚡ Quick Announce (X + Threads)
            </Text>
            {lead?.quickAnnouncement?.recommended ? (
              <Text color="teal.300" fontSize="xs" fontWeight="600" mb={2}>
                ⚡ Recommended: {lead.quickAnnouncement.why}
              </Text>
            ) : (
              <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
                Fast text update — skips long-form and the per-platform cards.
                Two distinct takes, each with its own steer. Upload any media on
                the card before publishing.
              </Text>
            )}
            <Text
              color="whiteAlpha.600"
              fontSize="10px"
              fontWeight="700"
              mb={1}
            >
              X STEER (optional)
            </Text>
            <Textarea
              value={xSteer}
              onChange={(e) => setXSteer(e.target.value)}
              placeholder={
                lead?.quickAnnouncement?.xAngle ||
                "e.g. make it a debate; lead with the price"
              }
              size="sm"
              rows={2}
              mb={2}
              bg="whiteAlpha.100"
              borderColor="whiteAlpha.300"
            />
            <Text
              color="whiteAlpha.600"
              fontSize="10px"
              fontWeight="700"
              mb={1}
            >
              THREADS STEER (optional)
            </Text>
            <Textarea
              value={threadsSteer}
              onChange={(e) => setThreadsSteer(e.target.value)}
              placeholder={
                lead?.quickAnnouncement?.threadsAngle ||
                "e.g. ask if it's worth it; keep it warm"
              }
              size="sm"
              rows={2}
              mb={2}
              bg="whiteAlpha.100"
              borderColor="whiteAlpha.300"
            />
            <Button
              size="sm"
              bg="nexzy.blue"
              color="white"
              fontWeight="700"
              _hover={{ bg: "nexzy.lightBlue" }}
              onClick={generateQuick}
              loading={busy === "gen"}
              loadingText="Generating…"
              disabled={generating}
            >
              Generate quick announcement
            </Button>
            {quickErr && (
              <Text color="red.300" fontSize="xs" mt={2}>
                {quickErr}
              </Text>
            )}
            {quickOk && !quickErr && (
              <Text color="teal.300" fontSize="xs" mt={2}>
                Queued — your X + Threads takes will appear in the Suggestions
                tab (⚡ QUICK) in a moment.
              </Text>
            )}
          </Box>

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
// A single suggested posting time. `isReal` = derived from the owner's own post
// history (carries a post count `n`); otherwise it's a research-backed window.
type PostTimeSlot = { label: string; isReal: boolean; n?: number };

function bestPracticeWindows(platform: string, target: Date): number[] {
  return (
    ((platform === "youtube"
      ? ytShortsWindows(target)
      : platform === "facebook"
        ? fbWindows(target)
        : platform === "instagram"
          ? igWindows(target)
          : platform === "threads"
            ? threadsWindows(target)
            : platform === "x"
              ? xWindows(target)
              : platform === "tiktok"
                ? tiktokWindows(target)
                : GUIDE_WINDOWS[platform]) as number[] | undefined) ?? []
  );
}

// Render an hour as a 1-hour RANGE label, best→worst per slot:
// 9 -> "9–10 AM", 11 -> "11 AM–12 PM", 12 -> "12–1 PM", 19 -> "7–8 PM".
function fmtHour(_target: Date, h: number): string {
  const lab = (x: number) => {
    const hr = ((x % 24) + 24) % 24;
    const mer = hr < 12 ? "AM" : "PM";
    const h12 = hr % 12 === 0 ? 12 : hr % 12;
    return { h12, mer };
  };
  const a = lab(h);
  const b = lab(h + 1);
  return a.mer === b.mer
    ? `${a.h12}–${b.h12} ${b.mer}`
    : `${a.h12} ${a.mer}–${b.h12} ${b.mer}`;
}

// The owner's OWN best slots for this platform/day, ranked best→worst by reach,
// each with its post count. Empty when that platform has no history yet.
function realSlotsForDay(
  platform: string,
  target: Date,
  real?: Record<string, { hour: number; n: number; source: string }[]>,
): PostTimeSlot[] {
  const dn = DAY_NAMES[target.getDay()];
  // Tolerate BOTH shapes: the new ranked array, and the legacy single object
  // from profiles pulled before the ranked change (until the next Refresh).
  const rawReal = real?.[dn] as
    | { hour: number; n: number; source: string }
    | { hour: number; n: number; source: string }[]
    | undefined;
  const ranked = Array.isArray(rawReal) ? rawReal : rawReal ? [rawReal] : [];
  const used = new Set<number>();
  const slots: PostTimeSlot[] = [];
  for (const rd of ranked.slice(0, 5)) {
    if (used.has(rd.hour)) continue;
    used.add(rd.hour);
    slots.push({ label: fmtHour(target, rd.hour), isReal: true, n: rd.n });
  }
  return slots;
}

// The FULL research-backed recommended windows for this platform/day — always
// shown complete and untrimmed, independent of the owner's own data, so he can
// choose to trust the research when his own history is still thin.
function generalSlotsForDay(platform: string, target: Date): PostTimeSlot[] {
  return bestPracticeWindows(platform, target).map((h) => ({
    label: fmtHour(target, h),
    isReal: false,
  }));
}

// Chris's OWN YouTube Studio "When your viewers are on YouTube" chart, hand-read
// 2026-09-02 (Analytics → Audience; all viewers, not just subs; last 28d; already
// in CT/GMT-0500). This is a THIRD layer — real per-channel YouTube audience-online
// data — shown ALONGSIDE (not replacing) the research windows. YouTube's active-hours
// aren't API-pullable (Studio UI only), so re-transcribe this when the chart shifts.
// Best→worst by weekday (0=Sun). Peaks: midday ~1pm every day + a 5–7pm wing (Fri
// strongest evening); mornings are weak.
const YT_AUDIENCE_CHART: Record<number, number[]> = {
  0: [13, 10, 12], // Sun
  1: [13, 12, 18], // Mon
  2: [13, 17, 15], // Tue
  3: [13, 12, 14], // Wed
  4: [13, 14, 12], // Thu
  5: [18, 17, 13], // Fri — evening strongest
  6: [13, 17, 14], // Sat
};

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
  // Chris's own YouTube Studio audience-online chart for the selected day (3rd layer).
  const ytChartSlots = (YT_AUDIENCE_CHART[sel.date.getDay()] ?? []).map(
    (h) => ({
      label: fmtHour(sel.date, h),
      isReal: false,
    }),
  );
  // TWO independent lists, shown as two sections:
  //  • realRows — the owner's own best slots (only platforms that have history)
  //  • generalRows — the FULL research windows for EVERY platform, always, so the
  //    complete recommendation is always available for a judgment call.
  const realRows = PLATFORMS_SHOWN.flatMap((p) => {
    const slots = realSlotsForDay(p, sel.date, byPlat?.[p]);
    if (!slots.length) return [];
    const label = p === "youtube" ? "YT Shorts" : (PLATFORM_LABEL[p] ?? p);
    return [{ p, label, slots }];
  });
  const generalRows = PLATFORMS_SHOWN.flatMap((p) => {
    // YouTube splits into Shorts + a separate Long-form row, because the two
    // formats peak at opposite times (Shorts midday/evening, long-form mornings).
    if (p === "youtube") {
      const longSlots: PostTimeSlot[] = ytLongWindows(sel.date).map((h) => ({
        label: fmtHour(sel.date, h),
        isReal: false,
      }));
      return [
        {
          p,
          label: "YT Shorts",
          slots: generalSlotsForDay("youtube", sel.date),
        },
        { p: "youtube-long", label: "YT Long", slots: longSlots },
      ];
    }
    const slots = generalSlotsForDay(p, sel.date);
    if (!slots.length) return [];
    return [{ p, label: PLATFORM_LABEL[p] ?? p, slots }];
  });
  const renderRow = (r: {
    p: string;
    label: string;
    slots: PostTimeSlot[];
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
      <Flex flex="1" minW={0} wrap="wrap" gap={1}>
        {r.slots.map((s, i) => (
          <Flex
            key={i}
            align="center"
            px={2}
            py="1px"
            borderRadius="md"
            bg={s.isReal ? "green.900" : "whiteAlpha.100"}
            border="1px solid"
            borderColor={s.isReal ? "green.500" : "whiteAlpha.200"}
          >
            <Text
              fontSize="xs"
              fontWeight={s.isReal ? "700" : "500"}
              color={s.isReal ? "green.200" : "nexzy.gray.100"}
            >
              {s.label}
              {s.isReal && s.n ? ` (${s.n})` : ""}
            </Text>
          </Flex>
        ))}
      </Flex>
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
                FROM YOUR REAL DATA (n = posts)
              </Text>
              <VStack align="stretch" gap={1}>
                {realRows.map(renderRow)}
              </VStack>
            </Box>
          )}
          {ytChartSlots.length > 0 && (
            <Box mb={2}>
              <Text color="purple.300" fontSize="10px" fontWeight="700" mb={1}>
                FROM YOUR YOUTUBE · viewers online (Studio · 28d, all viewers)
              </Text>
              <Flex align="center" gap={2}>
                <Text
                  fontSize="xs"
                  color="nexzy.white"
                  fontWeight="600"
                  w="72px"
                  flexShrink={0}
                >
                  YouTube
                </Text>
                <Flex flex="1" minW={0} wrap="wrap" gap={1}>
                  {ytChartSlots.map((s, i) => (
                    <Flex
                      key={i}
                      align="center"
                      px={2}
                      py="1px"
                      borderRadius="md"
                      bg="purple.900"
                      border="1px solid"
                      borderColor="purple.400"
                    >
                      <Text fontSize="xs" fontWeight="700" color="purple.200">
                        {s.label}
                      </Text>
                    </Flex>
                  ))}
                </Flex>
              </Flex>
            </Box>
          )}
          <Box mb={3}>
            <Text
              color="whiteAlpha.500"
              fontSize="10px"
              fontWeight="700"
              mb={1}
            >
              RECOMMENDED · FROM OUR RESEARCH
            </Text>
            <VStack align="stretch" gap={1}>
              {generalRows.map(renderRow)}
            </VStack>
            <Text color="whiteAlpha.400" fontSize="10px" mt={1.5}>
              Three reads, most-trusted first: your post data (green) · your
              YouTube viewers-online chart (purple) · and the research-backed
              windows (below) — all shown so you can make the call. YouTube,
              Facebook, Instagram &amp; Threads are day-specific in CST,
              combined across all 2026 studies (gaming rows weighted 3x for
              YT/FB). YT Shorts, Facebook &amp; Instagram: afternoon + evening.
              YT long-form: mornings. Threads: mornings (8–11am, text-first),
              Tue–Thu best. Others (X, TikTok) use flat windows.
            </Text>
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

          {audience?.raw?.platformPerformance ? (
            <Box mt={3}>
              <CrossPlatformPerformance
                summary={
                  audience.raw.platformPerformance as Record<
                    string,
                    PlatformStat
                  >
                }
              />
            </Box>
          ) : null}

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
