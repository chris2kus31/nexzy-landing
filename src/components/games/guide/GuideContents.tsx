"use client";

// The guide's table of contents, one list for every game (IGN style):
// the story walkthrough and its steps, the other guide pages and their
// sub-pages, the checklists, and the lists (every entry type with its own
// pages). The hub shows it as columns; guide pages show it as a sidebar
// with collapsible groups. Story titles past the reader's spoiler setting
// are masked; done steps get a check (same progress as the map).
import { mapChoices } from "@/lib/hub-engine/maps";
import { useEffect, useState } from "react";
import NextLink from "next/link";
import { Box, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { FiCheck, FiChevronDown, FiChevronRight } from "react-icons/fi";
import {
  guidePath,
  isStory,
  labelOf,
  spoilerVisible,
  walkOf,
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
  /** Right side, e.g. a chapter's "6/18". */
  meta?: string;
  /** A step's chapter (the sidebar opens only the reader's chapter). */
  chapter?: string;
  /** Guides: nesting depth (0 = top-level page) and the slugs of the
   *  pages above it, so the sidebar can fold each branch. */
  depth?: number;
  parents?: string[];
  /** Guides: the page has sub-pages (the sidebar shows a fold toggle). */
  kids?: boolean;
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
      : labelOf(p);
  const groups: Group[] = [];
  // The Story page is the walkthrough: its steps, numbered, or with
  // chapters each chapter (with its done count) and its steps under it.
  const w = walkOf(pages);
  const story = w.story;
  const isDone = (p: HubPageNode) => !!p.entry && found.has(p.entry.id);
  if (story)
    groups.push({
      key: "walkthrough",
      title: labelOf(story),
      href: guidePath(slug, story.slug),
      links: story.chaptered
        ? story.children.flatMap((c) => {
            const ch = w.chapters.find((x) => x.node === c);
            const head: Link = {
              key: c.slug,
              href: guidePath(slug, c.slug),
              label: masked(c, "Spoiler page"),
            };
            if (!ch) return [head];
            const tracked = ch.steps.filter((x) => x.node.entry);
            return [
              {
                ...head,
                meta: tracked.length
                  ? `${tracked.filter((x) => isDone(x.node)).length}/${tracked.length}`
                  : undefined,
              },
              ...ch.steps.map((x) => ({
                key: x.node.slug,
                href: guidePath(slug, x.node.slug),
                label: masked(x.node, "Spoiler step"),
                n: x.inChapter,
                done: isDone(x.node),
                child: true,
                chapter: c.slug,
              })),
            ];
          })
        : w.steps.map((x) => ({
            key: x.node.slug,
            href: guidePath(slug, x.node.slug),
            label: masked(x.node, "Spoiler step"),
            n: x.n,
            done: isDone(x.node),
          })),
    });
  const others = pages.filter((p) => p !== story);
  if (others.length)
    groups.push({
      key: "guides",
      title: "Guides",
      // Every level (Collectibles > Collectible Cards > a card set), parents
      // first. Sub-pages of a Steps page are numbered, with Done marks.
      links: others.flatMap((p) => {
        const walk = (
          n: HubPageNode,
          parents: string[],
          parent: HubPageNode | null,
          i: number,
        ): Link[] => [
          {
            key: n.slug,
            href: guidePath(slug, n.slug),
            label: masked(n, parent?.steps ? "Spoiler step" : "Spoiler page"),
            child: parents.length > 0,
            depth: parents.length,
            parents,
            kids: n.children.length > 0,
            ...(parent?.steps ? { n: i + 1, done: isDone(n) } : {}),
          },
          ...n.children.flatMap((c, j) => walk(c, [...parents, n.slug], n, j)),
        ];
        return walk(p, [], null, 0);
      }),
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
        // The first map is "Interactive map"; dungeon maps (one link per
        // group, opening on its first floor) follow it.
        ...mapChoices(config).map((m, i) => ({
          key: `map-${m.key}`,
          href:
            i === 0
              ? `/games/${slug}/map`
              : `/games/${slug}/map?map=${encodeURIComponent(m.key)}`,
          label: i === 0 ? "Interactive map" : `Map: ${m.label}`,
        })),
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

const ON_BG = "rgba(255,215,0,0.10)";

function LinkRow({
  l,
  current,
  fold,
}: {
  l: Link;
  current?: string;
  /** Sidebar: a page with sub-pages gets a fold toggle on its right. */
  fold?: { open: boolean; toggle: () => void };
}) {
  const on = l.key === current;
  const indent =
    l.depth != null ? [2.5, 6, 9, 12][Math.min(l.depth, 3)] : l.child ? 6 : 2.5;
  const row = (
    <Flex
      asChild
      align="center"
      gap={2}
      px={2.5}
      py={1.5}
      pl={indent}
      flex={fold ? "1" : undefined}
      minW={0}
      borderRadius="0 8px 8px 0"
      borderLeft="2px solid"
      borderColor={on ? G.gold : "transparent"}
      fontSize="sm"
      fontWeight={on ? "700" : "500"}
      color={on ? G.gold : l.child ? G.muted : G.text}
      bg={on ? ON_BG : "transparent"}
      _hover={on ? {} : { bg: "rgba(255,255,255,0.05)", color: "white" }}
    >
      <NextLink href={l.href} aria-current={on ? "page" : undefined}>
        {l.n != null && (
          <Text
            as="span"
            minW="20px"
            fontWeight="800"
            color={on ? G.gold : G.muted}
            fontSize="xs"
          >
            {l.n}
          </Text>
        )}
        <Text as="span" flex="1" lineClamp={2}>
          {l.label}
        </Text>
        {l.meta && (
          <Text as="span" fontSize="xs" color={G.muted} fontWeight="700">
            {l.meta}
          </Text>
        )}
        {l.done && <FiCheck aria-label="Done" color={GREEN} />}
      </NextLink>
    </Flex>
  );
  if (!fold) return row;
  return (
    <Flex align="center">
      {row}
      <Box asChild color={G.muted} p={1.5} _hover={{ color: "white" }}>
        <button
          type="button"
          onClick={fold.toggle}
          aria-expanded={fold.open}
          aria-label={`${fold.open ? "Collapse" : "Expand"} ${l.label}`}
        >
          {fold.open ? <FiChevronDown /> : <FiChevronRight />}
        </button>
      </Box>
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
  topLevel = false,
}: {
  slug: string;
  config: HubTemplateConfig;
  pages: HubPageNode[];
  counts: Record<string, number> | null;
  /** Links per group before "All N" (the guide index shows everything). */
  limit?: number;
  /** Hub only: the Guides column lists top-level pages, not sub-pages. */
  topLevel?: boolean;
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
        alignItems="start"
      >
        {groups.map((g) => {
          // Hub view: the Guides column lists top-level pages only (each
          // parent page and the sidebar link its sub-pages), so every main
          // guide is one click from the hub instead of behind "All N".
          // With chapters the Walkthrough column lists the chapters (each
          // with its done count) the same way.
          const top =
            topLevel &&
            (g.key === "guides" ||
              (g.key === "walkthrough" && g.links.some((l) => l.chapter)));
          const links = top ? g.links.filter((l) => !l.child) : g.links;
          const max = top ? Math.max(MAX, 12) : MAX;
          return (
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
                {/* The walkthrough's own page is one click from its column. */}
                {g.href && g.links.length > 0 ? (
                  <NextLink href={g.href} style={{ color: "inherit" }}>
                    {g.title}
                  </NextLink>
                ) : (
                  g.title
                )}
              </Text>
              <Stack gap={0}>
                {g.links.length === 0 && g.href && (
                  <LinkRow
                    l={{
                      key: g.key,
                      href: g.href,
                      label: `Open the ${g.title.toLowerCase()}`,
                    }}
                  />
                )}
                {links.slice(0, max).map((l) => (
                  <LinkRow key={l.key} l={l} />
                ))}
              </Stack>
              {links.length > max && (
                <Box px={2.5} pt={1.5}>
                  <NextLink
                    href={g.href ?? `/games/${slug}/guide`}
                    style={{ color: G.gold, fontSize: 13, fontWeight: 700 }}
                  >
                    All {links.length}
                  </NextLink>
                </Box>
              )}
            </Box>
          );
        })}
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
  // Walkthrough with chapters: the sidebar lists every chapter and opens
  // the steps of the reader's chapter only.
  const currentChapter =
    groups
      .find((g) => g.key === "walkthrough")
      ?.links.find((l) => l.key === current)?.chapter ?? null;
  const holds = (g: Group) =>
    g.links.some((l) => l.key === current) ||
    (g.key === "walkthrough" && g.href?.endsWith(`/${current}`));
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(groups.filter(holds).map((g) => g.key)),
  );
  // Guides: each page with sub-pages folds on its own. The branch holding
  // the current page starts open (and the current page's own sub-pages).
  const [openPages, setOpenPages] = useState<Set<string>>(() => {
    const here = groups
      .find((g) => g.key === "guides")
      ?.links.find((l) => l.key === current);
    return new Set([
      ...(here?.parents ?? []),
      ...(here?.kids ? [current] : []),
    ]);
  });
  // Moving to another page (client navigation keeps this component):
  // open the new page's branch too, without closing what the reader opened.
  const here = groups
    .find((g) => g.key === "guides")
    ?.links.find((l) => l.key === current);
  const branch = [
    ...(here?.parents ?? []),
    ...(here?.kids ? [current] : []),
  ].join("|");
  useEffect(() => {
    if (!branch) return;
    setOpenPages((cur) => {
      const add = branch.split("|").filter((k) => !cur.has(k));
      return add.length ? new Set([...cur, ...add]) : cur;
    });
    if (!groups.find((g) => g.key === "guides")) return;
    setOpen((cur) => (cur.has("guides") ? cur : new Set([...cur, "guides"])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);
  const togglePage = (k: string) =>
    setOpenPages((cur) => {
      const n = new Set(cur);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
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
        const canOpen = g.links.length > 0;
        return (
          <Box key={g.key}>
            <Flex
              align="center"
              borderRadius="0 8px 8px 0"
              borderLeft="2px solid"
              borderColor={onTitle ? G.gold : "transparent"}
              bg={onTitle ? ON_BG : "transparent"}
            >
              {g.href ? (
                <Box
                  asChild
                  flex="1"
                  px={2.5}
                  py={1.5}
                  fontSize="sm"
                  fontWeight="800"
                  color={onTitle ? G.gold : "white"}
                  _hover={{ color: G.gold }}
                >
                  <NextLink
                    href={g.href}
                    aria-current={onTitle ? "page" : undefined}
                  >
                    {g.title}
                  </NextLink>
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
              {canOpen && (
                <Box
                  asChild
                  color={G.muted}
                  p={1.5}
                  _hover={{ color: "white" }}
                >
                  <button
                    type="button"
                    onClick={() => toggle(g.key)}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Collapse" : "Expand"} ${g.title}`}
                  >
                    {isOpen ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                </Box>
              )}
            </Flex>
            {isOpen && canOpen && (
              <Stack gap={0} pl={1}>
                {g.links
                  .filter(
                    (l) =>
                      (!l.chapter ||
                        l.chapter === current ||
                        l.chapter === currentChapter) &&
                      (l.parents ?? []).every((k) => openPages.has(k)),
                  )
                  .map((l) => (
                    <LinkRow
                      key={l.key}
                      l={l}
                      current={current}
                      fold={
                        l.kids
                          ? {
                              open: openPages.has(l.key),
                              toggle: () => togglePage(l.key),
                            }
                          : undefined
                      }
                    />
                  ))}
              </Stack>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
