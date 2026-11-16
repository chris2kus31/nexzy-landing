// One trend entry (nexzyapp.com/t/<slug>/<entryId>): the link a shared entry
// carries. Its link preview is the entry's own 1.91:1 image, so X, Facebook
// and iMessage show the picks. Then: "Do you match? Make yours". Not indexed
// (it is one person's post); the trend page is the indexed one.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Image,
  Stack,
  Text,
} from "@chakra-ui/react";
import AppCta from "@/components/blog/AppCta";
import TrendPing from "@/components/trends/TrendPing";
import { fetchTrend, fetchTrendEntry } from "@/lib/trends/server";
import { SITE_URL, SLUG_RE, UUID_RE } from "@/lib/trends/types";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string; entry: string }> };

async function load(slug: string, entry: string) {
  if (!SLUG_RE.test(slug) || slug.length > 60 || !UUID_RE.test(entry))
    return null;
  const [t, e] = await Promise.all([
    fetchTrend(slug),
    fetchTrendEntry(slug, entry),
  ]);
  return t && e ? { t, e } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, entry } = await params;
  const r = await load(slug, entry);
  if (!r) return { title: "Entry not found", robots: { index: false } };
  const { t, e } = r;
  const who = `@${e.entry.author.username}`;
  const title = `${who}'s #${t.hashtag}`;
  const names = e.picks
    .slice(0, 3)
    .map((p) => p.name)
    .join(", ");
  const description = `${t.title}: ${names}${e.picks.length > 3 ? " and more" : ""}. Do you match? Make yours on Nexzy.`;
  const image = e.entry.trend?.images?.link;
  const url = `${SITE_URL}/t/${t.slug}/${e.entry.id}`;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
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

export default async function TrendEntryPage({ params }: Params) {
  const { slug, entry } = await params;
  const r = await load(slug, entry);
  if (!r) notFound();
  const { t, e } = r;
  const img = e.entry.trend?.images?.portrait ?? null;

  return (
    <Box bg="#151935" minH="100vh" color="#F4F5FA">
      <TrendPing slug={t.slug} page="entry" />
      <Container maxW="1100px" py={{ base: 6, md: 10 }} px={{ base: 4, md: 6 }}>
        <Flex gap={{ base: 6, md: 10 }} wrap="wrap" align="flex-start">
          <Box flex="1 1 360px" minW={0} maxW="520px" mx="auto">
            <Box
              borderRadius="16px"
              overflow="hidden"
              border="1px solid #2C335F"
              bg="#1E2346"
            >
              {img ? (
                <Image
                  src={img}
                  alt={`@${e.entry.author.username}'s #${t.hashtag}`}
                  w="100%"
                  h="auto"
                />
              ) : (
                <Flex aspectRatio="4 / 5" align="center" justify="center">
                  <Text color="#5A6399">The image is on its way.</Text>
                </Flex>
              )}
            </Box>
          </Box>

          <Stack flex="1 1 380px" minW={0} gap={4}>
            <Text
              fontSize="sm"
              fontWeight="700"
              color="#9AA1C7"
              letterSpacing="1px"
            >
              <NextLink href={`/t/${t.slug}`}>
                #{t.hashtag.toUpperCase()}
              </NextLink>
            </Text>
            <Heading
              as="h1"
              fontSize={{ base: "3xl", md: "4xl" }}
              fontWeight="800"
              lineHeight="1.1"
            >
              @{e.entry.author.username}&apos;s #{t.hashtag}
            </Heading>
            <Text color="#B8BEDB" fontSize="lg">
              {t.title}
            </Text>
            <Stack as="ol" gap={2} listStyleType="none" m={0} p={0}>
              {e.picks.map((p, i) => (
                <HStack as="li" key={p.id} gap={3} align="flex-start">
                  <Flex
                    w="26px"
                    h="26px"
                    flexShrink={0}
                    borderRadius="full"
                    bg="#FFD24A"
                    color="#151935"
                    fontSize="xs"
                    fontWeight="800"
                    align="center"
                    justify="center"
                  >
                    {p.badge ?? i + 1}
                  </Flex>
                  <Box minW={0}>
                    <Text fontWeight="700">
                      {p.slug ? (
                        <NextLink href={`/games/${p.slug}`}>{p.name}</NextLink>
                      ) : (
                        p.name
                      )}
                    </Text>
                    {p.reason && (
                      <Text fontSize="sm" color="#9AA1C7">
                        {p.reason}
                      </Text>
                    )}
                  </Box>
                </HStack>
              ))}
            </Stack>
            <Text fontSize="sm" color="#9AA1C7">
              {e.entry.likeCount.toLocaleString("en-US")}{" "}
              {e.entry.likeCount === 1 ? "heart" : "hearts"} on Nexzy
            </Text>
            {t.joinable && (
              <Button
                asChild
                h="50px"
                borderRadius="12px"
                bg="#FFD24A"
                color="#151935"
                fontWeight="800"
                fontSize="md"
                alignSelf="flex-start"
                px={6}
              >
                <NextLink href={`/t/${t.slug}#make`}>
                  Do you match? Make yours
                </NextLink>
              </Button>
            )}
            <AppCta
              variant="inline"
              location="trend_entry"
              heading="React and see who matches"
              subtext="Heart this, compare your picks and follow the people who match you in the Nexzy app."
            />
          </Stack>
        </Flex>
      </Container>
    </Box>
  );
}
