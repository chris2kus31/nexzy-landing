// A game's guide contents: every published guide page, in the order set in
// Admin -> Hub guides -> Pages, plus the checklists and entry lists. 404 when
// the guide is off.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import { Box, Container, Heading, Text } from "@chakra-ui/react";
import { fetchGameHub } from "@/lib/blog/api";
import { fetchEnginePage } from "@/lib/hub-engine/server";
import { G } from "@/components/games/guide/GuideBits";
import GuideIndexBody from "@/components/games/guide/GuideIndexBody";

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
  const title = `${d.short} Guide: Walkthrough, Maps and Collectibles`.slice(
    0,
    70,
  );
  const description = `Every page of Nexzy's ${d.short} guide: walkthrough, interactive map, checklists and tips.`;
  return {
    title,
    description,
    alternates: { canonical: `/games/${slug}/guide` },
    // Nothing to index until there are pages.
    ...(d.pages.length || Object.keys(d.counts).length
      ? {}
      : { robots: { index: false } }),
  };
}

export default async function GuideIndex({ params }: Params) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  return (
    <Container maxW="7xl" py={{ base: 6, md: 10 }}>
      <Text fontSize="sm" color={G.muted} mb={2}>
        <NextLink href={`/games/${slug}`}>{d.short}</NextLink> / Guide
      </Text>
      <Heading as="h1" fontSize={{ base: "2xl", md: "4xl" }} color="white">
        {d.short} guide
      </Heading>
      <Box mt={6}>
        <GuideIndexBody
          slug={slug}
          config={d.config}
          pages={d.pages}
          counts={d.counts}
        />
      </Box>
    </Container>
  );
}
