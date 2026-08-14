import NextLink from "next/link";
import NextImage from "next/image";
import { Box, Flex, Heading, Text, HStack, Badge } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";

/**
 * "Make it yours" game card — the article's linked game with a deep link to
 * /games/{slug}. That URL opens the game inside the Nexzy app for installed
 * users (Universal / App Link) and the web game hub for everyone else. This is
 * the per-article flywheel: read the story, then track the game / ask Nexzy /
 * watch deals. Rendered on every game-linked article (all beats) in place of the
 * generic app CTA, so the funnel is about the game you just read about.
 */
export default function GameActionCard({
  game,
}: {
  game: NonNullable<PublicPost["game"]>;
}) {
  const year = game.released ? new Date(game.released).getFullYear() : null;

  return (
    <NextLink href={`/games/${game.slug}`} style={{ display: "block" }}>
      <Box
        borderWidth="1px"
        borderColor="rgba(77,163,255,0.3)"
        borderRadius="2xl"
        overflow="hidden"
        bg="linear-gradient(135deg, rgba(0,123,255,0.10), rgba(0,123,255,0.02))"
        transition="all 0.2s"
        _hover={{ borderColor: "nexzy.lightBlue" }}
      >
        <Flex direction={{ base: "column", sm: "row" }} align="stretch">
          {game.backgroundImage && (
            <Box
              position="relative"
              w={{ base: "full", sm: "150px" }}
              minH={{ base: "140px", sm: "auto" }}
              flexShrink={0}
            >
              <NextImage
                src={game.backgroundImage}
                alt={game.name}
                fill
                sizes="(max-width: 640px) 100vw, 150px"
                style={{ objectFit: "cover" }}
              />
            </Box>
          )}
          <Box p={5} flex="1">
            <Text
              fontFamily="heading"
              fontSize="xs"
              letterSpacing="wider"
              textTransform="uppercase"
              color="nexzy.lightBlue"
              fontWeight="700"
              mb={1}
            >
              Make it yours
            </Text>
            <Heading as="h2" size="md" color="white" mb={2}>
              {game.name}
            </Heading>
            <HStack gap={2} wrap="wrap" mb={3}>
              {year && (
                <Badge colorPalette="blue" variant="subtle">
                  {year}
                </Badge>
              )}
              {(game.genres ?? []).slice(0, 2).map((g) => (
                <Badge key={g} colorPalette="purple" variant="subtle">
                  {g}
                </Badge>
              ))}
            </HStack>
            <Text fontSize="sm" color="white" fontWeight="600">
              Add {game.name} to your library →
            </Text>
            <Text fontSize="xs" color="gray.400" mt={1}>
              Track it, watch for deals, and ask Nexzy for help — in the app.
            </Text>
          </Box>
        </Flex>
      </Box>
    </NextLink>
  );
}
