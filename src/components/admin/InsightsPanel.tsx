"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import {
  getContentSuggestions,
  refreshContentInsights,
  type ContentSuggestion,
  type PlatformInsights,
} from "@/lib/admin/client";

const PLATFORM_COLOR: Record<string, string> = {
  facebook: "blue",
  instagram: "pink",
  threads: "gray",
  youtube: "red",
};

/** One published card: what it went to + its real numbers, with a refresh. */
function PerfRow({ s }: { s: ContentSuggestion }) {
  const [insights, setInsights] = useState<PlatformInsights[]>(
    s.payload?.insights ?? [],
  );
  const [busy, setBusy] = useState(false);
  const posted = (s.payload?.publishResults ?? []).filter((r) => r.ok);

  const refresh = async () => {
    setBusy(true);
    try {
      const card = await refreshContentInsights(s.id);
      setInsights(card.payload?.insights ?? []);
    } catch {
      /* leave as-is */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <Flex justify="space-between" align="flex-start" gap={3} mb={2}>
        <HStack gap={2} wrap="wrap" flex={1} minW={0}>
          {posted.map((r, i) => (
            <Badge
              key={i}
              colorPalette={PLATFORM_COLOR[r.platform] || "gray"}
              variant="solid"
            >
              {r.platform}
            </Badge>
          ))}
          <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
            {s.title}
          </Text>
        </HStack>
        <Button
          size="xs"
          variant="outline"
          color="nexzy.gray.100"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={refresh}
          loading={busy}
          loadingText="…"
        >
          ↻ Refresh
        </Button>
      </Flex>

      {insights.length === 0 ? (
        <Text fontSize="xs" color="whiteAlpha.500">
          No numbers yet — hit Refresh (they mature over a day or two).
        </Text>
      ) : (
        <VStack align="stretch" gap={0.5}>
          {insights.map((it, i) => (
            <Text key={i} fontSize="xs" color="nexzy.gray.100">
              <Text as="span" color="nexzy.white" fontWeight="600">
                {it.platform}:
              </Text>{" "}
              {it.error
                ? `— (${it.error})`
                : Object.entries(it.metrics)
                    .map(([k, v]) => `${k} ${v.toLocaleString()}`)
                    .join(" · ") || "—"}
            </Text>
          ))}
        </VStack>
      )}

      {s.payload?.insightsFetchedAt && (
        <Text fontSize="10px" color="whiteAlpha.400" mt={2}>
          updated {new Date(s.payload.insightsFetchedAt).toLocaleString()}
        </Text>
      )}
    </Box>
  );
}

/**
 * Performance — every card you've published to social (FB/IG/Threads), with its
 * real numbers. The insights live on the cards (from the publish hub); this is
 * the one place to see them all and refresh.
 */
export default function InsightsPanel() {
  const [cards, setCards] = useState<ContentSuggestion[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const all = await getContentSuggestions();
      // Only cards that were actually published to a social platform.
      const published = all.filter((s) =>
        (s.payload?.publishResults ?? []).some((r) => r.ok),
      );
      setCards(published);
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Failed to load performance.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <Text color="red.300" fontSize="sm">
        {error}
      </Text>
    );
  }
  if (!cards) {
    return (
      <Flex justify="center" py={12}>
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }

  return (
    <VStack align="stretch" gap={4}>
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Performance
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          Every card you&rsquo;ve published to Facebook / Instagram / Threads and
          its real numbers. Refreshes daily; hit Refresh for the latest.
        </Text>
      </Box>
      {cards.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          Nothing published to social yet. Publish a card from{" "}
          <b>Suggestions</b> and it&rsquo;ll show up here.
        </Text>
      ) : (
        cards.map((s) => <PerfRow key={s.id} s={s} />)
      )}
    </VStack>
  );
}
