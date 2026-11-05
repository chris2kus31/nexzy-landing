// Every entry of one guide type ("All Dungeons", "All Characters") as one
// indexable page. Only types with page: true get one; anything else 404s.
// The hub's "Browse the guide" tiles land here.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import { Container, Heading, Text } from "@chakra-ui/react";
import { fetchGameHub } from "@/lib/blog/api";
import {
  fetchEnginePage,
  fetchEngineTypeEntries,
} from "@/lib/hub-engine/server";
import { WALKTHROUGH_KEY, typeOf } from "@/lib/hub-engine/types";
import { G } from "@/components/games/guide/GuideBits";
import { GuideTypeList } from "@/components/games/guide/GuideSections";
import { jsonLdString } from "@/lib/seo/jsonld";

export const revalidate = 300;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const KEY_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

type Params = { params: Promise<{ slug: string; type: string }> };

async function load(slug: string, type: string) {
  if (!KEY_RE.test(type)) return null;
  const [hub, engine] = await Promise.all([
    fetchGameHub(slug),
    fetchEnginePage(slug, 300),
  ]);
  if (!hub || !engine.enabled || !engine.config) return null;
  const t = typeOf(engine.config, type);
  if (!t?.page) return null;
  const fetched = await fetchEngineTypeEntries(slug, type);
  // Story types keep the guide's order (walkthrough steps); everything else
  // reads best A to Z.
  const story = engine.config.checklists.some(
    (c) => c.key === WALKTHROUGH_KEY && c.filter.types.includes(type),
  );
  const items = story
    ? fetched
    : [...fetched].sort((a, b) => a.title.localeCompare(b.title, "en"));
  return {
    config: engine.config,
    t,
    items,
    short: hub.profile?.aliases?.[0] || hub.game.name,
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, type } = await params;
  const d = await load(slug, type);
  if (!d) return { title: "Not found", robots: { index: false } };
  const n = d.items.length;
  const title = `All ${n ? `${n} ` : ""}${d.t.plural} in ${d.short}`.slice(
    0,
    70,
  );
  const description =
    `Every ${d.t.label.toLowerCase()} in ${d.short}, with where to find it and a free tracker.`.slice(
      0,
      160,
    );
  return {
    title,
    description,
    alternates: { canonical: `/games/${slug}/${type}` },
    openGraph: { title, description, type: "website" },
    // An empty list is not worth indexing yet.
    ...(n ? {} : { robots: { index: false } }),
  };
}

export default async function GuideTypePage({ params }: Params) {
  const { slug, type } = await params;
  const d = await load(slug, type);
  if (!d) notFound();
  const url = `${SITE_URL}/games/${slug}/${type}`;
  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${d.short} ${d.t.plural}`,
    url,
    // Only what the default (no spoilers) view shows, so structured data
    // matches the visible list and never names late-game entries.
    numberOfItems: d.items.filter((e) => !e.spoilerStage).length,
    itemListElement: d.items
      .filter((e) => !e.spoilerStage)
      .slice(0, 100)
      .map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/games/${slug}/${type}/${e.slug}`,
        name: e.title,
      })),
  };
  return (
    <Container maxW="5xl" py={{ base: 6, md: 10 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(list) }}
      />
      <Text fontSize="sm" color={G.muted} mb={2}>
        <NextLink href={`/games/${slug}`}>{d.short}</NextLink> / Guide
      </Text>
      <Heading
        as="h1"
        fontSize={{ base: "2xl", md: "4xl" }}
        color="white"
        lineHeight="1.15"
      >
        {d.short} {d.t.plural}
      </Heading>
      <Text color={G.muted} mt={2} mb={6}>
        {d.items.length
          ? `All ${d.items.length} in the Nexzy guide.`
          : "Entries are being added."}
      </Text>
      {d.items.length > 0 && (
        <GuideTypeList slug={slug} config={d.config} items={d.items} />
      )}
      <Text fontSize="xs" color={G.muted} mt={8}>
        Unofficial guide by Nexzy.
      </Text>
    </Container>
  );
}
