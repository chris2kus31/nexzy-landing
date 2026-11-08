// One guide entry (a location, collectible, mission, character...) as its
// own indexable page. Everything shown is driven by the entry's type in the
// game's template: its fields in order, links both ways, its pins.
// Only types with page: true get a page; anything else 404s.
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import NextLink from "next/link";
import NextImage from "next/image";
import {
  Box,
  Container,
  Flex,
  HStack,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";
import { fetchGameHub } from "@/lib/blog/api";
import {
  fetchEngineChecklist,
  fetchEngineEntry,
  fetchEnginePage,
} from "@/lib/hub-engine/server";
import { guidePath, isStory, typeOf } from "@/lib/hub-engine/types";
import GuideStepNav, {
  type StepRef,
} from "@/components/games/guide/GuideStepNav";
import {
  FieldValue,
  G,
  hasFieldValue,
  LinkChips,
  TypeChip,
  UnconfirmedBadge,
} from "@/components/games/guide/GuideBits";
import GuideMapScreen from "@/components/games/guide/GuideMapScreen";
import { bestPin, floorsOf } from "@/lib/hub-engine/maps";
import { jsonLdString } from "@/lib/seo/jsonld";

export const revalidate = 300;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const KEY_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Params = {
  params: Promise<{ slug: string; type: string; entry: string }>;
};

async function load(slug: string, type: string, entrySlug: string) {
  if (!KEY_RE.test(type) || !SLUG_RE.test(entrySlug) || entrySlug.length > 80)
    return null;
  const [hub, engine, entry] = await Promise.all([
    fetchGameHub(slug),
    fetchEnginePage(slug, 300),
    fetchEngineEntry(slug, entrySlug),
  ]);
  if (
    !hub ||
    !engine.enabled ||
    !engine.config ||
    !entry ||
    entry.type !== type
  )
    return null;
  const t = typeOf(engine.config, type);
  // Types without their own page (chests, enemies...) live on the map.
  if (t && !t.page && entry.pins.length) return { mapOnly: true as const };
  if (!t?.page) return null;
  return {
    config: engine.config,
    entry,
    t,
    short: hub.profile?.aliases?.[0] || hub.game.name,
    step: await storyStep(slug, engine.config.checklists, type, entry.id),
  };
}

/** Where this entry sits in the story walkthrough (a checklist with the
 *  Story switch that lists its type), or null. A failed list read only
 *  drops the step controls, never the page. */
async function storyStep(
  slug: string,
  checklists: { key: string; story?: boolean; filter: { types: string[] } }[],
  type: string,
  entryId: string,
) {
  // An empty type list means every type.
  const c = checklists.find(
    (x) =>
      isStory(x) && (!x.filter.types.length || x.filter.types.includes(type)),
  );
  if (!c) return null;
  const list = await fetchEngineChecklist(slug, c.key).catch(() => null);
  const i = list ? list.items.findIndex((x) => x.id === entryId) : -1;
  if (!list || i < 0) return null;
  const ref = (n: number): StepRef | null => {
    const x = list.items[n];
    return x
      ? {
          slug: x.slug,
          type: x.type,
          title: x.title,
          spoilerStage: x.spoilerStage,
        }
      : null;
  };
  return {
    key: list.key,
    title: list.title,
    position: i + 1,
    total: list.items.length,
    prev: ref(i - 1),
    next: ref(i + 1),
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, type, entry } = await params;
  const d = await load(slug, type, entry);
  if (!d) return { title: "Not found", robots: { index: false } };
  if ("mapOnly" in d) return { robots: { index: false } };
  const title = `${d.entry.title} - ${d.short} ${d.t.label}`.slice(0, 70);
  const description = (
    d.entry.summary ||
    `${d.entry.title}: where it is in ${d.short}, how to get it and what it links to.`
  ).slice(0, 160);
  const img = d.entry.media[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/games/${slug}/${type}/${entry}` },
    openGraph: {
      title,
      description,
      type: "article",
      ...(img ? { images: [img] } : {}),
    },
  };
}

export default async function GuideEntryPage({ params }: Params) {
  const { slug, type, entry: entrySlug } = await params;
  const d = await load(slug, type, entrySlug);
  if (!d) notFound();
  if ("mapOnly" in d)
    redirect(`/games/${slug}/map?entry=${encodeURIComponent(entrySlug)}`);
  // A guide page covers this entry (a walkthrough step): one page, not two.
  if (d.entry.guidePage) redirect(guidePath(slug, d.entry.guidePage.slug));
  const { config, entry, t } = d;
  const pin = bestPin(config, entry.pins);
  const map = pin ? config.maps.find((m) => m.key === pin.map) : undefined;
  const url = `${SITE_URL}/games/${slug}/${type}/${entrySlug}`;
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: d.short,
        item: `${SITE_URL}/games/${slug}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t.plural,
        // The type's own list page (every page: true type has one).
        item: `${SITE_URL}/games/${slug}/${type}`,
      },
      { "@type": "ListItem", position: 3, name: entry.title, item: url },
    ],
  };
  const typeLabel = (k: string) => typeOf(config, k)?.plural ?? k;
  return (
    <Container maxW="4xl" py={{ base: 6, md: 10 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(crumbs) }}
      />
      <Text fontSize="sm" color={G.muted} mb={2}>
        <NextLink href={`/games/${slug}`}>{d.short}</NextLink> /{" "}
        <NextLink href={`/games/${slug}/${type}`}>{t.plural}</NextLink>
      </Text>
      {d.step && (
        <Text
          fontSize="xs"
          fontWeight="800"
          color={G.gold}
          textTransform="uppercase"
          letterSpacing="0.08em"
          mb={1}
        >
          Step {d.step.position} of {d.step.total}
        </Text>
      )}
      <HStack gap={2} mb={2} wrap="wrap">
        <TypeChip config={config} type={entry.type} />
        {entry.status === "unconfirmed" && (
          <UnconfirmedBadge label={config.features.unconfirmedLabel} />
        )}
      </HStack>
      <Heading
        as="h1"
        fontSize={{ base: "2xl", md: "4xl" }}
        color="white"
        lineHeight="1.15"
      >
        {entry.title}
      </Heading>
      {entry.summary && (
        <Text color={G.text} fontSize="lg" mt={3}>
          {entry.summary}
        </Text>
      )}

      {entry.media[0] && (
        <Box
          position="relative"
          w="100%"
          h={{ base: "220px", md: "380px" }}
          mt={5}
          borderRadius="14px"
          overflow="hidden"
        >
          <NextImage
            src={entry.media[0].url}
            alt={entry.media[0].alt ?? entry.title}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 860px"
            style={{ objectFit: "cover" }}
          />
        </Box>
      )}

      <Stack gap={5} mt={6}>
        {t.fields.map((f) => {
          const v = entry.fields[f.key];
          // hasFieldValue mirrors what FieldValue draws, so no label ever
          // shows with nothing under it (and FieldValue stays a component,
          // never called as a plain function).
          if (!hasFieldValue(f, v)) return null;
          return (
            <Box key={f.key}>
              <Text fontSize="sm" color={G.muted} fontWeight="700" mb={1}>
                {f.label}
              </Text>
              <FieldValue field={f} value={v} gameSlug={slug} config={config} />
            </Box>
          );
        })}

        {entry.media.length > 1 && (
          <Flex gap={2} overflowX="auto">
            {entry.media.slice(1).map((m) => (
              <Box
                key={m.url}
                position="relative"
                minW="240px"
                h="150px"
                borderRadius="10px"
                overflow="hidden"
              >
                <NextImage
                  src={m.url}
                  alt={m.alt ?? ""}
                  fill
                  sizes="240px"
                  style={{ objectFit: "cover" }}
                />
              </Box>
            ))}
          </Flex>
        )}

        {map && pin && (
          <Box>
            <Text fontSize="sm" color={G.muted} fontWeight="700" mb={2}>
              On the map
            </Text>
            <Suspense
              fallback={<Box h="320px" bg="#0a0f22" borderRadius="14px" />}
            >
              <GuideMapScreen
                slug={slug}
                config={{
                  // Only what the mini map needs, not the whole template.
                  features: config.features,
                  eras: config.eras,
                  spoilerStages: config.spoilerStages,
                  types: config.types.map((t) => ({ ...t, fields: [] })),
                  maps: floorsOf(config, map),
                  checklists: [],
                  sections: [],
                }}
                map={map}
                preview
                focusPin={pin.id}
              />
            </Suspense>
          </Box>
        )}

        {entry.linkedFrom.map((g) => (
          <Box key={`${g.type}-${g.field}`}>
            <Text fontSize="sm" color={G.muted} fontWeight="700" mb={2}>
              Related {typeLabel(g.type).toLowerCase()}
            </Text>
            <LinkChips refs={g.entries} gameSlug={slug} config={config} />
          </Box>
        ))}
      </Stack>

      {d.step && (
        <GuideStepNav
          slug={slug}
          config={{
            features: config.features,
            spoilerStages: config.spoilerStages,
          }}
          entryId={entry.id}
          listKey={d.step.key}
          listTitle={d.step.title}
          position={d.step.position}
          total={d.step.total}
          prev={d.step.prev}
          next={d.step.next}
        />
      )}

      <Text fontSize="xs" color={G.muted} mt={8}>
        Last updated{" "}
        {new Date(entry.updatedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "America/Chicago",
        })}
        . Unofficial guide by Nexzy.
      </Text>
    </Container>
  );
}
