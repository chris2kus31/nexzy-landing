import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Box, Container, Flex, Heading, Image, Text } from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import ViewPing from "@/components/blog/ViewPing";
import ArticleAnalytics from "@/components/blog/ArticleAnalytics";
import { fetchRewindEpisode, fetchRewindDay } from "@/lib/blog/api";
import { imageObjectLd } from "@/lib/blog/imageLd";
import TrackedLink from "@/components/TrackedLink";
import RewindVault from "@/components/rewind/RewindVault";
import RewindScrubber from "@/components/rewind/RewindScrubber";
import {
  eraForYear,
  yearsAgo,
  thenNow,
  dateSlug,
  monthName,
} from "@/lib/rewind/era";

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const SERIF = 'Georgia, "Times New Roman", serif';

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

/** Strip inline markdown so split paragraphs never render raw *asterisks* etc. */
function stripMd(s: string): string {
  return (s || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
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
  const vid = youTubeId(ep.youtubeUrl || ep.videoUrls?.[0]);

  const hub = ep.event
    ? await fetchRewindDay(ep.event.month, ep.event.day)
    : null;
  const timeline = hub?.timeline || [];
  const stops = timeline
    .filter((t) => t.slug)
    .map((t) => ({ year: t.year ?? 0, slug: t.slug as string }));
  const more = timeline.filter((t) => t.slug && t.slug !== slug).slice(0, 3);

  const spec = ep.spec ?? null;
  const platform = spec?.platforms?.[0] ?? null;

  // Split the body into paragraphs so we can flow them into magazine columns and
  // interleave the pull-quote + Tale-of-the-tape (like the mock). The pull-quote
  // is the shortest punchy sentence from the body (skipping the opening line).
  const bodyParas = (ep.bodyMarkdown || "")
    .split(/\n\n+/)
    .map((p) => stripMd(p.trim()))
    .filter(Boolean);
  const pullQuote = (() => {
    const src = (bodyParas.slice(1).join(" ") || bodyParas.join(" "))
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 45 && s.length <= 130);
    return src.sort((a, b) => a.length - b.length)[0] || null;
  })();

  // Era meta chips fill the opener's left column and add editorial context.
  const metaChips = [
    platform,
    ep.event ? regionName(ep.event.region) : null,
    era.label,
    ep.event ? categoryLabel(ep.event.category) : null,
  ].filter((x): x is string => !!x);

  const specRows: { k: string; v: string }[] = [];
  if (ep.event)
    specRows.push({
      k: "Released",
      v: `${monthName(ep.event.month)} ${ep.event.day}${year ? `, ${year}` : ""}`,
    });
  if (spec?.platforms?.length)
    specRows.push({ k: "Platform", v: spec.platforms.join(", ") });
  if (ep.event) specRows.push({ k: "Region", v: regionName(ep.event.region) });
  if (spec?.genres?.length)
    specRows.push({ k: "Genre", v: spec.genres.join(", ") });
  if (spec?.esrb) specRows.push({ k: "Rating", v: spec.esrb });
  if (ep.event)
    specRows.push({ k: "Moment", v: categoryLabel(ep.event.category) });

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

  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />

      <Box
        position="relative"
        pt={{ base: 20, md: 24 }}
        pb={16}
        overflow="hidden"
      >
        {/* Halftone dot texture — the "print" feel over the navy page */}
        <Box
          position="absolute"
          inset="0"
          pointerEvents="none"
          opacity={0.05}
          css={{
            backgroundImage: "radial-gradient(#cfe0ff 1px, transparent 1.4px)",
            backgroundSize: "5px 5px",
          }}
        />

        <Container maxW="6xl" position="relative">
          {/* MASTHEAD */}
          <Flex
            justify="space-between"
            align="flex-end"
            borderBottom="3px solid"
            borderColor="nexzy.blue"
            pb={2}
          >
            <Box>
              <Heading
                fontFamily="title"
                fontSize={{ base: "3xl", md: "5xl" }}
                lineHeight="0.85"
                color="nexzy.white"
                letterSpacing="0.06em"
              >
                REWIND
              </Heading>
              <Text
                fontFamily="mono"
                fontSize="sm"
                letterSpacing="0.16em"
                color="nexzy.lightBlue"
              >
                THIS DAY IN GAMING
              </Text>
            </Box>
            <Text
              fontFamily="mono"
              fontSize="sm"
              color="nexzy.gray.100"
              textAlign="right"
              lineHeight="1.3"
            >
              {ep.event
                ? `${monthName(ep.event.month).toUpperCase()} ${ep.event.day} · `
                : ""}
              <Box as="span" color="nexzy.gold">
                {year ?? "—"}
              </Box>
              <br />
              {era.label}
            </Text>
          </Flex>

          {/* REWIND SCRUBBER — interactive year travel */}
          <RewindScrubber
            stops={stops}
            currentSlug={slug}
            accent={era.accent}
          />

          {/* FEATURE OPENER — sized title beside the cover */}
          <Box
            display="grid"
            gridTemplateColumns={{ base: "1fr", md: "1.3fr 0.7fr" }}
            gap={{ base: 6, md: 10 }}
            alignItems="start"
            mt={{ base: 6, md: 10 }}
          >
            <Box>
              <Text
                fontFamily="mono"
                fontSize="sm"
                letterSpacing="0.14em"
                color={era.accent}
                mb={2}
              >
                ON THIS DAY
                {ep.event
                  ? ` · ${monthName(ep.event.month).toUpperCase()} ${ep.event.day}`
                  : ""}
                {ya ? ` · ${ya} YEARS AGO` : ""}
              </Text>
              <Heading
                as="h1"
                fontFamily="title"
                fontSize={{ base: "4xl", md: "6xl" }}
                lineHeight="0.95"
                color="nexzy.white"
                textTransform="uppercase"
                mb={4}
              >
                {ep.title}
              </Heading>
              {ep.excerpt && (
                <Text
                  fontFamily={SERIF}
                  fontSize={{ base: "lg", md: "xl" }}
                  color="gray.200"
                  lineHeight="1.5"
                  maxW="48ch"
                >
                  {ep.excerpt}
                </Text>
              )}
              <Text
                fontFamily="mono"
                fontSize="xs"
                color="nexzy.gray.100"
                mt={5}
                letterSpacing="0.08em"
                textTransform="uppercase"
              >
                By{" "}
                <Box as="span" color="nexzy.white">
                  {ep.author || "Nexzy Rewind"}
                </Box>{" "}
                · Nexzy Rewind
              </Text>
              {metaChips.length > 0 && (
                <Flex wrap="wrap" gap={2} mt={5}>
                  {metaChips.map((c) => (
                    <Text
                      key={c}
                      fontFamily="mono"
                      fontSize="11px"
                      letterSpacing="0.08em"
                      textTransform="uppercase"
                      color={era.accent}
                      border="1px solid"
                      borderColor={era.accent}
                      borderRadius="full"
                      px={3}
                      py={1}
                    >
                      {c}
                    </Text>
                  ))}
                </Flex>
              )}
            </Box>

            <Box>
              {ep.heroImageUrl && (
                <Box
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  bg="whiteAlpha.50"
                  borderRadius="lg"
                  p={2}
                >
                  <Image
                    src={ep.heroImageUrl}
                    alt={ep.imageAlt || ep.title}
                    w="100%"
                    borderRadius="md"
                  />
                  <Text
                    fontFamily="mono"
                    fontSize="xs"
                    color="nexzy.gray.100"
                    mt={2}
                  >
                    ▲ {platform || "The box that started it"}
                    {ep.event ? ` · ${monthName(ep.event.month)} ${year}` : ""}
                  </Text>
                </Box>
              )}
            </Box>
          </Box>

          {/* RULE — divider between the opener and the article */}
          <Box h="1px" bg="whiteAlpha.300" my={{ base: 7, md: 9 }} />

          {/* ARTICLE — dark editorial: paragraphs flow into two magazine columns
              with the pull-quote + Tale-of-the-tape interleaved as breakouts. */}
          {bodyParas.length > 0 && (
            <Box
              fontFamily={SERIF}
              css={{
                columnGap: "40px",
                "& > p:first-of-type::first-letter": {
                  float: "left",
                  fontFamily: SERIF,
                  fontSize: "76px",
                  lineHeight: "0.58",
                  fontWeight: 700,
                  color: era.accent,
                  paddingRight: "12px",
                  paddingTop: "6px",
                },
                "@media (min-width: 768px)": { columnCount: 2 },
              }}
            >
              {(() => {
                const flow: ReactNode[] = [];
                bodyParas.forEach((p, i) => {
                  flow.push(
                    <Text
                      as="p"
                      key={`p${i}`}
                      fontSize={{ base: "md", md: "lg" }}
                      lineHeight="1.8"
                      color="gray.200"
                      mb={5}
                      textAlign="justify"
                    >
                      {p}
                    </Text>,
                  );
                  if (i === 1 && pullQuote) {
                    flow.push(
                      <Box
                        key="pull"
                        my={4}
                        py={3}
                        borderTop="2px solid"
                        borderBottom="2px solid"
                        borderColor="nexzy.blue"
                        css={{ breakInside: "avoid" }}
                      >
                        <Text
                          fontFamily="title"
                          fontWeight="700"
                          fontSize={{ base: "xl", md: "2xl" }}
                          lineHeight="1.2"
                          color="nexzy.gold"
                        >
                          &ldquo;{pullQuote}&rdquo;
                        </Text>
                      </Box>,
                    );
                  }
                  if (i === 1 && specRows.length > 0) {
                    flow.push(
                      <Box
                        key="tale"
                        mb={4}
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        bg="whiteAlpha.50"
                        borderRadius="lg"
                        p={4}
                        css={{ breakInside: "avoid" }}
                      >
                        <Text
                          fontFamily="mono"
                          fontSize="11px"
                          letterSpacing="0.16em"
                          color="nexzy.lightBlue"
                          borderBottom="1px solid"
                          borderColor="whiteAlpha.200"
                          pb={2}
                          mb={2}
                        >
                          TALE OF THE TAPE
                        </Text>
                        {specRows.map((row, j) => (
                          <Flex
                            key={row.k}
                            justify="space-between"
                            gap={3}
                            py={1.5}
                            borderBottom={
                              j < specRows.length - 1 ? "1px solid" : "none"
                            }
                            borderColor="whiteAlpha.100"
                          >
                            <Text
                              fontFamily="mono"
                              fontSize="11px"
                              letterSpacing="0.06em"
                              color="nexzy.gray.100"
                              textTransform="uppercase"
                              pt={0.5}
                            >
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
                      </Box>,
                    );
                  }
                });
                return flow;
              })()}
            </Box>
          )}

          {/* THE REEL — era video (follows the article, as in the mock) */}
          {vid && (
            <Box mt={12}>
              <Text
                fontFamily="title"
                fontWeight="700"
                textTransform="uppercase"
                letterSpacing="0.14em"
                fontSize="sm"
                color="nexzy.lightBlue"
                borderBottom="1px solid"
                borderColor="whiteAlpha.200"
                pb={2}
                mb={3}
              >
                Roll the tape ▸ the game in motion
              </Text>
              <RewindVault vid={vid} title={ep.title} year={year} />
            </Box>
          )}

          {/* THEN vs NOW */}
          {tn && (
            <Box
              mt={12}
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="xl"
              overflow="hidden"
            >
              <Text
                textAlign="center"
                fontFamily="title"
                fontWeight="700"
                textTransform="uppercase"
                letterSpacing="0.18em"
                fontSize="sm"
                bg="nexzy.blue"
                color="#001133"
                py={2}
              >
                Then &amp; Now
              </Text>
              <Box
                display="grid"
                gridTemplateColumns={{ base: "1fr", md: "1fr auto 1fr" }}
                gap={{ base: 5, md: 8 }}
                alignItems="start"
                p={{ base: 4, md: 6 }}
              >
                <Box>
                  <Text
                    fontFamily="mono"
                    fontSize="sm"
                    color="green.300"
                    mb={3}
                  >
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
                <Box
                  justifySelf="center"
                  alignSelf={{ md: "center" }}
                  color={era.accent}
                  fontSize="2xl"
                  fontWeight="800"
                  lineHeight="1"
                  transform={{ base: "rotate(90deg)", md: "none" }}
                >
                  →
                </Box>
                <Box>
                  <Text
                    fontFamily="mono"
                    fontSize="sm"
                    color="orange.300"
                    mb={3}
                  >
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
              </Box>
              <Text
                textAlign="center"
                pb={5}
                fontFamily={SERIF}
                fontStyle="italic"
                color="nexzy.white"
                fontSize={{ base: "md", md: "lg" }}
              >
                You used to{" "}
                <Box as="span" fontWeight="700" color="nexzy.gold">
                  own
                </Box>{" "}
                it. Now you just{" "}
                <Box as="span" fontWeight="700" color="nexzy.gold">
                  access
                </Box>{" "}
                it.
              </Text>
            </Box>
          )}

          {/* MORE ON THIS DAY */}
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

          {/* MASTHEAD FOOTER */}
          <Flex
            justify="space-between"
            align="center"
            mt={12}
            pt={4}
            borderTop="3px solid"
            borderColor="nexzy.blue"
            fontFamily="mono"
            fontSize="xs"
            letterSpacing="0.12em"
            color="nexzy.gray.100"
          >
            <Text>
              NEXZY{" "}
              <Box as="span" color="nexzy.gold">
                REWIND
              </Box>
            </Text>
            <Text>A NEW TIME-MACHINE DROP EVERY DAY</Text>
          </Flex>
        </Container>
      </Box>

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
