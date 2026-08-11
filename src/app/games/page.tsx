import type { Metadata } from "next";
import { Box, Container, Heading, Text } from "@chakra-ui/react";
import { fetchGamesPage } from "@/lib/blog/api";
import GamesGrid from "@/components/games/GamesGrid";

export const revalidate = 300;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const metadata: Metadata = {
  title: "Game Guides, Walkthroughs & News",
  description:
    "Nexzy's guides, walkthroughs, lists and news, organized by game — everything we've covered so far, in one place.",
  alternates: { canonical: "/games" },
};

const PAGE_SIZE = 60;

export default async function GamesIndexPage() {
  const { items: games, total } = await fetchGamesPage(1, PAGE_SIZE);

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Game Hubs",
    url: `${SITE_URL}/games`,
    isPartOf: { "@type": "WebSite", name: "Nexzy", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: games.slice(0, 100).map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/games/${g.slug}`,
        name: g.name,
      })),
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Games",
        item: `${SITE_URL}/games`,
      },
    ],
  };

  return (
    <Box position="relative" overflow="hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Ambient brand glow */}
      <Box
        position="absolute"
        top="-25%"
        right="-10%"
        w="45%"
        h="90%"
        borderRadius="full"
        bg="nexzy.blue"
        opacity={0.08}
        filter="blur(120px)"
      />
      <Box
        position="absolute"
        top="10%"
        left="-12%"
        w="40%"
        h="80%"
        borderRadius="full"
        bg="nexzy.yellow"
        opacity={0.05}
        filter="blur(120px)"
      />

      <Container maxW="6xl" position="relative" py={{ base: 10, md: 16 }}>
        <Heading
          as="h1"
          fontFamily="title"
          size={{ base: "2xl", md: "4xl" }}
          color="white"
          mb={3}
          lineHeight="1.1"
        >
          Everything we&apos;ve covered, by game
        </Heading>
        <Text
          color="gray.400"
          fontSize={{ base: "md", md: "lg" }}
          mb={{ base: 8, md: 12 }}
          maxW="2xl"
        >
          Our guides, walkthroughs, lists and news for each game — gathered in
          one place, and growing every week.
        </Text>

        <GamesGrid initialItems={games} total={total} pageSize={PAGE_SIZE} />
      </Container>
    </Box>
  );
}
