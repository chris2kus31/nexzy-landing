// ============================================
// FILE: components/landing/CrawlHighway.tsx
// "Explore Nexzy" — a compact, server-rendered internal-link block near the
// bottom of the home page. SEO purpose: the homepage is the site's most-crawled
// (currently ONLY-indexed) page, so it must fan crawl equity out to the game
// hubs and content sections. Plain crawlable <a> links, no client JS.
// Adaptive: renders nothing if there are no games to show.
// ============================================
import NextLink from "next/link";
import { Box, Container, Flex, Heading, Text, HStack } from "@chakra-ui/react";
import type { GameWithContent } from "@/lib/blog/api";

const HUBS: { label: string; href: string }[] = [
  { label: "Gaming News", href: "/blog" },
  { label: "Guides", href: "/guides" },
  { label: "Walkthroughs", href: "/walkthroughs" },
  { label: "Lists", href: "/lists" },
  { label: "Reviews", href: "/reviews" },
  { label: "Rewind", href: "/rewind" },
  { label: "Videos", href: "/videos" },
  { label: "All Games", href: "/games" },
];

export default function CrawlHighway({ games }: { games: GameWithContent[] }) {
  if (!games.length) return null;
  return (
    <Box as="section" pb={{ base: 12, md: 16 }} bg="nexzy.navy">
      <Container maxW="container.xl" px={{ base: 5, md: 6 }}>
        <Flex
          justify="space-between"
          align="flex-end"
          gap={5}
          mb={5}
          wrap="wrap"
        >
          <Box>
            <HStack gap={2.5} mb={2}>
              <Box w="22px" h="2px" bg="nexzy.blue" borderRadius="full" />
              <Text
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="nexzy.blue"
              >
                Explore Nexzy
              </Text>
            </HStack>
            <Heading as="h2" size={{ base: "lg", md: "xl" }} color="white">
              Coverage by game
            </Heading>
          </Box>
        </Flex>

        {/* Game hubs — the deepest under-crawled section of the site */}
        <Flex wrap="wrap" gap={2} mb={6}>
          {games.map((g) => (
            <NextLink key={g.slug} href={`/games/${g.slug}`}>
              <Text
                px={3}
                py={1.5}
                borderRadius="full"
                border="1px solid"
                borderColor="whiteAlpha.200"
                color="gray.300"
                fontSize="sm"
                fontWeight="600"
                _hover={{ color: "nexzy.lightBlue", borderColor: "nexzy.blue" }}
                transition="all 0.2s"
              >
                {g.name}
              </Text>
            </NextLink>
          ))}
        </Flex>

        {/* Section hubs */}
        <Flex wrap="wrap" gap={4} rowGap={2}>
          {HUBS.map((h) => (
            <NextLink key={h.href} href={h.href}>
              <Text
                color="nexzy.lightBlue"
                fontSize="sm"
                fontWeight="700"
                _hover={{ textDecoration: "underline" }}
              >
                {h.label} →
              </Text>
            </NextLink>
          ))}
        </Flex>
      </Container>
    </Box>
  );
}
