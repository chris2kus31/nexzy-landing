// Share page for one player rating (Phase 2): "<player> rated <game> 9.1".
// What a shared link opens. Its og:image (opengraph-image.tsx beside it) is
// the rating card. Not indexed: thin per-player pages would compete with the
// hub, which is the page we want ranking.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import { Box, Container, HStack, Heading, Link, Stack, Text } from "@chakra-ui/react";
import { fetchHubReview } from "@/lib/blog/api";
import AppCta from "@/components/blog/AppCta";
import { CRITERIA, hoursLabel, platformLabel } from "@/lib/hubs/reviews";
import { fmtHubDate } from "@/lib/hubs/types";

export const revalidate = 1800;

const SLUG_RE = /^[a-z0-9-]{1,200}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ slug: string; id: string }> };

async function load(slug: string, id: string) {
  if (!SLUG_RE.test(slug) || !UUID_RE.test(id)) return null;
  return fetchHubReview(slug, id);
}

const who = (r: NonNullable<Awaited<ReturnType<typeof load>>>) =>
  r.author ? `@${r.author.username}` : "A Nexzy player";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, id } = await params;
  const r = await load(slug, id);
  if (!r) return { title: "Rating not found", robots: { index: false } };
  const title = `${who(r)} rated ${r.game.name} ${r.score.toFixed(1)}/10`;
  const description = r.body
    ? r.body.slice(0, 160)
    : `See how players rate ${r.game.name} on Nexzy, and add your own score.`;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function RatedPage({ params }: Params) {
  const { slug, id } = await params;
  const r = await load(slug, id);
  if (!r) notFound();
  const hub = `/games/${r.game.slug}`;
  return (
    <Container maxW="3xl" py={{ base: 8, md: 12 }}>
      <Link asChild color="nexzy.lightBlue" fontSize="sm" mb={6} display="inline-block">
        <NextLink href={hub}>{r.game.name} hub</NextLink>
      </Link>

      <Box bg="#1a1f3a" borderRadius="18px" p={{ base: 5, md: 8 }} border="1px solid" borderColor="rgba(255,215,0,0.35)">
        <HStack justify="space-between" align="start" gap={6} flexWrap="wrap">
          <Box minW={0} flex="1">
            <Text fontSize="sm" color="#9aa3bf" letterSpacing="0.08em" textTransform="uppercase">
              Nexzy Players rating
            </Text>
            <Heading as="h1" fontFamily="title" fontSize={{ base: "2xl", md: "4xl" }} color="white" lineHeight="1.15" mt={2}>
              {who(r)} rated {r.game.name}
            </Heading>
            <Text fontSize="sm" color="#9aa3bf" mt={2}>
              {[r.dayOne ? "Day One reviewer" : null, platformLabel(r.platform), hoursLabel(r.hours), fmtHubDate(r.createdAt)]
                .filter(Boolean)
                .join("  ·  ")}
            </Text>
          </Box>
          <Box textAlign="center" flexShrink={0}>
            <Text fontFamily="title" fontSize={{ base: "5xl", md: "6xl" }} color="#FFD700" lineHeight="1">
              {r.score.toFixed(1)}
            </Text>
            <Text fontSize="sm" color="#9aa3bf">
              out of 10
            </Text>
          </Box>
        </HStack>

        <Stack gap={2} mt={6}>
          {CRITERIA.map((c) => {
            const v = r.criteria[c.key];
            return (
              <HStack key={c.key} gap={3}>
                <Text fontSize="sm" color="#c7cde0" w="120px" flexShrink={0}>
                  {c.label}
                </Text>
                <Box flex="1" h="8px" bg="whiteAlpha.200" borderRadius="999px" overflow="hidden">
                  {v != null && <Box h="100%" w={`${(v / 5) * 100}%`} bg="#FFD700" borderRadius="999px" />}
                </Box>
                <Text fontSize="sm" color="#9aa3bf" w="44px" textAlign="right">
                  {v != null ? `${v}/5` : "n/a"}
                </Text>
              </HStack>
            );
          })}
        </Stack>

        {r.body && (
          <Text color="#EDF2F7" mt={6} whiteSpace="pre-line" lineHeight="1.7">
            {r.body}
          </Text>
        )}

        <Box mt={8}>
          <Link
            asChild
            bg="#FFD700"
            color="#0b0e1d"
            fontWeight="700"
            borderRadius="10px"
            px={5}
            py={3}
            display="inline-block"
            _hover={{ textDecoration: "none", opacity: 0.9 }}
          >
            <NextLink href={`${hub}#scores`}>See the score and rate it yourself</NextLink>
          </Link>
        </Box>
      </Box>

      <Box mt={10}>
        <AppCta
          variant="inline"
          location="rating-share"
          heading={`Follow ${r.game.name} on Nexzy`}
          subtext={`News, trailers and player scores for ${r.game.name} in one feed. Free on iOS & Android.`}
        />
      </Box>
    </Container>
  );
}
