import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  VStack,
  Link,
  Badge,
  Button,
  Icon,
} from "@chakra-ui/react";
import { HiArrowRight } from "react-icons/hi";
import { fetchWalkthrough, fetchRelatedByGame } from "@/lib/blog/api";
import ArticleBody from "@/components/blog/ArticleBody";
import GameCard from "@/components/blog/GameCard";
import MoreOnGame from "@/components/blog/MoreOnGame";
import AppCta from "@/components/blog/AppCta";
import Byline from "@/components/blog/Byline";
import { authorJsonLd } from "@/lib/blog/authors";
import ViewPing from "@/components/blog/ViewPing";
import ArticleAnalytics from "@/components/blog/ArticleAnalytics";

export const revalidate = 300;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchWalkthrough(slug);
  if (!data) return { title: "Walkthrough not found — Nexzy" };
  const w = data.walkthrough;
  const title = w.seoTitle || w.title;
  const description = w.seoDescription || w.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/walkthroughs/${w.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      images: w.heroImageUrl ? [{ url: w.heroImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: w.heroImageUrl ? [w.heroImageUrl] : undefined,
    },
  };
}

export default async function WalkthroughOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchWalkthrough(slug);
  if (!data) notFound();
  const { walkthrough: w, chapters } = data;
  const url = `${SITE_URL}/walkthroughs/${w.slug}`;
  const firstChapter = chapters[0];
  const byGame = await fetchRelatedByGame(w.slug, 4);

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
      { "@type": "ListItem", position: 3, name: w.title, item: url },
    ],
  };
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: w.title,
    description: w.seoDescription || w.excerpt || undefined,
    image: w.heroImageUrl ? [w.heroImageUrl] : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: w.publishedAt || undefined,
    dateModified: w.updatedAt || w.publishedAt || undefined,
    author: authorJsonLd(w.author, SITE_URL),
    hasPart: chapters.map((c, i) => ({
      "@type": "WebPage",
      position: i + 1,
      name: c.title,
      url: `${url}/${c.chapterSlug}`,
    })),
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <Container maxW="3xl" py={{ base: 8, md: 12 }}>
        <HStack gap={2} mb={6} fontSize="sm" color="gray.400" flexWrap="wrap">
          <Link asChild color="nexzy.lightBlue">
            <NextLink href="/walkthroughs">Walkthroughs</NextLink>
          </Link>
          <Text>/</Text>
          <Text color="gray.500" lineClamp={1}>
            {w.title}
          </Text>
        </HStack>

        <HStack gap={4} mb={4} flexWrap="wrap">
          <Badge colorPalette="purple" variant="solid">
            Walkthrough
          </Badge>
          <Text color="gray.400" fontSize="sm">
            {chapters.length} chapters
          </Text>
        </HStack>

        <Heading
          as="h1"
          fontFamily="title"
          size={{ base: "2xl", md: "3xl" }}
          color="white"
          mb={4}
          lineHeight="1.15"
        >
          {w.title}
        </Heading>

        <Box mb={6}>
          <Byline
            author={w.author}
            date={w.publishedAt}
            updated={w.updatedAt}
          />
        </Box>

        {w.game && (
          <Box mb={6}>
            <GameCard game={w.game} />
          </Box>
        )}

        {w.bodyMarkdown && (
          <Box color="gray.200" fontSize="lg" mb={8}>
            <ArticleBody body={w.bodyMarkdown} location="walkthroughs" />
          </Box>
        )}

        {firstChapter && (
          <Button asChild size="lg" colorPalette="purple" mb={10}>
            <NextLink
              href={`/walkthroughs/${w.slug}/${firstChapter.chapterSlug}`}
            >
              Start walkthrough
              <Icon ml={1}>
                <HiArrowRight />
              </Icon>
            </NextLink>
          </Button>
        )}

        <Heading as="h2" size="lg" color="white" mb={4}>
          Chapters
        </Heading>
        <VStack align="stretch" gap={2} mb={12}>
          {chapters.map((c, i) => (
            <Link
              key={c.chapterSlug}
              asChild
              _hover={{ textDecoration: "none" }}
            >
              <NextLink href={`/walkthroughs/${w.slug}/${c.chapterSlug}`}>
                <HStack
                  justify="space-between"
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  _hover={{
                    bg: "whiteAlpha.100",
                    borderColor: "whiteAlpha.400",
                  }}
                >
                  <HStack gap={3}>
                    <Text
                      color="nexzy.lightBlue"
                      fontWeight="700"
                      fontSize="sm"
                      minW="24px"
                    >
                      {i + 1}
                    </Text>
                    <Text color="white">{c.title}</Text>
                  </HStack>
                  <Icon color="gray.500">
                    <HiArrowRight />
                  </Icon>
                </HStack>
              </NextLink>
            </Link>
          ))}
        </VStack>

        {w.game ? (
          <AppCta
            variant="inline"
            location="walkthroughs"
            heading={`Playing ${w.game.name}? Get Nexzy.`}
            subtext={`Get step-by-step AI help for ${w.game.name}, track it, and earn coins — free on iOS & Android.`}
          />
        ) : (
          <AppCta variant="inline" location="walkthroughs" />
        )}
      </Container>

      <MoreOnGame game={byGame.game} items={byGame.items} />

      <ViewPing slug={w.slug} />
      <ArticleAnalytics slug={w.slug} />
    </Box>
  );
}
