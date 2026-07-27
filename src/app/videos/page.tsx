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
} from "@chakra-ui/react";
import { HiArrowLeft, HiArrowRight } from "react-icons/hi";
import { fetchVideos } from "@/lib/blog/api";
import VideoTile from "@/components/blog/VideoTile";
import VideoShelf from "@/components/blog/VideoShelf";
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
      "Nexzy gaming videos and Shorts — trending clips, boss moments, tips, and highlights for the games you play. New drops every week, from YouTube, TikTok & Reels.",
    alternates: { canonical: page > 1 ? `/videos?page=${page}` : "/videos" },
  };
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <Box mb={5}>
      <HStack gap={2.5} mb={2}>
        <Box w="20px" h="2px" bg="pink.400" borderRadius="full" />
        <Text
          fontSize="xs"
          fontWeight="800"
          letterSpacing="0.14em"
          textTransform="uppercase"
          color="pink.300"
        >
          {eyebrow}
        </Text>
      </HStack>
      <Heading as="h2" size={{ base: "lg", md: "xl" }} color="white">
        {title}
      </Heading>
    </Box>
  );
}

export default async function VideosIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);

  const [latest, trending] = await Promise.all([
    fetchVideos({ page, pageSize: PAGE_SIZE, sort: "latest" }),
    page === 1
      ? fetchVideos({ pageSize: 12, sort: "trending" })
      : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 12 }),
  ]);
  const { items, total } = latest;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Featured hero (or newest) on page 1; keep it out of the rows below.
  const hero =
    page === 1 ? (items.find((v) => v.featured) ?? items[0] ?? null) : null;
  const heroSlug = hero?.slug;
  const trendingItems = trending.items
    .filter((v) => v.slug !== heroSlug)
    .slice(0, 10);
  const showTrending = page === 1 && trendingItems.length >= 4;
  const latestItems = items.filter((v) => v.slug !== heroSlug);

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
              <Box mb={{ base: 12, md: 16 }}>
                <FeaturedVideo video={hero} play />
              </Box>
            )}

            {showTrending && (
              <Box mb={{ base: 12, md: 16 }}>
                <SectionHeading eyebrow="Most watched" title="Trending" />
                <VideoShelf items={trendingItems} from="videos_trending" />
              </Box>
            )}

            {latestItems.length > 0 && (
              <Box>
                <SectionHeading
                  eyebrow={page > 1 ? `Page ${page}` : "Fresh drops"}
                  title="Latest"
                />
                <SimpleGrid
                  columns={{ base: 2, sm: 3, md: 4, lg: 5 }}
                  gap={{ base: 4, md: 6 }}
                >
                  {latestItems.map((v) => (
                    <VideoTile key={v.slug} video={v} from="videos_latest" />
                  ))}
                </SimpleGrid>
              </Box>
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

            <Box mt={16}>
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
