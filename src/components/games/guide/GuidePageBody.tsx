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
  FiChevronDown,
  FiList,
} from "react-icons/fi";
import {
  guidePath,
  spoilerVisible,
  type HubGuidePage,
  type HubPageNode,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";
import { G } from "@/components/games/guide/GuideBits";
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
}: {
  slug: string;
  config: HubTemplateConfig;
  pages: HubPageNode[];
  page: HubGuidePage;
}) {
  return (
    <GuideProgressProvider slug={slug}>
      <Flex gap={8} align="flex-start" direction={{ base: "column", lg: "row" }}>
        <Box
          as="aside"
          w={{ base: "100%", lg: "270px" }}
          flexShrink={0}
          position={{ lg: "sticky" }}
          top={{ lg: "90px" }}
          maxH={{ lg: "calc(100vh - 110px)" }}
          overflowY={{ lg: "auto" }}
        >
          <Toc slug={slug} config={config} pages={pages} current={page.slug} />
        </Box>
        <Box flex="1" minW={0} w="100%">
          <Flex justify="flex-end" mb={4}>
            <GuidePrefs config={config} />
          </Flex>
          <PageGate config={config} stage={page.spoilerStage}>
            <GuideBlocks slug={slug} config={config} blocks={page.blocks} />
            {page.children.length > 0 && (
              <Stack gap={2} mt={8}>
                <Text color={G.muted} fontSize="sm" fontWeight="700">
                  In this section
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
                          {c.title}
                        </Text>
                        {c.summary && (
                          <Text color={G.muted} fontSize="sm" lineClamp={2}>
                            {c.summary}
                          </Text>
                        )}
                      </Box>
                      <FiArrowRight aria-hidden color={G.gold} />
                    </NextLink>
                  </Flex>
                ))}
              </Stack>
            )}
          </PageGate>
          <PrevNext slug={slug} config={config} pages={pages} page={page} />
        </Box>
      </Flex>
    </GuideProgressProvider>
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
  current,
}: {
  slug: string;
  config: HubTemplateConfig;
  pages: HubPageNode[];
  current: string;
}) {
  const { spoiler } = useGuideProgress();
  const masked = (p: HubPageNode) =>
    config.features.spoilers &&
    !!p.spoilerStage &&
    !spoilerVisible(config.spoilerStages, p.spoilerStage, spoiler);
  const item = (p: HubPageNode, child: boolean) => {
    const on = p.slug === current;
    return (
      <Box
        key={p.slug}
        asChild
        display="block"
        px={3}
        py={2}
        pl={child ? 7 : 3}
        borderRadius="8px"
        fontSize="sm"
        fontWeight={on ? "800" : child ? "500" : "600"}
        color={on ? G.ink : child ? G.muted : G.text}
        bg={on ? G.gold : "transparent"}
        _hover={on ? {} : { bg: "rgba(255,255,255,0.06)", color: "white" }}
      >
        <NextLink href={guidePath(slug, p.slug)} aria-current={on ? "page" : undefined}>
          {masked(p) && !on ? "Spoiler page" : p.title}
        </NextLink>
      </Box>
    );
  };
  const list = (
    <Stack as="nav" aria-label="Guide pages" gap={0.5}>
      <Box
        asChild
        display="block"
        px={3}
        py={2}
        fontSize="sm"
        fontWeight="700"
        color={G.gold}
      >
        <NextLink href={`/games/${slug}#guide`}>Guide home</NextLink>
      </Box>
      {pages.map((p) => {
        // Children show under the open section (and always on desktop).
        return (
          <Box key={p.slug}>
            {item(p, false)}
            {p.children.map((c) => item(c, true))}
          </Box>
        );
      })}
    </Stack>
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
          px={3}
          pt={2}
          pb={1}
          fontSize="xs"
          fontWeight="800"
          color={G.muted}
          textTransform="uppercase"
          letterSpacing="0.06em"
        >
          Table of contents
        </Text>
        {list}
      </Box>
    </>
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
      n?.spoilerStage &&
      !spoilerVisible(config.spoilerStages, n.spoilerStage, spoiler)
      ? "Spoiler page"
      : p.title;
  };
  const card = (
    dir: "prev" | "next",
    p: { slug: string; title: string },
  ) => (
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
        <Flex align="center" gap={1.5} color={G.gold} fontSize="sm" fontWeight="700">
          {dir === "prev" && <FiArrowLeft aria-hidden />}
          {dir === "prev" ? "Previous" : "Next"}
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
