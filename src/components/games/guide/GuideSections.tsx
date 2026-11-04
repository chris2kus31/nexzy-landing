"use client";

// The guide on a game hub: the sections the game's template lists, in its
// order (map, cards, list, checklist, featured). Server HTML ships the
// sections from the page build (crawlable); on mount we refresh them once
// (edge-cached for 60s, no polling) and apply the reader's era and spoiler
// choices. Unknown section styles render nothing.
import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Flex,
  HStack,
  Heading,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiCheckSquare } from "react-icons/fi";
import {
  eraVisible,
  spoilerVisible,
  type HubCard,
  type HubEnginePage,
  type HubResolvedSection,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";
import { G, GuideCard } from "@/components/games/guide/GuideBits";
import GuideMap from "@/components/games/guide/GuideMap";
import {
  GuideProgressProvider,
  useGuideProgress,
} from "@/components/games/guide/GuideProgress";

export default function GuideSections({
  slug,
  initial,
}: {
  slug: string;
  initial: HubEnginePage;
}) {
  const [page, setPage] = useState(initial);
  useEffect(() => {
    let alive = true;
    fetch(`/api/hub-engine/${slug}`)
      .then((r) => (r.ok ? (r.json() as Promise<HubEnginePage>) : null))
      .then((d) => {
        if (alive && d && d.contentVersion !== initial.contentVersion)
          setPage(d);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [slug, initial.contentVersion]);

  if (!page.enabled || !page.config || !page.sections.length) return null;
  return (
    <GuideProgressProvider slug={slug}>
      <Body slug={slug} config={page.config} sections={page.sections} />
    </GuideProgressProvider>
  );
}

export function GuidePrefs({ config }: { config: HubTemplateConfig }) {
  const { era, setEra, spoiler, setSpoiler } = useGuideProgress();
  const { eraSwitch, spoilers } = config.features;
  if (
    !(eraSwitch && config.eras.length) &&
    !(spoilers && config.spoilerStages.length)
  )
    return null;
  return (
    <Flex gap={2} wrap="wrap" align="center">
      {eraSwitch && config.eras.length > 0 && (
        <NativeSelect.Root size="sm" width="auto">
          <NativeSelect.Field
            aria-label="Era"
            value={era ?? ""}
            onChange={(e) => setEra(e.target.value || null)}
            bg={G.card}
            color="white"
          >
            <option value="">All eras</option>
            {config.eras.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      )}
      {spoilers && config.spoilerStages.length > 0 && (
        <NativeSelect.Root size="sm" width="auto">
          <NativeSelect.Field
            aria-label="Spoilers"
            value={spoiler ?? ""}
            onChange={(e) => setSpoiler(e.target.value || null)}
            bg={G.card}
            color="white"
          >
            <option value="">No spoilers</option>
            {config.spoilerStages.map((s) => (
              <option key={s.key} value={s.key}>
                Up to: {s.label}
              </option>
            ))}
            <option value="all">Show everything</option>
          </NativeSelect.Field>
        </NativeSelect.Root>
      )}
    </Flex>
  );
}

/** Cards the reader may see with their era / spoiler choices. */
export function useVisible(config: HubTemplateConfig) {
  const { era, spoiler } = useGuideProgress();
  const { eraSwitch, spoilers } = config.features;
  const stages = config.spoilerStages;
  return useCallback(
    (c: HubCard) =>
      eraVisible(c.eras, eraSwitch ? era : null) &&
      (!spoilers || spoilerVisible(stages, c.spoilerStage, spoiler)),
    [era, spoiler, eraSwitch, spoilers, stages],
  );
}

function Body({
  slug,
  config,
  sections,
}: {
  slug: string;
  config: HubTemplateConfig;
  sections: HubResolvedSection[];
}) {
  const visible = useVisible(config);
  return (
    <Stack gap={4}>
      <Flex justify="flex-end">
        <GuidePrefs config={config} />
      </Flex>
      {sections.map((s) => (
        <Section
          key={s.key}
          slug={slug}
          config={config}
          s={s}
          visible={visible}
        />
      ))}
    </Stack>
  );
}

function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      as="section"
      bg={G.panel}
      borderRadius="18px"
      p={{ base: 5, md: 6 }}
      border="1px solid"
      borderColor={G.line}
    >
      <HStack
        justify="space-between"
        align="baseline"
        wrap="wrap"
        gap={2}
        mb={4}
      >
        <Heading as="h2" fontSize={{ base: "xl", md: "2xl" }} color="white">
          {title}
        </Heading>
        {aside}
      </HStack>
      {children}
    </Box>
  );
}

function Section({
  slug,
  config,
  s,
  visible,
}: {
  slug: string;
  config: HubTemplateConfig;
  s: HubResolvedSection;
  visible: (c: HubCard) => boolean;
}) {
  const { found } = useGuideProgress();
  if (s.style === "map") {
    const map = config.maps.find((m) => m.key === s.mapKey);
    if (!map) return null;
    return (
      <Panel
        title={s.title}
        aside={
          <Text fontSize="sm" color={G.muted}>
            Tap a pin for details
          </Text>
        }
      >
        <GuideMap slug={slug} config={config} map={map} preview />
      </Panel>
    );
  }
  if (s.style === "checklist") {
    const c = config.checklists.find((x) => x.key === s.checklistKey);
    if (!c) return null;
    return (
      <Panel title={s.title}>
        <NextLink href={`/games/${slug}/checklist/${c.key}`}>
          <HStack
            bg={G.card}
            border="1px solid"
            borderColor={G.line}
            borderRadius="12px"
            p={4}
            gap={3}
            _hover={{ borderColor: G.gold }}
          >
            <FiCheckSquare color={G.gold} size={22} aria-hidden />
            <Box flex="1">
              <Text color="white" fontWeight="700">
                {c.title}
              </Text>
              <Text fontSize="sm" color={G.muted}>
                {s.total ? `${s.total} to find` : "Items are being added"}
                {c.description ? ` · ${c.description}` : ""}
              </Text>
            </Box>
            <Text color={G.gold} fontWeight="700" fontSize="sm">
              Track it
            </Text>
          </HStack>
        </NextLink>
      </Panel>
    );
  }
  const items = s.items.filter(visible);
  if (!items.length) return null;
  if (s.style === "featured") {
    return (
      <Panel title={s.title}>
        <GuideCard card={items[0]} config={config} gameSlug={slug} />
      </Panel>
    );
  }
  if (s.style === "cards") {
    return (
      <Panel title={s.title}>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={3}>
          {items.map((c) => (
            <GuideCard key={c.id} card={c} config={config} gameSlug={slug} />
          ))}
        </SimpleGrid>
      </Panel>
    );
  }
  if (s.style === "list") {
    return (
      <Panel title={s.title}>
        <Stack gap={2}>
          {items.map((c) => (
            <GuideCard
              key={c.id}
              card={c}
              config={config}
              gameSlug={slug}
              compact
              minimal
              right={
                found.has(c.id) ? (
                  <Text fontSize="xs" color="#7EE2A0" fontWeight="700">
                    Found
                  </Text>
                ) : null
              }
            />
          ))}
        </Stack>
      </Panel>
    );
  }
  return null;
}
