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
  Image,
  Badge,
  Link,
  Separator,
} from "@chakra-ui/react";
import { fetchPost } from "@/lib/blog/api";
import Markdown from "@/components/blog/Markdown";

export const revalidate = 300;

const BEAT_LABEL: Record<string, string> = {
  game_news: "Game News",
  console_hardware: "Hardware",
  game_movies_tv: "Movies & TV",
  deals: "Deals",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return { title: "Article not found — Nexzy News" };

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || undefined;
  return {
    title: `${title} — Nexzy News`,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.publishedAt || undefined,
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

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    image: post.heroImageUrl ? [post.heroImageUrl] : undefined,
    datePublished: post.publishedAt || undefined,
    author: { "@type": "Organization", name: post.author || "Nexzy Editorial" },
    publisher: { "@type": "Organization", name: "Nexzy" },
  };

  return (
    <Container maxW="container.md" py={{ base: 8, md: 12 }}>
      <Link
        as={NextLink}
        href="/blog"
        color="nexzy.lightBlue"
        fontSize="sm"
        mb={6}
        display="inline-block"
      >
        ← All news
      </Link>

      <HStack gap={3} mb={4}>
        <Badge colorPalette="blue" variant="subtle">
          {BEAT_LABEL[post.beat] || post.beat}
        </Badge>
        {post.publishedAt && (
          <Text color="gray.400" fontSize="sm">
            {new Date(post.publishedAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        )}
      </HStack>

      <Heading as="h1" size="3xl" color="white" mb={4} lineHeight="1.2">
        {post.title}
      </Heading>

      {post.heroImageUrl && (
        <Image
          src={post.heroImageUrl}
          alt={post.imageAlt || post.title}
          w="full"
          borderRadius="xl"
          mb={2}
        />
      )}
      {post.imageCredit && (
        <Text color="gray.500" fontSize="xs" mb={6}>
          {post.imageCredit}
        </Text>
      )}

      {post.bodyMarkdown && <Markdown>{post.bodyMarkdown}</Markdown>}

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

      <Text color="gray.500" fontSize="xs" mt={10}>
        {post.author || "Nexzy Editorial"}
      </Text>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Container>
  );
}
