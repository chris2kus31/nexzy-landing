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
import { HiClock } from "react-icons/hi";
import { fetchPost, fetchRelated, fetchRelatedByGame } from "@/lib/blog/api";
import { imageObjectLd } from "@/lib/blog/imageLd";
import { slugifyTag } from "@/lib/blog/tags";
import { youtubeEmbedUrl, isYoutubeShort } from "@/lib/blog/youtube";
import GuideBody from "@/components/guides/GuideBody";
import AppCta from "@/components/blog/AppCta";
import GameCard from "@/components/blog/GameCard";
import Byline from "@/components/blog/Byline";
import { authorJsonLd } from "@/lib/blog/authors";
import ShareRow from "@/components/blog/ShareRow";
import BlogCard from "@/components/blog/BlogCard";
import MoreOnGame from "@/components/blog/MoreOnGame";
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
    title,
    description,
    alternates: { canonical: `/guides/${post.slug}` },
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
  const byGame = await fetchRelatedByGame(post.slug, 4);
  const byGameSlugs = new Set(byGame.items.map((p) => p.slug));
  const relatedDeduped = related.filter((p) => !byGameSlugs.has(p.slug));
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
        .replace(/^(AI-generated|Generated with AI)$/i, "AI illustration")
    : null;

  const guideUrl = `${SITE_URL}/guides/${post.slug}`;
  const steps = toHowToSteps(post.bodyMarkdown);
  const guidePublisher = {
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
  // Only claim HowTo when there are >=2 real step headings; otherwise emit a
  // plain Article so we never ship a thin/empty HowTo (a structured-data trap).
  const guideLd =
    steps.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: post.title,
          description: post.seoDescription || post.excerpt || undefined,
          image: imageObjectLd(post),
          totalTime: `PT${minutes}M`,
          datePublished: post.publishedAt || undefined,
          dateModified: post.updatedAt || post.publishedAt || undefined,
          author: authorJsonLd(post.author, SITE_URL),
          mainEntityOfPage: { "@type": "WebPage", "@id": guideUrl },
          step: steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.name,
            text: s.text,
          })),
          publisher: guidePublisher,
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
          mainEntityOfPage: { "@type": "WebPage", "@id": guideUrl },
          publisher: guidePublisher,
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

  // FAQPage only when there are >=2 real Q&As (thin-schema guard).
  const faqLd =
    post.faq && post.faq.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

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
          <Badge
            variant="outline"
            color="nexzy.lightBlue"
            bg="rgba(0,123,255,0.12)"
            borderColor="rgba(0,123,255,0.28)"
            borderRadius="full"
            px={3}
            py="5px"
            fontSize="11px"
            fontWeight="800"
            letterSpacing="0.14em"
            textTransform="uppercase"
          >
            Guide
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

        {post.game && <GameCard game={post.game} />}

        {post.bodyMarkdown && (
          <GuideBody body={post.bodyMarkdown} location="guides" />
        )}

        {post.faq && post.faq.length > 0 && (
          <Box mt={10}>
            <Heading as="h2" size="lg" color="white" mb={4}>
              Frequently asked questions
            </Heading>
            <VStack align="stretch" gap={3}>
              {post.faq.map((f, i) => (
                <Box
                  key={i}
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                  bg="whiteAlpha.50"
                  borderRadius="xl"
                  px={4}
                  py={3.5}
                >
                  <Heading as="h3" size="sm" color="white" mb={1.5}>
                    {f.q}
                  </Heading>
                  <Text color="gray.300">{f.a}</Text>
                </Box>
              ))}
            </VStack>
          </Box>
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
              location="guides"
              heading={`Playing ${post.appGame.name || post.title}? Get Nexzy.`}
              subtext={`Track ${post.appGame.name || "this game"}, get step-by-step AI help for any stuck moment, and earn coins — free on iOS & Android.`}
            />
          ) : (
            <AppCta variant="inline" location="guides" />
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
      <MoreOnGame game={byGame.game} items={byGame.items} />

      {relatedDeduped.length > 0 && (
        <Box borderTop="1px solid" borderColor="whiteAlpha.100" py={12}>
          <Container maxW="container.xl">
            <Heading as="h2" size="lg" color="white" mb={6}>
              More guides
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
      <ArticleAnalytics slug={post.slug} type="guide" author={post.author} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guideLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
    </Box>
  );
}
