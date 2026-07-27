import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  Badge,
  Link,
  Icon,
} from "@chakra-ui/react";
import { HiArrowRight } from "react-icons/hi";
import { fetchVideo, fetchVideos } from "@/lib/blog/api";
import { slugifyTag } from "@/lib/blog/tags";
import { youtubeEmbedUrl } from "@/lib/blog/youtube";
import AppCta from "@/components/blog/AppCta";
import ShareRow from "@/components/blog/ShareRow";
import VideoPlayer from "@/components/blog/VideoPlayer";
import VideoTile from "@/components/blog/VideoTile";
import PlatformLinks from "@/components/blog/PlatformLinks";
import VideoViewPing from "@/components/blog/VideoViewPing";
import ArticleAnalytics from "@/components/blog/ArticleAnalytics";

// ISR: video pages are cached and rebuilt in the background (fast + crawlable).
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const video = await fetchVideo(slug);
  if (!video) return { title: "Video not found — Nexzy" };

  const title = video.title;
  const description = video.caption || `Watch "${video.title}" on Nexzy.`;
  const image = video.thumbnailUrl || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/videos/${video.slug}` },
    openGraph: {
      title,
      description,
      type: "video.other",
      images: image ? [{ url: image, alt: video.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [{ url: image, alt: video.title }] : undefined,
    },
  };
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const video = await fetchVideo(slug);
  if (!video) notFound();

  const shareUrl = `${SITE_URL}/videos/${video.slug}`;
  const videoEmbed = youtubeEmbedUrl(video.youtubeUrl);
  const topics = (video.tags || [])
    .map((t) => ({ label: t, slug: slugifyTag(t) }))
    .filter((t) => t.slug);

  // "More videos" rail — newest, excluding this one.
  const more = (await fetchVideos({ page: 1, pageSize: 7 })).items
    .filter((v) => v.slug !== video.slug)
    .slice(0, 6);

  const videoPublisher = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Nexzy",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/android-chrome-512x512.png`,
      width: 512,
      height: 512,
    },
  };

  // VideoObject only when there's a real embeddable YouTube video (thin-schema
  // guard). No duration column yet — omit it rather than fabricate.
  const videoLd = video.youtubeId
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: video.title,
        description: video.caption || video.title,
        thumbnailUrl: video.thumbnailUrl ? [video.thumbnailUrl] : undefined,
        uploadDate: video.publishedAt || undefined,
        contentUrl: video.youtubeUrl || undefined,
        embedUrl: videoEmbed || undefined,
        publisher: videoPublisher,
        mainEntityOfPage: { "@type": "WebPage", "@id": shareUrl },
        ...(video.tags && video.tags.length
          ? { keywords: video.tags.join(", ") }
          : {}),
        ...(video.viewCount
          ? {
              interactionStatistic: {
                "@type": "InteractionCounter",
                interactionType: { "@type": "WatchAction" },
                userInteractionCount: video.viewCount,
              },
            }
          : {}),
      }
    : null;

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
      { "@type": "ListItem", position: 3, name: video.title, item: shareUrl },
    ],
  };

  return (
    <Box>
      <Container maxW="3xl" py={{ base: 8, md: 12 }}>
        {/* Visible breadcrumb (matches BreadcrumbList JSON-LD) */}
        <HStack gap={2} mb={6} fontSize="sm" color="gray.400" flexWrap="wrap">
          <Link asChild color="nexzy.lightBlue">
            <NextLink href="/videos">Videos</NextLink>
          </Link>
          <Text>/</Text>
          <Text color="gray.500" lineClamp={1}>
            {video.title}
          </Text>
        </HStack>

        {/* Meta row */}
        <HStack gap={3} mb={4} flexWrap="wrap">
          <Badge
            colorPalette={video.source === "nexzy" ? "blue" : "gray"}
            variant="solid"
            size="sm"
          >
            {video.source === "nexzy" ? "Nexzy" : "Featured"}
          </Badge>
          <Badge
            colorPalette={video.isShort ? "pink" : "gray"}
            variant="subtle"
            size="sm"
          >
            {video.isShort ? "Short" : "Video"}
          </Badge>
          <Box ml="auto">
            <ShareRow url={shareUrl} title={video.title} />
          </Box>
        </HStack>

        <Heading
          as="h1"
          fontFamily="title"
          size={{ base: "2xl", md: "4xl" }}
          color="white"
          mb={video.caption ? 2 : 6}
          lineHeight="1.15"
        >
          {video.title}
        </Heading>
        {video.caption && (
          <Text color="gray.300" fontSize="lg" mb={6} lineHeight="1.6">
            {video.caption}
          </Text>
        )}

        {/* Inline player — 9:16 for a Short, 16:9 otherwise. YouTube plays
            inline (with engagement analytics); other platforms are "also on"
            links below. */}
        {video.youtubeId && (
          <Box
            mx={video.isShort ? "auto" : undefined}
            w={video.isShort ? { base: "full", sm: "340px" } : "full"}
            mb={6}
          >
            <VideoPlayer
              videoId={video.youtubeId}
              slug={video.slug}
              source={video.source}
              isShort={video.isShort}
              gameSlug={video.game?.slug ?? null}
              from="video_detail"
            />
          </Box>
        )}

        {/* Also on other platforms (open-out) */}
        {video.platformLinks && Object.keys(video.platformLinks).length > 0 && (
          <Box mb={8}>
            <Text color="gray.400" fontSize="sm" fontWeight="600" mb={2}>
              Also watch on
            </Text>
            <PlatformLinks links={video.platformLinks} slug={video.slug} />
          </Box>
        )}

        {/* Up-link to the game hub */}
        {video.game && (
          <Box
            borderWidth="1px"
            borderColor="gray.700"
            borderRadius="xl"
            bg="whiteAlpha.50"
            p={4}
            mb={8}
            transition="all 0.2s"
            _hover={{ borderColor: "nexzy.blue/60", bg: "whiteAlpha.100" }}
          >
            <Link asChild _hover={{ textDecoration: "none" }}>
              <NextLink href={`/games/${video.game.slug}`}>
                <Text
                  fontSize="xs"
                  color="gray.500"
                  textTransform="uppercase"
                  letterSpacing="wide"
                  mb={1}
                >
                  This video covers
                </Text>
                <Heading as="h2" size="md" color="gray.100" mb={1}>
                  {video.game.name}
                </Heading>
                <HStack
                  gap={1}
                  color="nexzy.lightBlue"
                  fontWeight="600"
                  fontSize="sm"
                >
                  <Text>All {video.game.name} videos, guides &amp; news</Text>
                  <Icon>
                    <HiArrowRight />
                  </Icon>
                </HStack>
              </NextLink>
            </Link>
          </Box>
        )}

        {topics.length > 0 && (
          <Box mb={10}>
            <Heading as="h2" size="sm" color="gray.300" mb={3}>
              Topics
            </Heading>
            <HStack gap={2} flexWrap="wrap">
              {topics.map((t) => (
                <Link
                  key={t.slug}
                  asChild
                  px={3}
                  py={1}
                  borderRadius="full"
                  border="1px solid"
                  borderColor="whiteAlpha.300"
                  color="gray.200"
                  fontSize="sm"
                  fontWeight="600"
                  _hover={{
                    bg: "whiteAlpha.100",
                    color: "white",
                    borderColor: "nexzy.lightBlue",
                    textDecoration: "none",
                  }}
                >
                  <NextLink href={`/blog/topic/${t.slug}`}>#{t.label}</NextLink>
                </Link>
              ))}
            </HStack>
          </Box>
        )}

        <Box mt={4}>
          <AppCta variant="inline" location="videos" />
        </Box>

        <HStack
          justify="space-between"
          mt={10}
          pt={6}
          borderTop="1px solid"
          borderColor="whiteAlpha.200"
        >
          <Text color="gray.500" fontSize="xs">
            Nexzy
          </Text>
          <ShareRow url={shareUrl} title={video.title} />
        </HStack>
      </Container>

      {more.length > 0 && (
        <Box borderTop="1px solid" borderColor="whiteAlpha.100" py={12}>
          <Container maxW="container.xl">
            <HStack justify="space-between" mb={6} align="flex-end">
              <Heading as="h2" size="lg" color="white">
                More videos
              </Heading>
              <Link
                asChild
                color="nexzy.lightBlue"
                fontWeight="700"
                fontSize="sm"
              >
                <NextLink href="/videos">Browse all →</NextLink>
              </Link>
            </HStack>
            <HStack
              gap={{ base: 4, md: 5 }}
              overflowX="auto"
              align="stretch"
              pb={3}
              css={{
                scrollSnapType: "x mandatory",
                scrollbarWidth: "thin",
                "&::-webkit-scrollbar": { height: "6px" },
                "&::-webkit-scrollbar-thumb": {
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "999px",
                },
              }}
            >
              {more.map((v) => (
                <Box
                  key={v.slug}
                  minW={{ base: "150px", md: "180px" }}
                  w={{ base: "150px", md: "180px" }}
                  css={{ scrollSnapAlign: "start" }}
                >
                  <VideoTile video={v} from="video_detail_more" />
                </Box>
              ))}
            </HStack>
          </Container>
        </Box>
      )}

      <VideoViewPing slug={video.slug} />
      <ArticleAnalytics slug={video.slug} type="video" />

      {videoLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </Box>
  );
}
