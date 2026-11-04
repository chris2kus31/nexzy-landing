// One checklist from a game's guide ("All Gold Skulltulas"), with ticks
// saved to the reader's browser or account. Indexable: the full list is in
// the server HTML for search.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import { Container, Heading, Text } from "@chakra-ui/react";
import { fetchGameHub } from "@/lib/blog/api";
import { fetchEngineChecklist, fetchEnginePage } from "@/lib/hub-engine/server";
import GuideChecklist from "@/components/games/guide/GuideChecklist";
import { G } from "@/components/games/guide/GuideBits";

export const revalidate = 300;
const KEY_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

type Params = { params: Promise<{ slug: string; key: string }> };

async function load(slug: string, key: string) {
  if (!KEY_RE.test(key)) return null;
  const [hub, engine, list] = await Promise.all([
    fetchGameHub(slug),
    fetchEnginePage(slug, 300),
    fetchEngineChecklist(slug, key),
  ]);
  if (!hub || !engine.enabled || !engine.config || !list) return null;
  return {
    config: engine.config,
    list,
    short: hub.profile?.aliases?.[0] || hub.game.name,
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, key } = await params;
  const d = await load(slug, key);
  if (!d) return { title: "Checklist not found", robots: { index: false } };
  const n = d.list.items.length;
  const title = `${d.short}: All ${d.list.title}${n ? ` (${n})` : ""}`;
  const description = (
    d.list.description ||
    `Every ${d.list.title.toLowerCase()} in ${d.short}, with locations and a free tracker that saves your progress.`
  ).slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/games/${slug}/checklist/${key}` },
    openGraph: { title, description, type: "article" },
  };
}

export default async function ChecklistPage({ params }: Params) {
  const { slug, key } = await params;
  const d = await load(slug, key);
  if (!d) notFound();
  return (
    <Container maxW="4xl" py={{ base: 6, md: 10 }}>
      <Text fontSize="sm" color={G.muted} mb={2}>
        <NextLink href={`/games/${slug}`}>{d.short}</NextLink> / Checklist
      </Text>
      <Heading
        as="h1"
        fontSize={{ base: "2xl", md: "4xl" }}
        color="white"
        mb={2}
      >
        {d.short}: {d.list.title}
      </Heading>
      {d.list.description && (
        <Text color={G.muted} mb={4}>
          {d.list.description}
        </Text>
      )}
      <Text fontSize="sm" mb={4}>
        <NextLink
          href={`/games/${slug}/map`}
          style={{ color: G.gold, textDecoration: "underline" }}
        >
          See them on the map
        </NextLink>
      </Text>
      <GuideChecklist slug={slug} config={d.config} list={d.list} />
    </Container>
  );
}
