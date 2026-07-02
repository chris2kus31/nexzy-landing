"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { Box, Heading, VStack, HStack, Text } from "@chakra-ui/react";
import { formatCount } from "@/lib/blog/format";

// Only the fields this widget needs — declared locally so the component stays
// client-safe (no import from the server-only blog api module).
type TrendingItem = {
  slug: string;
  title: string;
  viewCount: number;
};

/**
 * "Most read" sidebar. Seeded with the server-rendered list (good for SEO),
 * then refreshed live from /api/blog/trending on mount and when the tab regains
 * focus — so the read counts reflect reality within seconds instead of being
 * frozen by the page's 5-minute ISR cache.
 */
export default function MostRead({ posts }: { posts: TrendingItem[] }) {
  const [items, setItems] = useState<TrendingItem[]>(posts);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await fetch(
          `/api/blog/trending?limit=${posts.length || 5}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data: TrendingItem[] = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
      } catch {
        // keep the server-seeded list on failure
      }
    };

    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [posts.length]);

  if (items.length === 0) return null;

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="nexzy.blue/20"
      borderRadius="xl"
      p={5}
    >
      <Heading as="h2" size="md" color="white" mb={4}>
        Most read
      </Heading>
      <VStack align="stretch" gap={3}>
        {items.map((p, i) => (
          <NextLink key={p.slug} href={`/blog/${p.slug}`}>
            <HStack gap={3} align="flex-start">
              <Text
                color="nexzy.blue"
                fontWeight="700"
                fontSize="lg"
                lineHeight="1.2"
                minW="22px"
              >
                {i + 1}
              </Text>
              <Box>
                <Text
                  color="gray.100"
                  fontSize="sm"
                  fontWeight="500"
                  lineClamp={2}
                  _hover={{ color: "white" }}
                >
                  {p.title}
                </Text>
                <Text color="gray.500" fontSize="xs" mt={0.5}>
                  {formatCount(p.viewCount)} reads
                </Text>
              </Box>
            </HStack>
          </NextLink>
        ))}
      </VStack>
    </Box>
  );
}
