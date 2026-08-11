"use client";

import { useState } from "react";
import {
  Box,
  Heading,
  Text,
  Badge,
  SimpleGrid,
  Button,
  Flex,
} from "@chakra-ui/react";
import NextImage from "next/image";
import TrackedLink from "@/components/TrackedLink";
import type { GameWithContent } from "@/lib/blog/api";

/**
 * Paginated game-hub grid. Server-renders the first page; "Load more" fetches
 * additional pages from /api/games and appends — so we never render the entire
 * (unbounded) games list at once.
 */
export default function GamesGrid({
  initialItems,
  total,
  pageSize,
}: {
  initialItems: GameWithContent[];
  total: number;
  pageSize: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const hasMore = items.length < total;

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    const next = page + 1;
    try {
      const res = await fetch(`/api/games?page=${next}&pageSize=${pageSize}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [...prev, ...(data.items ?? [])]);
        setPage(next);
      }
    } catch {
      // leave the list as-is on a transient error
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <Text color="gray.500">No game coverage yet — check back soon.</Text>
    );
  }

  return (
    <>
      <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={5}>
        {items.map((g, i) => {
          const year = g.released ? new Date(g.released).getFullYear() : null;
          return (
            <TrackedLink
              key={g.slug}
              href={`/games/${g.slug}`}
              event="content_click"
              params={{
                content_type: "game",
                slug: g.slug,
                from: "games_listing",
                position: i,
              }}
              style={{ display: "block", height: "100%" }}
            >
              <Box
                position="relative"
                borderRadius="xl"
                overflow="hidden"
                border="1px solid"
                borderColor="nexzy.blue/20"
                aspectRatio={3 / 4}
                transition="all 0.2s"
                _hover={{
                  borderColor: "nexzy.blue/60",
                  transform: "translateY(-4px)",
                  shadow: "0 16px 40px rgba(0,0,0,0.5)",
                }}
              >
                {g.backgroundImage ? (
                  <NextImage
                    src={g.backgroundImage}
                    alt={g.name}
                    fill
                    priority={i === 0}
                    sizes="(max-width: 768px) 50vw, 240px"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <Box position="absolute" inset={0} bg="whiteAlpha.100" />
                )}
                <Box
                  position="absolute"
                  inset={0}
                  pointerEvents="none"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(16,18,34,0.96) 8%, rgba(16,18,34,0.35) 45%, rgba(16,18,34,0) 70%)",
                  }}
                />
                <Box
                  position="absolute"
                  bottom={0}
                  left={0}
                  right={0}
                  p={3}
                  pointerEvents="none"
                >
                  <Heading as="h2" size="sm" color="white" lineClamp={2} mb={1}>
                    {g.name}
                  </Heading>
                  <Badge colorPalette="yellow" variant="subtle">
                    {g.count} {g.count === 1 ? "piece" : "pieces"}
                    {year ? ` · ${year}` : ""}
                  </Badge>
                </Box>
              </Box>
            </TrackedLink>
          );
        })}
      </SimpleGrid>

      {hasMore ? (
        <Flex justify="center" mt={{ base: 8, md: 10 }}>
          <Button
            onClick={loadMore}
            loading={loading}
            variant="outline"
            borderColor="nexzy.blue/40"
            color="white"
            borderRadius="full"
            px={8}
            _hover={{ bg: "whiteAlpha.100" }}
          >
            Load more games
          </Button>
        </Flex>
      ) : null}
    </>
  );
}
