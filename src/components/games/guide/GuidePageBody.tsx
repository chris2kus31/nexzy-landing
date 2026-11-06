"use client";

// The interactive part of a guide page: era / spoiler choices, the table of
// contents (sidebar on desktop, a dropdown on phones), the page's blocks and
// Previous / Next. One progress provider, so ticks in a tracker match the
// map and checklists of the same game.
import NextLink from "next/link";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiChevronDown,
  FiList,
} from "react-icons/fi";
import {
  guidePath,
  spoilerVisible,
  typeOf,
  type HubGuidePage,
  type HubPageNode,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";
import {
  FieldValue,
  G,
  hasFieldValue,
  UnconfirmedBadge,
} from "@/components/games/guide/GuideBits";
import GuideMap from "@/components/games/guide/GuideMap";
import { GuideContentsSidebar } from "@/components/games/guide/GuideContents";
import { StepCards, stepsOfNode } from "@/components/games/guide/GuideSteps";

const GREEN = "#7EE2A0";
import GuideBlocks from "@/components/games/guide/GuideBlocks";
import {
  GuideProgressProvider,
  useGuideProgress,
} from "@/components/games/guide/GuideProgress";
import { GuidePrefs } from "@/components/games/guide/GuideSections";

export default function GuidePageBody({
  slug,
  config,
  pages,
  page,
  counts = null,
}: {
  slug: string;
  config: HubTemplateConfig;
  pages: HubPageNode[];
  page: HubGuidePage;
  counts?: Record<string, number> | null;
}) {
  return (
    <GuideProgressProvider slug={slug}>
      <Flex
        gap={8}
        align="flex-start"
        direction={{ base: "column", lg: "row" }}
      >
        <Box
          as="aside"
          w={{ base: "100%", lg: "270px" }}
          flexShrink={0}
          position={{ lg: "sticky" }}
          top={{ lg: "90px" }}
          maxH={{ lg: "calc(100vh - 110px)" }}
          overflowY={{ lg: "auto" }}
        >
          <Toc
            slug={slug}
            config={config}
            pages={pages}
            counts={counts}
            current={page.slug}
          />
        </Box>
        {/* Reading width like a guide, not a dashboard. */}
        <Box flex="1" minW={0} w="100%" maxW="820px">
          <Flex mb={5}>
            <GuidePrefs config={config} />
          </Flex>
          <PageGate config={config} stage={page.spoilerStage}>
            {page.entry && (
              // Any page about a mission gets its facts, Mark done and map
              // pin. The mission can be later in the story than the page.
              <PageGate config={config} stage={page.entry.spoilerStage}>
                <StepPanel slug={slug} config={config} page={page} />
              </PageGate>
            )}
            <GuideBlocks
              slug={slug}
              config={config}
              blocks={page.blocks}
              pages={pages}
              pageSlug={page.slug}
            />
            {page.children.length > 0 && (
              <ChildList
                slug={slug}
                config={config}
                pages={pages}
                page={page}
              />
            )}
            {page.children.length === 0 && (page.story || page.steps) && (
              <Box
                mt={8}
                bg={G.card}
                border="1px dashed"
                borderColor={G.line}
                borderRadius="14px"
                p={6}
                textAlign="center"
              >
                <Text color="white" fontWeight="700">
                  Steps are on the way
                </Text>
                <Text color={G.muted} fontSize="sm" mt={1}>
                  Each step shows up here as it goes live.
                </Text>
              </Box>
            )}
          </PageGate>
          <PrevNext slug={slug} config={config} pages={pages} page={page} />
        </Box>
      </Flex>
    </GuideProgressProvider>
  );
}

/** Sub-pages of this page (walkthrough steps get Done marks). */
function ChildList({
  slug,
  config,
  pages,
  page,
}: {
  slug: string;
  config: HubTemplateConfig;
  pages: HubPageNode[];
  page: HubGuidePage;
}) {
  const { found, spoiler } = useGuideProgress();
  const node = pages.find((p) => p.slug === page.slug);
  // Steps: every step as walkthrough cards (Up next / Done / reward),
  // unless a Steps block on this page already shows them all.
  if (node && (node.steps || node.story || page.steps)) {
    // (a "Next 5" block already shows every step when there are 5 or fewer)
    if (
      page.blocks.some(
        (b) =>
          b.kind === "steps" && (b.show === "all" || node.children.length <= 5),
      )
    )
      return null;
    return (
      <Box mt={8}>
        <StepCards
          id="all-steps"
          config={config}
          title="All steps"
          show="all"
          steps={stepsOfNode(slug, node)}
        />
      </Box>
    );
  }
  const title = (slugOf: string, t: string) => {
    const n = node?.children.find((c) => c.slug === slugOf);
    return config.features.spoilers &&
      [n?.spoilerStage, n?.entry?.spoilerStage].some(
        (s) => !!s && !spoilerVisible(config.spoilerStages, s, spoiler),
      )
      ? "Spoiler step"
      : t;
  };
  const doneOf = (slugOf: string) => {
    const e = node?.children.find((c) => c.slug === slugOf)?.entry;
    return !!e && found.has(e.id);
  };
  return (
    <Stack gap={2} mt={8}>
      <Text color={G.muted} fontSize="sm" fontWeight="700">
        {page.story ? "All steps" : "In this section"}
      </Text>
      {page.children.map((c, i) => (
        <Flex
          key={c.slug}
          asChild
          align="center"
          gap={3}
          bg={G.panel}
          border="1px solid"
          borderColor={G.line}
          borderRadius="12px"
          p={3}
          _hover={{ borderColor: G.gold }}
        >
          <NextLink href={guidePath(slug, c.slug)}>
            <Text color={G.gold} fontWeight="800" minW="28px">
              {i + 1}
            </Text>
            <Box flex="1">
              <Text color="white" fontWeight="700">
                {title(c.slug, c.title)}
              </Text>
              {c.summary && title(c.slug, c.title) === c.title && (
                <Text color={G.muted} fontSize="sm" lineClamp={2}>
                  {c.summary}
                </Text>
              )}
            </Box>
            {doneOf(c.slug) ? (
              <Flex
                align="center"
                gap={1}
                color={GREEN}
                fontSize="sm"
                fontWeight="700"
              >
                <FiCheck aria-hidden /> Done
              </Flex>
            ) : (
              <FiArrowRight aria-hidden color={G.gold} />
            )}
          </NextLink>
        </Flex>
      ))}
    </Stack>
  );
}

/** A whole page marked as a spoiler stage. */
function PageGate({
  config,
  stage,
  children,
}: {
  config: HubTemplateConfig;
  stage: string | null;
  children: React.ReactNode;
}) {
  const { spoiler, setSpoiler } = useGuideProgress();
  if (
    !config.features.spoilers ||
    !stage ||
    spoilerVisible(config.spoilerStages, stage, spoiler)
  )
    return <>{children}</>;
  const label =
    config.spoilerStages.find((s) => s.key === stage)?.label ?? "later";
  return (
    <Box
      bg={G.card}
      border="1px dashed"
      borderColor={G.line}
      borderRadius="14px"
      p={6}
      textAlign="center"
    >
      <Text color={G.text} fontWeight="700" mb={2}>
        This page has story spoilers ({label}).
      </Text>
      <Box
        as="button"
        onClick={() => setSpoiler(stage)}
        color={G.ink}
        bg={G.gold}
        fontWeight="800"
        px={4}
        py={2}
        borderRadius="999px"
      >
        Show it
      </Box>
    </Box>
  );
}

function Toc({
  slug,
  config,
  pages,
  counts,
  current,
}: {
  slug: string;
  config: HubTemplateConfig;
  pages: HubPageNode[];
  counts: Record<string, number> | null;
  current: string;
}) {
  const list = (
    <GuideContentsSidebar
      slug={slug}
      config={config}
      pages={pages}
      counts={counts}
      current={current}
    />
  );
  return (
    <>
      {/* Phones: a dropdown above the page. */}
      <Box display={{ base: "block", lg: "none" }}>
        <details
          style={{
            background: G.panel,
            border: `1px solid ${G.line}`,
            borderRadius: 12,
          }}
        >
          <summary
            style={{
              listStyle: "none",
              cursor: "pointer",
              padding: "12px 14px",
              color: "white",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FiList aria-hidden /> Guide contents
            <span style={{ marginLeft: "auto", display: "inline-flex" }}>
              <FiChevronDown aria-hidden />
            </span>
          </summary>
          <Box px={1} pb={2}>
            {list}
          </Box>
        </details>
      </Box>
      {/* Desktop: sidebar. */}
      <Box
        display={{ base: "none", lg: "block" }}
        bg={G.panel}
        border="1px solid"
        borderColor={G.line}
        borderRadius="14px"
        p={2}
      >
        <Text
          px={2.5}
          pt={2}
          pb={1}
          fontSize="xs"
          fontWeight="800"
          color={G.muted}
          textTransform="uppercase"
          letterSpacing="0.06em"
        >
          Guide contents
        </Text>
        {list}
      </Box>
    </>
  );
}

/** A walkthrough step: the mission's short facts, Mark done (same progress
 *  as the map and checklists) and its spot on the map. */
function StepPanel({
  slug,
  config,
  page,
}: {
  slug: string;
  config: HubTemplateConfig;
  page: HubGuidePage;
}) {
  const { found, toggle } = useGuideProgress();
  const e = page.entry;
  if (!e) return null;
  const done = found.has(e.id);
  const t = typeOf(config, e.type);
  const facts = (t?.fields ?? []).filter(
    (f) =>
      f.onCard &&
      f.kind !== "longtext" &&
      f.kind !== "video" &&
      hasFieldValue(f, e.fields[f.key]),
  );
  const pin = page.pins?.[0];
  const map = pin ? config.maps.find((m) => m.key === pin.map) : undefined;
  return (
    <Box
      bg={G.panel}
      border="1px solid"
      borderColor={done ? "rgba(126,226,160,0.45)" : G.line}
      borderRadius="16px"
      p={{ base: 3, md: 4 }}
      mb={6}
    >
      <Flex align="center" gap={3} wrap="wrap" mb={map ? 3 : 0}>
        <Box flex="1" minW="200px">
          {facts.map((f) => (
            <Flex key={f.key} gap={2} fontSize="sm" wrap="wrap">
              <Text color={G.muted} fontWeight="700">
                {f.label}:
              </Text>
              <Box color={G.text}>
                <FieldValue
                  field={f}
                  value={e.fields[f.key]}
                  gameSlug={slug}
                  config={config}
                />
              </Box>
            </Flex>
          ))}
          {e.status === "unconfirmed" && (
            <Box mt={1}>
              <UnconfirmedBadge label={config.features.unconfirmedLabel} />
            </Box>
          )}
        </Box>
        <Flex
          asChild
          align="center"
          gap={2}
          px={4}
          py={2}
          borderRadius="999px"
          border="1px solid"
          borderColor={done ? GREEN : G.gold}
          bg={done ? "rgba(126,226,160,0.12)" : G.gold}
          color={done ? GREEN : G.ink}
          fontWeight="800"
          fontSize="sm"
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            onClick={() => toggle(e.id)}
          >
            <FiCheck aria-hidden />
            {done ? "Done" : "Mark done"}
          </button>
        </Flex>
      </Flex>
      {map && pin && (
        <GuideMap
          slug={slug}
          config={config}
          map={map}
          preview
          focusPin={pin.id}
        />
      )}
    </Box>
  );
}

function PrevNext({
  slug,
  config,
  pages,
  page,
}: {
  slug: string;
  config: HubTemplateConfig;
  pages: HubPageNode[];
  page: HubGuidePage;
}) {
  const { spoiler } = useGuideProgress();
  if (!page.prev && !page.next) return null;
  const all = pages.flatMap((p) => [p, ...p.children]);
  // A later step's title can give the story away: hide it like the TOC does.
  const titleOf = (p: { slug: string; title: string }) => {
    const n = all.find((x) => x.slug === p.slug);
    return config.features.spoilers &&
      [n?.spoilerStage, n?.entry?.spoilerStage].some(
        (s) => !!s && !spoilerVisible(config.spoilerStages, s, spoiler),
      )
      ? "Spoiler page"
      : p.title;
  };
  const card = (dir: "prev" | "next", p: { slug: string; title: string }) => (
    <Flex
      asChild
      flex="1"
      minW="220px"
      direction="column"
      align={dir === "next" ? "flex-end" : "flex-start"}
      textAlign={dir === "next" ? "right" : "left"}
      gap={1}
      bg={G.panel}
      border="1px solid"
      borderColor={G.line}
      borderRadius="12px"
      p={4}
      _hover={{ borderColor: G.gold }}
    >
      <NextLink href={guidePath(slug, p.slug)} rel={dir}>
        <Flex
          align="center"
          gap={1.5}
          color={G.gold}
          fontSize="sm"
          fontWeight="700"
        >
          {dir === "prev" && <FiArrowLeft aria-hidden />}
          {dir === "prev"
            ? page.isStep
              ? "Previous step"
              : "Previous"
            : page.isStep
              ? "Next step"
              : "Next"}
          {dir === "next" && <FiArrowRight aria-hidden />}
        </Flex>
        <Text color="white" fontWeight="700">
          {titleOf(p)}
        </Text>
      </NextLink>
    </Flex>
  );
  return (
    <Flex gap={3} mt={10} wrap="wrap">
      {page.prev ? card("prev", page.prev) : <Box flex="1" />}
      {page.next ? card("next", page.next) : <Box flex="1" />}
    </Flex>
  );
}
