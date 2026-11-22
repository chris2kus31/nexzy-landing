// One drop (nexzyapp.com/drops/<slug>): what it asks, the builder (no
// account needed), who matches (in the app), the most picked games and the
// top builds this week. Shared links land here (?s=<source> counts the
// visit). 404 while the API's TRENDS_ENABLED is off, or for a draft or
// removed drop. Old /t/<slug> links 301 here (next.config.ts).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import {
  Box,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import TrendBuilder from "@/components/trends/TrendBuilder";
import TrendPing from "@/components/trends/TrendPing";
import EntryCard from "@/components/trends/EntryCard";
import MostPicked from "@/components/drops/MostPicked";
import NextDropStrip from "@/components/drops/NextDropStrip";
import StoreButtons from "@/components/drops/StoreButtons";
import { D, num, shortDate } from "@/components/drops/tokens";
import {
  fetchTrend,
  fetchTrendEntries,
  fetchTrendPicks,
} from "@/lib/trends/server";
import { jsonLdString } from "@/lib/seo/jsonld";
import {
  SITE_URL,
  SLUG_RE,
  dropPath,
  gameHref,
  pickRange,
  webBuildable,
} from "@/lib/trends/types";

export const revalidate = 120;

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!SLUG_RE.test(slug) || slug.length > 60) return null;
  return fetchTrend(slug);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = await load(slug);
  if (!t) return { title: "Drop not found", robots: { index: false } };
  // Same request as the page (12), so Next serves both from one fetch.
  const [top] = await fetchTrendEntries(slug, "top", 12).catch(() => []);
  const title = `#${t.hashtag}: ${t.title} | Nexzy Drops`;
  const description =
    t.description ||
    `${t.title}. Make your build, share it, and see who matches you on Nexzy.`;
  const image = top?.trend?.images?.link;
  const url = `${SITE_URL}${dropPath(t.slug)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // A player drop is on the website only once Nexzy turns it on; until
    // then its page opens from a shared link but stays out of search.
    ...(t.webVisible === false
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      title,
      description,
      url,
      type: "website",
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function DropPage({ params }: Params) {
  const { slug } = await params;
  const t = await load(slug);
  if (!t) notFound();
  const [picks, entries] = await Promise.all([
    fetchTrendPicks(slug),
    fetchTrendEntries(slug, "top", 12),
  ]);
  const soon = !!t.startsAt && Date.parse(t.startsAt) > Date.now();
  const builds = t.entryCount + (t.buildCount ?? 0);
  const { max } = pickRange(t);
  const url = `${SITE_URL}${dropPath(t.slug)}`;

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `#${t.hashtag}: ${t.title}`,
      description: t.description || t.title,
      url,
      isPartOf: { "@type": "WebSite", name: "Nexzy", url: SITE_URL },
      ...(picks.length
        ? {
            mainEntity: {
              "@type": "ItemList",
              name: `Most picked games in #${t.hashtag}`,
              numberOfItems: Math.min(picks.length, 10),
              itemListElement: picks.slice(0, 10).map((p, i) => {
                const href = gameHref(p);
                return {
                  "@type": "ListItem",
                  position: i + 1,
                  name: `${p.name} (on ${p.percent}% of builds)`,
                  ...(href ? { url: `${SITE_URL}${href}` } : {}),
                };
              }),
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Nexzy", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Drops",
          item: `${SITE_URL}/drops`,
        },
        { "@type": "ListItem", position: 3, name: `#${t.hashtag}`, item: url },
      ],
    },
  ];

  return (
    <Box position="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }}
      />
      <TrendPing slug={t.slug} page="trend" />
      <Box
        position="absolute"
        top="-80px"
        left="-160px"
        w="720px"
        h="720px"
        pointerEvents="none"
        bg="radial-gradient(circle, rgba(255,210,74,0.14), transparent 62%)"
      />
      <Container
        maxW="1200px"
        py={{ base: 6, md: 12 }}
        px={{ base: 4, md: 10 }}
        position="relative"
      >
        <Flex gap={{ base: 8, md: 12 }} wrap="wrap" align="flex-start">
          <Stack flex="1 1 460px" minW={0} gap={4}>
            <Flex gap={2} align="center" fontSize="sm">
              <NextLink
                href="/drops"
                style={{ color: D.yellow, fontWeight: 700 }}
              >
                Nexzy Drops
              </NextLink>
              <Text color={D.muted}>Pick {max}</Text>
            </Flex>
            <Heading
              as="h1"
              fontFamily="title"
              fontWeight="700"
              fontSize={{ base: "5xl", md: "7xl" }}
              color={D.yellow}
              letterSpacing="-1px"
              lineHeight="0.95"
              wordBreak="break-word"
            >
              #{t.hashtag}
            </Heading>
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800">
              {t.title}
            </Text>
            {t.description && (
              <Text color={D.dim} lineHeight="1.6">
                {t.description}
              </Text>
            )}
            <Flex gap={8} wrap="wrap">
              {builds > 0 && (
                <Box>
                  <Text
                    fontFamily="title"
                    fontWeight="700"
                    fontSize="3xl"
                    lineHeight="1"
                  >
                    {num(builds)}
                  </Text>
                  <Text fontSize="sm" color={D.muted} mt={1}>
                    {builds === 1 ? "build" : "builds"}
                  </Text>
                </Box>
              )}
              {t.entryCountToday > 0 && (
                <Box>
                  <Text
                    fontFamily="title"
                    fontWeight="700"
                    fontSize="3xl"
                    lineHeight="1"
                  >
                    {num(t.entryCountToday)}
                  </Text>
                  <Text fontSize="sm" color={D.muted} mt={1}>
                    posted today
                  </Text>
                </Box>
              )}
              {picks[0] && (
                <Box>
                  <Text
                    fontFamily="title"
                    fontWeight="700"
                    fontSize="3xl"
                    lineHeight="1"
                  >
                    {picks[0].percent}%
                  </Text>
                  <Text fontSize="sm" color={D.muted} mt={1}>
                    picked {picks[0].name}
                  </Text>
                </Box>
              )}
              {t.endsAt && !soon && (
                <Box>
                  <Text
                    fontFamily="title"
                    fontWeight="700"
                    fontSize="3xl"
                    lineHeight="1"
                  >
                    {shortDate(t.endsAt)}
                  </Text>
                  <Text fontSize="sm" color={D.muted} mt={1}>
                    {t.joinable ? "last day" : "ended"}
                  </Text>
                </Box>
              )}
              {t.startedBy && (
                <Text alignSelf="flex-end" fontSize="sm" color={D.muted}>
                  Started by @{t.startedBy}
                </Text>
              )}
            </Flex>
            <Box mt={2}>
              {soon ? (
                <NextDropStrip
                  label="Drops"
                  drop={{
                    slug: t.slug,
                    hashtag: t.hashtag,
                    title: t.title,
                    startsAt: t.startsAt,
                    covers: [],
                  }}
                />
              ) : webBuildable(t) ? (
                <TrendBuilder trend={t} />
              ) : (
                <Box
                  p={5}
                  borderRadius="18px"
                  bg={D.panel}
                  border="1px solid"
                  borderColor={D.line}
                >
                  <Text fontWeight="800" fontSize="lg">
                    Make this one in the Nexzy app
                  </Text>
                  <Text color={D.muted} mt={1}>
                    This drop has steps the app does best. Get it free, then
                    open this link again.
                  </Text>
                  <Box mt={4}>
                    <StoreButtons location="drop_app_only" />
                  </Box>
                </Box>
              )}
            </Box>
          </Stack>

          <Stack flex="1 1 380px" minW={0} gap={8}>
            <Box
              p={5}
              borderRadius="18px"
              border="1px solid rgba(110,139,255,0.45)"
              bg="linear-gradient(135deg, rgba(59,107,255,0.20), rgba(26,31,71,0.7))"
            >
              <Text fontSize="xs" fontWeight="800" color={D.blueSoft}>
                In the app
              </Text>
              <Text fontFamily="title" fontWeight="700" fontSize="2xl" mt={1}>
                Find your player 2
              </Text>
              <Text color={D.dim} fontSize="sm" mt={1.5} lineHeight="1.55">
                Post your build and see every player who picked the same games.
                Follow the ones you match, then start a Squad Room together.
              </Text>
              <Box mt={4}>
                <StoreButtons location="drop_page" />
              </Box>
            </Box>

            {picks.length > 0 && (
              <Box>
                <Heading
                  as="h2"
                  fontFamily="title"
                  fontWeight="700"
                  fontSize="2xl"
                  mb={3}
                >
                  Most picked
                </Heading>
                <MostPicked
                  drops={[{ slug: t.slug, hashtag: t.hashtag, picks }]}
                  rows={8}
                />
              </Box>
            )}

            {entries.length > 0 && (
              <Box>
                <Heading
                  as="h2"
                  fontFamily="title"
                  fontWeight="700"
                  fontSize="2xl"
                  mb={3}
                >
                  Top builds this week
                </Heading>
                <SimpleGrid columns={2} gap={3}>
                  {entries.map((e) => (
                    <EntryCard
                      key={e.id}
                      slug={t.slug}
                      hashtag={t.hashtag}
                      entry={e}
                    />
                  ))}
                </SimpleGrid>
                <Text fontSize="sm" color={D.muted} mt={3}>
                  See every build, and who matches you, in the Nexzy app.
                </Text>
              </Box>
            )}
          </Stack>
        </Flex>
      </Container>
    </Box>
  );
}
