"use client";

import { Box, Flex, SimpleGrid, Heading, Text } from "@chakra-ui/react";

/**
 * Facebook Page performance card (Content Studio -> Audience). Reads
 * raw.facebookPerformance from the token-free audience refresh: last-28d page
 * follows, views, unique viewers, engagements, video views, the follower vs
 * non-follower split of post views, and median video watch time. Renders
 * nothing until the refresh has stored it.
 */
export type FbSource = {
  ok?: boolean;
  stale?: boolean;
  windowDays?: number;
  follows?: number | null;
  views?: number | null;
  uniqueViewers?: number | null;
  engagements?: number | null;
  videoViews?: number | null;
  viewsByFollowType?: Record<string, number>;
  medianVideoWatchSec?: number | null;
  notes?: string[];
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

export default function FacebookPerformance({ src }: { src?: FbSource }) {
  if (!src?.ok) return null;
  const ft = src.viewsByFollowType ?? {};
  const fol = ft.FOLLOWER ?? 0;
  const non = ft.NON_FOLLOWER ?? 0;
  const nonPct =
    fol + non > 0 ? `${Math.round((non / (fol + non)) * 100)}%` : "—";

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
          Facebook — last {src.windowDays ?? 28} days
        </Heading>
        <Flex align="baseline" gap={3}>
          {src.stale && (
            <Text color="orange.300" fontSize="xs">
              showing the previous pull
            </Text>
          )}
          <Text color="nexzy.gray.100" fontSize="xs">
            {fmt(src.follows)} follows
          </Text>
        </Flex>
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap={3}>
        <Kpi label="Views" value={fmt(src.views)} />
        <Kpi label="Unique viewers" value={fmt(src.uniqueViewers)} />
        <Kpi label="Post engagements" value={fmt(src.engagements)} />
        <Kpi label="Video views" value={fmt(src.videoViews)} />
        <Kpi label="Post views from non-followers" value={nonPct} />
        <Kpi
          label="Video median watch"
          value={
            src.medianVideoWatchSec != null
              ? `${src.medianVideoWatchSec}s`
              : "—"
          }
        />
      </SimpleGrid>

      {!!src.notes?.length && (
        <Text color="nexzy.gray.100" fontSize="10px" mt={3}>
          Not returned by Meta: {src.notes.join(" · ")}
        </Text>
      )}
    </Box>
  );
}
