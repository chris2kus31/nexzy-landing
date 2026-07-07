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
  Separator,
  Icon,
} from "@chakra-ui/react";
import { HiClock, HiEye } from "react-icons/hi";
import { fetchPost, fetchRelated } from "@/lib/blog/api";
import { slugifyTag } from "@/lib/blog/tags";
import { formatCount } from "@/lib/blog/format";
import { youtubeEmbedUrl, isYoutubeShort } from "@/lib/blog/youtube";
import Markdown from "@/components/blog/Markdown";
import AppCta from "@/components/blog/AppCta";
import Byline from "@/components/blog/Byline";
import ShareRow from "@/components/blog/ShareRow";
import BlogCard from "@/components/blog/BlogCard";
import ViewPing from "@/components/blog/ViewPing";
import ArticleAnalytics from "@/components/blog/ArticleAnalytics";

// ISR: guide pages are cached and rebuilt in the background (fast + crawlable).
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

function readingMinutes(markdown?: string): number {
  if (!markdown) return 1;
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Parse the guide body into HowTo steps: each "## " heading is a step name, and
 * the prose beneath it (stripped of markdown) is the step text. Powers the
 * HowTo JSON-LD so the guide can win rich results for "how to beat X" searches.
 */
function toHowToSteps(markdown?: string): { name: string; text: string }[] {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const steps: { name: string; text: string }[] = [];
  let current: { name: string; text: string } | null = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/); // top-level guide sections only
    if (h && !line.startsWith("###")) {
      if (current) steps.push(current);
      current = { name: h[1].replace(/[#*`]/g, "").trim(), text: "" };
    } else if (current) {
      const clean = line
        .replace(/[#*_`>[\]()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (clean) current.text += (current.text ? " " : "") + clean;
    }
  }
  if (current) steps.push(current);
  return steps
    .map((s) => ({ name: s.name, text: s.text.slice(0, 500) }))
    .filter((s) => s.name && s.text);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post || post.type !== "guide")
    return { title: "Guide not found — Nexzy" };

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || undefined;
  return {
    title: `${title} — Nexzy Guides`,
    description,
    alternates: { canonical: `/guides/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      images: post.heroImageUrl ? [{ url: post.heroImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.heroImageUrl ? [post.heroImageUrl] : undefined,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();
  // Only guides live here; an article slug 404s (it has its own /blog home).
  if (post.type !== "guide") notFound();

  const related = await fetchRelated(post.slug, 3);
  const topics = (post.tags || [])
    .map((t) => ({ label: t, slug: slugifyTag(t) }))
    .filter((t) => t.slug);

  const shareUrl = `${SITE_URL}/guides/${post.slug}`;
  const minutes = readingMinutes(post.bodyMarkdown);
  const videoEmbed = youtubeEmbedUrl(post.youtubeUrl);
  const videoIsShort = isYoutubeShort(post.youtubeUrl);
  const imageCredit = post.imageCredit
    ? post.imageCredit
        .replace(/\s*\(.*?\)\s*$/, "")
        .replace(/^AI-generated$/i, "Generated with AI")
    : null;

  const guideUrl = `${SITE_URL}/guides/${post.slug}`;
  const steps = toHowToSteps(post.bodyMarkdown);

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: post.title,
    description: post.seoDescription || post.excerpt || undefined,
    image: post.heroImageUrl ? [post.heroImageUrl] : undefined,
    totalTime: `PT${minutes}M`,
    mainEntityOfPage: { "@type": "WebPage", "@id": guideUrl },
    ...(steps.length
      ? {
          step: steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.name,
            text: s.text,
          })),
        }
      : {}),
    publisher: {
      "@type": "Organization",
      name: "Nexzy",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/android-chrome-512x512.png`,
        width: 512,
        height: 512,
      },
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
        name: "Guides",
        item: `${SITE_URL}/guides`,
      },
      { "@type": "ListItem", position: 3, name: post.title, item: guideUrl },
    ],
  };

  return (
    <Box>
      <Container maxW="3xl" py={{ base: 8, md: 12 }}>
        {/* Visible breadcrumb (matches BreadcrumbList JSON-LD) */}
        <HStack gap={2} mb={6} fontSize="sm" color="gray.400" flexWrap="wrap">
          <Link asChild color="nexzy.lightBlue">
            <NextLink href="/guides">Guides</NextLink>
          </Link>
          <Text>/</Text>
          <Text color="gray.500" lineClamp={1}>
            {post.title}
          </Text>
        </HStack>

        {/* Meta row */}
        <HStack gap={4} mb={4} flexWrap="wrap">
          <Badge colorPalette="cyan" variant="solid">
            Guide
          </Badge>
          <HStack gap={1} color="gray.400" fontSize="sm">
            <Icon>
              <HiClock />
            </Icon>
            <Text>{minutes} min read</Text>
          </HStack>
          {post.viewCount > 0 && (
            <HStack gap={1} color="gray.400" fontSize="sm">
              <Icon>
                <HiEye />
              </Icon>
              <Text>{formatCount(post.viewCount)} reads</Text>
            </HStack>
          )}
          <Box ml="auto">
            <ShareRow url={shareUrl} title={post.title} />
          </Box>
        </HStack>

        <Heading
          as="h1"
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

        <Box mb={8}>
          <Byline author={post.author} date={post.publishedAt} />
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

        {post.bodyMarkdown && <Markdown>{post.bodyMarkdown}</Markdown>}

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

        {post.sources && post.sources.length > 0 && (
          <Box mt={10}>
            <Separator borderColor="whiteAlpha.200" mb={4} />
            <Heading as="h2" size="sm" color="gray.300" mb={3}>
              Sources
            </Heading>
            <VStack align="stretch" gap={2}>
              {post.sources.map((s, i) => (
                <Link
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="nexzy.lightBlue"
                  fontSize="sm"
                >
                  {s.name}
                </Link>
              ))}
            </VStack>
          </Box>
        )}

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

        {/* Turn readers into installs. When we actually have this game in the
            Nexzy library, make the CTA game-specific (track it + in-app AI). */}
        <Box mt={10}>
          {post.appGame?.inDb ? (
            <AppCta
              variant="inline"
              heading={`Playing ${post.appGame.name || post.title}? Get Nexzy.`}
              subtext={`Track ${post.appGame.name || "this game"}, get step-by-step AI help for any stuck moment, and earn coins — free on iOS & Android.`}
            />
          ) : (
            <AppCta variant="inline" />
          )}
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

      {/* Related guides */}
      {related.length > 0 && (
        <Box borderTop="1px solid" borderColor="whiteAlpha.100" py={12}>
          <Container maxW="container.xl">
            <Heading as="h2" size="lg" color="white" mb={6}>
              More guides
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
              {related.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </SimpleGrid>
          </Container>
        </Box>
      )}

      <ViewPing slug={post.slug} />
      <ArticleAnalytics slug={post.slug} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </Box>
  );
}
