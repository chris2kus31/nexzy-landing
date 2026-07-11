import NextImage from "next/image";
import { Box, Flex, Heading, Text, HStack, Badge } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";

/**
 * "This guide covers" panel — the DB game a guide/article is linked to.
 * Cover art + release year + genres + platforms. Rendered on guide pages when
 * the post has a confirmed primary game link.
 */
export default function GameCard({
  game,
}: {
  game: NonNullable<PublicPost["game"]>;
}) {
  const year = game.released ? new Date(game.released).getFullYear() : null;

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.700"
      borderRadius="xl"
      overflow="hidden"
      bg="whiteAlpha.50"
      mb={8}
    >
      <Flex direction={{ base: "column", sm: "row" }} align="stretch">
        {game.backgroundImage && (
          <Box
            position="relative"
            w={{ base: "full", sm: "180px" }}
            minH="120px"
            flexShrink={0}
          >
            <NextImage
              src={game.backgroundImage}
              alt={game.name}
              fill
              sizes="(max-width: 640px) 100vw, 180px"
              style={{ objectFit: "cover" }}
            />
          </Box>
        )}
        <Box p={4} flex="1">
          <Text
            fontSize="xs"
            color="gray.500"
            textTransform="uppercase"
            letterSpacing="wide"
            mb={1}
          >
            This guide covers
          </Text>
          <Heading as="h2" size="md" color="gray.100" mb={2}>
            {game.name}
          </Heading>
          <HStack gap={2} wrap="wrap" mb={2}>
            {year && (
              <Badge colorPalette="blue" variant="subtle">
                {year}
              </Badge>
            )}
            {game.genres.slice(0, 2).map((g) => (
              <Badge key={g} colorPalette="purple" variant="subtle">
                {g}
              </Badge>
            ))}
          </HStack>
          {game.platforms.length > 0 && (
            <Text fontSize="sm" color="gray.400">
              {game.platforms.slice(0, 5).join(" · ")}
            </Text>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
