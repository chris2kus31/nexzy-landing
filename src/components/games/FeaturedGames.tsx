// ============================================
// FILE: components/games/FeaturedGames.tsx
// The "Featured" row at the top of /games: up to 4 games picked in
// Admin -> Featured on web (else the newest live mega hubs). A game with a
// live mega hub shows its guide stats and opens straight to the guide;
// any other game opens its hub page. Server component, no client JS.
// ============================================
import NextLink from "next/link";
import { Badge, Box, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import { hubParts } from "@/lib/hub-engine/types";
import type { WebFeaturedCard } from "@/lib/blog/api";

export default function FeaturedGames({ items }: { items: WebFeaturedCard[] }) {
  if (!items.length) return null;
  return (
    <Box
      as="section"
      mb={{ base: 10, md: 14 }}
      aria-labelledby="featured-games"
    >
      <Heading
        id="featured-games"
        as="h2"
        fontSize={{ base: "lg", md: "xl" }}
        color="white"
        mb={4}
      >
        Featured
      </Heading>
      <SimpleGrid
        columns={{ base: 1, sm: 2, lg: Math.min(items.length, 4) }}
        gap={5}
      >
        {items.map((g) => {
          const parts = g.hub ? hubParts(g.hub, 3) : [];
          const href = g.hub ? `/games/${g.slug}#guide` : `/games/${g.slug}`;
          return (
            <NextLink
              key={g.slug}
              href={href}
              style={{ display: "block", height: "100%" }}
            >
              <Box
                bg="whiteAlpha.50"
                border="2px solid"
                borderColor={g.hub ? "nexzy.gold" : "whiteAlpha.200"}
                borderRadius="xl"
                overflow="hidden"
                transition="all 0.2s"
                _hover={{ transform: "translateY(-4px)", shadow: "lg" }}
                h="full"
                display="flex"
                flexDirection="column"
              >
                <Box
                  position="relative"
                  overflow="hidden"
                  w="full"
                  aspectRatio={16 / 9}
                >
                  {g.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.image}
                      alt={g.name}
                      loading="lazy"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <Box position="absolute" inset={0} bg="nexzy.blue/10" />
                  )}
                  {g.hub && (
                    <Badge
                      position="absolute"
                      top={3}
                      left={3}
                      bg="nexzy.gold"
                      color="nexzy.navy"
                      fontWeight="800"
                      size="sm"
                    >
                      Mega hub
                    </Badge>
                  )}
                </Box>
                <Box
                  p={4}
                  flex={1}
                  display="flex"
                  flexDirection="column"
                  gap={2}
                >
                  <Heading as="h3" size="md" color="white" lineClamp={2}>
                    {g.name}
                  </Heading>
                  {parts.length > 0 && (
                    <Text color="gray.300" fontSize="sm" lineClamp={2}>
                      {parts.join(" · ")}
                    </Text>
                  )}
                  <Text
                    color={g.hub ? "nexzy.gold" : "nexzy.lightBlue"}
                    fontWeight="800"
                    fontSize="sm"
                    mt="auto"
                  >
                    {g.hub ? "Open the guide →" : "News, guides and more →"}
                  </Text>
                </Box>
              </Box>
            </NextLink>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}
