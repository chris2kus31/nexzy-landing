"use client";

import { Box, Flex, VStack, SimpleGrid, Heading, Text } from "@chakra-ui/react";

/**
 * Shared YouTube performance card — surfaces the last-28d channel data the
 * collectors already pull (views, watch time, retention/APV, engagement) plus
 * the Shorts vs long-form split, traffic sources, and top videos. Used by both
 * the Growth tab (from the daily snapshot) and the Content Studio → Audience
 * panel (from the token-free audience refresh). Renders nothing until the
 * YouTube source has reported ok.
 */
export type YtSource = {
  ok?: boolean;
  channel?: {
    title?: string;
    subscribers?: number;
    totalViews?: number;
    videoCount?: number;
  };
  summary?: {
    views?: number;
    estimatedMinutesWatched?: number;
    averageViewDuration?: number;
    averageViewPercentage?: number;
    subscribersGained?: number;
    subscribersLost?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  trafficSources?: { source: string; views: number; minutes: number }[];
  topVideos?: { videoId: string; views: number; minutes: number }[];
  byContentType?: {
    type: string;
    views: number;
    minutes: number;
    avgViewPercentage: number;
  }[];
};

const YT_TRAFFIC_LABEL: Record<string, string> = {
  SHORTS: "Shorts feed",
  SUBSCRIBER: "Subscriptions / home",
  YT_SEARCH: "YouTube search",
  RELATED_VIDEO: "Suggested videos",
  EXT_URL: "External",
  NO_LINK_OTHER: "Direct / other",
  NO_LINK_EMBEDDED: "Embedded",
  PLAYLIST: "Playlists",
  YT_CHANNEL: "Channel page",
  NOTIFICATION: "Notifications",
  YT_OTHER_PAGE: "Other YouTube",
  HASHTAGS: "Hashtags",
  CAMPAIGN_CARD: "Campaign cards",
  END_SCREEN: "End screens",
  ANNOTATION: "Cards / annotations",
};
function ytTraffic(code: string): string {
  return YT_TRAFFIC_LABEL[code] ?? code.replace(/_/g, " ").toLowerCase();
}
const YT_CONTENT_LABEL: Record<string, string> = {
  shorts: "Shorts",
  videoOnDemand: "Long-form",
  liveStream: "Live",
  unspecified: "Other",
};

function Kpi({ label, value }: { label: string; value: string | number }) {
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

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <Box
      bg="whiteAlpha.100"
      borderRadius="full"
      h="6px"
      w="full"
      overflow="hidden"
    >
      <Box
        bg={color}
        h="100%"
        w={`${Math.max(2, Math.min(100, pct))}%`}
        borderRadius="full"
      />
    </Box>
  );
}

export default function YouTubePerformance({ src }: { src?: YtSource }) {
  if (!src?.ok) return null;
  const s = src.summary ?? {};
  const fmt = (n?: number) =>
    typeof n === "number" ? n.toLocaleString() : "—";
  const watchHrs =
    typeof s.estimatedMinutesWatched === "number"
      ? Math.round(s.estimatedMinutesWatched / 60).toLocaleString()
      : "—";
  const netSubs = (s.subscribersGained ?? 0) - (s.subscribersLost ?? 0);
  const engagements = (s.likes ?? 0) + (s.comments ?? 0) + (s.shares ?? 0);
  const apv =
    typeof s.averageViewPercentage === "number"
      ? `${s.averageViewPercentage.toFixed(0)}%`
      : "—";

  const traffic = (src.trafficSources ?? []).slice(0, 6);
  const trafficMax = Math.max(1, ...traffic.map((r) => r.views));
  const content = (src.byContentType ?? []).filter(
    (c) => c.type !== "unspecified" || c.views > 0,
  );
  const contentMax = Math.max(1, ...content.map((c) => c.views));
  const top = (src.topVideos ?? []).slice(0, 5);
  const topMax = Math.max(1, ...top.map((v) => v.views));

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
          YouTube — last 28 days
        </Heading>
        {src.channel?.subscribers != null && (
          <Text color="nexzy.gray.100" fontSize="xs">
            {fmt(src.channel.subscribers)} subscribers
          </Text>
        )}
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap={3} mb={5}>
        <Kpi label="Views 28d" value={fmt(s.views)} />
        <Kpi label="Watch hours" value={watchHrs} />
        <Kpi label="Avg % viewed" value={apv} />
        <Kpi label="Net subs 28d" value={fmt(netSubs)} />
        <Kpi label="Engagements" value={fmt(engagements)} />
        <Kpi label="Videos" value={fmt(src.channel?.videoCount)} />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 3 }} gap={6}>
        {content.length > 0 && (
          <Box>
            <Text
              color="nexzy.gray.100"
              fontSize="xs"
              fontWeight="700"
              textTransform="uppercase"
              mb={2}
            >
              Shorts vs long-form
            </Text>
            <VStack align="stretch" gap={2.5}>
              {content.map((c) => (
                <Box key={c.type}>
                  <Flex justify="space-between" mb={1} gap={2}>
                    <Text color="nexzy.white" fontSize="sm">
                      {YT_CONTENT_LABEL[c.type] ?? c.type}
                    </Text>
                    <Text color="nexzy.gray.100" fontSize="xs">
                      {fmt(c.views)} · {c.avgViewPercentage.toFixed(0)}% viewed
                    </Text>
                  </Flex>
                  <MiniBar
                    pct={(c.views / contentMax) * 100}
                    color={c.type === "shorts" ? "nexzy.blue" : "purple.400"}
                  />
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {traffic.length > 0 && (
          <Box>
            <Text
              color="nexzy.gray.100"
              fontSize="xs"
              fontWeight="700"
              textTransform="uppercase"
              mb={2}
            >
              How people find you
            </Text>
            <VStack align="stretch" gap={2.5}>
              {traffic.map((r) => (
                <Box key={r.source}>
                  <Flex justify="space-between" mb={1} gap={2}>
                    <Text color="nexzy.white" fontSize="sm">
                      {ytTraffic(r.source)}
                    </Text>
                    <Text color="nexzy.gray.100" fontSize="xs">
                      {fmt(r.views)}
                    </Text>
                  </Flex>
                  <MiniBar
                    pct={(r.views / trafficMax) * 100}
                    color="teal.400"
                  />
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {top.length > 0 && (
          <Box>
            <Text
              color="nexzy.gray.100"
              fontSize="xs"
              fontWeight="700"
              textTransform="uppercase"
              mb={2}
            >
              Top videos
            </Text>
            <VStack align="stretch" gap={2.5}>
              {top.map((v) => (
                <Box key={v.videoId}>
                  <Flex justify="space-between" mb={1} gap={2}>
                    <a
                      href={`https://www.youtube.com/watch?v=${v.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#4aa3ff",
                        fontSize: 13,
                        textDecoration: "none",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {v.videoId}
                    </a>
                    <Text color="nexzy.gray.100" fontSize="xs" flexShrink={0}>
                      {fmt(v.views)}
                    </Text>
                  </Flex>
                  <MiniBar pct={(v.views / topMax) * 100} color="orange.400" />
                </Box>
              ))}
            </VStack>
          </Box>
        )}
      </SimpleGrid>
    </Box>
  );
}
