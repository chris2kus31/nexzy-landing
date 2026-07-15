import type { Metadata } from "next";
import { Box, Container, Heading, Text, SimpleGrid } from "@chakra-ui/react";
import { fetchWalkthroughs } from "@/lib/blog/api";
import BlogCard from "@/components/blog/BlogCard";
import AppCta from "@/components/blog/AppCta";

export const revalidate = 300;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const metadata: Metadata = {
  title: "Game Walkthroughs — Full Playthroughs, Chapter by Chapter | Nexzy",
  description:
    "Complete game walkthroughs broken into chapters — area-by-area directions, key items, tough fights, and missable content.",
  alternates: { canonical: "/walkthroughs" },
};

export default async function WalkthroughsIndexPage() {
  const { items } = await fetchWalkthroughs({ pageSize: 36 });

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Nexzy Game Walkthroughs",
    description:
      "Full, chaptered game walkthroughs — area by area, with items, fights, and missables.",
    url: `${SITE_URL}/walkthroughs`,
  };

  return (
    <Box>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <Container maxW="container.xl" py={{ base: 10, md: 14 }}>
        <Box maxW="2xl" mb={{ base: 8, md: 10 }}>
          <Text
            color="cyan.300"
            fontSize="sm"
            fontWeight="700"
            letterSpacing="wide"
            textTransform="uppercase"
            mb={2}
          >
            Nexzy Walkthroughs
          </Text>
          <Heading
            as="h1"
            size={{ base: "2xl", md: "4xl" }}
            color="white"
            mb={3}
            lineHeight="1.1"
          >
            Full walkthroughs, chapter by chapter.
          </Heading>
          <Text color="gray.300" fontSize={{ base: "md", md: "lg" }}>
            Complete playthroughs broken into chapters — where to go, what to
            grab, which fights to prep for, and what you can miss. Plus the
            Nexzy AI in your pocket for anything we haven&apos;t covered yet.
          </Text>
        </Box>

        {items.length === 0 ? (
          <Box
            border="1px dashed"
            borderColor="whiteAlpha.300"
            borderRadius="xl"
            p={10}
            textAlign="center"
          >
            <Text color="gray.300" mb={4}>
              Walkthroughs are on the way. In the meantime, the Nexzy app can
              walk you through any game right now.
            </Text>
            <AppCta variant="inline" location="walkthroughs" />
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6}>
            {items.map((p) => (
              <BlogCard key={p.slug} post={p} />
            ))}
          </SimpleGrid>
        )}
      </Container>
    </Box>
  );
}
