// Full interactive guide map for a game (Phase 4 mega hub engine). The map,
// its pins and filters all come from the game's template; a game without a
// live guide 404s. ?map=<key> picks another map; ?pin=<id> opens on a pin.
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import { Box, Container, Flex, Heading, Text } from "@chakra-ui/react";
import { fetchGameHub } from "@/lib/blog/api";
import { fetchEnginePage } from "@/lib/hub-engine/server";
import GuideMapScreen from "@/components/games/guide/GuideMapScreen";
import { G } from "@/components/games/guide/GuideBits";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const [hub, engine] = await Promise.all([
    fetchGameHub(slug),
    fetchEnginePage(slug, 300),
  ]);
  if (!hub || !engine.enabled || !engine.config || !engine.config.maps.length)
    return null;
  const short = hub.profile?.aliases?.[0] || hub.game.name;
  return { hub, engine, config: engine.config, short };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return { title: "Map not found", robots: { index: false } };
  const title = `${d.short} Interactive Map`;
  const description = `Interactive ${d.short} map: every ${d.config.types
    .filter((t) => t.pinnable)
    .slice(0, 4)
    .map((t) => t.plural.toLowerCase())
    .join(", ")} and more. Track what you've found, spoiler-free.`.slice(
    0,
    160,
  );
  return {
    title,
    description,
    alternates: { canonical: `/games/${slug}/map` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function GuideMapPage({ params }: Params) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  return (
    <Container maxW="7xl" py={{ base: 6, md: 10 }}>
      <Text fontSize="sm" color={G.muted} mb={2}>
        <NextLink href={`/games/${slug}`}>{d.short}</NextLink> / Map
      </Text>
      <Flex justify="space-between" align="baseline" wrap="wrap" gap={3} mb={4}>
        <Heading as="h1" fontSize={{ base: "2xl", md: "4xl" }} color="white">
          {d.short} interactive map
        </Heading>
        {d.config.maps.length > 1 && (
          <Flex gap={2} wrap="wrap">
            {d.config.maps.map((m) => (
              <NextLink key={m.key} href={`/games/${slug}/map?map=${m.key}`}>
                <Text
                  fontSize="sm"
                  px={3}
                  py={1}
                  borderRadius="999px"
                  border="1px solid"
                  borderColor={G.line}
                  color={G.muted}
                >
                  {m.name}
                </Text>
              </NextLink>
            ))}
          </Flex>
        )}
      </Flex>
      <Suspense fallback={<Box h="70vh" bg="#0a0f22" borderRadius="14px" />}>
        <GuideMapScreen slug={slug} config={d.config} />
      </Suspense>
      <Text fontSize="xs" color={G.muted} mt={3}>
        Unofficial fan map by Nexzy. Pins are placed by the Nexzy team;
        unconfirmed ones are marked.
      </Text>
    </Container>
  );
}
