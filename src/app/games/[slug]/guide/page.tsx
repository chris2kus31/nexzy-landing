// A game's guide contents: every published guide page, in the order set in
// Admin -> Hub guides -> Pages, plus the checklists and entry lists. 404 when
// the guide is off.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import { Box, Container, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { fetchGameHub } from "@/lib/blog/api";
import { fetchEnginePage } from "@/lib/hub-engine/server";
import { guidePath } from "@/lib/hub-engine/types";
import { G } from "@/components/games/guide/GuideBits";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const [hub, engine] = await Promise.all([
    fetchGameHub(slug),
    fetchEnginePage(slug, 300),
  ]);
  if (!hub || !engine.enabled || !engine.config) return null;
  return {
    config: engine.config,
    pages: engine.pages ?? [],
    counts: engine.typeCounts ?? {},
    short: hub.profile?.aliases?.[0] || hub.game.name,
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return { title: "Guide not found", robots: { index: false } };
  const title = `${d.short} Guide: Walkthrough, Maps and Collectibles`.slice(0, 70);
  const description = `Every page of Nexzy's ${d.short} guide: walkthrough, interactive map, checklists and tips.`;
  return {
    title,
    description,
    alternates: { canonical: `/games/${slug}/guide` },
    // Nothing to index until there are pages.
    ...(d.pages.length ? {} : { robots: { index: false } }),
  };
}

const row = {
  bg: G.panel,
  border: "1px solid",
  borderColor: G.line,
  borderRadius: "12px",
  p: 4,
  _hover: { borderColor: G.gold },
};

export default async function GuideIndex({ params }: Params) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const lists = d.config.types.filter((t) => t.page && (d.counts[t.key] ?? 0) > 0);
  return (
    <Container maxW="4xl" py={{ base: 6, md: 10 }}>
      <Text fontSize="sm" color={G.muted} mb={2}>
        <NextLink href={`/games/${slug}`}>{d.short}</NextLink> / Guide
      </Text>
      <Heading as="h1" fontSize={{ base: "2xl", md: "4xl" }} color="white">
        {d.short} guide
      </Heading>
      <Stack gap={3} mt={6}>
        {d.pages.map((p) => (
          // Spoiler pages: title hidden here (no reader settings on the
          // server); the page itself asks before showing anything.
          <Box key={p.slug}>
            <Box asChild display="block" {...row}>
              <NextLink href={guidePath(slug, p.slug)}>
                <Text color="white" fontWeight="800" fontSize="lg">
                  {p.spoilerStage ? "Spoiler page" : p.title}
                </Text>
                {p.summary && !p.spoilerStage && (
                  <Text color={G.muted} fontSize="sm" mt={1}>
                    {p.summary}
                  </Text>
                )}
              </NextLink>
            </Box>
            {p.children.length > 0 && (
              <Stack gap={1} mt={1} pl={5}>
                {p.children.map((c, i) => (
                  <Flex key={c.slug} asChild gap={3} py={1.5} color={G.text}>
                    <NextLink href={guidePath(slug, c.slug)}>
                      <Text color={G.gold} fontWeight="800" minW="24px">
                        {i + 1}
                      </Text>
                      <Text _hover={{ textDecoration: "underline" }}>
                        {c.spoilerStage ? "Spoiler step" : c.title}
                      </Text>
                    </NextLink>
                  </Flex>
                ))}
              </Stack>
            )}
          </Box>
        ))}
        {!d.pages.length && (
          <Text color={G.muted}>Guide pages are on the way.</Text>
        )}
      </Stack>
      {(d.config.checklists.length > 0 || lists.length > 0 || d.config.maps.length > 0) && (
        <Stack gap={2} mt={10}>
          <Heading as="h2" fontSize="lg" color="white" mb={1}>
            Maps, checklists and lists
          </Heading>
          {d.config.maps.length > 0 && (
            <NextLink href={`/games/${slug}/map`} style={{ color: G.gold }}>
              Interactive map
            </NextLink>
          )}
          {d.config.checklists.map((c) => (
            <NextLink
              key={c.key}
              href={`/games/${slug}/checklist/${c.key}`}
              style={{ color: G.gold }}
            >
              {c.title}
            </NextLink>
          ))}
          {lists.map((t) => (
            <NextLink key={t.key} href={`/games/${slug}/${t.key}`} style={{ color: G.gold }}>
              All {t.plural} ({d.counts[t.key]})
            </NextLink>
          ))}
        </Stack>
      )}
    </Container>
  );
}
