// A trend's public page (nexzyapp.com/t/<slug>): what it is, the builder
// (no account needed), the most picked games and the top entries. Shared
// links land here (?s=<source> counts the visit). 404 while the API's
// TRENDS_ENABLED is off, or for a draft / removed trend.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import {
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import AppCta from "@/components/blog/AppCta";
import TrendBuilder from "@/components/trends/TrendBuilder";
import TrendPing from "@/components/trends/TrendPing";
import EntryCard from "@/components/trends/EntryCard";
import {
  fetchTrend,
  fetchTrendEntries,
  fetchTrendPicks,
} from "@/lib/trends/server";
import { SITE_URL, SLUG_RE, webBuildable } from "@/lib/trends/types";

export const revalidate = 120;

type Params = { params: Promise<{ slug: string }> };

const num = (n: number) => n.toLocaleString("en-US");

async function load(slug: string) {
  if (!SLUG_RE.test(slug) || slug.length > 60) return null;
  return fetchTrend(slug);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = await load(slug);
  if (!t) return { title: "Trend not found", robots: { index: false } };
  // Same request as the page (12), so Next serves both from one fetch.
  const [top] = await fetchTrendEntries(slug, "top", 12).catch(() => []);
  const title = `#${t.hashtag}: ${t.title}`;
  const description =
    t.description ||
    `${t.title}. Pick yours, get your image, and see who matches you on Nexzy.`;
  const image = top?.trend?.images?.link;
  const url = `${SITE_URL}/t/${t.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
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

export default async function TrendPage({ params }: Params) {
  const { slug } = await params;
  const t = await load(slug);
  if (!t) notFound();
  const [picks, entries] = await Promise.all([
    fetchTrendPicks(slug),
    fetchTrendEntries(slug, "top", 12),
  ]);

  return (
    <Box bg="#151935" minH="100vh" color="#F4F5FA">
      <TrendPing slug={t.slug} page="trend" />
      <Container maxW="1200px" py={{ base: 6, md: 10 }} px={{ base: 4, md: 6 }}>
        <Flex gap={{ base: 6, md: 8 }} wrap="wrap" align="flex-start">
          <Stack flex="1 1 460px" minW={0} gap={4}>
            <Text
              fontSize="sm"
              fontWeight="700"
              color="#9AA1C7"
              letterSpacing="1px"
            >
              <NextLink href="/trends">TRENDS</NextLink>
            </Text>
            <Heading
              as="h1"
              fontSize={{ base: "4xl", md: "6xl" }}
              fontWeight="800"
              color="#FFD24A"
              letterSpacing="-1px"
              lineHeight="1.05"
              wordBreak="break-word"
            >
              #{t.hashtag}
            </Heading>
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="700">
              {t.title}
            </Text>
            {t.description && <Text color="#B8BEDB">{t.description}</Text>}
            <HStack gap={6} wrap="wrap" color="#B8BEDB" fontSize="sm">
              <Text>
                <Text as="b" color="white" fontSize="xl">
                  {num(t.entryCount)}
                </Text>{" "}
                {t.entryCount === 1 ? "entry" : "entries"}
              </Text>
              {t.entryCountToday > 0 && (
                <Text>
                  <Text as="b" color="white" fontSize="xl">
                    {num(t.entryCountToday)}
                  </Text>{" "}
                  today
                </Text>
              )}
              {t.startedBy && <Text>Started by @{t.startedBy}</Text>}
            </HStack>
            <Box mt={2}>
              {webBuildable(t) ? (
                <TrendBuilder trend={t} />
              ) : (
                <Box
                  p={5}
                  borderRadius="18px"
                  bg="#1E2346"
                  border="1px solid #2C335F"
                >
                  <Text fontWeight="800" fontSize="lg">
                    Make this one in the Nexzy app
                  </Text>
                  <Text color="#9AA1C7" mt={1}>
                    This trend has steps the app does best. Get it free, then
                    open this link again.
                  </Text>
                </Box>
              )}
            </Box>
          </Stack>

          <Stack flex="1 1 380px" minW={0} gap={5}>
            <AppCta
              variant="inline"
              location="trend_page"
              heading="See who matches you"
              subtext="In the Nexzy app every entry shows how many picks you share. Get reactions, keep your picks on your profile, see the full rankings."
            />

            {picks.length > 0 && (
              <Box>
                <Text fontSize="lg" fontWeight="800" mb={3}>
                  Most picked on Nexzy
                </Text>
                <SimpleGrid columns={3} gap={3}>
                  {picks.slice(0, 6).map((p, i) => (
                    <Stack key={p.gameId} gap={1.5} minW={0}>
                      <Box
                        borderRadius="10px"
                        overflow="hidden"
                        aspectRatio="4 / 3"
                        bg="#232A52"
                      >
                        {p.cover && (
                          <Image
                            src={p.cover}
                            alt=""
                            w="100%"
                            h="100%"
                            objectFit="cover"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </Box>
                      <Text fontSize="sm" fontWeight="700" lineClamp={2}>
                        {i + 1}{" "}
                        {p.slug ? (
                          <NextLink href={`/games/${p.slug}`}>
                            {p.name}
                          </NextLink>
                        ) : (
                          p.name
                        )}
                      </Text>
                      <Text fontSize="xs" color="#9AA1C7">
                        {p.percent}% of entries
                      </Text>
                    </Stack>
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {entries.length > 0 && (
              <Box>
                <Text fontSize="lg" fontWeight="800" mb={3}>
                  Top entries this week
                </Text>
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
                <Text fontSize="sm" color="#9AA1C7" mt={3}>
                  See every entry, and who matches you, in the Nexzy app.
                </Text>
              </Box>
            )}
          </Stack>
        </Flex>
      </Container>
    </Box>
  );
}
