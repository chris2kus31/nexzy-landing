"use client";

import {
  Box,
  Flex,
  VStack,
  SimpleGrid,
  Heading,
  Text,
  Link,
} from "@chakra-ui/react";
import { FiExternalLink } from "react-icons/fi";

/**
 * Instagram performance card (Content Studio -> Audience). Reads
 * raw.instagramPerformance from the token-free audience refresh: last-28d views
 * and reach split by follower vs non-follower and by format, follows vs
 * unfollows, and per-Reel watch time + 3-second skip rate. Renders nothing
 * until the refresh has stored it.
 */
export type IgReel = {
  id: string;
  at: string;
  caption: string | null;
  url: string | null;
  kind?: string | null;
  views: number | null;
  reach: number | null;
  avgWatchSec: number | null;
  skipRate: number | null;
  shares: number | null;
  saves: number | null;
};
export type IgSource = {
  ok?: boolean;
  stale?: boolean;
  windowDays?: number;
  views?: {
    total?: number | null;
    byFollowType?: Record<string, number>;
    byFormat?: Record<string, number>;
  };
  reach?: {
    total?: number | null;
    byFollowType?: Record<string, number>;
    byFormat?: Record<string, number>;
  };
  follows?: { follows: number; unfollows: number } | null;
  reels?: {
    stale?: boolean;
    count: number;
    medianViews: number | null;
    medianAvgWatchSec: number | null;
    medianSkipRate: number | null;
    list: IgReel[];
  };
  notes?: string[];
};

const FORMAT_LABEL: Record<string, string> = {
  REEL: "Reels",
  REELS: "Reels",
  FEED: "Feed posts",
  POST: "Posts",
  CAROUSEL_CONTAINER: "Carousels",
  STORY: "Stories",
  AD: "Ads",
};

const fmt = (n?: number | null) =>
  typeof n === "number" ? n.toLocaleString() : "—";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      px={3}
      py={2.5}
    >
      <Text color="nexzy.white" fontSize="xl" fontWeight="700" lineHeight="1.1">
        {value}
      </Text>
      <Text color="nexzy.gray.100" fontSize="10px">
        {label}
      </Text>
    </Box>
  );
}

function Bars({
  title,
  parts,
  labels,
}: {
  title: string;
  parts: Record<string, number>;
  labels: Record<string, string>;
}) {
  const rows = Object.entries(parts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!rows.length) return null;
  const total = rows.reduce((a, [, v]) => a + v, 0);
  return (
    <Box>
      <Text
        color="nexzy.gray.100"
        fontSize="xs"
        fontWeight="700"
        textTransform="uppercase"
        mb={2}
      >
        {title}
      </Text>
      <VStack align="stretch" gap={2.5}>
        {rows.map(([k, v]) => (
          <Box key={k}>
            <Flex justify="space-between" mb={1} gap={2}>
              <Text color="nexzy.white" fontSize="sm">
                {labels[k] ?? k.replace(/_/g, " ").toLowerCase()}
              </Text>
              <Text color="nexzy.gray.100" fontSize="xs">
                {fmt(v)} · {Math.round((v / total) * 100)}%
              </Text>
            </Flex>
            <Box
              bg="whiteAlpha.100"
              borderRadius="full"
              h="6px"
              overflow="hidden"
            >
              <Box
                bg="nexzy.blue"
                h="100%"
                w={`${Math.max(2, (v / total) * 100)}%`}
                borderRadius="full"
              />
            </Box>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}

export default function InstagramPerformance({ src }: { src?: IgSource }) {
  if (!src?.ok) return null;
  const ft = src.views?.byFollowType ?? {};
  const fol = ft.FOLLOWER ?? 0;
  const non = ft.NON_FOLLOWER ?? 0;
  const nonPct =
    fol + non > 0 ? `${Math.round((non / (fol + non)) * 100)}%` : "—";
  const r = src.reels;
  const net = src.follows ? src.follows.follows - src.follows.unfollows : null;
  const reels = (r?.list ?? []).filter(
    (x) => x.avgWatchSec != null || x.skipRate != null || x.views != null,
  );

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={{ base: 4, md: 5 }}
    >
      <Flex align="baseline" justify="space-between" mb={3} wrap="wrap" gap={2}>
        <Heading size="sm" color="nexzy.white">
          Instagram — last {src.windowDays ?? 28} days
        </Heading>
        {src.stale && (
          <Text color="orange.300" fontSize="xs">
            showing the previous pull
          </Text>
        )}
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap={3} mb={5}>
        <Kpi label="Views" value={fmt(src.views?.total)} />
        <Kpi label="Accounts reached" value={fmt(src.reach?.total)} />
        <Kpi label="Views from non-followers" value={nonPct} />
        <Kpi
          label="Net follows"
          value={net == null ? "—" : `${net > 0 ? "+" : ""}${net}`}
        />
        <Kpi
          label="Reels median watch"
          value={r?.medianAvgWatchSec != null ? `${r.medianAvgWatchSec}s` : "—"}
        />
        <Kpi
          label="Reels skip in first 3s"
          value={r?.medianSkipRate != null ? `${r.medianSkipRate}%` : "—"}
        />
      </SimpleGrid>

      <SimpleGrid
        columns={{ base: 1, lg: 2 }}
        gap={6}
        mb={reels.length ? 5 : 0}
      >
        <Bars
          title="Views: followers vs non-followers"
          parts={ft}
          labels={{ FOLLOWER: "Followers", NON_FOLLOWER: "Non-followers" }}
        />
        <Bars
          title="Views by format"
          parts={src.views?.byFormat ?? {}}
          labels={FORMAT_LABEL}
        />
      </SimpleGrid>

      {reels.length > 0 && (
        <Box>
          <Text
            color="nexzy.gray.100"
            fontSize="xs"
            fontWeight="700"
            textTransform="uppercase"
            mb={2}
          >
            Reels: watch time and 3s skip rate
          </Text>
          <VStack align="stretch" gap={1}>
            {reels.slice(0, 15).map((x) => (
              <Flex key={x.id} align="center" gap={2} py={1}>
                <Box flex="1" minW={0}>
                  <Text fontSize="xs" color="nexzy.white" lineClamp={1}>
                    {x.caption || "(no caption)"}
                  </Text>
                  <Text fontSize="10px" color="nexzy.gray.100">
                    {new Date(x.at).toLocaleDateString("en-US", {
                      timeZone: "America/Chicago",
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {fmt(x.views)} views
                    {x.avgWatchSec != null
                      ? ` · ${x.avgWatchSec}s avg watch`
                      : ""}
                    {x.skipRate != null ? ` · ${x.skipRate}% skipped` : ""}
                    {x.shares != null ? ` · ${x.shares} shares` : ""}
                  </Text>
                </Box>
                {x.url && (
                  <Link
                    href={x.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="nexzy.lightBlue"
                    aria-label="Open Reel"
                    flexShrink={0}
                  >
                    <FiExternalLink />
                  </Link>
                )}
              </Flex>
            ))}
          </VStack>
        </Box>
      )}

      {!!src.notes?.length && (
        <Text color="nexzy.gray.100" fontSize="10px" mt={3}>
          Not returned by Meta: {src.notes.join(" · ")}
        </Text>
      )}
    </Box>
  );
}
