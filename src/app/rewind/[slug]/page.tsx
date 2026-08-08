import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import {
  Box,
  Container,
  Flex,
  HStack,
  Heading,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import ArticleBody from "@/components/blog/ArticleBody";
import ViewPing from "@/components/blog/ViewPing";
import ArticleAnalytics from "@/components/blog/ArticleAnalytics";
import { fetchRewindEpisode, fetchRewindDay } from "@/lib/blog/api";
import { imageObjectLd } from "@/lib/blog/imageLd";
import TrackedLink from "@/components/TrackedLink";
import RewindVault from "@/components/rewind/RewindVault";
import {
  eraForYear,
  yearsAgo,
  thenNow,
  dateSlug,
  monthName,
} from "@/lib/rewind/era";

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

function youTubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ep = await fetchRewindEpisode(slug);
  if (!ep) return { title: "Rewind — Nexzy" };
  const title = ep.seoTitle || ep.title;
  const description = ep.seoDescription || ep.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/rewind/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: ep.publishedAt || undefined,
      images: ep.heroImageUrl
        ? [{ url: ep.heroImageUrl, alt: ep.imageAlt || ep.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ep.heroImageUrl ? [ep.heroImageUrl] : undefined,
    },
  };
}

export default async function RewindEpisodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ep = await fetchRewindEpisode(slug);
  if (!ep) notFound();

  const year = ep.event?.year ?? null;
  const era = eraForYear(year);
  const ya = yearsAgo(year);
  const tn = thenNow(year, ep.event?.category);
  const digits = year ? String(year).split("") : [];
  const vid = youTubeId(ep.youtubeUrl || ep.videoUrls?.[0]);

  const hub = ep.event
    ? await fetchRewindDay(ep.event.month, ep.event.day)
    : null;
  const more = (hub?.timeline || [])
    .filter((t) => t.slug && t.slug !== slug)
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: ep.title,
    datePublished: ep.publishedAt || undefined,
    dateModified: ep.updatedAt || ep.publishedAt || undefined,
    image: imageObjectLd(ep),
    author: { "@type": "Person", name: ep.author || "Nexzy Rewind" },
    publisher: {
      "@type": "Organization",
      name: "Nexzy",
      url: SITE_URL,
    },
    ...(vid
      ? {
          video: [
            {
              "@type": "VideoObject",
              name: ep.title,
              description: ep.excerpt || ep.title,
              thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              uploadDate: ep.publishedAt || undefined,
              embedUrl: `https://www.youtube-nocookie.com/embed/${vid}`,
              contentUrl: `https://www.youtube.com/watch?v=${vid}`,
            },
          ],
        }
      : {}),
    mainEntityOfPage: `${SITE_URL}/rewind/${slug}`,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Rewind",
        item: `${SITE_URL}/rewind`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: ep.title,
        item: `${SITE_URL}/rewind/${slug}`,
      },
    ],
  };

  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />

      {/* HERO — era-adaptive time-machine header */}
      <Box
        textAlign="center"
        py={{ base: 10, md: 14 }}
        px={4}
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
      >
        <HStack
          display="inline-flex"
          gap={2}
          border="1px solid"
          borderColor={era.accent}
          color={era.accent}
          borderRadius="full"
          px={3}
          py={1}
          mb={4}
          fontFamily="mono"
          fontSize="xs"
          letterSpacing="widest"
        >
          <Box as="span">●</Box>
          <Box as="span">
            {era.label}
            {year ? ` · ${year}` : ""}
          </Box>
        </HStack>

        <Text
          fontFamily="mono"
          letterSpacing="0.4em"
          fontSize="xs"
          color="nexzy.gray.100"
          mb={3}
        >
          ON THIS DAY
        </Text>

        {digits.length > 0 && (
          <HStack justify="center" gap={1.5} mb={4}>
            {digits.map((d, i) => (
              <Box
                key={i}
                w={{ base: "34px", md: "42px" }}
                h={{ base: "46px", md: "56px" }}
                display="grid"
                placeItems="center"
                bg="#060b16"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="md"
                fontFamily="mono"
                fontWeight="800"
                fontSize={{ base: "2xl", md: "4xl" }}
                color="nexzy.gold"
              >
                {d}
              </Box>
            ))}
          </HStack>
        )}

        <Heading
          as="h1"
          fontFamily="title"
          size={{ base: "xl", md: "3xl" }}
          color="nexzy.white"
          maxW="3xl"
          mx="auto"
          lineHeight="1.15"
        >
          {ep.title}
        </Heading>

        <Text color="nexzy.gray.100" fontSize="sm" mt={3}>
          {ep.event
            ? `${monthName(ep.event.month)} ${ep.event.day}${year ? `, ${year}` : ""}`
            : ""}
          {ya ? ` · ${ya} years ago today` : ""}
        </Text>
        <Text color="nexzy.gray.100" fontSize="sm" mt={1}>
          By{" "}
          <Box as="span" color="nexzy.white">
            {ep.author || "Nexzy Rewind"}
          </Box>{" "}
          · Nexzy Rewind
        </Text>
      </Box>

      <Container maxW="3xl" py={{ base: 8, md: 12 }}>
        {ep.heroImageUrl && (
          <Image
            src={ep.heroImageUrl}
            alt={ep.imageAlt || ep.title}
            w="100%"
            borderRadius="xl"
            mb={8}
          />
        )}

        {ep.bodyMarkdown && (
          <ArticleBody body={ep.bodyMarkdown} location="rewind" />
        )}

        {/* THEN vs NOW — physical-media contrast (conditional) */}
        {tn && (
          <Box
            mt={10}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="xl"
            p={{ base: 4, md: 6 }}
          >
            <Text
              textAlign="center"
              fontFamily="mono"
              letterSpacing="0.2em"
              fontSize="sm"
              color="nexzy.gold"
              mb={4}
            >
              THEN vs NOW
            </Text>
            <Flex gap={4} direction={{ base: "column", md: "row" }}>
              <Box flex="1">
                <Text fontFamily="mono" fontSize="xs" color="green.300" mb={2}>
                  {year} — IN THE BOX
                </Text>
                <VStack align="stretch" gap={1}>
                  {tn.then.map((t) => (
                    <Text key={t} color="nexzy.gray.100" fontSize="sm">
                      • {t}
                    </Text>
                  ))}
                </VStack>
              </Box>
              <Box flex="1">
                <Text fontFamily="mono" fontSize="xs" color="orange.300" mb={2}>
                  {new Date().getFullYear()} — IN THE CLOUD
                </Text>
                <VStack align="stretch" gap={1}>
                  {tn.now.map((t) => (
                    <Text key={t} color="nexzy.gray.100" fontSize="sm">
                      • {t}
                    </Text>
                  ))}
                </VStack>
              </Box>
            </Flex>
          </Box>
        )}

        {/* Video — era-adaptive vault (CRT for old eras, panel for modern) */}
        {vid && <RewindVault vid={vid} title={ep.title} year={year} />}

        {/* More from the vault */}
        {more.length > 0 && ep.event && (
          <Box mt={12}>
            <Text
              fontFamily="mono"
              fontSize="xs"
              letterSpacing="0.15em"
              color="nexzy.gray.100"
              mb={3}
            >
              MORE FROM THE VAULT · {monthName(ep.event.month).toUpperCase()}{" "}
              {ep.event.day}
            </Text>
            <VStack align="stretch" gap={2}>
              {more.map((m) => (
                <TrackedLink
                  key={m.slug ?? m.title}
                  href={`/rewind/${m.slug}`}
                  event="content_click"
                  params={{
                    content_type: "rewind",
                    slug: m.slug ?? "",
                    from: "rewind_more",
                  }}
                >
                  <Box
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="lg"
                    p={3}
                    _hover={{ borderColor: era.accent }}
                  >
                    <Text
                      fontFamily="mono"
                      fontSize="10px"
                      color={era.accent}
                      mb={1}
                    >
                      {m.year ?? "—"}
                    </Text>
                    <Text color="nexzy.white" fontWeight="600">
                      {m.title}
                    </Text>
                  </Box>
                </TrackedLink>
              ))}
            </VStack>
          </Box>
        )}

        {ep.event && (
          <Box mt={10}>
            <NextLink
              href={`/rewind/day/${dateSlug(ep.event.month, ep.event.day)}`}
            >
              <Text color="nexzy.lightBlue" fontSize="sm">
                ← Everything that happened on {monthName(ep.event.month)}{" "}
                {ep.event.day}
              </Text>
            </NextLink>
          </Box>
        )}
      </Container>

      <Footer />

      <ViewPing slug={slug} />
      <ArticleAnalytics
        slug={slug}
        type="rewind"
        author={ep.author ?? undefined}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </Box>
  );
}
