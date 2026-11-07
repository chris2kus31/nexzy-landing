// ============================================
// FILE: components/landing/HomeLibrary.tsx
// Home "From the library" rail — folds the newest guides, walkthroughs and
// lists into ONE row while each type is still small. Renders nothing if the
// library is empty, and fills out on its own as more is published.
// ============================================
import NextLink from "next/link";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  HStack,
  SimpleGrid,
} from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";
import BlogCard from "@/components/blog/BlogCard";
import HubLiveCardTile from "@/components/landing/HubLiveCardTile";
import type { HubLiveCard } from "@/lib/hub-engine/types";

export default function HomeLibrary({
  items,
  hubs = [],
}: {
  items: PublicPost[];
  /** Live mega hubs lead the rail (newest first). */
  hubs?: HubLiveCard[];
}) {
  if (!items.length && !hubs.length) return null;
  // Hubs first, then the newest posts, keeping full rows of three.
  const lead = hubs.slice(0, 3);
  const posts = items.slice(0, Math.max(0, items.length - lead.length));
  return (
    <Box
      as="section"
      pt={{ base: 6, md: 8 }}
      pb={{ base: 16, md: 24 }}
      bg="nexzy.navy"
    >
      <Container maxW="container.xl" px={{ base: 5, md: 6 }}>
        <Flex
          justify="space-between"
          align="flex-end"
          gap={5}
          mb={8}
          wrap="wrap"
        >
          <Box>
            <HStack gap={2.5} mb={3}>
              <Box w="22px" h="2px" bg="nexzy.blue" borderRadius="full" />
              <Text
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="nexzy.blue"
              >
                From the newsroom
              </Text>
            </HStack>
            <Heading as="h2" size={{ base: "xl", md: "2xl" }} color="white">
              Guides, walkthroughs &amp;{" "}
              <Text as="span" color="nexzy.gold">
                lists
              </Text>
            </Heading>
            <HStack
              gap={2}
              mt={3}
              px={3}
              py={1.5}
              w="fit-content"
              borderRadius="full"
              bg="nexzy.gold/10"
              border="1px solid"
              borderColor="nexzy.gold/30"
            >
              <Text color="nexzy.gold" fontSize="sm" fontWeight="700">
                ✦ Fresh guides, walkthroughs &amp; lists every week
              </Text>
            </HStack>
          </Box>
          <NextLink href="/guides">
            <Text color="nexzy.lightBlue" fontWeight="700" fontSize="sm">
              Browse all guides →
            </Text>
          </NextLink>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
          {lead.map((h) => (
            <HubLiveCardTile key={`hub-${h.slug}`} hub={h} />
          ))}
          {posts.map((p) => (
            <BlogCard key={`${p.type}-${p.slug}`} post={p} />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
