import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  HStack,
  SimpleGrid,
  Link,
} from "@chakra-ui/react";
import { fetchPosts, fetchTags } from "@/lib/blog/api";
import { slugifyTag } from "@/lib/blog/tags";
import BlogCard from "@/components/blog/BlogCard";
import Pager from "@/components/blog/Pager";

// ISR: hub pages are cached and rebuilt in the background (fast + crawlable).
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const PAGE_SIZE = 18;

/** Prettify a slug as a fallback label: "gta-6" -> "Gta 6". */
function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Resolve a slug to its human display label from the tag index. */
async function resolveLabel(slug: string): Promise<string | null> {
  const tags = await fetchTags(500);
  const match = tags.find((t) => t.slug === slug);
  if (match) return match.tag;
  // Not a known published tag — still allow the page if any article matches,
  // but signal "unknown" so the caller can 404 empty topics.
  return null;
}

// Pre-render the busiest topics for SEO; the rest render on-demand (ISR).
export async function generateStaticParams(): Promise<{ tag: string }[]> {
  const tags = await fetchTags(50);
  return tags.map((t) => ({ tag: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const label = (await resolveLabel(tag)) || prettifySlug(tag);
  const title = `${label} — Nexzy News`;
  const description = `The latest ${label} news, updates, and coverage from the Nexzy newsroom.`;
  return {
    title,
    description,
    alternates: { canonical: `/blog/topic/${tag}` },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TopicHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tag } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
  const slug = slugifyTag(tag);
  const [label, list] = await Promise.all([
    resolveLabel(slug),
    fetchPosts({ tag: slug, page, pageSize: PAGE_SIZE }),
  ]);

  // No articles carry this topic → 404 (don't index empty hubs).
  if (list.items.length === 0) notFound();

  const displayLabel = label || prettifySlug(slug);
  const hubUrl = `${SITE_URL}/blog/topic/${slug}`;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${displayLabel} — Nexzy News`,
    description: `The latest ${displayLabel} news and coverage from Nexzy.`,
    url: hubUrl,
    isPartOf: { "@type": "WebSite", name: "Nexzy", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: list.items.slice(0, 20).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/blog/${p.slug}`,
        name: p.title,
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
        name: "Game News",
        item: `${SITE_URL}/blog`,
      },
      { "@type": "ListItem", position: 3, name: displayLabel, item: hubUrl },
    ],
  };

  return (
    <Container maxW="container.xl" py={{ base: 10, md: 14 }}>
      {/* Breadcrumb */}
      <HStack gap={2} mb={6} fontSize="sm" color="gray.400" flexWrap="wrap">
        <Link asChild color="nexzy.lightBlue">
          <NextLink href="/blog">Game News</NextLink>
        </Link>
        <Text>/</Text>
        <Text color="gray.500">Topics</Text>
        <Text>/</Text>
        <Text color="gray.300">{displayLabel}</Text>
      </HStack>

      <Flex direction="column" mb={{ base: 8, md: 10 }} gap={2}>
        <Text color="nexzy.lightBlue" fontWeight="700" fontSize="sm">
          TOPIC
        </Text>
        <Heading as="h1" size="2xl" color="white">
          #{displayLabel}
        </Heading>
        <Text color="gray.400">
          {list.total} article{list.total === 1 ? "" : "s"} on {displayLabel}.
        </Text>
      </Flex>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6}>
        {list.items.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </SimpleGrid>

      <Pager
        basePath={`/blog/topic/${slug}`}
        page={page}
        total={list.total}
        pageSize={list.pageSize}
      />

      <Box mt={10}>
        <Link asChild color="nexzy.lightBlue" fontWeight="600">
          <NextLink href="/blog">← All game news</NextLink>
        </Link>
      </Box>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </Container>
  );
}
