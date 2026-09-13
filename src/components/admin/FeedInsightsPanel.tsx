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
import { FiBarChart2, FiRefreshCw } from "react-icons/fi";
import {
  getFeedImpressions,
  type FeedImpressionsReport,
} from "@/lib/admin/client";

/**
 * Feed insights (1H-b) — admin-only monitoring for the impression counter. There
 * is NO user-facing display yet (Chris's call: track now, display later); this
 * is where he watches the numbers + volume the aggregate table is absorbing, and
 * can spot if impressions ever misbehave (kill-switch: FEED_IMPRESSIONS_ENABLED).
 */
export default function FeedInsightsPanel() {
  const [data, setData] = useState<FeedImpressionsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getFeedImpressions(100)
      .then(setData)
      .catch((e) => setError(e?.message || "Failed to load."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const nf = (n: number) => n.toLocaleString();

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
        First-party feed impressions (how many times items were shown in the
        feed). Admin-only — not shown to users yet. An impression = shown on
        screen; the same item seen again in a later session counts again
        (X-style total impressions, not unique reach).
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
      ) : !data ? null : (
        <VStack align="stretch" gap={5}>
          <SimpleGrid columns={{ base: 2 }} gap={4}>
            <Box
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              p={4}
            >
              <Text fontSize="xs" color="nexzy.gray.100" mb={1}>
                Total impressions
              </Text>
              <Text
                fontSize="2xl"
                color="nexzy.white"
                fontFamily="title"
                fontWeight="700"
              >
                {nf(data.total)}
              </Text>
            </Box>
            <Box
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              p={4}
            >
              <Text fontSize="xs" color="nexzy.gray.100" mb={1}>
                Distinct items tracked
              </Text>
              <Text
                fontSize="2xl"
                color="nexzy.white"
                fontFamily="title"
                fontWeight="700"
              >
                {nf(data.distinctItems)}
              </Text>
            </Box>
          </SimpleGrid>

          <Box>
            <Text
              fontSize="xs"
              color="nexzy.gray.100"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={2}
            >
              Most-seen items
            </Text>
            {data.rows.length === 0 ? (
              <Box
                border="1px dashed"
                borderColor="whiteAlpha.300"
                borderRadius="xl"
                p={10}
                textAlign="center"
              >
                <Text color="nexzy.gray.100">
                  No impressions recorded yet. They accrue as users scroll the
                  feed (once the API + 1.1.10 app are live).
                </Text>
              </Box>
            ) : (
              <VStack align="stretch" gap={2}>
                {data.rows.map((r) => (
                  <Flex
                    key={`${r.refType}:${r.refId}`}
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="md"
                    px={3}
                    py={2}
                    align="center"
                    gap={3}
                  >
                    <Badge colorPalette="purple" variant="subtle">
                      {r.refType}
                    </Badge>
                    <Box flex={1} minW={0}>
                      <Text color="nexzy.white" fontSize="sm" lineClamp={1}>
                        {r.label ||
                          (r.author ? `@${r.author}` : r.refId.slice(0, 8))}
                      </Text>
                      {r.author && r.label && (
                        <Text color="nexzy.gray.100" fontSize="xs">
                          @{r.author}
                        </Text>
                      )}
                    </Box>
                    <Text
                      color="nexzy.lightBlue"
                      fontSize="sm"
                      fontWeight="700"
                    >
                      {nf(r.impressions)}
                    </Text>
                  </Flex>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      )}
    </Box>
  );
}
