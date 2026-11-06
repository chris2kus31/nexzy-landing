"use client";

// The guide's table of contents, one list for every game (IGN style):
// the story walkthrough and its steps, the other guide pages and their
// sub-pages, the checklists, and the lists (every entry type with its own
// pages). The hub shows it as columns; guide pages show it as a sidebar
// with collapsible groups. Story titles past the reader's spoiler setting
// are masked; done steps get a check (same progress as the map).
import { useState } from "react";
import NextLink from "next/link";
import { Box, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { FiCheck, FiChevronDown, FiChevronRight } from "react-icons/fi";
import {
  guidePath,
  isStory,
  spoilerVisible,
  type HubPageNode,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";
import { G } from "@/components/games/guide/GuideBits";
import { useGuideProgress } from "@/components/games/guide/GuideProgress";

const GREEN = "#7EE2A0";

type Link = {
  key: string;
  href: string;
  label: string;
  n?: number;
  done?: boolean;
  child?: boolean;
};
type Group = { key: string; title: string; href?: string; links: Link[] };

/** Build the groups (pure: same order on the hub and in the sidebar). */
export function useGuideGroups(
  slug: string,
  config: HubTemplateConfig,
  pages: HubPageNode[],
  counts: Record<string, number> | null,
): Group[] {
  const { spoiler, found } = useGuideProgress();
  // Masked when the page or its linked entry is past the reader's spoilers.
  const hides = (stage: string | null | undefined) =>
    !!stage && !spoilerVisible(config.spoilerStages, stage, spoiler);
  const masked = (p: HubPageNode, fallback: string) =>
    config.features.spoilers &&
    (hides(p.spoilerStage) || hides(p.entry?.spoilerStage))
      ? fallback
      : p.title;
  const groups: Group[] = [];
  const story = pages.find((p) => p.story && p.children.length > 0);
  if (story)
    groups.push({
      key: "walkthrough",
      title: story.title,
      href: guidePath(slug, story.slug),
      links: story.children.map((c, i) => ({
        key: c.slug,
        href: guidePath(slug, c.slug),
        label: masked(c, "Spoiler step"),
        n: i + 1,
        done: !!c.entry && found.has(c.entry.id),
      })),
    });
  const others = pages.filter((p) => p !== story);
  if (others.length)
    groups.push({
      key: "guides",
      title: "Guides",
      links: others.flatMap((p) => [
        {
          key: p.slug,
          href: guidePath(slug, p.slug),
          label: masked(p, "Spoiler page"),
        },
        ...p.children.map((c) => ({
          key: c.slug,
          href: guidePath(slug, c.slug),
          label: masked(c, "Spoiler page"),
          child: true,
        })),
      ]),
    });
  // With a story page, its checklist would repeat the walkthrough.
  const lists = config.checklists.filter((c) => !(story && isStory(c)));
  const types = config.types.filter(
    (t) => t.page && (counts?.[t.key] ?? 0) > 0,
  );
  if (lists.length || config.maps.length)
    groups.push({
      key: "trackers",
      title: "Map and checklists",
      links: [
        ...(config.maps.length
          ? [
              {
                key: "map",
                href: `/games/${slug}/map`,
                label: "Interactive map",
              },
            ]
          : []),
        ...lists.map((c) => ({
          key: `cl-${c.key}`,
          href: `/games/${slug}/checklist/${c.key}`,
          label: c.title,
        })),
      ],
    });
  if (types.length)
    groups.push({
      key: "lists",
      title: "Everything in the game",
      links: types.map((t) => ({
        key: `t-${t.key}`,
        href: `/games/${slug}/${t.key}`,
        label: `${t.plural} (${counts?.[t.key] ?? 0})`,
      })),
    });
  return groups;
}

function LinkRow({ l, current }: { l: Link; current?: string }) {
  const on = l.key === current;
  return (
    <Flex
      asChild
      align="center"
      gap={2}
      px={2.5}
      py={1.5}
      pl={l.child ? 6 : 2.5}
      borderRadius="8px"
      fontSize="sm"
      fontWeight={on ? "800" : "500"}
      color={on ? G.ink : l.child ? G.muted : G.text}
      bg={on ? G.gold : "transparent"}
      _hover={on ? {} : { bg: "rgba(255,255,255,0.06)", color: "white" }}
    >
      <NextLink href={l.href} aria-current={on ? "page" : undefined}>
        {l.n != null && (
          <Text
            as="span"
            minW="20px"
            fontWeight="800"
            color={on ? G.ink : G.gold}
            fontSize="xs"
          >
            {l.n}
          </Text>
        )}
        <Text as="span" flex="1" lineClamp={2}>
          {l.label}
        </Text>
        {l.done && <FiCheck aria-label="Done" color={on ? G.ink : GREEN} />}
      </NextLink>
    </Flex>
  );
}

/** Hub: groups as columns. Long groups show the first few + "All". */
export function GuideContentsHub({
  slug,
  config,
  pages,
  counts,
  limit = 8,
}: {
  slug: string;
  config: HubTemplateConfig;
  pages: HubPageNode[];
  counts: Record<string, number> | null;
  /** Links per group before "All N" (the guide index shows everything). */
  limit?: number;
}) {
  const groups = useGuideGroups(slug, config, pages, counts);
  if (!groups.length) return null;
  const MAX = limit;
  return (
    <Box id="guide-contents" scrollMarginTop="140px">
      <Text as="h3" fontSize="xl" fontWeight="700" color="white" mb={3}>
        Guide contents
      </Text>
      <SimpleGrid
        columns={{ base: 1, md: 2, lg: Math.min(groups.length, 4) }}
        gap={3}
      >
        {groups.map((g) => (
          <Box
            key={g.key}
            bg={G.panel}
            border="1px solid"
            borderColor={G.line}
            borderRadius="14px"
            p={3}
          >
            <Text
              px={2.5}
              pb={1.5}
              fontSize="xs"
              fontWeight="800"
              color={G.muted}
              textTransform="uppercase"
              letterSpacing="0.06em"
            >
              {g.title}
            </Text>
            <Stack gap={0}>
              {g.links.slice(0, MAX).map((l) => (
                <LinkRow key={l.key} l={l} />
              ))}
            </Stack>
            {g.links.length > MAX && (
              <Box px={2.5} pt={1.5}>
                <NextLink
                  href={g.href ?? `/games/${slug}/guide`}
                  style={{ color: G.gold, fontSize: 13, fontWeight: 700 }}
                >
                  All {g.links.length}
                </NextLink>
              </Box>
            )}
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

/** Guide page sidebar: collapsible groups; the current page's group open. */
export function GuideContentsSidebar({
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
  const groups = useGuideGroups(slug, config, pages, counts);
  const holds = (g: Group) =>
    g.links.some((l) => l.key === current) ||
    (g.key === "walkthrough" && g.href?.endsWith(`/${current}`));
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(groups.filter(holds).map((g) => g.key)),
  );
  const toggle = (k: string) =>
    setOpen((cur) => {
      const n = new Set(cur);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  return (
    <Stack as="nav" aria-label="Guide contents" gap={1}>
      <Box
        asChild
        display="block"
        px={2.5}
        py={1.5}
        fontSize="sm"
        fontWeight="700"
        color={G.gold}
      >
        <NextLink href={`/games/${slug}#guide`}>Guide home</NextLink>
      </Box>
      {groups.map((g) => {
        const isOpen = open.has(g.key);
        const onTitle =
          g.key === "walkthrough" && g.href?.endsWith(`/${current}`);
        return (
          <Box key={g.key}>
            <Flex align="center">
              {g.href ? (
                <Box
                  asChild
                  flex="1"
                  px={2.5}
                  py={1.5}
                  borderRadius="8px"
                  fontSize="sm"
                  fontWeight="800"
                  color={onTitle ? G.ink : "white"}
                  bg={onTitle ? G.gold : "transparent"}
                >
                  <NextLink href={g.href}>{g.title}</NextLink>
                </Box>
              ) : (
                <Text
                  flex="1"
                  px={2.5}
                  py={1.5}
                  fontSize="sm"
                  fontWeight="800"
                  color="white"
                >
                  {g.title}
                </Text>
              )}
              <Box asChild color={G.muted} p={1.5} _hover={{ color: "white" }}>
                <button
                  type="button"
                  onClick={() => toggle(g.key)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${g.title}`}
                >
                  {isOpen ? <FiChevronDown /> : <FiChevronRight />}
                </button>
              </Box>
            </Flex>
            {isOpen && (
              <Stack gap={0} pl={1}>
                {g.links.map((l) => (
                  <LinkRow key={l.key} l={l} current={current} />
                ))}
              </Stack>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
