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
  Link,
  Badge,
  Icon,
  Flex,
  Separator,
} from "@chakra-ui/react";
import { HiArrowLeft, HiArrowRight } from "react-icons/hi";
import { fetchChapter } from "@/lib/blog/api";
import Markdown from "@/components/blog/Markdown";
import GameCard from "@/components/blog/GameCard";
import Byline from "@/components/blog/Byline";
import ViewPing from "@/components/blog/ViewPing";
import ArticleAnalytics from "@/components/blog/ArticleAnalytics";

export const revalidate = 300;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

function toHowToSteps(markdown?: string): { name: string; text: string }[] {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const steps: { name: string; text: string }[] = [];
  let current: { name: string; text: string } | null = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
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
  params: Promise<{ slug: string; chapter: string }>;
}): Promise<Metadata> {
  const { slug, chapter } = await params;
  const data = await fetchChapter(slug, chapter);
  if (!data) return { title: "Chapter not found — Nexzy" };
  const c = data.chapter;
  const title = c.seoTitle || c.title;
  const description = c.seoDescription || c.excerpt || undefined;
  return {
    title: `${title} — ${data.walkthrough.title}`,
    description,
    alternates: { canonical: `/walkthroughs/${slug}/${chapter}` },
    openGraph: {
      title,
      description,
      type: "article",
      images: c.heroImageUrl ? [{ url: c.heroImageUrl }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function WalkthroughChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter } = await params;
  const data = await fetchChapter(slug, chapter);
  if (!data) notFound();
  const { walkthrough: w, chapter: c, chapters, prev, next } = data;
  const url = `${SITE_URL}/walkthroughs/${slug}/${chapter}`;
  const idx = chapters.findIndex((ch) => ch.chapterSlug === chapter);
  const steps = toHowToSteps(c.bodyMarkdown);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Walkthroughs",
        item: `${SITE_URL}/walkthroughs`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: w.title,
        item: `${SITE_URL}/walkthroughs/${slug}`,
      },
      { "@type": "ListItem", position: 4, name: c.title, item: url },
    ],
  };
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: c.title,
    description: c.seoDescription || c.excerpt || undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    isPartOf: {
      "@type": "Article",
      name: w.title,
      url: `${SITE_URL}/walkthroughs/${slug}`,
    },
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

  return (
    <Box>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <Container maxW="6xl" py={{ base: 8, md: 12 }}>
        <HStack gap={2} mb={6} fontSize="sm" color="gray.400" flexWrap="wrap">
          <Link asChild color="nexzy.lightBlue">
            <NextLink href="/walkthroughs">Walkthroughs</NextLink>
          </Link>
          <Text>/</Text>
          <Link asChild color="nexzy.lightBlue">
            <NextLink href={`/walkthroughs/${slug}`}>{w.title}</NextLink>
          </Link>
          <Text>/</Text>
          <Text color="gray.500" lineClamp={1}>
            {c.title}
          </Text>
        </HStack>

        <Flex gap={{ base: 0, lg: 10 }} align="flex-start">
          <Box
            as="aside"
            display={{ base: "none", lg: "block" }}
            w="260px"
            flexShrink={0}
            position="sticky"
            top="80px"
          >
            <Text
              color="gray.400"
              fontSize="xs"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={3}
            >
              Chapters
            </Text>
            <VStack align="stretch" gap={1}>
              {chapters.map((ch, i) => {
                const active = ch.chapterSlug === chapter;
                return (
                  <Link
                    key={ch.chapterSlug}
                    asChild
                    _hover={{ textDecoration: "none" }}
                  >
                    <NextLink href={`/walkthroughs/${slug}/${ch.chapterSlug}`}>
                      <HStack
                        gap={2}
                        p={2}
                        borderRadius="md"
                        bg={active ? "whiteAlpha.200" : undefined}
                        _hover={{ bg: "whiteAlpha.100" }}
                      >
                        <Text
                          color={active ? "nexzy.lightBlue" : "gray.500"}
                          fontSize="xs"
                          fontWeight="700"
                          minW="18px"
                        >
                          {i + 1}
                        </Text>
                        <Text
                          color={active ? "white" : "gray.300"}
                          fontSize="sm"
                          lineClamp={2}
                        >
                          {ch.title}
                        </Text>
                      </HStack>
                    </NextLink>
                  </Link>
                );
              })}
            </VStack>
          </Box>

          <Box flex="1" minW={0}>
            <HStack gap={4} mb={3} flexWrap="wrap">
              <Badge colorPalette="purple" variant="solid">
                Walkthrough
              </Badge>
              <Text color="gray.400" fontSize="sm">
                Chapter {idx >= 0 ? idx + 1 : 1} of {chapters.length}
              </Text>
            </HStack>
            <Heading
              as="h1"
              size={{ base: "xl", md: "2xl" }}
              color="white"
              mb={6}
              lineHeight="1.15"
            >
              {c.title}
            </Heading>

            <Box mb={6}>
              <Byline author={c.author} date={c.publishedAt} />
            </Box>

            {c.heroImageUrl && (
              <Box
                position="relative"
                w="100%"
                h={{ base: "200px", md: "320px" }}
                borderRadius="lg"
                overflow="hidden"
                mb={6}
              >
                <NextImage
                  src={c.heroImageUrl}
                  alt={c.imageAlt || c.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  style={{ objectFit: "cover" }}
                />
              </Box>
            )}

            {c.game && (
              <Box mb={6}>
                <GameCard game={c.game} />
              </Box>
            )}

            <Box color="gray.200">
              <Markdown>{c.bodyMarkdown || ""}</Markdown>
            </Box>

            <Separator my={8} borderColor="whiteAlpha.200" />

            <Flex justify="space-between" gap={4} flexWrap="wrap">
              {prev ? (
                <Link
                  asChild
                  color="nexzy.lightBlue"
                  _hover={{ textDecoration: "none" }}
                >
                  <NextLink href={`/walkthroughs/${slug}/${prev.chapterSlug}`}>
                    <HStack gap={1}>
                      <Icon>
                        <HiArrowLeft />
                      </Icon>
                      <Text lineClamp={1}>{prev.title}</Text>
                    </HStack>
                  </NextLink>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  asChild
                  color="nexzy.lightBlue"
                  _hover={{ textDecoration: "none" }}
                >
                  <NextLink href={`/walkthroughs/${slug}/${next.chapterSlug}`}>
                    <HStack gap={1}>
                      <Text lineClamp={1}>{next.title}</Text>
                      <Icon>
                        <HiArrowRight />
                      </Icon>
                    </HStack>
                  </NextLink>
                </Link>
              ) : (
                <span />
              )}
            </Flex>
          </Box>
        </Flex>
      </Container>
      <ViewPing slug={c.slug} />
      <ArticleAnalytics slug={c.slug} />
    </Box>
  );
}
