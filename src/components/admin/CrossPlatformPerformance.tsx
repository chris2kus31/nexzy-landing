"use client";

import { Box, Flex, VStack, Heading, Text } from "@chakra-ui/react";

/**
 * Cross-platform performance — one comparable view of how your posts did on
 * every integrated platform, from the post history the audience refresh already
 * pulls (no LLM, no extra API). Shows posts, total reach, avg reach/post, and
 * best post per platform. Reach is NOT apples-to-apples across platforms
 * (IG = unique accounts, YouTube/Threads = views, X = impressions/engagement),
 * so each platform's bar is scaled against itself, and the caveat is shown.
 */
export type PlatformStat = {
  posts: number;
  totalReach: number;
  avgReach: number;
  bestReach: number;
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube Shorts",
  youtube_long: "YouTube long-form",
  instagram: "Instagram",
  facebook: "Facebook",
  threads: "Threads",
  x: "X",
};
const PLATFORM_COLOR: Record<string, string> = {
  youtube: "red.400",
  instagram: "pink.400",
  facebook: "blue.400",
  threads: "purple.400",
  x: "gray.400",
};
const ORDER = [
  "youtube",
  "youtube_long",
  "instagram",
  "facebook",
  "threads",
  "x",
];

function fmt(n?: number): string {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

export default function CrossPlatformPerformance({
  summary,
}: {
  summary?: Record<string, PlatformStat>;
}) {
  if (!summary || Object.keys(summary).length === 0) return null;
  const rows = ORDER.filter((p) => summary[p]?.posts > 0).map((p) => ({
    platform: p,
    ...summary[p],
  }));
  // Also include any platform not in ORDER (future-proof).
  for (const p of Object.keys(summary)) {
    if (!ORDER.includes(p) && summary[p]?.posts > 0) {
      rows.push({ platform: p, ...summary[p] });
    }
  }
  if (rows.length === 0) return null;
  const avgMax = Math.max(1, ...rows.map((r) => r.avgReach));

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={{ base: 4, md: 5 }}
    >
      <Heading size="sm" color="nexzy.white" mb={1}>
        Cross-platform performance
      </Heading>
      <Text color="nexzy.gray.100" fontSize="xs" mb={4}>
        From your recent post history · avg reach/post, scaled per platform
      </Text>

      <VStack align="stretch" gap={3.5}>
        {rows.map((r) => (
          <Box key={r.platform}>
            <Flex justify="space-between" align="baseline" mb={1} gap={2}>
              <Text color="nexzy.white" fontSize="sm" fontWeight="700">
                {PLATFORM_LABEL[r.platform] ?? r.platform}
              </Text>
              <Text color="nexzy.gray.100" fontSize="xs">
                {fmt(r.avgReach)} avg · {fmt(r.posts)} posts ·{" "}
                {fmt(r.totalReach)} total · best {fmt(r.bestReach)}
              </Text>
            </Flex>
            <Box
              bg="whiteAlpha.100"
              borderRadius="full"
              h="8px"
              w="full"
              overflow="hidden"
            >
              <Box
                bg={PLATFORM_COLOR[r.platform] ?? "nexzy.blue"}
                h="100%"
                w={`${Math.max(2, Math.min(100, (r.avgReach / avgMax) * 100))}%`}
                borderRadius="full"
              />
            </Box>
          </Box>
        ))}
      </VStack>

      <Text color="whiteAlpha.500" fontSize="10px" mt={4}>
        Reach means different things per platform (IG = unique accounts, YouTube
        / Threads = views, X = impressions or engagement), so compare each
        platform against its own trend, not against the others.
      </Text>
    </Box>
  );
}
