"use client";

// The guide on a game hub, one layout for every game (the mega hub
// template): the map preview beside the reader's progress on every
// checklist, the story walkthrough (the checklist with the Story switch), one
// "Browse" tile per entry type, then the template's other sections (cards,
// featured, and lists drawn as compact tables). Map and checklist sections
// in the template are folded into the top block, not repeated. Server HTML
// ships it all (crawlable); on mount we refresh once (edge-cached 60s, no
// polling) and apply the reader's era and spoiler choices.
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
import { FiCheck, FiChevronRight, FiHelpCircle } from "react-icons/fi";
import {
  entryPath,
  guidePath,
  isStory,
  eraVisible,
  spoilerVisible,
  typeOf,
  type HubCard,
  type HubChecklistPage,
  type HubEnginePage,
  type HubFieldDef,
  type HubPageNode,
  type HubResolvedSection,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";
import {
  G,
  GuideCard,
  hasFieldValue,
} from "@/components/games/guide/GuideBits";
import GuideMap from "@/components/games/guide/GuideMap";
import {
  GuideProgressProvider,
  useGuideProgress,
} from "@/components/games/guide/GuideProgress";

const GREEN = "#7EE2A0";

export default function GuideSections({
  slug,
  initial,
  checklists,
}: {
  slug: string;
  initial: HubEnginePage;
  /** Every checklist of the template, loaded by the page (server). */
  checklists: HubChecklistPage[];
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

  if (!page.enabled || !page.config) return null;
  return (
    <GuideProgressProvider slug={slug}>
      <Body
        slug={slug}
        config={page.config}
        sections={page.sections}
        checklists={checklists}
        typeCounts={page.typeCounts ?? null}
        pages={page.pages ?? []}
      />
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
  checklists,
  typeCounts,
  pages,
}: {
  slug: string;
  config: HubTemplateConfig;
  sections: HubResolvedSection[];
  checklists: HubChecklistPage[];
  typeCounts: Record<string, number> | null;
  pages: HubPageNode[];
}) {
  const visible = useVisible(config);
  const mapSection = sections.find((s) => s.style === "map");
  const map =
    config.maps.find((m) => m.key === mapSection?.mapKey) ?? config.maps[0];
  const storyKeys = new Set(
    config.checklists.filter(isStory).map((c) => c.key),
  );
  const trackers = checklists.filter(
    (c) => !storyKeys.has(c.key) && c.items.length > 0,
  );
  const walk = checklists.find(
    (c) => storyKeys.has(c.key) && c.items.length > 0,
  );
  const rest = sections.filter(
    (s) => s.style !== "map" && s.style !== "checklist",
  );
  return (
    <Stack as="section" id="guide" gap={6} scrollMarginTop="140px">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Heading
          as="h2"
          fontFamily="heading"
          fontSize={{ base: "2xl", md: "3xl" }}
          color="white"
        >
          Guide
        </Heading>
        <GuidePrefs config={config} />
      </Flex>

      {(map || trackers.length > 0 || walk) && (
        <Flex gap={5} wrap="wrap" align="stretch">
          {map && (
            <Box
              id="guide-map"
              scrollMarginTop="140px"
              flex="999 1 560px"
              minW={0}
              bg={G.panel}
              border="1px solid"
              borderColor={G.line}
              borderRadius="18px"
              p={{ base: 3, md: 4 }}
            >
              <HStack justify="space-between" mb={3} px={1} wrap="wrap">
                <Heading as="h3" fontSize="lg" color="white">
                  {mapSection?.title || "Interactive map"}
                </Heading>
                <Text fontSize="sm" color={G.muted}>
                  Tap a pin for details
                </Text>
              </HStack>
              <GuideMap slug={slug} config={config} map={map} preview />
            </Box>
          )}
          {(trackers.length > 0 || walk) && (
            <ProgressCard
              slug={slug}
              lists={walk ? [walk, ...trackers] : trackers}
            />
          )}
        </Flex>
      )}

      {walk && (
        <Walkthrough
          slug={slug}
          config={config}
          list={walk}
          visible={visible}
        />
      )}

      {pages.length > 0 && (
        <GuidePages slug={slug} config={config} pages={pages} />
      )}

      {typeCounts && (
        <BrowseTiles slug={slug} config={config} counts={typeCounts} />
      )}

      {rest.map((s) => (
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

function Bar({ pct }: { pct: number }) {
  return (
    <Box
      h="4px"
      bg="rgba(255,255,255,0.08)"
      borderRadius="999px"
      overflow="hidden"
    >
      <Box h="100%" w={`${pct}%`} bg={GREEN} />
    </Box>
  );
}

/** Every checklist with the reader's found count, in one card. */
function ProgressCard({
  slug,
  lists,
}: {
  slug: string;
  lists: HubChecklistPage[];
}) {
  const { found, signedIn } = useGuideProgress();
  const rows = lists.map((c) => {
    const done = c.items.filter((i) => found.has(i.id)).length;
    return { c, done, total: c.items.length };
  });
  const all = rows.reduce((n, r) => n + r.total, 0);
  const done = rows.reduce((n, r) => n + r.done, 0);
  const pct = all ? Math.round((done / all) * 100) : 0;
  return (
    <Box
      flex="1 1 320px"
      bg={G.panel}
      border="1px solid"
      borderColor={G.line}
      borderRadius="18px"
      p={{ base: 4, md: 5 }}
      display="flex"
      flexDirection="column"
      gap={3}
    >
      <HStack justify="space-between" align="baseline" wrap="wrap">
        <Heading as="h3" fontSize="lg" color="white">
          Your progress
        </Heading>
        <Text fontSize="xs" color={G.muted}>
          {signedIn ? "Synced to your account" : "Saved on this device"}
        </Text>
      </HStack>
      <HStack gap={3}>
        <Text
          fontFamily="title"
          fontSize="4xl"
          fontWeight="700"
          color="white"
          lineHeight="1"
        >
          {pct}%
        </Text>
        <Text fontSize="sm" color={G.muted}>
          {done} of {all} found
        </Text>
      </HStack>
      <Stack gap={2}>
        {rows.map(({ c, done: d, total }) => (
          <NextLink key={c.key} href={`/games/${slug}/checklist/${c.key}`}>
            <Box
              bg={G.card}
              border="1px solid"
              borderColor={G.line}
              borderRadius="10px"
              px={3}
              py={2.5}
              _hover={{ borderColor: G.gold }}
            >
              <HStack justify="space-between" mb={1.5}>
                <Text fontSize="sm" fontWeight="600" color="white">
                  {c.title}
                </Text>
                <HStack gap={1} color={G.muted} fontSize="sm">
                  <Text>
                    {d} / {total}
                  </Text>
                  <FiChevronRight aria-hidden />
                </HStack>
              </HStack>
              <Bar pct={total ? Math.round((d / total) * 100) : 0} />
            </Box>
          </NextLink>
        ))}
      </Stack>
    </Box>
  );
}

/** The story, a few steps at a time around where the reader is. */
function Walkthrough({
  slug,
  config,
  list,
  visible,
}: {
  slug: string;
  config: HubTemplateConfig;
  list: HubChecklistPage;
  visible: (c: HubCard) => boolean;
}) {
  const { found } = useGuideProgress();
  const steps = list.items
    .map((c, i) => ({ c, n: i + 1 }))
    .filter((x) => visible(x.c));
  const hidden = list.items.length - steps.length;
  const next = steps.findIndex((x) => !found.has(x.c.id));
  const start = Math.max(
    0,
    Math.min(next < 0 ? steps.length : next, steps.length) - 1,
  );
  const shown = steps.slice(start, start + 5);
  const t = (c: HubCard) => typeOf(config, c.type);
  return (
    <Box id="guide-walkthrough" scrollMarginTop="140px">
      <HStack justify="space-between" align="baseline" mb={3} wrap="wrap">
        <Heading as="h3" fontSize="xl" color="white">
          {list.title}
        </Heading>
        <NextLink href={`/games/${slug}/checklist/${list.key}`}>
          <Text color={G.gold} fontWeight="700" fontSize="sm">
            All {list.items.length} steps
          </Text>
        </NextLink>
      </HStack>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} gap={3}>
        {shown.map(({ c, n }, i) => {
          const done = found.has(c.id);
          const isNext = !done && start + i === next;
          const reward = (t(c)?.fields ?? []).find(
            (f) =>
              f.onCard &&
              f.kind === "text" &&
              hasFieldValue(f, c.fields[f.key]),
          );
          const href = t(c)?.page
            ? entryPath(slug, c.type, c.slug)
            : `/games/${slug}/checklist/${list.key}`;
          return (
            <NextLink key={c.id} href={href}>
              <Box
                h="100%"
                bg={G.panel}
                border="1px solid"
                borderColor={
                  isNext
                    ? "rgba(255,215,0,0.6)"
                    : done
                      ? "rgba(126,226,160,0.35)"
                      : G.line
                }
                borderRadius="12px"
                p={3.5}
                display="flex"
                flexDirection="column"
                gap={1.5}
                _hover={{ borderColor: G.gold }}
              >
                <HStack justify="space-between">
                  <Text fontSize="xs" fontWeight="700" color={G.muted}>
                    STEP {n}
                  </Text>
                  <Text
                    fontSize="xs"
                    fontWeight="700"
                    color={done ? GREEN : isNext ? G.gold : G.muted}
                  >
                    {done ? "Done" : isNext ? "Up next" : "Later"}
                  </Text>
                </HStack>
                <Text fontWeight="700" color="white" lineHeight="1.3">
                  {c.title}
                </Text>
                {reward && (
                  <Text fontSize="xs" color={G.muted} mt="auto">
                    {reward.label}: {String(c.fields[reward.key])}
                  </Text>
                )}
              </Box>
            </NextLink>
          );
        })}
      </SimpleGrid>
      {hidden > 0 && (
        <Text fontSize="xs" color={G.muted} mt={2}>
          {hidden} more step{hidden === 1 ? " is" : "s are"} hidden to avoid
          spoilers. Change Spoilers above to see them.
        </Text>
      )}
    </Box>
  );
}

/** One tile per entry type that has its own pages and at least one entry. */
/** The guide's pages (table of contents) as tiles; steps count under each. */
function GuidePages({
  slug,
  config,
  pages,
}: {
  slug: string;
  config: HubTemplateConfig;
  pages: HubPageNode[];
}) {
  const { spoiler } = useGuideProgress();
  const masked = (p: HubPageNode) =>
    config.features.spoilers &&
    !!p.spoilerStage &&
    !spoilerVisible(config.spoilerStages, p.spoilerStage, spoiler);
  return (
    <Box id="guide-pages" scrollMarginTop="140px">
      <Flex justify="space-between" align="baseline" mb={3} gap={3}>
        <Heading as="h3" fontSize="xl" color="white">
          Guide pages
        </Heading>
        <NextLink
          href={`/games/${slug}/guide`}
          style={{ color: G.gold, fontSize: 14, fontWeight: 700 }}
        >
          All pages
        </NextLink>
      </Flex>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={3}>
        {pages.slice(0, 12).map((p) => (
          <NextLink key={p.slug} href={guidePath(slug, p.slug)}>
            <Box
              h="100%"
              bg={G.panel}
              border="1px solid"
              borderColor={G.line}
              borderRadius="12px"
              p={4}
              _hover={{ borderColor: G.gold }}
            >
              <Text fontWeight="700" color="white">
                {masked(p) ? "Spoiler page" : p.title}
              </Text>
              {p.summary && !masked(p) && (
                <Text fontSize="sm" color={G.muted} lineClamp={2} mt={1}>
                  {p.summary}
                </Text>
              )}
              {p.children.length > 0 && (
                <Text fontSize="xs" color={G.gold} fontWeight="700" mt={2}>
                  {p.children.length} step{p.children.length > 1 ? "s" : ""}
                </Text>
              )}
            </Box>
          </NextLink>
        ))}
      </SimpleGrid>
    </Box>
  );
}

function BrowseTiles({
  slug,
  config,
  counts,
}: {
  slug: string;
  config: HubTemplateConfig;
  counts: Record<string, number>;
}) {
  const tiles = config.types.filter((t) => t.page && (counts[t.key] ?? 0) > 0);
  if (!tiles.length) return null;
  return (
    <Box id="guide-browse" scrollMarginTop="140px">
      <Heading as="h3" fontSize="xl" color="white" mb={3}>
        Browse the guide
      </Heading>
      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} gap={3}>
        {tiles.map((t) => (
          <NextLink key={t.key} href={`/games/${slug}/${t.key}`}>
            <Box
              h="100%"
              bg={G.panel}
              border="1px solid"
              borderColor={G.line}
              borderRadius="12px"
              p={4}
              _hover={{ borderColor: G.gold }}
            >
              <Box w="10px" h="10px" borderRadius="full" bg={t.color} mb={2} />
              <Text fontWeight="700" color="white">
                {t.plural}
              </Text>
              <Text fontSize="sm" color={G.muted}>
                {counts[t.key]}
              </Text>
            </Box>
          </NextLink>
        ))}
      </SimpleGrid>
    </Box>
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
        <Heading as="h3" fontSize={{ base: "lg", md: "xl" }} color="white">
          {title}
        </Heading>
        {aside}
      </HStack>
      {children}
    </Box>
  );
}

/** A short field value as plain text for a table cell, or null. */
function cellText(f: HubFieldDef, v: unknown): string | null {
  if (!hasFieldValue(f, v)) return null;
  if (f.kind === "select")
    return f.options?.find((o) => o.key === v)?.label ?? null;
  if (f.kind === "multiselect" && Array.isArray(v))
    return v
      .map((k) => f.options?.find((o) => o.key === k)?.label)
      .filter(Boolean)
      .join(", ");
  if (f.kind === "number" && typeof v === "number")
    return v.toLocaleString("en-US");
  if (f.kind === "boolean") return v ? "Yes" : "No";
  if (f.kind === "text" && typeof v === "string") return v;
  return null;
}

/** A list section as a compact table: name plus the type's short on-card
 *  fields as columns (e.g. Dungeons: Boss, Reward). */
function TableList({
  slug,
  config,
  items,
  summaries = false,
}: {
  slug: string;
  config: HubTemplateConfig;
  items: HubCard[];
  /** Show each entry's summary under its name (type list pages). */
  summaries?: boolean;
}) {
  const { found } = useGuideProgress();
  const types = new Set(items.map((c) => c.type));
  const t = types.size === 1 ? typeOf(config, items[0].type) : undefined;
  const cols = (t?.fields ?? []).filter(
    (f) =>
      f.onCard &&
      ["text", "select", "multiselect", "number", "boolean"].includes(f.kind) &&
      items.some((c) => cellText(f, c.fields[f.key]) != null),
  );
  const th = {
    padding: "10px 14px",
    textAlign: "left" as const,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: G.muted,
  };
  const td = { padding: "12px 14px", verticalAlign: "top" as const };
  return (
    <Box overflowX="auto" mx={{ base: -1, md: 0 }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
      >
        <thead>
          <tr>
            <th scope="col" style={th}>
              NAME
            </th>
            {cols.map((f) => (
              <th key={f.key} scope="col" style={th}>
                {f.label.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const ct = typeOf(config, c.type);
            const name = (
              <HStack gap={1.5} display="inline-flex">
                <Text as="span" fontWeight="700" color="white">
                  {c.title}
                </Text>
                {c.status === "unconfirmed" && (
                  <Box
                    as="span"
                    color={G.warn}
                    display="inline-flex"
                    role="img"
                    title={config.features.unconfirmedLabel}
                    aria-label={config.features.unconfirmedLabel}
                  >
                    <FiHelpCircle size={13} />
                  </Box>
                )}
                {found.has(c.id) && (
                  <Box
                    as="span"
                    color={GREEN}
                    display="inline-flex"
                    role="img"
                    aria-label="Found"
                  >
                    <FiCheck size={14} />
                  </Box>
                )}
              </HStack>
            );
            return (
              <tr key={c.id} style={{ borderTop: `1px solid ${G.line}` }}>
                <th
                  scope="row"
                  style={{ ...td, textAlign: "left", fontWeight: 400 }}
                >
                  {ct?.page ? (
                    <NextLink href={entryPath(slug, c.type, c.slug)}>
                      {name}
                    </NextLink>
                  ) : (
                    name
                  )}
                  {summaries && cols.length < 2 && c.summary && (
                    <Text fontSize="sm" color={G.muted} mt={1} maxW="60ch">
                      {c.summary}
                    </Text>
                  )}
                </th>
                {cols.map((f) => (
                  <td key={f.key} style={{ ...td, color: G.text }}>
                    {cellText(f, c.fields[f.key]) ?? ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
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
        <TableList slug={slug} config={config} items={items} />
      </Panel>
    );
  }
  return null;
}

/** A type's own list page (/games/<slug>/<type>): every entry as one
 *  table, with the reader's found ticks and spoiler / era choices. */
export function GuideTypeList({
  slug,
  config,
  items,
}: {
  slug: string;
  config: HubTemplateConfig;
  items: HubCard[];
}) {
  return (
    <GuideProgressProvider slug={slug}>
      <TypeListBody slug={slug} config={config} items={items} />
    </GuideProgressProvider>
  );
}

function TypeListBody({
  slug,
  config,
  items,
}: {
  slug: string;
  config: HubTemplateConfig;
  items: HubCard[];
}) {
  const visible = useVisible(config);
  const shown = items.filter(visible);
  const hidden = items.length - shown.length;
  return (
    <Stack gap={4}>
      <Flex justify="flex-end">
        <GuidePrefs config={config} />
      </Flex>
      <Box
        bg={G.panel}
        border="1px solid"
        borderColor={G.line}
        borderRadius="18px"
        p={{ base: 2, md: 3 }}
      >
        <TableList slug={slug} config={config} items={shown} summaries />
      </Box>
      {hidden > 0 && (
        <Text fontSize="sm" color={G.muted}>
          {hidden} more hidden by your era or spoiler choice.
        </Text>
      )}
    </Stack>
  );
}
