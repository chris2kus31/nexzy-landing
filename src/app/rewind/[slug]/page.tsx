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

const REGION: Record<string, string> = {
  NA: "North America",
  US: "North America",
  JP: "Japan",
  EU: "Europe",
  PAL: "PAL regions",
  WW: "Worldwide",
};
function regionName(r?: string | null): string {
  if (!r) return "—";
  return REGION[r.toUpperCase()] ?? r;
}
function categoryLabel(c?: string | null): string {
  return (c ?? "").replace(/_/g, " ").replace(/^./, (s) => s.toUpperCase());
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

  const spec = ep.spec ?? null;
  const released = ep.event
    ? `${monthName(ep.event.month)} ${ep.event.day}${year ? `, ${year}` : ""}`
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: ep.title,
    datePublished: ep.publishedAt || undefined,
    dateModified: ep.updatedAt || ep.publishedAt || undefined,
    image: imageObjectLd(ep),
    author: { "@type": "Person", name: ep.author || "Nexzy Rewind" },
    publisher: { "@type": "Organization", name: "Nexzy", url: SITE_URL },
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

  const specRows: { k: string; v: string }[] = [];
  if (released) specRows.push({ k: "Released", v: released });
  if (spec?.platforms?.length)
    specRows.push({ k: "Platform", v: spec.platforms.join(", ") });
  if (ep.event) specRows.push({ k: "Region", v: regionName(ep.event.region) });
  if (spec?.genres?.length)
    specRows.push({ k: "Genre", v: spec.genres.join(", ") });
  if (spec?.esrb) specRows.push({ k: "Rating", v: spec.esrb });
  if (ep.event)
    specRows.push({ k: "Moment", v: categoryLabel(ep.event.category) });

  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />

      {/* HERO — compact, horizontal, era-adaptive. pt clears the fixed 64px nav. */}
      <Box
        position="relative"
        pt={{ base: 24, md: 28 }}
        pb={{ base: 8, md: 10 }}
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        overflow="hidden"
      >
        <Box
          position="absolute"
          inset="0"
          pointerEvents="none"
          css={{
            background:
              "repeating-linear-gradient(to bottom, rgba(255,255,255,.03) 0 1px, transparent 1px 4px)",
          }}
        />
        <Container maxW="6xl" position="relative">
          <Flex
            direction={{ base: "column", md: "row" }}
            align={{ base: "center", md: "flex-start" }}
            gap={{ base: 5, md: 8 }}
            textAlign={{ base: "center", md: "left" }}
          >
            <Box flexShrink={0}>
              {digits.length > 0 && (
                <HStack justify="center" gap={1.5}>
                  {digits.map((d, i) => (
                    <Box
                      key={i}
                      position="relative"
                      w={{ base: "38px", md: "44px" }}
                      h={{ base: "50px", md: "58px" }}
                      display="grid"
                      placeItems="center"
                      bg="#060b16"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      borderRadius="md"
                      fontFamily="mono"
                      fontWeight="800"
                      fontSize={{ base: "3xl", md: "4xl" }}
                      color="nexzy.gold"
                      css={{
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: "50%",
                          height: "1px",
                          background: "rgba(0,0,0,.55)",
                        },
                      }}
                    >
                      {d}
                    </Box>
                  ))}
                </HStack>
              )}
              <Box
                display="inline-block"
                mt={3}
                border="1px solid"
                borderColor={era.accent}
                color={era.accent}
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.18em"
                px={2.5}
                py={1}
                borderRadius="full"
              >
                ● {era.label}
              </Box>
            </Box>

            <Box flex="1">
              <Text
                fontFamily="mono"
                letterSpacing="0.32em"
                fontSize="11px"
                color="nexzy.gray.100"
                mb={2}
              >
                ON THIS DAY
                {ep.event
                  ? ` · ${monthName(ep.event.month).toUpperCase()} ${ep.event.day}`
                  : ""}
              </Text>
              <Heading
                as="h1"
                fontFamily="title"
                size={{ base: "lg", md: "2xl" }}
                color="nexzy.white"
                lineHeight="1.15"
              >
                {ep.title}
              </Heading>
              <Text color="nexzy.gray.100" fontSize="sm" mt={3}>
                {ya ? `${ya} years ago today · ` : ""}By{" "}
                <Box as="span" color="nexzy.white">
                  {ep.author || "Nexzy Rewind"}
                </Box>{" "}
                · Nexzy Rewind
              </Text>
            </Box>
          </Flex>
        </Container>
      </Box>

      <Container maxW="6xl" py={{ base: 8, md: 12 }}>
        {/* READING — a SET-HEIGHT cream paper that scrolls internally, beside the
            box art + Spec Plate. Fixed window: the page stays put no matter how
            long the article runs (only the paper body scrolls). */}
        <Flex direction={{ base: "column", md: "row" }} gap={6} align="start">
          {ep.bodyMarkdown && (
            <Box
              flex="1"
              minW={0}
              bg="#efe7d3"
              borderRadius="xl"
              boxShadow="0 20px 44px rgba(0,0,0,.4)"
              display="flex"
              flexDirection="column"
              h={{ base: "auto", md: "480px" }}
              overflow="hidden"
            >
              <Text
                as="div"
                fontFamily="mono"
                fontSize="xs"
                letterSpacing="0.2em"
                color="#8a6d3b"
                px={{ base: 5, md: 8 }}
                pt={{ base: 5, md: 7 }}
                pb={3}
                borderBottom="1px solid rgba(138,109,59,.25)"
              >
                SET THE CLOCK TO {year ?? "—"} ▸
              </Text>
              <Box
                overflowY="auto"
                px={{ base: 5, md: 8 }}
                py={{ base: 5, md: 6 }}
                css={{
                  "& p:first-of-type::first-letter": {
                    float: "left",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: "3.5rem",
                    lineHeight: "0.8",
                    fontWeight: 700,
                    color: era.accent,
                    paddingRight: "10px",
                    paddingTop: "4px",
                  },
                  "&::-webkit-scrollbar": { width: "8px" },
                  "&::-webkit-scrollbar-thumb": {
                    background: "rgba(90,75,54,.35)",
                    borderRadius: "4px",
                  },
                }}
              >
                <ArticleBody
                  body={ep.bodyMarkdown}
                  location="rewind"
                  tone="paper"
                />
              </Box>
            </Box>
          )}

          {/* Box art + Spec Plate — the hero-image + stat-card cascade tiers.
              Fills the paper's height so the two columns bottom-align. */}
          <Box
            w={{ base: "100%", md: "320px" }}
            flexShrink={0}
            h={{ base: "auto", md: "480px" }}
          >
            <VStack align="stretch" gap={4} h="100%">
              {ep.heroImageUrl && (
                <Image
                  src={ep.heroImageUrl}
                  alt={ep.imageAlt || ep.title}
                  w="100%"
                  flex={{ md: "1" }}
                  minH={{ base: "200px", md: "0" }}
                  objectFit="contain"
                  bg="#0b1120"
                  p={3}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                />
              )}
              {specRows.length > 0 && (
                <Box
                  flexShrink={0}
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="xl"
                  p={4}
                >
                  <Text
                    fontFamily="mono"
                    fontSize="10px"
                    letterSpacing="0.18em"
                    color="nexzy.gray.100"
                    mb={3}
                  >
                    SPEC PLATE
                  </Text>
                  <VStack align="stretch" gap={0}>
                    {specRows.map((row, i) => (
                      <Flex
                        key={row.k}
                        justify="space-between"
                        gap={3}
                        py={2}
                        borderBottom={
                          i < specRows.length - 1 ? "1px solid" : "none"
                        }
                        borderColor="whiteAlpha.100"
                      >
                        <Text fontSize="13px" color="nexzy.gray.100">
                          {row.k}
                        </Text>
                        <Text
                          fontSize="13px"
                          color="nexzy.white"
                          fontWeight="600"
                          textAlign="right"
                        >
                          {row.v}
                        </Text>
                      </Flex>
                    ))}
                  </VStack>
                  {spec?.gameSlug && (
                    <NextLink href={`/games/${spec.gameSlug}`}>
                      <Text
                        mt={3}
                        fontSize="xs"
                        color={era.accent}
                        fontWeight="600"
                      >
                        Open the game hub ▸
                      </Text>
                    </NextLink>
                  )}
                </Box>
              )}
            </VStack>
          </Box>
        </Flex>

        {/* FEATURE SLOT top tier — THEN vs NOW (physical-media eras only) */}
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
              letterSpacing="0.24em"
              fontSize="sm"
              color="nexzy.gold"
              mb={4}
            >
              THEN vs NOW
            </Text>
            <Flex
              gap={{ base: 4, md: 10 }}
              direction={{ base: "column", md: "row" }}
              align={{ md: "flex-start" }}
              justify="center"
            >
              <Box flex="1">
                <Text fontFamily="mono" fontSize="xs" color="green.300" mb={2}>
                  {year} — IN THE BOX
                </Text>
                <Flex wrap="wrap" gap={2}>
                  {tn.then.map((t) => (
                    <Text
                      key={t}
                      fontSize="12px"
                      color="nexzy.gray.100"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      px={2.5}
                      py={1}
                      borderRadius="full"
                    >
                      {t}
                    </Text>
                  ))}
                </Flex>
              </Box>
              <Text
                color={era.accent}
                fontSize="2xl"
                fontWeight="800"
                textAlign="center"
              >
                →
              </Text>
              <Box flex="1">
                <Text fontFamily="mono" fontSize="xs" color="orange.300" mb={2}>
                  {new Date().getFullYear()} — IN THE CLOUD
                </Text>
                <Flex wrap="wrap" gap={2}>
                  {tn.now.map((t) => (
                    <Text
                      key={t}
                      fontSize="12px"
                      color="nexzy.gray.100"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      px={2.5}
                      py={1}
                      borderRadius="full"
                    >
                      {t}
                    </Text>
                  ))}
                </Flex>
              </Box>
            </Flex>
            <Text
              textAlign="center"
              mt={5}
              fontFamily="var(--font-voice, Georgia, serif)"
              fontStyle="italic"
              color="nexzy.white"
              fontSize={{ base: "md", md: "lg" }}
            >
              You used to{" "}
              <Box as="span" fontWeight="700">
                own
              </Box>{" "}
              it. Now you just{" "}
              <Box as="span" fontWeight="700">
                access
              </Box>{" "}
              it.
            </Text>
          </Box>
        )}

        {/* MEDIA SLOT — era CRT video vault (no Wayback) */}
        {vid && <RewindVault vid={vid} title={ep.title} year={year} />}

        {/* MORE ON THIS DAY — slim chips */}
        {more.length > 0 && ep.event && (
          <Box mt={12}>
            <Text
              fontFamily="mono"
              fontSize="xs"
              letterSpacing="0.15em"
              color="nexzy.gray.100"
              mb={3}
            >
              MORE ON {monthName(ep.event.month).toUpperCase()} {ep.event.day}
            </Text>
            <Box
              display="grid"
              gridTemplateColumns={{
                base: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              }}
              gap={3}
            >
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
                    h="100%"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="lg"
                    p={4}
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
            </Box>
          </Box>
        )}

        {ep.event && (
          <Box mt={8}>
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

        {/* Time-machine sign-off strip */}
        <Flex
          align="center"
          gap={3}
          mt={12}
          pt={6}
          borderTop="1px solid"
          borderColor="whiteAlpha.100"
        >
          <Box w="28px" h="3px" bg="nexzy.gold" borderRadius="full" />
          <Text
            fontFamily="mono"
            fontSize="xs"
            letterSpacing="0.12em"
            color="nexzy.gray.100"
          >
            NEXZY REWIND — A NEW TIME-MACHINE DROP EVERY DAY
          </Text>
        </Flex>
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
