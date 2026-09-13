"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Spinner,
  SimpleGrid,
  Badge,
} from "@chakra-ui/react";
import { FiBarChart2, FiRefreshCw, FiHeart, FiEye } from "react-icons/fi";
import {
  getFeedImpressions,
  type FeedImpressionsReport,
} from "@/lib/admin/client";

/**
 * Feed insights (1H-b) — admin-only analytics for the impression counter. Not a
 * raw dump: headline totals, the type MIX people are actually seeing, and a
 * bounded top-10 where each item shows its title + hearts + engagement rate so
 * the number means something ("seen a lot, no hearts" is the signal to act on).
 */

// Friendly labels + colors per feed content type.
const TYPE_META: Record<string, { label: string; color: string }> = {
  community_post: { label: "Posts", color: "teal" },
  blog_post: { label: "Articles", color: "blue" },
  video: { label: "Videos", color: "purple" },
  announcement: { label: "Announcements", color: "orange" },
};
const meta = (t: string) =>
  TYPE_META[t] ?? { label: t.replace(/_/g, " "), color: "gray" };

export default function FeedInsightsPanel() {
  const [data, setData] = useState<FeedImpressionsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getFeedImpressions(10)
      .then(setData)
      .catch((e) => setError(e?.message || "Failed to load."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const nf = (n: number) => n.toLocaleString();
  const engagement = (hearts: number, impressions: number) =>
    impressions > 0 ? `${Math.round((hearts / impressions) * 100)}%` : "—";

  return (
    <Box>
      <HStack gap={2} mb={1}>
        <Box color="nexzy.lightBlue">
          <FiBarChart2 />
        </Box>
        <Heading size="md" color="nexzy.white">
          Feed insights
        </Heading>
        <Box flex={1} />
        <Button
          size="sm"
          variant="outline"
          color="nexzy.gray.100"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={load}
        >
          <FiRefreshCw /> Refresh
        </Button>
      </HStack>
      <Text fontSize="sm" color="nexzy.gray.100" mb={5}>
        How much of the feed people actually see, and which items land. An
        impression = shown on screen (re-counts across sessions, not unique
        reach). Read it against hearts: high views + low hearts = seen but not
        landing.
      </Text>

      {error && (
        <Text color="red.300" fontSize="sm" mb={4}>
          {error}
        </Text>
      )}

      {loading ? (
        <Flex justify="center" py={12}>
          <Spinner color="nexzy.lightBlue" />
        </Flex>
      ) : !data ? null : data.total === 0 ? (
        <Box
          border="1px dashed"
          borderColor="whiteAlpha.300"
          borderRadius="xl"
          p={10}
          textAlign="center"
        >
          <Text color="nexzy.gray.100">
            No impressions yet. They accrue as users scroll the feed (once the
            1.1.10 app is live).
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={6}>
          {/* Headline numbers */}
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            {[
              { label: "Total impressions", value: nf(data.total) },
              { label: "Items seen", value: nf(data.distinctItems) },
              { label: "Avg views / item", value: nf(data.avgPerItem) },
            ].map((s) => (
              <Box
                key={s.label}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
                p={4}
              >
                <Text fontSize="xs" color="nexzy.gray.100" mb={1}>
                  {s.label}
                </Text>
                <Text fontSize="2xl" color="nexzy.white" fontFamily="title">
                  {s.value}
                </Text>
              </Box>
            ))}
          </SimpleGrid>

          {/* What people are seeing — type mix */}
          <Box>
            <Text
              fontSize="xs"
              color="nexzy.gray.100"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={3}
            >
              What people are seeing
            </Text>
            <VStack align="stretch" gap={3}>
              {data.byType.map((t) => {
                const m = meta(t.refType);
                const pct =
                  data.total > 0
                    ? Math.round((t.impressions / data.total) * 100)
                    : 0;
                return (
                  <Box key={t.refType}>
                    <Flex justify="space-between" mb={1} align="baseline">
                      <HStack gap={2}>
                        <Text color="nexzy.white" fontSize="sm">
                          {m.label}
                        </Text>
                        <Text color="nexzy.gray.100" fontSize="xs">
                          {t.items} item{t.items === 1 ? "" : "s"}
                        </Text>
                      </HStack>
                      <Text color="nexzy.gray.100" fontSize="xs">
                        {nf(t.impressions)} · {pct}%
                      </Text>
                    </Flex>
                    <Box bg="whiteAlpha.100" borderRadius="full" h="8px">
                      <Box
                        bg={`${m.color}.400`}
                        borderRadius="full"
                        h="8px"
                        w={`${pct}%`}
                        minW={pct > 0 ? "6px" : "0"}
                      />
                    </Box>
                  </Box>
                );
              })}
            </VStack>
          </Box>

          {/* Top items — capped leaderboard */}
          <Box>
            <Text
              fontSize="xs"
              color="nexzy.gray.100"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={3}
            >
              Top {data.top.length} most-seen
            </Text>
            <VStack align="stretch" gap={2}>
              {data.top.map((r, i) => {
                const m = meta(r.refType);
                const label =
                  r.title?.trim() ||
                  `${m.label.replace(/s$/, "")} · ${r.refId.slice(0, 8)}`;
                const inner = (
                  <Flex
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="md"
                    px={3}
                    py={2}
                    align="center"
                    gap={3}
                  >
                    <Text
                      color="nexzy.gray.100"
                      fontSize="xs"
                      w="18px"
                      textAlign="right"
                    >
                      {i + 1}
                    </Text>
                    <Badge colorPalette={m.color} variant="subtle">
                      {m.label.replace(/s$/, "")}
                    </Badge>
                    <Text
                      flex={1}
                      minW={0}
                      color="nexzy.white"
                      fontSize="sm"
                      lineClamp={1}
                    >
                      {label}
                    </Text>
                    <HStack gap={1} color="nexzy.gray.100">
                      <FiEye size={13} />
                      <Text fontSize="sm" color="nexzy.white" fontWeight="500">
                        {nf(r.impressions)}
                      </Text>
                    </HStack>
                    <HStack gap={1} color="nexzy.gray.100" minW="70px">
                      <FiHeart size={13} />
                      <Text fontSize="sm">
                        {nf(r.hearts)}
                        <Text as="span" color="nexzy.gray.100" fontSize="xs">
                          {" "}
                          ({engagement(r.hearts, r.impressions)})
                        </Text>
                      </Text>
                    </HStack>
                  </Flex>
                );
                return r.slug ? (
                  <a
                    key={`${r.refType}:${r.refId}`}
                    href={`/blog/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    {inner}
                  </a>
                ) : (
                  <Box key={`${r.refType}:${r.refId}`}>{inner}</Box>
                );
              })}
            </VStack>
          </Box>
        </VStack>
      )}
    </Box>
  );
}
