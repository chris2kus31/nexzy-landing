"use client";

// Renders a guide page's blocks (the same JSON the app renders). Server HTML
// carries every block that isn't a spoiler or era-specific, so pages are
// crawlable; the reader's era and spoiler choices (remembered per game) then
// show or hide the rest. Trackers tick entries as found, the same progress
// as the map and checklists. Nothing here renders HTML from content.
import { useState } from "react";
import NextLink from "next/link";
import NextImage from "next/image";
import { Box, Flex, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiEye,
  FiHelpCircle,
  FiInfo,
  FiMapPin,
} from "react-icons/fi";
import {
  entryPath,
  eraVisible,
  spoilerVisible,
  typeOf,
  type HubCaptionedImage,
  type HubPageNode,
  type HubResolvedBlock,
  type HubTableRow,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";
import {
  G,
  GuideCard,
  GuideMarkdown,
} from "@/components/games/guide/GuideBits";
import GuideMap from "@/components/games/guide/GuideMap";
import GuideVideo from "@/components/games/guide/GuideVideo";
import GuideEntryDialog from "@/components/games/guide/GuideEntryDialog";
import { useGuideProgress } from "@/components/games/guide/GuideProgress";
import { useVisible } from "@/components/games/guide/GuideSections";
import { StepCards, stepsOfNode } from "@/components/games/guide/GuideSteps";

const GREEN = "#7EE2A0";

export default function GuideBlocks({
  slug,
  config,
  blocks,
  pages = [],
  pageSlug = null,
}: {
  slug: string;
  config: HubTemplateConfig;
  blocks: HubResolvedBlock[];
  /** The guide's page tree + this page (for the Steps block). */
  pages?: HubPageNode[];
  pageSlug?: string | null;
}) {
  return (
    <Stack gap={6}>
      {blocks.map((b) => (
        <Gate key={b.id} config={config} block={b}>
          <Block
            slug={slug}
            config={config}
            b={b}
            pages={pages}
            pageSlug={pageSlug}
          />
        </Gate>
      ))}
    </Stack>
  );
}

/** Era / spoiler gate for one block. A hidden spoiler says what it is and
 *  offers to show it, so nobody wonders why a section is missing. */
function Gate({
  config,
  block,
  children,
}: {
  config: HubTemplateConfig;
  block: HubResolvedBlock;
  children: React.ReactNode;
}) {
  const { era, spoiler, setSpoiler } = useGuideProgress();
  const { eraSwitch, spoilers } = config.features;
  if (!eraVisible(block.eras, eraSwitch ? era : null)) return null;
  if (
    spoilers &&
    block.spoilerStage &&
    !spoilerVisible(config.spoilerStages, block.spoilerStage, spoiler)
  ) {
    const label =
      config.spoilerStages.find((s) => s.key === block.spoilerStage)?.label ??
      "later in the story";
    return (
      <Flex
        align="center"
        gap={3}
        bg={G.card}
        border="1px dashed"
        borderColor={G.line}
        borderRadius="12px"
        p={4}
        wrap="wrap"
      >
        <FiEye aria-hidden color={G.muted} />
        <Text color={G.muted} flex="1" minW="200px">
          Spoiler: {label}.
        </Text>
        <Box
          as="button"
          onClick={() => setSpoiler(block.spoilerStage)}
          color={G.gold}
          fontWeight="700"
          fontSize="sm"
        >
          Show spoilers up to here
        </Box>
      </Flex>
    );
  }
  return <>{children}</>;
}

function Block({
  slug,
  config,
  b,
  pages = [],
  pageSlug = null,
}: {
  slug: string;
  config: HubTemplateConfig;
  b: HubResolvedBlock;
  pages?: HubPageNode[];
  pageSlug?: string | null;
}) {
  switch (b.kind) {
    case "steps": {
      // This page's sub-pages as walkthrough steps.
      const node = pages.find((p) => p.slug === pageSlug);
      if (!node) return null;
      return (
        <StepCards
          config={config}
          title={b.title}
          show={b.show}
          steps={stepsOfNode(slug, node)}
          allHref="#all-steps"
        />
      );
    }
    case "text":
      return <GuideMarkdown text={b.markdown} />;
    case "tip":
      return <Tip style={b.style} markdown={b.markdown} />;
    case "image":
      return (
        <Figure
          img={b.image}
          after={
            b.entrySlug && b.entryType ? (
              <Flex gap={4} mt={1.5} wrap="wrap">
                {config.types.find((t) => t.key === b.entryType)?.pinnable && (
                  <NextLink
                    href={`/games/${slug}/map?entry=${b.entrySlug}`}
                    style={{
                      color: G.gold,
                      fontSize: 14,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FiMapPin aria-hidden /> Show on map
                  </NextLink>
                )}
                {typeOf(config, b.entryType)?.page && (
                  <NextLink
                    href={entryPath(slug, b.entryType, b.entrySlug)}
                    style={{ color: G.gold, fontSize: 14 }}
                  >
                    Details
                  </NextLink>
                )}
              </Flex>
            ) : null
          }
        />
      );
    case "gallery":
      return (
        <Flex gap={3} overflowX="auto" pb={2}>
          {b.images.map((img) => (
            <Box key={img.url} minW={{ base: "78%", md: "300px" }} w="300px">
              <Figure img={img} h={190} />
            </Box>
          ))}
        </Flex>
      );
    case "video":
      return (
        <Box maxW="820px">
          <GuideVideo url={b.url} start={b.start} caption={b.caption} />
        </Box>
      );
    case "dropdown":
      return <Dropdown slug={slug} config={config} b={b} />;
    case "table":
      return b.mode === "manual" ? (
        <ManualTable
          title={b.title}
          columns={b.columns}
          rows={(b.rows as string[][]) ?? []}
        />
      ) : (
        <Tracker
          slug={slug}
          config={config}
          title={b.title}
          labels={b.columnLabels ?? ["Name"]}
          columns={b.columns}
          rows={(b.rows as HubTableRow[]) ?? []}
          complete={b.complete}
        />
      );
    case "map": {
      const map = config.maps.find((m) => m.key === b.mapKey);
      if (!map) return null;
      return (
        <Box
          bg={G.panel}
          border="1px solid"
          borderColor={G.line}
          borderRadius="16px"
          p={{ base: 2, md: 3 }}
        >
          <GuideMap
            slug={slug}
            config={config}
            map={map}
            preview
            types={b.filter.types}
            focusEntry={b.focusEntry}
          />
        </Box>
      );
    }
    case "checklist":
      return <ChecklistBlock slug={slug} b={b} />;
    case "entries":
      return <EntriesBlock slug={slug} config={config} b={b} />;
    default:
      return null;
  }
}

function Tip({
  style,
  markdown,
}: {
  style: "tip" | "warning" | "spoiler";
  markdown: string;
}) {
  const [shown, setShown] = useState(false);
  const color =
    style === "warning" ? "#FFB86B" : style === "spoiler" ? "#c792ea" : G.gold;
  const Icon =
    style === "warning"
      ? FiAlertTriangle
      : style === "spoiler"
        ? FiEye
        : FiInfo;
  return (
    <Box
      bg="rgba(255,255,255,0.03)"
      borderLeft="4px solid"
      borderColor={color}
      borderRadius="10px"
      p={4}
    >
      <Flex
        align="center"
        gap={2}
        mb={2}
        color={color}
        fontWeight="800"
        fontSize="sm"
      >
        <Icon aria-hidden />
        {style === "warning"
          ? "Heads up"
          : style === "spoiler"
            ? "Spoiler"
            : "Tip"}
      </Flex>
      {style === "spoiler" && !shown ? (
        <Box
          as="button"
          onClick={() => setShown(true)}
          color={G.text}
          textDecoration="underline"
          fontSize="sm"
        >
          Tap to show
        </Box>
      ) : (
        <GuideMarkdown text={markdown} />
      )}
    </Box>
  );
}

function Figure({
  img,
  h = 420,
  after,
}: {
  img: HubCaptionedImage;
  h?: number;
  after?: React.ReactNode;
}) {
  return (
    <Box as="figure" m={0}>
      <Box
        position="relative"
        w="100%"
        h={{ base: `${Math.round(h * 0.6)}px`, md: `${h}px` }}
        borderRadius="12px"
        overflow="hidden"
        bg={G.card}
      >
        <NextImage
          src={img.url}
          alt={img.alt ?? img.caption ?? ""}
          fill
          sizes="(max-width: 900px) 100vw, 860px"
          style={{ objectFit: "cover" }}
        />
      </Box>
      {img.caption && (
        <Text as="figcaption" fontSize="sm" color={G.muted} mt={1.5}>
          {img.caption}
        </Text>
      )}
      {after}
    </Box>
  );
}

function Dropdown({
  slug,
  config,
  b,
}: {
  slug: string;
  config: HubTemplateConfig;
  b: Extract<HubResolvedBlock, { kind: "dropdown" }>;
}) {
  const [open, setOpen] = useState(b.open);
  return (
    <Box
      border="1px solid"
      borderColor={G.line}
      borderRadius="12px"
      bg={G.panel}
      overflow="hidden"
    >
      <Flex
        as="button"
        w="100%"
        textAlign="left"
        align="center"
        gap={2}
        p={4}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? <FiChevronDown aria-hidden /> : <FiChevronRight aria-hidden />}
        <Text color="white" fontWeight="700" fontSize="lg">
          {b.title}
        </Text>
      </Flex>
      {/* Closed content stays in the HTML (hidden) so search engines read it. */}
      <Box px={4} pb={4} hidden={!open}>
        <GuideBlocks
          slug={slug}
          config={config}
          blocks={b.blocks as HubResolvedBlock[]}
        />
      </Box>
    </Box>
  );
}

const tableBox = {
  border: "1px solid",
  borderColor: G.line,
  borderRadius: "14px",
  overflowX: "auto" as const,
  bg: G.panel,
};

function ManualTable({
  title,
  columns,
  rows,
}: {
  title: string | null;
  columns: string[];
  rows: string[][];
}) {
  return (
    <Box>
      {title && (
        <Heading as="h3" fontSize="lg" color="white" mb={3}>
          {title}
        </Heading>
      )}
      <Box {...tableBox}>
        <Box
          as="table"
          w="100%"
          fontSize="sm"
          style={{ borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              {columns.map((c, i) => (
                <Th key={i}>{c}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((_, j) => (
                  <Td key={j} strong={j === 0}>
                    {r[j] ?? ""}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </Box>
  );
}

function Tracker({
  slug,
  config,
  title,
  labels,
  columns,
  rows,
  complete,
}: {
  slug: string;
  config: HubTemplateConfig;
  title: string | null;
  labels: string[];
  columns: string[];
  rows: HubTableRow[];
  complete: boolean;
}) {
  const { found, toggle } = useGuideProgress();
  const { era, spoiler } = useGuideProgress();
  const { eraSwitch, spoilers } = config.features;
  // Details open in a window over the page (no second page to read).
  const [open, setOpen] = useState<string | null>(null);
  const shown = rows.filter(
    (r) =>
      eraVisible(r.eras, eraSwitch ? era : null) &&
      (!spoilers ||
        spoilerVisible(config.spoilerStages, r.spoilerStage, spoiler)),
  );
  const done = shown.filter((r) => found.has(r.id)).length;
  const hidden = rows.length - shown.length;
  return (
    <Box>
      <Flex justify="space-between" align="baseline" mb={3} gap={3} wrap="wrap">
        {title ? (
          <Heading as="h3" fontSize="lg" color="white">
            {title}
          </Heading>
        ) : (
          <Box />
        )}
        {complete && shown.length > 0 && (
          <Text fontSize="sm" color={done === shown.length ? GREEN : G.muted}>
            {done} / {shown.length} complete
          </Text>
        )}
      </Flex>
      <Box {...tableBox}>
        <Box
          as="table"
          w="100%"
          fontSize="sm"
          style={{ borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              {labels.map((l, i) => (
                <Th key={i}>{l}</Th>
              ))}
              {complete && <Th>Complete</Th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const t = typeOf(config, r.type);
              const on = found.has(r.id);
              return (
                <tr key={r.id}>
                  <Td strong>
                    <Flex align="center" gap={1.5}>
                      <NextLink
                        href={
                          t?.page
                            ? entryPath(slug, r.type, r.slug)
                            : `/games/${slug}/map?entry=${r.slug}`
                        }
                        style={{ textDecoration: "underline" }}
                        aria-haspopup="dialog"
                        onClick={(e) => {
                          // New-tab clicks still open the page.
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                            return;
                          e.preventDefault();
                          setOpen(r.slug);
                        }}
                      >
                        {r.title}
                      </NextLink>
                      {r.status === "unconfirmed" && (
                        <Box
                          as="span"
                          role="img"
                          aria-label={config.features.unconfirmedLabel}
                          title={config.features.unconfirmedLabel}
                          color={G.warn}
                          display="inline-flex"
                        >
                          <FiHelpCircle size={13} />
                        </Box>
                      )}
                    </Flex>
                  </Td>
                  {columns.map((c) => (
                    <Td key={c}>{r.cells[c] ?? ""}</Td>
                  ))}
                  {complete && (
                    <Td>
                      <Flex
                        as="button"
                        role="checkbox"
                        aria-checked={on}
                        aria-label={`${r.title} complete`}
                        onClick={() => toggle(r.id)}
                        align="center"
                        gap={2}
                        px={2.5}
                        py={1.5}
                        borderRadius="8px"
                        border="1px solid"
                        borderColor={on ? GREEN : G.line}
                        bg={on ? "rgba(126,226,160,0.12)" : "transparent"}
                        color={on ? GREEN : G.text}
                        fontWeight="700"
                      >
                        <Flex
                          w="18px"
                          h="18px"
                          borderRadius="4px"
                          border="2px solid"
                          borderColor={on ? GREEN : G.muted}
                          align="center"
                          justify="center"
                          bg={on ? GREEN : "transparent"}
                          color={G.ink}
                        >
                          {on && <FiCheck size={12} strokeWidth={4} />}
                        </Flex>
                        {on ? "Done" : "Mark"}
                      </Flex>
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Box>
      </Box>
      {hidden > 0 && (
        <Text fontSize="xs" color={G.muted} mt={2}>
          {hidden} more hidden by your era or spoiler settings.
        </Text>
      )}
      <GuideEntryDialog
        slug={slug}
        config={config}
        entrySlug={open}
        onOpenEntry={setOpen}
        onClose={() => setOpen(null)}
      />
    </Box>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <Box
      as="th"
      textAlign="left"
      px={3}
      py={2.5}
      color={G.muted}
      fontSize="xs"
      fontWeight="800"
      textTransform="uppercase"
      letterSpacing="0.05em"
      borderBottom="1px solid"
      borderColor={G.line}
      whiteSpace="nowrap"
      bg="rgba(255,255,255,0.03)"
    >
      {children}
    </Box>
  );
}

function Td({
  children,
  strong,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <Box
      as="td"
      px={3}
      py={2.5}
      color={strong ? "white" : G.text}
      fontWeight={strong ? "700" : "400"}
      borderBottom="1px solid"
      borderColor="rgba(255,255,255,0.06)"
      verticalAlign="middle"
    >
      {children}
    </Box>
  );
}

function ChecklistBlock({
  slug,
  b,
}: {
  slug: string;
  b: Extract<HubResolvedBlock, { kind: "checklist" }>;
}) {
  return (
    <Flex
      asChild
      align="center"
      gap={3}
      bg={G.panel}
      border="1px solid"
      borderColor={G.line}
      borderRadius="14px"
      p={4}
      _hover={{ borderColor: G.gold }}
    >
      <NextLink href={`/games/${slug}/checklist/${b.checklistKey}`}>
        <Box flex="1">
          <Text color="white" fontWeight="700">
            {b.checklistTitle ?? "Checklist"}
          </Text>
          <Text color={G.muted} fontSize="sm">
            {b.total ?? 0} to find. Open the checklist to tick them off.
          </Text>
        </Box>
        <FiChevronRight aria-hidden color={G.gold} />
      </NextLink>
    </Flex>
  );
}

function EntriesBlock({
  slug,
  config,
  b,
}: {
  slug: string;
  config: HubTemplateConfig;
  b: Extract<HubResolvedBlock, { kind: "entries" }>;
}) {
  const visible = useVisible(config);
  const items = (b.items ?? []).filter(visible);
  if (!items.length) return null;
  return (
    <Box>
      {b.title && (
        <Heading as="h3" fontSize="lg" color="white" mb={3}>
          {b.title}
        </Heading>
      )}
      {b.style === "list" ? (
        <Stack gap={2}>
          {items.map((c) => (
            <GuideCard
              key={c.id}
              card={c}
              config={config}
              gameSlug={slug}
              minimal
            />
          ))}
        </Stack>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          {items.map((c) => (
            <GuideCard key={c.id} card={c} config={config} gameSlug={slug} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
