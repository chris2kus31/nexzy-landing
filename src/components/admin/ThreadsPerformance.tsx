"use client";

import { Box, Flex, VStack, SimpleGrid, Heading, Text } from "@chakra-ui/react";

/**
 * Threads performance card (Content Studio -> Audience). Reads
 * raw.threadsPerformance from the token-free audience refresh: last-28d
 * profile views, post totals, and follower demographics (Meta requires 100+
 * followers for demographics). Renders nothing until the refresh stored it.
 */
export type ThSource = {
  ok?: boolean;
  stale?: boolean;
  windowDays?: number;
  profileViews?: number | null;
  likes?: number | null;
  replies?: number | null;
  reposts?: number | null;
  quotes?: number | null;
  followersCount?: number | null;
  demographics?: Record<string, Record<string, number>>;
  notes?: string[];
};

const fmt = (n?: number | null) =>
  typeof n === "number" ? n.toLocaleString() : "—";

const GENDER_LABEL: Record<string, string> = {
  M: "Men",
  F: "Women",
  U: "Not stated",
};

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
  labels = {},
  cap,
}: {
  title: string;
  parts: Record<string, number>;
  labels?: Record<string, string>;
  cap?: number;
}) {
  let rows = Object.entries(parts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((a, [, v]) => a + v, 0);
  if (cap) rows = rows.slice(0, cap);
  if (!rows.length) return null;
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
                {labels[k] ?? k}
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

export default function ThreadsPerformance({ src }: { src?: ThSource }) {
  if (!src?.ok) return null;
  const d = src.demographics ?? {};

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
          Threads — last {src.windowDays ?? 28} days
        </Heading>
        <Flex align="baseline" gap={3}>
          {src.stale && (
            <Text color="orange.300" fontSize="xs">
              showing the previous pull
            </Text>
          )}
          <Text color="nexzy.gray.100" fontSize="xs">
            {fmt(src.followersCount)} followers
          </Text>
        </Flex>
      </Flex>

      <SimpleGrid
        columns={{ base: 2, md: 3, lg: 5 }}
        gap={3}
        mb={Object.keys(d).length ? 5 : 0}
      >
        <Kpi label="Profile views" value={fmt(src.profileViews)} />
        <Kpi label="Likes" value={fmt(src.likes)} />
        <Kpi label="Replies" value={fmt(src.replies)} />
        <Kpi label="Reposts" value={fmt(src.reposts)} />
        <Kpi label="Quotes" value={fmt(src.quotes)} />
      </SimpleGrid>

      {Object.keys(d).length > 0 && (
        <SimpleGrid columns={{ base: 1, lg: 3 }} gap={6}>
          <Bars title="Followers by age" parts={d.age ?? {}} />
          <Bars
            title="Followers by gender"
            parts={d.gender ?? {}}
            labels={GENDER_LABEL}
          />
          <Bars title="Top countries" parts={d.country ?? {}} cap={6} />
        </SimpleGrid>
      )}

      {!!src.notes?.length && (
        <Text color="nexzy.gray.100" fontSize="10px" mt={3}>
          Notes: {src.notes.join(" · ")}
        </Text>
      )}
    </Box>
  );
}
