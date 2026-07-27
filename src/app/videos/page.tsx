import type { Metadata } from "next";
import NextLink from "next/link";
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  HStack,
  Button,
  Icon,
  Separator,
} from "@chakra-ui/react";
import { HiArrowLeft, HiArrowRight } from "react-icons/hi";
import { fetchVideos } from "@/lib/blog/api";
import VideoTile from "@/components/blog/VideoTile";
import FeaturedVideo from "@/components/blog/FeaturedVideo";
import AppCta from "@/components/blog/AppCta";

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const PAGE_SIZE = 24;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);
  return {
    title: "Gaming Videos & Shorts",
    description:
      "Nexzy gaming videos and Shorts — quick clips, boss moments, tips, and highlights for the games you play. New drops every week, from YouTube, TikTok & Reels.",
    alternates: { canonical: page > 1 ? `/videos?page=${page}` : "/videos" },
  };
}

export default async function VideosIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);
  const { items, total } = await fetchVideos({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Spotlight the featured video (or newest) on page 1; the rest fill the grid.
  const hero =
    page === 1 ? (items.find((v) => v.featured) ?? items[0] ?? null) : null;
  const gridItems = hero ? items.filter((v) => v.slug !== hero.slug) : items;

  // CollectionPage always; wrap an ItemList only with >=2 real items (thin-
  // schema guard) so we never ship an empty ItemList.
  const collectionLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Nexzy Gaming Videos",
    description:
      "Nexzy gaming videos and Shorts for the games you play — clips, boss moments, tips, and highlights.",
    url: `${SITE_URL}/videos`,
  };
  if (items.length >= 2) {
    collectionLd.mainEntity = {
      "@type": "ItemList",
      itemListElement: items.map((v, i) => ({
        "@type": "ListItem",
        position: (page - 1) * PAGE_SIZE + i + 1,
        url: `${SITE_URL}/videos/${v.slug}`,
        name: v.title,
      })),
    };
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Videos",
        item: `${SITE_URL}/videos`,
      },
    ],
  };

  return (
    <Box>
      <Container maxW="container.xl" py={{ base: 10, md: 14 }}>
        <Box maxW="2xl" mb={{ base: 8, md: 10 }}>
          <Text
            color="pink.300"
            fontSize="sm"
            fontWeight="700"
            letterSpacing="wide"
            textTransform="uppercase"
            mb={2}
          >
            Nexzy Videos
          </Text>
          <Heading
            as="h1"
            fontFamily="title"
            size={{ base: "2xl", md: "4xl" }}
            color="white"
            mb={3}
            lineHeight="1.1"
          >
            Videos &amp; Shorts.
          </Heading>
          <Text color="gray.300" fontSize={{ base: "md", md: "lg" }}>
            Quick clips, boss moments, and tips for the games you play — made by
            Nexzy, on YouTube, TikTok &amp; Reels. Watch here, and get the app
            to track the games in every one.
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
              Videos are on the way. In the meantime, the Nexzy app can walk you
              through any game or boss right now.
            </Text>
            <AppCta variant="inline" location="videos" />
          </Box>
        ) : (
          <>
            {hero && (
              <Box mb={{ base: 10, md: 14 }}>
                <FeaturedVideo video={hero} play />
              </Box>
            )}

            {gridItems.length > 0 && (
              <>
                {hero && (
                  <HStack mb={5} gap={3}>
                    <Text
                      color="gray.400"
                      fontSize="xs"
                      fontWeight="800"
                      letterSpacing="0.14em"
                      textTransform="uppercase"
                    >
                      {page > 1 ? "More videos" : "Latest drops"}
                    </Text>
                    <Separator flex="1" borderColor="whiteAlpha.200" />
                  </HStack>
                )}
                <SimpleGrid
                  columns={{ base: 2, sm: 3, md: 4, lg: 5 }}
                  gap={{ base: 4, md: 6 }}
                >
                  {gridItems.map((v) => (
                    <VideoTile key={v.slug} video={v} />
                  ))}
                </SimpleGrid>
              </>
            )}

            {totalPages > 1 && (
              <HStack justify="center" gap={3} mt={12}>
                <Button
                  asChild={page > 1}
                  disabled={page <= 1}
                  size="sm"
                  variant="outline"
                  color="white"
                  borderColor="whiteAlpha.300"
                  _hover={{ bg: "whiteAlpha.100" }}
                >
                  {page > 1 ? (
                    <NextLink href={`/videos?page=${page - 1}`}>
                      <Icon mr={1}>
                        <HiArrowLeft />
                      </Icon>
                      Previous
                    </NextLink>
                  ) : (
                    <span>
                      <Icon mr={1}>
                        <HiArrowLeft />
                      </Icon>
                      Previous
                    </span>
                  )}
                </Button>
                <Text color="gray.400" fontSize="sm">
                  Page {page} of {totalPages}
                </Text>
                <Button
                  asChild={page < totalPages}
                  disabled={page >= totalPages}
                  size="sm"
                  variant="outline"
                  color="white"
                  borderColor="whiteAlpha.300"
                  _hover={{ bg: "whiteAlpha.100" }}
                >
                  {page < totalPages ? (
                    <NextLink href={`/videos?page=${page + 1}`}>
                      Next
                      <Icon ml={1}>
                        <HiArrowRight />
                      </Icon>
                    </NextLink>
                  ) : (
                    <span>
                      Next
                      <Icon ml={1}>
                        <HiArrowRight />
                      </Icon>
                    </span>
                  )}
                </Button>
              </HStack>
            )}

            <Box mt={14}>
              <AppCta variant="inline" location="videos" />
            </Box>
          </>
        )}
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </Box>
  );
}
