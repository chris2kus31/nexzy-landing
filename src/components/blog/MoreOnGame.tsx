import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Link,
  HStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import type { PublicPost } from "@/lib/blog/api";
import BlogCard from "./BlogCard";

/**
 * "More on {Game}" — the pillar->cluster internal-link module. Surfaces this
 * post's game siblings across every content type (guides, walkthroughs, news,
 * lists) plus a link into the game hub. Renders nothing when there's no game or
 * no siblings, so it's safe to drop on any detail page.
 */
export default function MoreOnGame({
  game,
  items,
}: {
  game: { name: string; slug: string } | null;
  items: PublicPost[];
}) {
  if (!game || items.length === 0) return null;
  return (
    <Box borderTop="1px solid" borderColor="whiteAlpha.100" py={12}>
      <Container maxW="container.xl">
        <HStack
          justify="space-between"
          align="baseline"
          mb={6}
          flexWrap="wrap"
          gap={2}
        >
          <Heading as="h2" size="lg" color="white">
            More on {game.name}
          </Heading>
          <Link asChild color="nexzy.lightBlue" fontSize="sm" fontWeight="600">
            <NextLink href={`/games/${game.slug}`}>
              All {game.name} guides, walkthroughs &amp; news &rarr;
            </NextLink>
          </Link>
        </HStack>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
          {items.map((p) => (
            <BlogCard key={p.slug} post={p} />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
