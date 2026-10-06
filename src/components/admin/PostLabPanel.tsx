"use client";

import { useMemo, useState } from "react";
import { Box, Flex, Text, VStack, SimpleGrid, Link } from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiAlertCircle,
  FiInfo,
  FiExternalLink,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";
import type {
  PostLabReport,
  PostLabPlatform,
  PostLabPost,
  PostLabSlot,
} from "@/lib/admin/client";

/**
 * POST LAB — "your post data", in depth. One reach metric per platform (never
 * mixed), medians not averages, sample size on every number, and the bad shown
 * next to the good: worst slots, bottom posts, weak formats, zero-reach posts,
 * and every excluded post with its reason. Data: raw.postLab (built on Refresh).
 */

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  threads: "Threads",
  x: "X",
  youtube: "YouTube",
};
const FORMAT_LABEL: Record<string, string> = {
  reel: "Reel",
  video: "Video",
  short: "Short",
  long: "Long-form",
  image: "Image",
  carousel: "Carousel",
  text: "Text",
  link: "Link",
};

function hourWord(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  return `${hr % 12 === 0 ? 12 : hr % 12} ${hr < 12 ? "AM" : "PM"}`;
}
function slotLabel(s: PostLabSlot): string {
  return `${s.day} ${hourWord(s.startHour)}–${hourWord(s.startHour + 3)}`;
}
function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}
function fmtPct(v: number | null | undefined): string {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}
function vs(v: number): string {
  return `${v > 0 ? "+" : ""}${v}%`;
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
  });
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      px={4}
      py={3}
    >
      <Text
        color="whiteAlpha.600"
        fontSize="10px"
        fontWeight="700"
        letterSpacing="0.06em"
        textTransform="uppercase"
        mb={2}
      >
        {title}
      </Text>
      {children}
    </Box>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "good" | "bad" | "neutral" | "warn";
}) {
  const map = {
    good: { bg: "green.900", c: "green.200", b: "green.600" },
    bad: { bg: "red.900", c: "red.200", b: "red.600" },
    warn: { bg: "orange.900", c: "orange.200", b: "orange.600" },
    neutral: { bg: "whiteAlpha.100", c: "nexzy.gray.100", b: "whiteAlpha.300" },
  }[tone];
  return (
    <Box
      as="span"
      display="inline-block"
      px={2}
      py="1px"
      borderRadius="full"
      bg={map.bg}
      color={map.c}
      border="1px solid"
      borderColor={map.b}
      fontSize="10px"
      fontWeight="700"
      whiteSpace="nowrap"
    >
      {children}
    </Box>
  );
}

function SlotList({
  slots,
  tone,
  empty,
}: {
  slots: PostLabSlot[];
  tone: "good" | "bad";
  empty: string;
}) {
  if (!slots.length)
    return (
      <Text fontSize="xs" color="nexzy.gray.100">
        {empty}
      </Text>
    );
  return (
    <VStack align="stretch" gap={1.5}>
      {slots.map((s) => (
        <Flex key={`${s.day}-${s.startHour}`} align="center" gap={2}>
          <Text fontSize="sm" color="nexzy.white" fontWeight="600" flex="1">
            {slotLabel(s)}
          </Text>
          <Text fontSize="xs" color="nexzy.gray.100">
            median {fmtNum(s.median)} · {s.n} posts
          </Text>
          <Pill tone={tone}>{vs(s.vsMedian)}</Pill>
        </Flex>
      ))}
    </VStack>
  );
}

function PostRow({ p, metric }: { p: PostLabPost; metric: string }) {
  return (
    <Flex align="center" gap={2} py={1}>
      <Box flex="1" minW={0}>
        <Text fontSize="xs" color="nexzy.white" lineClamp={1}>
          {p.caption || "(no caption)"}
        </Text>
        <Text fontSize="10px" color="nexzy.gray.100">
          {p.dayCt} {fmtDate(p.at)} CT · {FORMAT_LABEL[p.format] ?? p.format}
          {p.engRate != null ? ` · ${fmtPct(p.engRate)} engagement` : ""}
        </Text>
      </Box>
      <Text
        fontSize="sm"
        color="nexzy.white"
        fontWeight="700"
        title={metric}
        flexShrink={0}
      >
        {fmtNum(p.reach)}
      </Text>
      {p.url && (
        <Link
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          color="nexzy.lightBlue"
          aria-label="Open post"
          flexShrink={0}
        >
          <FiExternalLink />
        </Link>
      )}
    </Flex>
  );
}

function PlatformView({ p }: { p: PostLabPlatform }) {
  const [showAll, setShowAll] = useState(false);
  const flagIcon = {
    bad: <FiAlertTriangle />,
    warn: <FiAlertCircle />,
    info: <FiInfo />,
  };
  const flagColor = {
    bad: "red.300",
    warn: "orange.300",
    info: "nexzy.gray.100",
  };

  return (
    <VStack align="stretch" gap={3}>
      {/* What this is built on — so every number can be trusted (or not). */}
      <Flex
        gap={2}
        wrap="wrap"
        align="center"
        fontSize="xs"
        color="nexzy.gray.100"
      >
        <Pill>Metric: {p.metric}</Pill>
        <Pill>Last {p.windowDays} days</Pill>
        <Pill tone={p.analyzed >= 10 ? "good" : "warn"}>
          {p.analyzed} analyzed
        </Pill>
        {p.settling > 0 && <Pill>{p.settling} still settling (&lt;72h)</Pill>}
        {p.excluded.reduce((a, e) => a + e.count, 0) > 0 && (
          <Pill tone="warn">
            {p.excluded.reduce((a, e) => a + e.count, 0)} excluded
          </Pill>
        )}
        <Text>
          Median {fmtNum(p.median)} per post
          {p.medianEngRate != null
            ? ` · ${fmtPct(p.medianEngRate)} median engagement`
            : ""}
        </Text>
      </Flex>

      {p.error && (
        <Text fontSize="sm" color="red.300">
          Pull failed: {p.error}
        </Text>
      )}

      {/* The bad stuff, first. */}
      {p.flags.length > 0 && (
        <Card title="What to watch">
          <VStack align="stretch" gap={1}>
            {p.flags.map((f, i) => (
              <Flex
                key={i}
                gap={2}
                align="flex-start"
                color={flagColor[f.level]}
                fontSize="xs"
              >
                <Box pt="2px" flexShrink={0}>
                  {flagIcon[f.level]}
                </Box>
                <Text>{f.text}</Text>
              </Flex>
            ))}
          </VStack>
        </Card>
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
        <Card title="Best time slots (Central)">
          <SlotList
            slots={p.bestSlots}
            tone="good"
            empty="Not enough posts in any slot yet."
          />
        </Card>
        <Card title="Worst time slots (Central)">
          <SlotList
            slots={p.worstSlots}
            tone="bad"
            empty="Need more slots with 3+ posts to name a worst one."
          />
        </Card>
      </SimpleGrid>

      {p.formats.length > 0 && (
        <Card title="Format scorecard">
          <VStack align="stretch" gap={1.5}>
            {p.formats.map((f, i) => {
              const tone =
                i === 0 && p.formats.length > 1
                  ? "good"
                  : f.vsMedian <= -30
                    ? "bad"
                    : "neutral";
              return (
                <Flex key={f.format} align="center" gap={2}>
                  <Text
                    fontSize="sm"
                    color="nexzy.white"
                    fontWeight="600"
                    w="90px"
                  >
                    {FORMAT_LABEL[f.format] ?? f.format}
                  </Text>
                  <Text fontSize="xs" color="nexzy.gray.100" flex="1">
                    median {fmtNum(f.median)} · {f.n} posts
                    {f.engRate != null
                      ? ` · ${fmtPct(f.engRate)} engagement`
                      : ""}
                    {f.n < 3 ? " · thin sample" : ""}
                  </Text>
                  <Pill tone={tone}>{vs(f.vsMedian)}</Pill>
                </Flex>
              );
            })}
          </VStack>
        </Card>
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
        <Card title="Top 5 posts">
          {p.top.length ? (
            p.top.map((x) => <PostRow key={x.id} p={x} metric={p.metric} />)
          ) : (
            <Text fontSize="xs" color="nexzy.gray.100">
              No analyzed posts yet.
            </Text>
          )}
        </Card>
        <Card title="Bottom 5 posts">
          {p.bottom.length ? (
            p.bottom.map((x) => <PostRow key={x.id} p={x} metric={p.metric} />)
          ) : (
            <Text fontSize="xs" color="nexzy.gray.100">
              Needs 6+ analyzed posts.
            </Text>
          )}
        </Card>
      </SimpleGrid>

      <Card title={`Recent posts (${p.recent.length})`}>
        <VStack align="stretch" gap={0}>
          {(showAll ? p.recent : p.recent.slice(0, 8)).map((x) => (
            <Flex key={x.id} align="center" gap={2}>
              <Box flex="1" minW={0}>
                <PostRow p={x} metric={p.metric} />
              </Box>
              {x.excluded ? (
                <Pill tone="warn">excluded</Pill>
              ) : x.settling ? (
                <Pill>settling</Pill>
              ) : null}
            </Flex>
          ))}
        </VStack>
        {p.recent.length > 8 && (
          <Text
            as="button"
            mt={2}
            fontSize="xs"
            color="nexzy.lightBlue"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show fewer" : `Show all ${p.recent.length}`}
          </Text>
        )}
      </Card>

      {p.notes.length > 0 && (
        <Text fontSize="10px" color="whiteAlpha.500">
          {p.notes.join(" ")}
        </Text>
      )}
    </VStack>
  );
}

export default function PostLabPanel({ lab }: { lab: PostLabReport | null }) {
  const platforms = useMemo(
    () => lab?.platforms.filter((p) => p.listed > 0 || p.error) ?? [],
    [lab],
  );
  const [sel, setSel] = useState<string | null>(null);
  const current =
    platforms.find((p) => p.platform === sel) ?? platforms[0] ?? null;

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      px={4}
      py={3}
    >
      <Flex justify="space-between" align="center" mb={1} gap={2} wrap="wrap">
        <Flex align="center" gap={2}>
          <Text color="nexzy.white" fontSize="sm" fontWeight="700">
            Your post data, in depth
          </Text>
          <Box color="green.300">
            <FiTrendingUp />
          </Box>
          <Box color="red.300">
            <FiTrendingDown />
          </Box>
        </Flex>
        {lab?.generatedAt && (
          <Text fontSize="xs" color="whiteAlpha.500">
            built {fmtDate(lab.generatedAt)} CT
          </Text>
        )}
      </Flex>
      <Text fontSize="xs" color="nexzy.gray.100" mb={3}>
        One metric per platform, medians (not averages), sample size on every
        number, and the bad next to the good. Posts under{" "}
        {lab?.settleHours ?? 72}h old are shown but not ranked.
      </Text>

      {!lab || !platforms.length ? (
        <Text fontSize="sm" color="nexzy.gray.100">
          No post data yet. Hit Refresh above to pull it.
        </Text>
      ) : (
        <>
          <Flex gap={1} wrap="wrap" mb={3}>
            {platforms.map((p) => {
              const on = current?.platform === p.platform;
              return (
                <Box
                  key={p.platform}
                  as="button"
                  onClick={() => setSel(p.platform)}
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="700"
                  bg={on ? "nexzy.blue" : "transparent"}
                  color={on ? "white" : "nexzy.gray.100"}
                  border="1px solid"
                  borderColor={on ? "nexzy.blue" : "whiteAlpha.300"}
                >
                  {PLATFORM_LABEL[p.platform] ?? p.platform}
                  {p.error ? " · error" : ` · ${p.analyzed}`}
                </Box>
              );
            })}
          </Flex>
          {current && <PlatformView p={current} />}
        </>
      )}
    </Box>
  );
}
