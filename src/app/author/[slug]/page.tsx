import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  HStack,
  SimpleGrid,
} from "@chakra-ui/react";
import { getAuthorBySlug } from "@/lib/blog/authors";
import { fetchPosts } from "@/lib/blog/api";
import BlogCard from "@/components/blog/BlogCard";
import AuthorAvatar from "@/components/blog/AuthorAvatar";
import Pager from "@/components/blog/Pager";

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const PAGE_SIZE = 12;

type Params = Promise<{ slug: string }>;
type Search = Promise<{ page?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) return { title: "Author — Nexzy News" };
  return {
    title: `${author.name} — ${author.role} at Nexzy News`,
    description: author.bio,
    alternates: { canonical: `/author/${author.slug}` },
  };
}

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) notFound();

  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
  const { items, total, pageSize } = await fetchPosts({
    author: author.name,
    page,
    pageSize: PAGE_SIZE,
  });

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.role,
    description: author.bio,
    url: `${SITE_URL}/author/${author.slug}`,
    worksFor: { "@type": "Organization", name: "Nexzy" },
    ...(author.x || author.instagram
      ? { sameAs: [author.x, author.instagram].filter(Boolean) }
      : {}),
  };

  return (
    <Container maxW="container.xl" py={{ base: 10, md: 14 }}>
      <Flex gap={5} align="center" mb={{ base: 8, md: 10 }} wrap="wrap">
        <AuthorAvatar src={author.avatar} name={author.name} size={88} />
        <Box>
          <Heading as="h1" size="2xl" color="white" mb={1}>
            {author.name}
          </Heading>
          <Text color="nexzy.lightBlue" fontWeight="600" mb={2}>
            {author.role}, Nexzy News
          </Text>
          <Text color="gray.300" maxW="2xl" lineHeight="1.6">
            {author.bio}
          </Text>
        </Box>
      </Flex>

      <HStack mb={5}>
        <Heading as="h2" size="lg" color="white">
          Latest by {author.name}
        </Heading>
      </HStack>

      {items.length === 0 ? (
        <Text color="gray.400">No published articles yet.</Text>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6}>
            {items.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </SimpleGrid>
          <Pager
            basePath={`/author/${author.slug}`}
            page={page}
            total={total}
            pageSize={pageSize}
          />
        </>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />
    </Container>
  );
}
