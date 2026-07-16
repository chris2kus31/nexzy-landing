import type { Metadata } from "next";
import NextLink from "next/link";
import NextImage from "next/image";
import {
  Box,
  Container,
  Heading,
  Text,
  Badge,
  SimpleGrid,
} from "@chakra-ui/react";
import { fetchGamesWithContent } from "@/lib/blog/api";

export const revalidate = 300;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const metadata: Metadata = {
  title: "Game Hubs — Guides, Walkthroughs & News by Game | Nexzy",
  description:
    "Browse every game Nexzy covers — each with its guides, walkthroughs, lists and news gathered in one place.",
  alternates: { canonical: "/games" },
};

export default async function GamesIndexPage() {
  const games = await fetchGamesWithContent();

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Game Hubs",
    url: `${SITE_URL}/games`,
    isPartOf: { "@type": "WebSite", name: "Nexzy", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: games.length,
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
          size={{ base: "2xl", md: "4xl" }}
          color="white"
          mb={3}
          lineHeight="1.1"
        >
          Game Hubs
        </Heading>
        <Text
          color="gray.400"
          fontSize={{ base: "md", md: "lg" }}
          mb={{ base: 8, md: 12 }}
          maxW="2xl"
        >
          Every game we cover — with its guides, walkthroughs, lists and news
          gathered in one place.
        </Text>

        {games.length === 0 ? (
          <Text color="gray.500">No game hubs yet — check back soon.</Text>
        ) : (
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={5}>
            {games.map((g) => {
              const year = g.released
                ? new Date(g.released).getFullYear()
                : null;
              return (
                <NextLink
                  key={g.slug}
                  href={`/games/${g.slug}`}
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
                        sizes="(max-width: 768px) 50vw, 240px"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <Box position="absolute" inset={0} bg="whiteAlpha.100" />
                    )}
                    {/* gradient + title overlay */}
                    <Box
                      position="absolute"
                      inset={0}
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
                    >
                      <Heading
                        as="h2"
                        size="sm"
                        color="white"
                        lineClamp={2}
                        mb={1}
                      >
                        {g.name}
                      </Heading>
                      <Badge colorPalette="yellow" variant="subtle">
                        {g.count} {g.count === 1 ? "piece" : "pieces"}
                        {year ? ` · ${year}` : ""}
                      </Badge>
                    </Box>
                  </Box>
                </NextLink>
              );
            })}
          </SimpleGrid>
        )}
      </Container>
    </Box>
  );
}
