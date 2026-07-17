import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  HStack,
  Link,
  Badge,
  SimpleGrid,
} from "@chakra-ui/react";
import { getAuthorBySlug } from "@/lib/blog/authors";
import { fetchPosts, fetchAuthorProfile } from "@/lib/blog/api";
import { beatLabel } from "@/lib/blog/beats";
import BlogCard from "@/components/blog/BlogCard";
import AuthorAvatar from "@/components/blog/AuthorAvatar";
import Pager from "@/components/blog/Pager";

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const PAGE_SIZE = 12;

type Params = Promise<{ slug: string }>;
type Search = Promise<{ page?: string }>;

/** Merge the DB persona (editable) over the static fallback (avatar, defaults). */
async function resolveAuthor(slug: string) {
  const staticA = getAuthorBySlug(slug);
  const db = await fetchAuthorProfile(slug);
  if (!staticA && !db) return null;
  const socialUrls = [
    ...(db?.socials ? Object.values(db.socials) : []),
    staticA?.x ?? undefined,
    staticA?.instagram ?? undefined,
  ].filter((u): u is string => !!u);
  return {
    slug,
    name: db?.name || staticA?.name || slug,
    role: db?.title || staticA?.role || "Writer",
    bio: db?.bio || staticA?.bio || "",
    avatar: db?.avatarUrl || staticA?.avatar || null,
    nowPlaying: (db?.nowPlaying ?? []).filter(Boolean),
    socials: [...new Set(socialUrls)],
    knowsAbout: (db?.beats ?? []).map((b) => beatLabel(b)).filter(Boolean),
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await resolveAuthor(slug);
  if (!author) return { title: "Author" };
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
  const ogTitle = `${author.name} — ${author.role} at Nexzy`;
  return {
    title: `${author.name} — ${author.role}`,
    description: author.bio || undefined,
    alternates: {
      canonical:
        page > 1
          ? `/author/${author.slug}?page=${page}`
          : `/author/${author.slug}`,
    },
    openGraph: {
      type: "profile",
      title: ogTitle,
      description: author.bio || undefined,
      url: `${SITE_URL}/author/${author.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: author.bio || undefined,
    },
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
  const author = await resolveAuthor(slug);
  if (!author) notFound();

  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
  // All content types — articles, guides, walkthroughs, lists.
  const { items, total, pageSize } = await fetchPosts({
    author: author.name,
    type: "all",
    page,
    pageSize: PAGE_SIZE,
  });

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.role,
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.avatar
      ? {
          image: author.avatar.startsWith("http")
            ? author.avatar
            : `${SITE_URL}${author.avatar}`,
        }
      : {}),
    url: `${SITE_URL}/author/${author.slug}`,
    worksFor: { "@id": `${SITE_URL}/#organization` },
    ...(author.knowsAbout.length ? { knowsAbout: author.knowsAbout } : {}),
    ...(author.socials.length ? { sameAs: author.socials } : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: author.name,
        item: `${SITE_URL}/author/${author.slug}`,
      },
    ],
  };

  return (
    <Container maxW="container.xl" py={{ base: 10, md: 14 }}>
      <Flex gap={5} align="flex-start" mb={{ base: 8, md: 10 }} wrap="wrap">
        <AuthorAvatar src={author.avatar} name={author.name} size={88} />
        <Box flex="1" minW="260px">
          <Heading as="h1" fontFamily="title" size="2xl" color="white" mb={1}>
            {author.name}
          </Heading>
          <Text color="nexzy.lightBlue" fontWeight="600" mb={2}>
            {author.role}, Nexzy
          </Text>
          {author.bio && (
            <Text color="gray.300" maxW="2xl" lineHeight="1.6" mb={3}>
              {author.bio}
            </Text>
          )}

          {author.nowPlaying.length > 0 && (
            <Box mb={3}>
              <Text
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.1em"
                textTransform="uppercase"
                color="nexzy.gray.100"
                mb={1.5}
              >
                Currently playing
              </Text>
              <HStack gap={2} wrap="wrap">
                {author.nowPlaying.map((g) => (
                  <Badge
                    key={g}
                    colorPalette="cyan"
                    variant="subtle"
                    textTransform="none"
                  >
                    {g}
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}

          {author.socials.length > 0 && (
            <HStack gap={4} fontSize="sm">
              {author.socials.map((url) => (
                <Link
                  key={url}
                  href={url}
                  color="nexzy.lightBlue"
                  target="_blank"
                  rel="me noopener noreferrer"
                >
                  {new URL(url).hostname.replace(/^www\./, "")}
                </Link>
              ))}
            </HStack>
          )}
        </Box>
      </Flex>

      <HStack mb={5}>
        <Heading as="h2" size="lg" color="white">
          {author.name}&apos;s work
        </Heading>
      </HStack>

      {items.length === 0 ? (
        <Text color="gray.400">No published work yet.</Text>
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </Container>
  );
}
