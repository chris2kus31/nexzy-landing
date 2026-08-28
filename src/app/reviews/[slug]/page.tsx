import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import NextImage from "next/image";
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  VStack,
  SimpleGrid,
  Badge,
  Link,
  Icon,
} from "@chakra-ui/react";
import { HiClock } from "react-icons/hi";
import { fetchPost, fetchRelated, fetchRelatedByGame } from "@/lib/blog/api";
import { imageObjectLd } from "@/lib/blog/imageLd";
import { slugifyTag } from "@/lib/blog/tags";
import { youtubeEmbedUrl, isYoutubeShort } from "@/lib/blog/youtube";
import ArticleBody from "@/components/blog/ArticleBody";
import AppCta from "@/components/blog/AppCta";
import Byline from "@/components/blog/Byline";
import { authorJsonLd } from "@/lib/blog/authors";
import ShareRow from "@/components/blog/ShareRow";
import BlogCard from "@/components/blog/BlogCard";
import MoreOnGame from "@/components/blog/MoreOnGame";
import ViewPing from "@/components/blog/ViewPing";
import ArticleAnalytics from "@/components/blog/ArticleAnalytics";
import SourcesBlock from "@/components/blog/SourcesBlock";

// ISR: review pages are cached and rebuilt in the background (fast + crawlable).
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

function readingMinutes(markdown?: string): number {
  if (!markdown) return 1;
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** A 5-star string from a rating on its scale (e.g. 8/10 → "★★★★☆"). */
function starString(rating: number, scale: number): string {
  const filled = Math.max(0, Math.min(5, Math.round((rating / scale) * 5)));
  return "★★★★★".slice(0, filled) + "☆☆☆☆☆".slice(0, 5 - filled);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post || post.type !== "review")
    return { title: "Review not found — Nexzy" };

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/reviews/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      images: post.heroImageUrl
        ? [{ url: post.heroImageUrl, alt: post.imageAlt || post.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.heroImageUrl
        ? [{ url: post.heroImageUrl, alt: post.imageAlt || post.title }]
        : undefined,
    },
  };
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();
  // Only reviews live here; any other type 404s (each has its own home).
  if (post.type !== "review") notFound();

  const related = await fetchRelated(post.slug, 3);
  const byGame = await fetchRelatedByGame(post.slug, 4);
  const byGameSlugs = new Set(byGame.items.map((p) => p.slug));
  const relatedDeduped = related.filter((p) => !byGameSlugs.has(p.slug));
  const topics = (post.tags || [])
    .map((t) => ({ label: t, slug: slugifyTag(t) }))
    .filter((t) => t.slug);

  const shareUrl = `${SITE_URL}/reviews/${post.slug}`;
  const minutes = readingMinutes(post.bodyMarkdown);
  const videoEmbed = youtubeEmbedUrl(post.youtubeUrl);
  const videoIsShort = isYoutubeShort(post.youtubeUrl);
  const imageCredit = post.imageCredit
    ? post.imageCredit
        .replace(/\s*\(.*?\)\s*$/, "")
        .replace(/^(AI-generated|Generated with AI)$/i, "AI illustration")
    : null;

  const reviewUrl = `${SITE_URL}/reviews/${post.slug}`;
  const rv = post.review;
  const hasRating = !!rv && typeof rv.rating === "number";
  const scale = rv?.ratingScale || 10;

  const reviewPublisher = {
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
  // A scored review is a schema.org Review with a reviewRating + itemReviewed
  // (the star rich-result unlock). A review with no rating falls back to a plain
  // Article rather than shipping an empty/fake Rating node.
  const reviewLd =
    hasRating && rv
      ? {
          "@context": "https://schema.org",
          "@type": "Review",
          name: post.title,
          reviewBody: rv.verdictLine || post.excerpt || undefined,
          image: imageObjectLd(post),
          datePublished: post.publishedAt || undefined,
          dateModified: post.updatedAt || post.publishedAt || undefined,
          author: authorJsonLd(post.author, SITE_URL),
          publisher: reviewPublisher,
          mainEntityOfPage: { "@type": "WebPage", "@id": reviewUrl },
          reviewRating: {
            "@type": "Rating",
            ratingValue: rv.rating,
            bestRating: scale,
            worstRating: 1,
          },
          itemReviewed: rv.itemReviewed
            ? {
                "@type": rv.itemReviewed.type || "Movie",
                name: rv.itemReviewed.name,
              }
            : { "@type": "CreativeWork", name: post.title },
        }
      : {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.seoDescription || post.excerpt || undefined,
          image: imageObjectLd(post),
          datePublished: post.publishedAt || undefined,
          dateModified: post.updatedAt || post.publishedAt || undefined,
          author: authorJsonLd(post.author, SITE_URL),
          mainEntityOfPage: { "@type": "WebPage", "@id": reviewUrl },
          publisher: reviewPublisher,
        };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Reviews",
        item: `${SITE_URL}/reviews`,
      },
      { "@type": "ListItem", position: 3, name: post.title, item: reviewUrl },
    ],
  };

  return (
    <Box>
      <Container maxW="3xl" py={{ base: 8, md: 12 }}>
        {/* Visible breadcrumb (matches BreadcrumbList JSON-LD) */}
        <HStack gap={2} mb={6} fontSize="sm" color="gray.400" flexWrap="wrap">
          <Link asChild color="nexzy.lightBlue">
            <NextLink href="/reviews">Reviews</NextLink>
          </Link>
          <Text>/</Text>
          <Text color="gray.500" lineClamp={1}>
            {post.title}
          </Text>
        </HStack>

        {/* Meta row — labeled "Review" so readers + Google never mistake a
            take for reporting. */}
        <HStack gap={4} mb={4} flexWrap="wrap">
          <Badge colorPalette="teal" variant="solid">
            Review
          </Badge>
          <HStack gap={1} color="gray.400" fontSize="sm">
            <Icon>
              <HiClock />
            </Icon>
            <Text>{minutes} min read</Text>
          </HStack>
          <Box ml="auto">
            <ShareRow url={shareUrl} title={post.title} />
          </Box>
        </HStack>

        <Heading
          as="h1"
          fontFamily="title"
          size={{ base: "2xl", md: "4xl" }}
          color="white"
          mb={2}
          lineHeight="1.15"
        >
          {post.title}
        </Heading>
        {post.excerpt && (
          <Text color="gray.300" fontSize="lg" mb={6} lineHeight="1.6">
            {post.excerpt}
          </Text>
        )}

        {/* The verdict capsule — spoiler-free score + one-line verdict, above
            the fold. This is the answer an AI engine / featured snippet lifts. */}
        {hasRating && rv && (
          <Box
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="teal.400/40"
            borderRadius="xl"
            p={4}
            mb={6}
          >
            <HStack
              justify="space-between"
              align="flex-start"
              gap={4}
              mb={3}
              flexWrap="wrap"
            >
              <VStack gap={1} align="flex-start" flex={1} minW="200px">
                <Text
                  color="gray.400"
                  fontSize="xs"
                  fontWeight="700"
                  letterSpacing="wide"
                  textTransform="uppercase"
                >
                  {post.author ? `${post.author}'s verdict` : "The verdict"}
                </Text>
                <Text
                  color="teal.300"
                  fontFamily="title"
                  fontSize={{ base: "2xl", md: "3xl" }}
                  fontWeight="800"
                  lineHeight="1.1"
                >
                  {rv.verdictTier ?? "The Verdict"}
                </Text>
              </VStack>
              <VStack gap={0} align="flex-end" minW="72px">
                <Text color="teal.300" fontSize="lg" letterSpacing="1px">
                  {starString(rv.rating, scale)}
                </Text>
                <Text color="gray.500" fontSize="sm" fontWeight="700">
                  {rv.rating}/{scale}
                </Text>
              </VStack>
            </HStack>
            <Text color="white" fontSize="md" lineHeight="1.5">
              {rv.verdictLine || post.excerpt}
            </Text>
          </Box>
        )}

        <Box mb={8}>
          <Byline
            author={post.author}
            date={post.publishedAt}
            updated={post.updatedAt}
          />
        </Box>

        {post.heroImageUrl && (
          <Box
            position="relative"
            w="full"
            aspectRatio={16 / 9}
            borderRadius="2xl"
            overflow="hidden"
            mb={2}
          >
            <Box position="absolute" inset={0} className="nexzy-img-skeleton" />
            <NextImage
              src={post.heroImageUrl}
              alt={post.imageAlt || post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              style={{ objectFit: "cover" }}
            />
          </Box>
        )}
        {imageCredit && (
          <Text
            color="gray.600"
            fontSize="11px"
            fontStyle="italic"
            textAlign="right"
            mb={8}
          >
            {imageCredit}
          </Text>
        )}

        {post.bodyMarkdown && (
          <ArticleBody body={post.bodyMarkdown} location="reviews" />
        )}

        {videoEmbed && (
          <Box mt={10}>
            <Heading as="h2" size="sm" color="gray.300" mb={3}>
              Watch
            </Heading>
            <Box
              position="relative"
              w={videoIsShort ? { base: "full", sm: "340px" } : "full"}
              aspectRatio={videoIsShort ? 9 / 16 : 16 / 9}
              borderRadius="2xl"
              overflow="hidden"
              bg="black"
            >
              <iframe
                src={videoEmbed}
                title={`${post.title} — video`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
              />
            </Box>
          </Box>
        )}

        <SourcesBlock sources={post.sources} />

        {topics.length > 0 && (
          <Box mt={10}>
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

        {/* Turn readers into installs — the app tracks every game behind the
            adaptations. */}
        <Box mt={10}>
          <AppCta
            variant="inline"
            location="reviews"
            heading="Love the games behind the screen? Get Nexzy."
            subtext="Track every game these adaptations are based on, get price-drop alerts, and AI help when you're stuck — free on iOS & Android."
          />
        </Box>

        <HStack
          justify="space-between"
          mt={10}
          pt={6}
          borderTop="1px solid"
          borderColor="whiteAlpha.200"
        >
          <Text color="gray.500" fontSize="xs">
            {post.author || "Nexzy Editorial"}
          </Text>
          <ShareRow url={shareUrl} title={post.title} />
        </HStack>
      </Container>

      {/* Related by game */}
      <MoreOnGame game={byGame.game} items={byGame.items} />

      {relatedDeduped.length > 0 && (
        <Box borderTop="1px solid" borderColor="whiteAlpha.100" py={12}>
          <Container maxW="container.xl">
            <Heading as="h2" size="lg" color="white" mb={6}>
              More reviews
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
              {relatedDeduped.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </SimpleGrid>
          </Container>
        </Box>
      )}

      <ViewPing slug={post.slug} />
      <ArticleAnalytics slug={post.slug} type="review" author={post.author} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </Box>
  );
}
