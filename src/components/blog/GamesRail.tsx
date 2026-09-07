import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import NextLink from "next/link";

export interface RailGame {
  id: string;
  name: string;
  slug: string;
  backgroundImage: string | null;
  released?: string | null;
}

/**
 * "Games in this story" — a horizontal scroll-snap rail of real game cards
 * (cover art + name + release date) for multi-game articles like the weekly
 * releases roundup. Replaces the old static grid, which turned 15+ games into
 * a wall of dim text tiles. Server-renderable (pure CSS scrolling, no JS), so
 * every card stays a crawlable link to its game hub.
 */
export default function GamesRail({
  games,
  title = "Games in this story",
}: {
  games: RailGame[];
  title?: string;
}) {
  if (!games || games.length < 2) return null;
  const fmtDate = (d?: string | null): string | null => {
    if (!d) return null;
    const t = new Date(`${d}T00:00:00`);
    if (Number.isNaN(t.getTime())) return null;
    return t.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  return (
    <Box mt={8}>
      <Flex align="baseline" justify="space-between" mb={3}>
        <Heading as="h2" size="sm" color="white">
          {title}
        </Heading>
        <Text color="gray.500" fontSize="xs">
          {games.length} games · swipe →
        </Text>
      </Flex>
      <Flex
        gap={3}
        overflowX="auto"
        pb={2}
        css={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          "&::-webkit-scrollbar": { height: "6px" },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.15)",
            borderRadius: "3px",
          },
        }}
      >
        {games.map((g) => (
          <NextLink
            key={g.id}
            href={`/games/${g.slug}`}
            style={{
              textDecoration: "none",
              flexShrink: 0,
              scrollSnapAlign: "start",
            }}
          >
            <Box
              w="168px"
              borderRadius="xl"
              overflow="hidden"
              border="1px solid"
              borderColor="whiteAlpha.200"
              bg="whiteAlpha.50"
              _hover={{
                borderColor: "nexzy.blue",
                transform: "translateY(-2px)",
              }}
              transition="all 0.15s"
            >
              <Box h="94px" position="relative" bg="whiteAlpha.100">
                {g.backgroundImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.backgroundImage}
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
                )}
                <Box
                  position="absolute"
                  inset={0}
                  bg="linear-gradient(to top, rgba(10,14,30,0.75), transparent 55%)"
                />
              </Box>
              <Box p={2.5}>
                <Text
                  color="white"
                  fontWeight="600"
                  fontSize="sm"
                  lineClamp={2}
                  minH="40px"
                >
                  {g.name}
                </Text>
                <Text color="nexzy.lightBlue" fontSize="xs" mt={1}>
                  {fmtDate(g.released) ?? "View game →"}
                </Text>
              </Box>
            </Box>
          </NextLink>
        ))}
      </Flex>
    </Box>
  );
}
