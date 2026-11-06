"use client";

// Admin -> Hub guides -> Pages: guide pages built from blocks ("All Song
// Locations", "How to Farm Rupees", "Walkthrough" with step pages under it).
// The list sets the table of contents (order, one level of nesting); the
// page form stacks blocks: text, photo, gallery, video, table, dropdown, tip,
// map, checklist, entry list. Everything is checked by the API on Save; a
// page shows on the site only when its status is Published.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Flex,
  HStack,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  FiArrowDown,
  FiArrowLeft,
  FiArrowRight,
  FiArrowUp,
  FiCopy,
  FiExternalLink,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import type {
  BlockKind,
  HubBlock,
  HubCaptionedImage,
  HubFilter,
  HubTemplateConfig,
} from "@/lib/hub-engine/types";
import {
  createEnginePage,
  deleteEnginePage,
  errorLines,
  fileToDataUrl,
  getEnginePage,
  listEngineEntries,
  listEnginePages,
  reorderEnginePages,
  updateEnginePage,
  uploadEngineImage,
  type EnginePage,
  type EnginePageRow,
  type EngineEntryRow,
  type PageInput,
  type PageStatus,
} from "@/lib/admin/client-hub-engine";
import {
  C,
  Card,
  Check,
  Gold,
  Labeled,
  LongIn,
  MultiCheck,
  Pick,
  Plain,
  Problems,
  TextIn,
  keyify,
} from "@/components/admin/guide/ui";

const STATUS: {
  key: PageStatus;
  label: string;
  short: string;
  color: string;
}[] = [
  {
    key: "draft",
    label: "Draft (admins only)",
    short: "Draft",
    color: C.faint,
  },
  {
    key: "published",
    label: "Published",
    short: "Published (live)",
    color: C.good,
  },
  { key: "hidden", label: "Hidden", short: "Hidden", color: C.warn },
];

const KINDS: { kind: BlockKind; label: string; hint: string }[] = [
  { kind: "text", label: "Text", hint: "Paragraphs, headings, lists, links" },
  { kind: "image", label: "Photo", hint: "One photo with a caption" },
  { kind: "gallery", label: "Gallery", hint: "Several photos" },
  { kind: "video", label: "Video", hint: "YouTube or Streamable, start time" },
  {
    kind: "table",
    label: "Table",
    hint: "Typed rows, or a tracker of entries",
  },
  { kind: "dropdown", label: "Dropdown", hint: "Collapsible section" },
  { kind: "tip", label: "Tip box", hint: "Tip, warning or spoiler" },
  { kind: "map", label: "Map", hint: "Small live map of chosen types" },
  { kind: "checklist", label: "Checklist", hint: "A checklist's progress" },
  {
    kind: "entries",
    label: "Entry list",
    hint: "Cards or a list, e.g. newest finds",
  },
  {
    kind: "steps",
    label: "Walkthrough steps",
    hint: "This page's sub-pages as steps: Up next / Done / reward",
  },
];

const EMPTY_FILTER: HubFilter = { types: [], tags: [], eras: [], statuses: [] };
const newId = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function blankBlock(kind: BlockKind, config: HubTemplateConfig): HubBlock {
  const base = { id: newId(), spoilerStage: null, eras: [] as string[] };
  switch (kind) {
    case "text":
      return { ...base, kind, markdown: "" };
    case "tip":
      return { ...base, kind, style: "tip", markdown: "" };
    case "image":
      return {
        ...base,
        kind,
        image: { url: "", alt: null, caption: null },
        entrySlug: null,
      };
    case "gallery":
      return { ...base, kind, images: [] };
    case "video":
      return { ...base, kind, url: "", start: null, caption: null };
    case "table":
      return {
        ...base,
        kind,
        title: null,
        mode: "manual",
        columns: ["Name", "Where"],
        rows: [["", ""]],
      };
    case "dropdown":
      return { ...base, kind, title: "", open: false, blocks: [] };
    case "map":
      return {
        ...base,
        kind,
        mapKey: config.maps[0]?.key ?? "",
        filter: { ...EMPTY_FILTER },
        focusEntry: null,
      };
    case "checklist":
      return { ...base, kind, checklistKey: config.checklists[0]?.key ?? "" };
    case "entries":
      return {
        ...base,
        kind,
        title: null,
        filter: { ...EMPTY_FILTER },
        style: "cards",
        limit: 8,
        sort: "newest",
      };
    case "steps":
      return { ...base, kind, title: null, show: "next" };
  }
}

const move = <T,>(list: T[], i: number, d: number): T[] => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};

// ───────────────────────── list (table of contents) ─────────────────────────

export default function GuidePagesEditor({
  gameId,
  gameSlug,
  config,
  onDirtyChange,
}: {
  gameId: string;
  gameSlug: string;
  config: HubTemplateConfig;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [rows, setRows] = useState<EnginePageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string[]>([]);
  const [open, setOpen] = useState<EnginePage | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listEnginePages(gameId));
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      setLoading(false);
    }
  }, [gameId]);
  useEffect(() => {
    void load();
  }, [load]);

  // Tree order: each top page, then its children.
  const tree = useMemo(() => {
    const ids = new Set(rows.map((r) => r.id));
    const top = rows.filter((r) => !r.parentId || !ids.has(r.parentId));
    return top.map((t) => ({
      page: t,
      children: rows.filter((r) => r.parentId === t.id),
    }));
  }, [rows]);

  /** Send the whole order after a move / indent. */
  const commit = async (
    next: { page: EnginePageRow; children: EnginePageRow[] }[],
  ) => {
    const items: { id: string; parentId: string | null; sortOrder: number }[] =
      [];
    next.forEach((t, i) => {
      items.push({ id: t.page.id, parentId: null, sortOrder: (i + 1) * 10 });
      t.children.forEach((c, j) =>
        items.push({ id: c.id, parentId: t.page.id, sortOrder: (j + 1) * 10 }),
      );
    });
    setBusy(true);
    setErr([]);
    try {
      setRows(await reorderEnginePages(gameId, items));
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      setBusy(false);
    }
  };

  const openPage = async (id: string) => {
    setErr([]);
    try {
      setOpen(await getEnginePage(gameId, id));
    } catch (e) {
      setErr(errorLines(e));
    }
  };

  if (open)
    return (
      <PageForm
        gameId={gameId}
        gameSlug={gameSlug}
        config={config}
        page={open === "new" ? null : open}
        parents={tree
          .map((t) => t.page)
          .filter((p) => open === "new" || p.id !== open.id)}
        onDirtyChange={onDirtyChange}
        onClose={(changed) => {
          setOpen(null);
          if (changed) void load();
        }}
      />
    );

  const statusOf = (s: PageStatus) => STATUS.find((x) => x.key === s)!;
  const Row = ({
    p,
    child,
    tools,
  }: {
    p: EnginePageRow;
    child: boolean;
    tools: React.ReactNode;
  }) => (
    <Flex
      align="center"
      gap={3}
      bg={C.raised}
      borderRadius="10px"
      px={3}
      py={2}
      ml={child ? 8 : 0}
      wrap="wrap"
    >
      <Box flex="1" minW="200px">
        <Box
          as="button"
          textAlign="left"
          onClick={() => void openPage(p.id)}
          color={C.text}
          fontWeight="700"
          _hover={{ textDecoration: "underline" }}
        >
          {p.title}
        </Box>
        <Text fontSize="xs" color={C.faint}>
          /guide/{p.slug}
        </Text>
      </Box>
      {p.story && (
        <Badge
          bg="transparent"
          border="1px solid"
          borderColor={C.gold}
          color={C.gold}
        >
          story walkthrough
        </Badge>
      )}
      {p.entryId && (
        <Badge
          bg="transparent"
          border="1px solid"
          borderColor={C.line}
          color={C.muted}
        >
          linked
        </Badge>
      )}
      <Badge
        bg="transparent"
        border="1px solid"
        borderColor={statusOf(p.status).color}
        color={statusOf(p.status).color}
      >
        {p.status}
      </Badge>
      <HStack gap={1}>{tools}</HStack>
    </Flex>
  );
  const Icon = ({
    label,
    onClick,
    disabled,
    children,
  }: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <Box
      asChild
      color={disabled ? C.faint : C.muted}
      p={1}
      _hover={disabled ? {} : { color: C.text }}
    >
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        disabled={disabled || busy}
      >
        {children}
      </button>
    </Box>
  );

  return (
    <Stack gap={4}>
      <Card
        title={`Guide pages (${rows.length})`}
        aside={
          <Gold onClick={() => setOpen("new")}>
            <FiPlus aria-hidden /> New page
          </Gold>
        }
      >
        <Text fontSize="sm" color={C.muted} mb={3}>
          This list is the guide&apos;s table of contents. Arrows change the
          order; the right arrow puts a page under the one above it (for
          walkthrough steps), the left arrow brings it back to the top.
        </Text>
        <Problems lines={err} />
        {loading ? (
          <Text color={C.muted}>Loading...</Text>
        ) : !rows.length ? (
          <Text color={C.faint} fontSize="sm">
            No pages yet. Make one with New page (for example &quot;All Song
            Locations&quot; with a tracker table, or &quot;Walkthrough&quot;
            with a page per chapter under it).
          </Text>
        ) : (
          <Stack gap={2}>
            {tree.map((t, i) => (
              <Stack key={t.page.id} gap={2}>
                <Row
                  p={t.page}
                  child={false}
                  tools={
                    <>
                      <Icon
                        label="Move up"
                        disabled={i === 0}
                        onClick={() => void commit(move(tree, i, -1))}
                      >
                        <FiArrowUp />
                      </Icon>
                      <Icon
                        label="Move down"
                        disabled={i === tree.length - 1}
                        onClick={() => void commit(move(tree, i, 1))}
                      >
                        <FiArrowDown />
                      </Icon>
                      <Icon
                        label="Put under the page above"
                        disabled={i === 0 || t.children.length > 0}
                        onClick={() => {
                          const next = tree
                            .filter((_, j) => j !== i)
                            .map((x) =>
                              x.page.id === tree[i - 1].page.id
                                ? { ...x, children: [...x.children, t.page] }
                                : x,
                            );
                          void commit(next);
                        }}
                      >
                        <FiArrowRight />
                      </Icon>
                    </>
                  }
                />
                {t.children.map((c, j) => (
                  <Row
                    key={c.id}
                    p={c}
                    child
                    tools={
                      <>
                        <Icon
                          label="Move up"
                          disabled={j === 0}
                          onClick={() =>
                            void commit(
                              tree.map((x, k) =>
                                k === i
                                  ? { ...x, children: move(x.children, j, -1) }
                                  : x,
                              ),
                            )
                          }
                        >
                          <FiArrowUp />
                        </Icon>
                        <Icon
                          label="Move down"
                          disabled={j === t.children.length - 1}
                          onClick={() =>
                            void commit(
                              tree.map((x, k) =>
                                k === i
                                  ? { ...x, children: move(x.children, j, 1) }
                                  : x,
                              ),
                            )
                          }
                        >
                          <FiArrowDown />
                        </Icon>
                        <Icon
                          label="Bring back to the top level"
                          onClick={() => {
                            const next = tree.map((x, k) =>
                              k === i
                                ? {
                                    ...x,
                                    children: x.children.filter(
                                      (y) => y.id !== c.id,
                                    ),
                                  }
                                : x,
                            );
                            next.splice(i + 1, 0, { page: c, children: [] });
                            void commit(next);
                          }}
                        >
                          <FiArrowLeft />
                        </Icon>
                      </>
                    }
                  />
                ))}
              </Stack>
            ))}
          </Stack>
        )}
      </Card>
      <Text fontSize="xs" color={C.faint}>
        Published pages live at /games/{gameSlug}/guide/&lt;page&gt; and show in
        the guide&apos;s table of contents within a minute.
      </Text>
    </Stack>
  );
}

// ───────────────────────── page form ─────────────────────────

function PageForm({
  gameId,
  gameSlug,
  config,
  page,
  parents,
  onClose,
  onDirtyChange,
}: {
  gameId: string;
  gameSlug: string;
  config: HubTemplateConfig;
  page: EnginePage | null;
  parents: EnginePageRow[];
  onClose: (changed: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [v, setV] = useState<PageInput>(() =>
    page
      ? {
          title: page.title,
          slug: page.slug,
          summary: page.summary,
          status: page.status,
          parentId: page.parentId,
          spoilerStage: page.spoilerStage,
          eras: page.eras,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          blocks: page.blocks,
          story: !!page.story,
          entry: page.entry?.slug ?? null,
        }
      : { title: "", status: "draft", eras: [], blocks: [] },
  );
  const [saved, setSaved] = useState<EnginePage | null>(page);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string[]>([]);
  const [note, setNote] = useState("");
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);
  const set = (p: Partial<PageInput>) => {
    setV((cur) => ({ ...cur, ...p }));
    setDirty(true);
    setNote("");
  };

  const save = async () => {
    setBusy(true);
    setErr([]);
    try {
      const r = saved
        ? await updateEnginePage(gameId, saved.id, v)
        : await createEnginePage(gameId, v);
      setSaved(r);
      setV((cur) => ({ ...cur, slug: r.slug, blocks: r.blocks }));
      setDirty(false);
      setNote(
        r.status === "published"
          ? "Saved. Live on the site within a minute."
          : "Saved.",
      );
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (
      !saved ||
      !window.confirm(
        `Delete the page "${saved.title}"? Pages under it move to the top level.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteEnginePage(gameId, saved.id);
      onClose(true);
    } catch (e) {
      setErr(errorLines(e));
      setBusy(false);
    }
  };
  const close = () => {
    if (dirty && !window.confirm("You have unsaved changes. Close anyway?"))
      return;
    onClose(!!saved);
  };

  return (
    <Stack gap={4}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
        <Text color={C.text} fontWeight="800" fontSize="lg">
          {saved ? `Edit page: ${saved.title}` : "New page"}
        </Text>
        <HStack gap={2} wrap="wrap">
          {saved?.status === "published" && (
            <a
              href={`/games/${gameSlug}/guide/${saved.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: C.gold,
                fontSize: 13,
                display: "inline-flex",
                gap: 4,
                alignItems: "center",
              }}
            >
              View page <FiExternalLink aria-hidden />
            </a>
          )}
          {saved && (
            <Plain danger onClick={() => void remove()}>
              <FiTrash2 aria-hidden /> Delete
            </Plain>
          )}
          <Plain onClick={close}>
            <FiX aria-hidden /> Close
          </Plain>
          <Gold onClick={() => void save()} loading={busy} disabled={!dirty}>
            Save page
          </Gold>
        </HStack>
      </Flex>
      <Problems lines={err} />
      {note && (
        <Text color={C.good} fontSize="sm">
          {note}
        </Text>
      )}

      <Card title="Page">
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
          <Labeled label="Title *">
            <TextIn
              value={v.title}
              maxLength={120}
              onChange={(t) => set({ title: t })}
            />
          </Labeled>
          <Labeled
            label="Address"
            hint={
              saved
                ? "Changing it breaks old links"
                : "Made from the title if empty"
            }
          >
            <TextIn
              value={v.slug ?? ""}
              maxLength={80}
              placeholder={keyify(v.title)}
              onChange={(s) =>
                set({
                  slug:
                    s
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/^-+/, "") || null,
                })
              }
            />
          </Labeled>
          <Labeled label="Who can see it">
            <HStack gap={1} role="radiogroup" aria-label="Who can see it">
              {STATUS.map((st) => {
                const on = (v.status ?? "draft") === st.key;
                return (
                  <Box
                    key={st.key}
                    asChild
                    flex="1"
                    px={2}
                    py={1.5}
                    borderRadius="8px"
                    fontSize="sm"
                    fontWeight="700"
                    textAlign="center"
                    border="1px solid"
                    borderColor={on ? st.color : C.line}
                    bg={on ? st.color : "transparent"}
                    color={on ? C.ink : C.text}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => set({ status: st.key })}
                    >
                      {st.short}
                    </button>
                  </Box>
                );
              })}
            </HStack>
          </Labeled>
          <Labeled label="Under page" hint="For walkthrough steps or chapters">
            <Pick
              label="Under page"
              value={v.parentId ?? ""}
              onChange={(s) =>
                set({ parentId: s || null, ...(s ? { story: false } : {}) })
              }
              options={[
                { value: "", label: "Top level" },
                ...parents.map((p) => ({
                  value: p.id,
                  label: p.story ? `${p.title} (story walkthrough)` : p.title,
                })),
              ]}
            />
          </Labeled>
          {config.spoilerStages.length > 0 && (
            <Labeled label="Spoiler stage (whole page)">
              <Pick
                label="Spoiler stage"
                value={v.spoilerStage ?? ""}
                onChange={(s) => set({ spoilerStage: s || null })}
                options={[
                  { value: "", label: "Not a spoiler" },
                  ...config.spoilerStages.map((s) => ({
                    value: s.key,
                    label: s.label,
                  })),
                ]}
              />
            </Labeled>
          )}
        </SimpleGrid>
        <Flex gap={6} mt={3} wrap="wrap" align="flex-end">
          {!v.parentId && (
            <Check
              label="Story walkthrough: the pages under this one are the steps, in order (one per game)"
              checked={!!v.story}
              onChange={(story) => set({ story })}
            />
          )}
          <Box minW="320px" flex="1">
            <EntrySlugPicker
              gameId={gameId}
              label="This page is about (optional): link a mission or entry for its map pin, Mark done and progress"
              value={v.entry ?? null}
              onChange={(entry) => set({ entry })}
            />
          </Box>
        </Flex>
        <Box mt={3}>
          <Labeled
            label="Summary"
            hint="One or two lines under the title and in search results (max 300)"
          >
            <LongIn
              rows={2}
              maxLength={300}
              value={v.summary ?? ""}
              onChange={(s) => set({ summary: s || null })}
            />
          </Labeled>
        </Box>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={3}>
          <Labeled
            label="Search title (optional)"
            hint="Max 70; defaults to the title"
          >
            <TextIn
              value={v.seoTitle ?? ""}
              maxLength={70}
              onChange={(s) => set({ seoTitle: s || null })}
            />
          </Labeled>
          <Labeled
            label="Search description (optional)"
            hint="Max 170; defaults to the summary"
          >
            <TextIn
              value={v.seoDescription ?? ""}
              maxLength={170}
              onChange={(s) => set({ seoDescription: s || null })}
            />
          </Labeled>
        </SimpleGrid>
      </Card>

      <Card title={`Blocks (${v.blocks?.length ?? 0})`}>
        <BlocksEditor
          gameId={gameId}
          config={config}
          blocks={v.blocks ?? []}
          nested={false}
          onChange={(blocks) => set({ blocks })}
        />
      </Card>

      <Flex justify="flex-end">
        <Gold onClick={() => void save()} loading={busy} disabled={!dirty}>
          Save page
        </Gold>
      </Flex>
    </Stack>
  );
}

// ───────────────────────── blocks ─────────────────────────

function BlocksEditor({
  gameId,
  config,
  blocks,
  nested,
  onChange,
}: {
  gameId: string;
  config: HubTemplateConfig;
  blocks: HubBlock[];
  nested: boolean;
  onChange: (b: HubBlock[]) => void;
}) {
  const kinds = KINDS.filter(
    (k) =>
      !(nested && (k.kind === "dropdown" || k.kind === "steps")) &&
      !(k.kind === "map" && !config.maps.length) &&
      !(k.kind === "checklist" && !config.checklists.length),
  );
  const [adding, setAdding] = useState(false);
  return (
    <Stack gap={3}>
      {blocks.map((b, i) => (
        <BlockCard
          key={b.id}
          gameId={gameId}
          config={config}
          block={b}
          onChange={(nb) => onChange(blocks.map((x, j) => (j === i ? nb : x)))}
          tools={
            <HStack gap={1}>
              <Plain
                onClick={() => onChange(move(blocks, i, -1))}
                disabled={i === 0}
              >
                <FiArrowUp aria-label="Move up" />
              </Plain>
              <Plain
                onClick={() => onChange(move(blocks, i, 1))}
                disabled={i === blocks.length - 1}
              >
                <FiArrowDown aria-label="Move down" />
              </Plain>
              <Plain
                onClick={() => {
                  const copy = JSON.parse(JSON.stringify(b)) as HubBlock;
                  copy.id = newId();
                  if (copy.kind === "dropdown")
                    copy.blocks = copy.blocks.map((c) => ({
                      ...c,
                      id: newId(),
                    }));
                  const next = [...blocks];
                  next.splice(i + 1, 0, copy);
                  onChange(next);
                }}
              >
                <FiCopy aria-label="Duplicate" />
              </Plain>
              <Plain
                danger
                onClick={() =>
                  window.confirm("Remove this block?") &&
                  onChange(blocks.filter((_, j) => j !== i))
                }
              >
                <FiTrash2 aria-label="Remove" />
              </Plain>
            </HStack>
          }
        />
      ))}
      {adding ? (
        <Box bg={C.raised} borderRadius="10px" p={3}>
          <Flex justify="space-between" mb={2}>
            <Text color={C.text} fontWeight="700" fontSize="sm">
              Add a block
            </Text>
            <Plain onClick={() => setAdding(false)}>
              <FiX aria-label="Cancel" />
            </Plain>
          </Flex>
          <SimpleGrid columns={{ base: 2, md: 5 }} gap={2}>
            {kinds.map((k) => (
              <Box
                key={k.kind}
                as="button"
                textAlign="left"
                bg={C.surface}
                border="1px solid"
                borderColor={C.line}
                borderRadius="8px"
                p={2}
                _hover={{ borderColor: C.gold }}
                onClick={() => {
                  onChange([...blocks, blankBlock(k.kind, config)]);
                  setAdding(false);
                }}
              >
                <Text color={C.text} fontWeight="700" fontSize="sm">
                  {k.label}
                </Text>
                <Text color={C.faint} fontSize="xs">
                  {k.hint}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      ) : (
        <Box>
          <Plain onClick={() => setAdding(true)}>
            <FiPlus aria-hidden /> Add block
          </Plain>
        </Box>
      )}
    </Stack>
  );
}

function BlockCard({
  gameId,
  config,
  block: b,
  onChange,
  tools,
}: {
  gameId: string;
  config: HubTemplateConfig;
  block: HubBlock;
  onChange: (b: HubBlock) => void;
  tools: React.ReactNode;
}) {
  const label = KINDS.find((k) => k.kind === b.kind)?.label ?? b.kind;
  const typeOpts = config.types.map((t) => ({ value: t.key, label: t.plural }));
  return (
    <Box
      bg={C.raised}
      borderRadius="10px"
      p={3}
      borderLeft="3px solid"
      borderColor={C.gold}
    >
      <Flex justify="space-between" align="center" mb={2} gap={2} wrap="wrap">
        <Text color={C.gold} fontWeight="800" fontSize="sm">
          {label}
        </Text>
        {tools}
      </Flex>
      <Stack gap={3}>
        {b.kind === "text" && (
          <Labeled
            label="Text"
            hint="## Heading, **bold**, *italic*, [link](https://...), lines starting with - or 1. for lists"
          >
            <LongIn
              rows={6}
              maxLength={10000}
              value={b.markdown}
              onChange={(markdown) => onChange({ ...b, markdown })}
            />
          </Labeled>
        )}
        {b.kind === "tip" && (
          <>
            <Box w="220px">
              <Pick
                label="Style"
                value={b.style}
                onChange={(s) =>
                  onChange({ ...b, style: s as "tip" | "warning" | "spoiler" })
                }
                options={[
                  { value: "tip", label: "Tip" },
                  { value: "warning", label: "Warning" },
                  { value: "spoiler", label: "Spoiler (tap to show)" },
                ]}
              />
            </Box>
            <LongIn
              rows={3}
              maxLength={10000}
              value={b.markdown}
              onChange={(markdown) => onChange({ ...b, markdown })}
            />
          </>
        )}
        {b.kind === "image" && (
          <>
            <Photos
              gameId={gameId}
              value={b.image.url ? [b.image] : []}
              max={1}
              onChange={(imgs) =>
                onChange({
                  ...b,
                  image: imgs[0] ?? { url: "", alt: null, caption: null },
                })
              }
            />
            <EntrySlugPicker
              gameId={gameId}
              label="Show on map (optional): link this photo to an entry"
              value={b.entrySlug}
              onChange={(entrySlug) => onChange({ ...b, entrySlug })}
            />
          </>
        )}
        {b.kind === "gallery" && (
          <Photos
            gameId={gameId}
            value={b.images}
            max={12}
            onChange={(images) => onChange({ ...b, images })}
          />
        )}
        {b.kind === "video" && (
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
            <Labeled label="YouTube or Streamable link *">
              <TextIn
                value={b.url}
                maxLength={500}
                onChange={(url) => onChange({ ...b, url: url.trim() })}
              />
            </Labeled>
            <Labeled label="Start at" hint="1:30 or seconds (optional)">
              <TextIn
                value={b.start == null ? "" : fmtTime(b.start)}
                onChange={(s) => onChange({ ...b, start: parseTime(s) })}
              />
            </Labeled>
            <Labeled label="Caption">
              <TextIn
                value={b.caption ?? ""}
                maxLength={200}
                onChange={(c) => onChange({ ...b, caption: c || null })}
              />
            </Labeled>
          </SimpleGrid>
        )}
        {b.kind === "table" && (
          <TableEditor config={config} block={b} onChange={onChange} />
        )}
        {b.kind === "dropdown" && (
          <>
            <Flex gap={3} align="flex-end" wrap="wrap">
              <Box flex="1" minW="240px">
                <Labeled label="Dropdown title *">
                  <TextIn
                    value={b.title}
                    maxLength={120}
                    onChange={(title) => onChange({ ...b, title })}
                  />
                </Labeled>
              </Box>
              <Check
                label="Open by default"
                checked={b.open}
                onChange={(open) => onChange({ ...b, open })}
              />
            </Flex>
            <Box pl={3} borderLeft="1px solid" borderColor={C.line}>
              <BlocksEditor
                gameId={gameId}
                config={config}
                blocks={b.blocks}
                nested
                onChange={(blocks) => onChange({ ...b, blocks })}
              />
            </Box>
          </>
        )}
        {b.kind === "map" && (
          <>
            {config.maps.length > 1 && (
              <Box w="240px">
                <Pick
                  label="Map"
                  value={b.mapKey}
                  onChange={(mapKey) => onChange({ ...b, mapKey })}
                  options={config.maps.map((m) => ({
                    value: m.key,
                    label: m.name,
                  }))}
                />
              </Box>
            )}
            <MultiCheck
              label="Show only these types (none = all)"
              value={b.filter.types}
              options={typeOpts}
              onChange={(types) =>
                onChange({ ...b, filter: { ...b.filter, types } })
              }
            />
            <EntrySlugPicker
              gameId={gameId}
              label="Center on an entry (optional)"
              value={b.focusEntry}
              onChange={(focusEntry) => onChange({ ...b, focusEntry })}
            />
          </>
        )}
        {b.kind === "checklist" && (
          <Box w="280px">
            <Pick
              label="Checklist"
              value={b.checklistKey}
              onChange={(checklistKey) => onChange({ ...b, checklistKey })}
              options={config.checklists.map((c) => ({
                value: c.key,
                label: c.title,
              }))}
            />
          </Box>
        )}
        {b.kind === "steps" && (
          <>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              <Labeled label="Title (optional)">
                <TextIn
                  value={b.title ?? ""}
                  maxLength={120}
                  onChange={(t) => onChange({ ...b, title: t || null })}
                />
              </Labeled>
              <Labeled label="Show">
                <Pick
                  label="Show"
                  value={b.show}
                  onChange={(s) =>
                    onChange({ ...b, show: s as "next" | "all" })
                  }
                  options={[
                    {
                      value: "next",
                      label: "Next 5 steps (around the reader)",
                    },
                    { value: "all", label: "All steps" },
                  ]}
                />
              </Labeled>
            </SimpleGrid>
            <Text color={C.muted} fontSize="sm" mt={2}>
              Shows the pages under this page as numbered steps. Each step page
              gets Step X of N and Previous / Next step. Link a mission on a
              step page (This page is about) for its reward, Mark done and map
              pin. Use it on a top-level page.
            </Text>
          </>
        )}
        {b.kind === "entries" && (
          <>
            <SimpleGrid columns={{ base: 1, md: 4 }} gap={3}>
              <Labeled label="Title (optional)">
                <TextIn
                  value={b.title ?? ""}
                  maxLength={120}
                  onChange={(t) => onChange({ ...b, title: t || null })}
                />
              </Labeled>
              <Labeled label="Look">
                <Pick
                  label="Look"
                  value={b.style}
                  onChange={(s) =>
                    onChange({ ...b, style: s as "cards" | "list" })
                  }
                  options={[
                    { value: "cards", label: "Cards" },
                    { value: "list", label: "List" },
                  ]}
                />
              </Labeled>
              <Labeled label="Order">
                <Pick
                  label="Order"
                  value={b.sort}
                  onChange={(s) =>
                    onChange({ ...b, sort: s as "order" | "newest" | "title" })
                  }
                  options={[
                    { value: "newest", label: "Newest first" },
                    { value: "order", label: "Guide order" },
                    { value: "title", label: "A to Z" },
                  ]}
                />
              </Labeled>
              <Labeled label="How many (1-24)">
                <TextIn
                  type="number"
                  value={String(b.limit)}
                  onChange={(s) =>
                    onChange({
                      ...b,
                      limit: Math.max(1, Math.min(24, Number(s) || 1)),
                    })
                  }
                />
              </Labeled>
            </SimpleGrid>
            <MultiCheck
              label="Entry types (none = all)"
              value={b.filter.types}
              options={typeOpts}
              onChange={(types) =>
                onChange({ ...b, filter: { ...b.filter, types } })
              }
            />
          </>
        )}
        <Visibility config={config} block={b} onChange={onChange} />
      </Stack>
    </Box>
  );
}

/** Per-block spoiler stage and eras (hidden until the reader turns them on). */
function Visibility({
  config,
  block: b,
  onChange,
}: {
  config: HubTemplateConfig;
  block: HubBlock;
  onChange: (b: HubBlock) => void;
}) {
  if (!config.spoilerStages.length && !config.eras.length) return null;
  return (
    <Flex gap={4} wrap="wrap" align="center" pt={1}>
      {config.spoilerStages.length > 0 && (
        <Box w="240px">
          <Pick
            label="Block spoiler stage"
            value={b.spoilerStage ?? ""}
            onChange={(s) => onChange({ ...b, spoilerStage: s || null })}
            options={[
              { value: "", label: "Block: not a spoiler" },
              ...config.spoilerStages.map((s) => ({
                value: s.key,
                label: `Spoiler: ${s.label}`,
              })),
            ]}
          />
        </Box>
      )}
      {config.eras.map((x) => (
        <Check
          key={x.key}
          label={`Only ${x.label}`}
          checked={b.eras.includes(x.key)}
          onChange={(on) =>
            onChange({
              ...b,
              eras: on ? [...b.eras, x.key] : b.eras.filter((k) => k !== x.key),
            })
          }
        />
      ))}
    </Flex>
  );
}

function TableEditor({
  config,
  block: b,
  onChange,
}: {
  config: HubTemplateConfig;
  block: Extract<HubBlock, { kind: "table" }>;
  onChange: (b: HubBlock) => void;
}) {
  const [paste, setPaste] = useState("");
  const typeOpts = config.types.map((t) => ({ value: t.key, label: t.plural }));
  const head = (
    <Flex gap={3} wrap="wrap" align="flex-end">
      <Box flex="1" minW="220px">
        <Labeled label="Table title (optional)">
          <TextIn
            value={b.title ?? ""}
            maxLength={120}
            onChange={(t) => onChange({ ...b, title: t || null })}
          />
        </Labeled>
      </Box>
      <Box w="300px">
        <Pick
          label="Table kind"
          value={b.mode}
          onChange={(m) =>
            onChange(
              m === "entries"
                ? {
                    id: b.id,
                    kind: "table",
                    spoilerStage: b.spoilerStage,
                    eras: b.eras,
                    title: b.title,
                    mode: "entries",
                    filter: { ...EMPTY_FILTER },
                    columns: [],
                    complete: true,
                  }
                : {
                    id: b.id,
                    kind: "table",
                    spoilerStage: b.spoilerStage,
                    eras: b.eras,
                    title: b.title,
                    mode: "manual",
                    columns: ["Name", "Where"],
                    rows: [["", ""]],
                  },
            )
          }
          options={[
            { value: "manual", label: "Typed table (rows you write)" },
            { value: "entries", label: "Tracker (one row per entry)" },
          ]}
        />
      </Box>
    </Flex>
  );
  if (b.mode === "entries") {
    const fieldOpts: { value: string; label: string }[] = [];
    for (const tk of b.filter.types) {
      const t = config.types.find((x) => x.key === tk);
      for (const f of t?.fields ?? [])
        if (
          ["text", "number", "boolean", "select", "multiselect"].includes(
            f.kind,
          ) &&
          !fieldOpts.some((o) => o.value === f.key)
        )
          fieldOpts.push({ value: f.key, label: f.label });
    }
    return (
      <Stack gap={3}>
        {head}
        <MultiCheck
          label="Rows: entries of these types *"
          value={b.filter.types}
          options={typeOpts}
          onChange={(types) =>
            onChange({
              ...b,
              filter: { ...b.filter, types },
              columns: b.columns.filter((c) =>
                types.some((tk) =>
                  config.types
                    .find((x) => x.key === tk)
                    ?.fields.some((f) => f.key === c),
                ),
              ),
            })
          }
        />
        {b.filter.types.length > 0 && (
          <MultiCheck
            label="Columns (the name is always first)"
            value={b.columns}
            options={fieldOpts}
            onChange={(columns) =>
              onChange({ ...b, columns: columns.slice(0, 8) })
            }
          />
        )}
        <Check
          label="Complete checkbox on each row (ticks the entry as found)"
          checked={b.complete}
          onChange={(complete) => onChange({ ...b, complete })}
        />
      </Stack>
    );
  }
  const cols = b.columns;
  const setCell = (r: number, c: number, val: string) =>
    onChange({
      ...b,
      rows: b.rows.map((row, i) =>
        i === r ? row.map((x, j) => (j === c ? val : x)) : row,
      ),
    });
  return (
    <Stack gap={3}>
      {head}
      <Box overflowX="auto">
        <Box
          as="table"
          w="100%"
          style={{ borderCollapse: "separate", borderSpacing: 4 }}
        >
          <thead>
            <tr>
              {cols.map((c, j) => (
                <th key={j} style={{ minWidth: 140 }}>
                  <Flex gap={1}>
                    <TextIn
                      value={c}
                      maxLength={40}
                      onChange={(val) =>
                        onChange({
                          ...b,
                          columns: cols.map((x, k) => (k === j ? val : x)),
                        })
                      }
                    />
                    {cols.length > 1 && (
                      <Box
                        as="button"
                        aria-label="Remove column"
                        color={C.muted}
                        onClick={() =>
                          onChange({
                            ...b,
                            columns: cols.filter((_, k) => k !== j),
                            rows: b.rows.map((row) =>
                              row.filter((_, k) => k !== j),
                            ),
                          })
                        }
                      >
                        <FiX />
                      </Box>
                    )}
                  </Flex>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {b.rows.map((row, i) => (
              <tr key={i}>
                {cols.map((_, j) => (
                  <td key={j}>
                    <TextIn
                      value={row[j] ?? ""}
                      maxLength={300}
                      onChange={(val) => setCell(i, j, val)}
                    />
                  </td>
                ))}
                <td>
                  <Box
                    as="button"
                    aria-label="Remove row"
                    color={C.muted}
                    onClick={() =>
                      onChange({ ...b, rows: b.rows.filter((_, k) => k !== i) })
                    }
                  >
                    <FiTrash2 />
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
      <HStack gap={2} wrap="wrap">
        <Plain
          onClick={() =>
            onChange({ ...b, rows: [...b.rows, cols.map(() => "")] })
          }
          disabled={b.rows.length >= 200}
        >
          <FiPlus aria-hidden /> Row
        </Plain>
        <Plain
          onClick={() =>
            onChange({
              ...b,
              columns: [...cols, `Column ${cols.length + 1}`],
              rows: b.rows.map((r) => [...r, ""]),
            })
          }
          disabled={cols.length >= 8}
        >
          <FiPlus aria-hidden /> Column
        </Plain>
      </HStack>
      <Labeled
        label="Paste from a spreadsheet (optional)"
        hint="Copy cells from Sheets or Excel, paste here, then Use pasted rows. The first row becomes the column names."
      >
        <LongIn rows={3} value={paste} onChange={setPaste} />
      </Labeled>
      {paste.trim() && (
        <Box>
          <Plain
            onClick={() => {
              const lines = paste
                .split(/\r?\n/)
                .filter((l) => l.trim())
                .map((l) => l.split("\t").map((c) => c.trim().slice(0, 300)));
              if (!lines.length) return;
              const columns = lines[0]
                .slice(0, 8)
                .map((c, i) => c || `Column ${i + 1}`);
              const rows = lines
                .slice(1, 201)
                .map((r) => columns.map((_, j) => r[j] ?? ""));
              onChange({ ...b, columns, rows });
              setPaste("");
            }}
          >
            Use pasted rows
          </Plain>
        </Box>
      )}
    </Stack>
  );
}

function Photos({
  gameId,
  value,
  max,
  onChange,
}: {
  gameId: string;
  value: HubCaptionedImage[];
  max: number;
  onChange: (v: HubCaptionedImage[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string[]>([]);
  const add = async (files: File[]) => {
    setBusy(true);
    setErr([]);
    const out = [...value];
    try {
      for (const file of files.slice(0, max - value.length)) {
        const r = await uploadEngineImage(
          gameId,
          await fileToDataUrl(file),
          "photo",
        );
        out.push({ url: r.url, alt: null, caption: null });
      }
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      onChange(out);
      setBusy(false);
    }
  };
  return (
    <Stack
      gap={2}
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length) {
          e.preventDefault();
          void add(files);
        }
      }}
    >
      <Flex gap={2} wrap="wrap">
        {value.map((m, i) => (
          <Box key={m.url} w="180px" bg={C.surface} borderRadius="8px" p={2}>
            <img
              src={m.url}
              alt=""
              style={{
                width: "100%",
                height: 100,
                objectFit: "cover",
                borderRadius: 6,
              }}
            />
            <Stack gap={1} mt={1}>
              <TextIn
                value={m.caption ?? ""}
                placeholder="Caption (shown)"
                maxLength={200}
                onChange={(c) =>
                  onChange(
                    value.map((x, j) =>
                      j === i ? { ...x, caption: c || null } : x,
                    ),
                  )
                }
              />
              <TextIn
                value={m.alt ?? ""}
                placeholder="Describe it (screen readers)"
                maxLength={160}
                onChange={(a) =>
                  onChange(
                    value.map((x, j) =>
                      j === i ? { ...x, alt: a || null } : x,
                    ),
                  )
                }
              />
              <Plain
                danger
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                Remove
              </Plain>
            </Stack>
          </Box>
        ))}
      </Flex>
      {value.length < max && (
        <label
          style={{
            fontSize: 13,
            color: C.text,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {busy
            ? "Uploading..."
            : max > 1
              ? "Add photos (or paste)"
              : "Add photo (or paste)"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            multiple={max > 1}
            hidden
            onChange={(e) => {
              if (e.target.files) void add(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
        </label>
      )}
      <Problems lines={err} />
    </Stack>
  );
}

/** Search entries and keep one slug (photo "Show on map", map focus). */
function EntrySlugPicker({
  gameId,
  label,
  value,
  onChange,
}: {
  gameId: string;
  label: string;
  value: string | null;
  onChange: (slug: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<EngineEntryRow[]>([]);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setHits(
          (await listEngineEntries(gameId, { search: s })).items.slice(0, 8),
        );
      } catch {
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, gameId]);
  return (
    <Labeled label={label}>
      {value ? (
        <HStack
          bg={C.surface}
          borderRadius="999px"
          px={3}
          py={1}
          gap={2}
          w="fit-content"
        >
          <Text fontSize="sm" color={C.text}>
            {value}
          </Text>
          <Box
            as="button"
            aria-label="Remove"
            color={C.muted}
            onClick={() => onChange(null)}
          >
            <FiX />
          </Box>
        </HStack>
      ) : (
        <Box position="relative" maxW="360px">
          <TextIn value={q} placeholder="Search entries" onChange={setQ} />
          {hits.length > 0 && (
            <Box
              position="absolute"
              zIndex={5}
              top="100%"
              left={0}
              right={0}
              bg={C.surface}
              border="1px solid"
              borderColor={C.line}
              borderRadius="8px"
              mt={1}
            >
              {hits.map((h) => (
                <Box
                  key={h.id}
                  as="button"
                  w="100%"
                  textAlign="left"
                  p={2}
                  _hover={{ bg: C.raised }}
                  onClick={() => {
                    onChange(h.slug);
                    setQ("");
                    setHits([]);
                  }}
                >
                  <Text fontSize="sm" color={C.text}>
                    {h.title}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Labeled>
  );
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m}:${String(r).padStart(2, "0")}` : String(r);
}

function parseTime(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const parts = s.split(":").map((x) => Number(x));
  if (parts.some((x) => !Number.isFinite(x) || x < 0)) return null;
  const sec = parts.reduce((acc, x) => acc * 60 + x, 0);
  return Math.min(86400, Math.floor(sec));
}
