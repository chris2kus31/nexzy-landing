"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Spinner,
  Input,
  Image,
  Badge,
  Textarea,
} from "@chakra-ui/react";
import { FiSearch, FiDownloadCloud, FiX, FiLink, FiPlus } from "react-icons/fi";
import {
  getUnresolvedGames,
  searchGamesForLink,
  mapUnresolvedGame,
  importUnresolvedGame,
  skipUnresolvedGame,
  backfillGameLinks,
  type BackfillDetail,
  importAllUnresolved,
  getImportDiagnostics,
  dismissImportDiagnostic,
  dismissAllImportDiagnostics,
  type ImportDiagnostic,
  type UnresolvedGameRef,
  type GameLite,
  createManualGame,
  type ManualGamePayload,
  getGameTaxonomy,
  type GameTaxonomy,
  searchTags,
} from "@/lib/admin/client";

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  size: "sm" as const,
};

// Explicit colors — the admin theme is dark, so buttons must set text/bg
// or the label renders invisible (dark-on-dark).
const primaryBtn = {
  bg: "nexzy.blue",
  color: "white",
  _hover: { bg: "nexzy.blue", opacity: 0.9 },
};
const outlineBtn = {
  variant: "outline" as const,
  color: "nexzy.gray.100",
  borderColor: "whiteAlpha.300",
  _hover: { bg: "whiteAlpha.100" },
};

type OpRow = { label: string; sub?: string; tone: string };
type OpResult = { title: string; rows: OpRow[] };
function toneColor(t: string): string {
  return t === "green"
    ? "green.400"
    : t === "blue"
      ? "nexzy.lightBlue"
      : t === "orange"
        ? "orange.300"
        : t === "red"
          ? "red.300"
          : "whiteAlpha.400";
}

function timeAgo(iso: string): string {
  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read that file"));
    r.readAsDataURL(file);
  });
}

type TaxGroup = {
  group: string | null;
  options: { slug: string; name: string }[];
};

/**
 * Compact multi-select: shows the selected items as removable chips plus an
 * "Add / edit" toggle that reveals a filterable, grouped option list. Keeps the
 * form short instead of dumping every option as a wall of chips. Click a
 * selected chip to remove it; click an option to toggle it.
 */
function TaxPicker({
  label,
  groups,
  selected,
  onToggle,
}: {
  label: string;
  groups: TaxGroup[];
  selected: Set<string>;
  onToggle: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const nameBySlug = new Map<string, string>();
  groups.forEach((g) =>
    g.options.forEach((o) => nameBySlug.set(o.slug, o.name)),
  );
  const f = filter.trim().toLowerCase();
  const chosen = [...selected];
  return (
    <Box>
      <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
        {label}
        {selected.size ? ` · ${selected.size} selected` : ""}
      </Text>
      <Box
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        borderRadius="md"
        bg="whiteAlpha.50"
        p={2}
      >
        <Flex gap={2} wrap="wrap" align="center">
          {chosen.length === 0 && (
            <Text fontSize="xs" color="whiteAlpha.400">
              None selected
            </Text>
          )}
          {chosen.map((slug) => (
            <Button
              key={slug}
              size="xs"
              bg="nexzy.blue"
              color="white"
              borderRadius="full"
              _hover={{ bg: "nexzy.blue", opacity: 0.85 }}
              onClick={() => onToggle(slug)}
            >
              {nameBySlug.get(slug) ?? slug} ×
            </Button>
          ))}
          <Button size="xs" {...outlineBtn} onClick={() => setOpen((o) => !o)}>
            {open ? "Done" : "+ Add / edit"}
          </Button>
        </Flex>
        {open && (
          <Box mt={2}>
            <Input
              {...inputProps}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              mb={2}
            />
            <Box maxH="220px" overflowY="auto">
              {groups.map((g, gi) => {
                const opts = g.options.filter(
                  (o) => !f || o.name.toLowerCase().includes(f),
                );
                if (opts.length === 0) return null;
                return (
                  <Box key={gi} mb={2}>
                    {g.group && (
                      <Text fontSize="10px" color="whiteAlpha.600" mb={1}>
                        {g.group}
                      </Text>
                    )}
                    <HStack gap={2} wrap="wrap">
                      {opts.map((o) => {
                        const sel = selected.has(o.slug);
                        return (
                          <Button
                            key={o.slug}
                            size="xs"
                            borderWidth="1px"
                            bg={sel ? "nexzy.blue" : "transparent"}
                            color={sel ? "white" : "nexzy.gray.100"}
                            borderColor={sel ? "nexzy.blue" : "whiteAlpha.300"}
                            _hover={{
                              bg: sel ? "nexzy.blue" : "whiteAlpha.100",
                            }}
                            onClick={() => onToggle(o.slug)}
                          >
                            {o.name}
                          </Button>
                        );
                      })}
                    </HStack>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/**
 * Type-to-search tag picker for the 9k+ tag catalog. Selected tags show as
 * removable chips; typing queries the server (empty query = most-used tags).
 */
function TagPicker({
  selected,
  onChange,
}: {
  selected: { slug: string; name: string }[];
  onChange: (v: { slug: string; name: string }[]) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<
    { slug: string; name: string; gamesCount: number }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const selSlugs = new Set(selected.map((t) => t.slug));
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const h = setTimeout(() => {
      searchTags(q)
        .then((r) => {
          if (!cancelled) setResults(r);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
  }, [q]);
  const add = (t: { slug: string; name: string }) => {
    if (!selSlugs.has(t.slug))
      onChange([...selected, { slug: t.slug, name: t.name }]);
  };
  const remove = (slug: string) =>
    onChange(selected.filter((t) => t.slug !== slug));
  const shown = results.filter((r) => !selSlugs.has(r.slug));
  return (
    <Box>
      <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
        Tags{selected.length ? ` · ${selected.length} selected` : ""}
      </Text>
      <Box
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        borderRadius="md"
        bg="whiteAlpha.50"
        p={2}
      >
        {selected.length > 0 && (
          <Flex gap={2} wrap="wrap" mb={2}>
            {selected.map((t) => (
              <Button
                key={t.slug}
                size="xs"
                bg="nexzy.blue"
                color="white"
                borderRadius="full"
                _hover={{ bg: "nexzy.blue", opacity: 0.85 }}
                onClick={() => remove(t.slug)}
              >
                {t.name} ×
              </Button>
            ))}
          </Flex>
        )}
        <Input
          {...inputProps}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tags…"
        />
        <Box maxH="180px" overflowY="auto" mt={2}>
          {loading ? (
            <Text fontSize="xs" color="whiteAlpha.500">
              Searching…
            </Text>
          ) : shown.length === 0 ? (
            <Text fontSize="xs" color="whiteAlpha.500">
              {q ? "No matching tags." : "Type to search 9,000+ tags."}
            </Text>
          ) : (
            <HStack gap={2} wrap="wrap">
              {shown.map((r) => (
                <Button
                  key={r.slug}
                  size="xs"
                  borderWidth="1px"
                  bg="transparent"
                  color="nexzy.gray.100"
                  borderColor="whiteAlpha.300"
                  _hover={{ bg: "whiteAlpha.100" }}
                  onClick={() => add(r)}
                >
                  {r.name}
                </Button>
              ))}
            </HStack>
          )}
        </Box>
        {!q && (
          <Text fontSize="10px" color="whiteAlpha.500" mt={1}>
            Optional. Showing most-used tags; type to search all.
          </Text>
        )}
      </Box>
    </Box>
  );
}

/**
 * Manual game-creation form for the Missing-Games section — for games not in
 * RAWG (e.g. a Steam-owned title). Mirrors the RAWG import shape: core fields, a
 * cover image + screenshots (uploaded to S3), and taxonomy picked from the DB
 * (genres, platforms-as-consoles, stores, and type-to-search tags). Platforms
 * submit CONSOLE-level slugs so the game maps to the same relations a RAWG
 * import would. When `refId` is set, creating the game closes the row.
 */
function ManualGameForm({
  refId,
  initialName,
  initialCover,
  onCreated,
  onCancel,
}: {
  refId?: string;
  initialName?: string;
  initialCover?: string | null;
  onCreated: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [description, setDescription] = useState("");
  const [released, setReleased] = useState("");
  const [website, setWebsite] = useState("");
  const [isMature, setIsMature] = useState(false);
  const [tagSel, setTagSel] = useState<{ slug: string; name: string }[]>([]);
  // Taxonomy pickers (Phase 2): loaded once from the DB, selected by slug.
  const [tax, setTax] = useState<GameTaxonomy | null>(null);
  const [taxErr, setTaxErr] = useState<string | null>(null);
  const [genreSel, setGenreSel] = useState<Set<string>>(new Set());
  const [consoleSel, setConsoleSel] = useState<Set<string>>(new Set());
  const [storeSel, setStoreSel] = useState<Set<string>>(new Set());
  const [cover, setCover] = useState<string>(initialCover ?? "");
  const [shots, setShots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getGameTaxonomy()
      .then(setTax)
      .catch((e) => setTaxErr((e as Error).message));
  }, []);

  const toggleSel = (
    setter: (fn: (prev: Set<string>) => Set<string>) => void,
    slug: string,
  ) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  async function onCoverPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setCover(await fileToDataUrl(f));
    } catch (err) {
      setMsg((err as Error).message);
    }
  }
  async function onShotsPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    try {
      const urls = await Promise.all(files.map(fileToDataUrl));
      setShots((prev) => [...prev, ...urls]);
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function submit() {
    if (!name.trim()) {
      setMsg("A game name is required");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const payload: ManualGamePayload = {
        refId,
        name: name.trim(),
        description: description.trim() || undefined,
        released: released || undefined,
        website: website.trim() || undefined,
        isMature,
        coverImage: cover || undefined,
        screenshots: shots,
        genreSlugs: [...genreSel],
        platformSlugs: [...consoleSel],
        storeSlugs: [...storeSel],
        tagSlugs: tagSel.map((t) => t.slug),
      };
      const r = await createManualGame(payload);
      if (r.ok) {
        onCreated(name.trim());
      } else {
        setMsg(r.error || "Create failed — check the fields and try again.");
        setBusy(false);
      }
    } catch (err) {
      setMsg((err as Error).message);
      setBusy(false);
    }
  }

  const label = (t: string) => (
    <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
      {t}
    </Text>
  );

  return (
    <VStack align="stretch" gap={3}>
      <Text fontWeight="700" color="nexzy.white" fontSize="sm">
        Add a game manually
      </Text>
      <Text fontSize="xs" color="whiteAlpha.600">
        For games not in RAWG. Name is required; fill the rest as you can. Pick
        genres, consoles and stores from your database so the game maps to the
        same relationships a RAWG import would.
      </Text>

      <Box>
        {label("Name *")}
        <Input
          {...inputProps}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Game name"
        />
      </Box>

      <Box>
        {label("Description")}
        <Textarea
          {...inputProps}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description"
          rows={3}
        />
      </Box>

      <HStack gap={3} align="flex-start">
        <Box flex="1">
          {label("Released")}
          <Input
            {...inputProps}
            type="date"
            value={released}
            onChange={(e) => setReleased(e.target.value)}
          />
          <Text fontSize="10px" color="whiteAlpha.500" mt={1}>
            No date → shows only in What&rsquo;s New &amp; Search, not the main
            feeds.
          </Text>
        </Box>
        <Box flex="1">
          {label("Website")}
          <Input
            {...inputProps}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
          />
        </Box>
      </HStack>

      {taxErr && (
        <Text fontSize="xs" color="orange.300">
          Couldn&rsquo;t load taxonomy: {taxErr}
        </Text>
      )}

      {!tax && !taxErr && (
        <Text fontSize="xs" color="whiteAlpha.500">
          Loading taxonomy…
        </Text>
      )}
      {tax && (
        <>
          <TaxPicker
            label="Genres"
            groups={[{ group: null, options: tax.genres }]}
            selected={genreSel}
            onToggle={(s) => toggleSel(setGenreSel, s)}
          />
          <TaxPicker
            label="Platforms / consoles"
            groups={tax.platforms.map((grp) => ({
              group: grp.parent.name,
              options: grp.consoles,
            }))}
            selected={consoleSel}
            onToggle={(s) => toggleSel(setConsoleSel, s)}
          />
          <Text fontSize="10px" color="whiteAlpha.500" mt={-1}>
            Pick the specific consoles the game runs on — the platform family
            (e.g. PlayStation) is added automatically.
          </Text>
          <TaxPicker
            label="Stores"
            groups={[{ group: null, options: tax.stores }]}
            selected={storeSel}
            onToggle={(s) => toggleSel(setStoreSel, s)}
          />
        </>
      )}

      <TagPicker selected={tagSel} onChange={setTagSel} />

      <Button
        size="xs"
        {...outlineBtn}
        alignSelf="flex-start"
        onClick={() => setIsMature((v) => !v)}
      >
        {isMature ? "☑" : "☐"} Mature (18+)
      </Button>

      <Box>
        {label("Cover image")}
        <HStack gap={3} align="center">
          {cover && (
            <Image
              src={cover}
              alt=""
              boxSize="56px"
              borderRadius="md"
              objectFit="cover"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onCoverPick}
            style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}
          />
          {cover && (
            <Button size="xs" {...outlineBtn} onClick={() => setCover("")}>
              Clear
            </Button>
          )}
        </HStack>
      </Box>

      <Box>
        {label(`Screenshots${shots.length ? ` (${shots.length})` : ""}`)}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onShotsPick}
          style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}
        />
        {shots.length > 0 && (
          <HStack gap={2} mt={2} wrap="wrap">
            {shots.map((s, i) => (
              <Box key={i} position="relative">
                <Image
                  src={s}
                  alt=""
                  boxSize="48px"
                  borderRadius="sm"
                  objectFit="cover"
                />
                <Button
                  size="xs"
                  position="absolute"
                  top="-8px"
                  right="-8px"
                  bg="red.500"
                  color="white"
                  borderRadius="full"
                  minW="20px"
                  h="20px"
                  p={0}
                  onClick={() => setShots((p) => p.filter((_, j) => j !== i))}
                >
                  ×
                </Button>
              </Box>
            ))}
          </HStack>
        )}
      </Box>

      {msg && (
        <Text fontSize="xs" color="orange.300">
          {msg}
        </Text>
      )}

      <HStack gap={2}>
        <Button
          size="sm"
          {...primaryBtn}
          onClick={submit}
          loading={busy}
          loadingText="Creating"
        >
          Create game
        </Button>
        <Button size="sm" {...outlineBtn} onClick={onCancel}>
          Cancel
        </Button>
      </HStack>
    </VStack>
  );
}

function MissingGameCard({
  item,
  isOwner,
  onDone,
}: {
  item: UnresolvedGameRef;
  isOwner: boolean;
  onDone: (id: string) => void;
}) {
  const [q, setQ] = useState(item.rawName);
  const [results, setResults] = useState<GameLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [manual, setManual] = useState(false);

  async function doSearch() {
    setSearching(true);
    setMsg(null);
    try {
      setResults(await searchGamesForLink(q));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }

  async function doMap(gameId: string) {
    setBusy("map");
    try {
      await mapUnresolvedGame(item.id, gameId);
      onDone(item.id);
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(null);
    }
  }

  async function doImport() {
    setBusy("import");
    setMsg(null);
    try {
      const r = await importUnresolvedGame(item.id);
      const res = r?.result;
      if (res?.imported || res?.reason === "already_exists") {
        onDone(item.id);
      } else {
        setMsg(
          res?.reason === "no_rawg_match"
            ? "No RAWG match — try mapping to an existing game."
            : res?.reason === "no_api_key"
              ? "RAWG_API_KEY is not set on the API."
              : "Import failed — try again or map manually.",
        );
        setBusy(null);
      }
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(null);
    }
  }

  async function doSkip() {
    setBusy("skip");
    try {
      await skipUnresolvedGame(item.id);
      onDone(item.id);
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <Box
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={4}
      bg="whiteAlpha.50"
    >
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
        <Box>
          <Heading size="sm" color="nexzy.white">
            {item.rawName}
          </Heading>
          <HStack gap={2} mt={1}>
            <Badge colorPalette="orange" variant="subtle">
              {item.sourceType}
            </Badge>
            <Text fontSize="xs" color="whiteAlpha.600">
              {timeAgo(item.createdAt)}
            </Text>
          </HStack>
        </Box>
        <HStack gap={2}>
          {isOwner && (
            <Button
              size="sm"
              {...primaryBtn}
              onClick={doImport}
              loading={busy === "import"}
              loadingText="Importing"
            >
              <FiDownloadCloud /> Import from RAWG
            </Button>
          )}
          {isOwner && (
            <Button
              size="sm"
              {...outlineBtn}
              onClick={() => setManual((v) => !v)}
            >
              <FiPlus /> Add manually
            </Button>
          )}
          <Button
            size="sm"
            {...outlineBtn}
            onClick={doSkip}
            loading={busy === "skip"}
          >
            <FiX /> Skip
          </Button>
        </HStack>
      </Flex>

      {(item.candidateGameIds?.length ?? 0) > 0 && (
        <VStack align="stretch" mt={3} gap={1}>
          <Text fontSize="xs" color="whiteAlpha.600">
            Suggested matches
          </Text>
          {item.candidateGameIds!.map((c) => (
            <Button
              key={c.gameId}
              size="xs"
              {...outlineBtn}
              justifyContent="flex-start"
              onClick={() => doMap(c.gameId)}
              loading={busy === "map"}
            >
              <FiLink /> {c.name}
            </Button>
          ))}
        </VStack>
      )}

      <Box mt={3}>
        <HStack gap={2}>
          <Input
            {...inputProps}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your games DB…"
            onKeyDown={(e) => {
              if (e.key === "Enter") doSearch();
            }}
          />
          <Button
            size="sm"
            {...primaryBtn}
            onClick={doSearch}
            loading={searching}
          >
            <FiSearch /> Search
          </Button>
        </HStack>
        {results.length > 0 && (
          <VStack align="stretch" mt={2} gap={1}>
            <Text fontSize="xs" color="whiteAlpha.600">
              These are games already in Nexzy. Tap Link to mark this missing
              game as the same game.
            </Text>
            {results.map((g) => (
              <Flex
                key={g.id}
                align="center"
                gap={2}
                p={2}
                borderWidth="1px"
                borderColor="whiteAlpha.200"
                borderRadius="md"
              >
                {g.backgroundImage && (
                  <Image
                    src={g.backgroundImage}
                    alt=""
                    boxSize="32px"
                    borderRadius="sm"
                    objectFit="cover"
                  />
                )}
                <Box flex="1">
                  <Text fontSize="sm" color="nexzy.white">
                    {g.name}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.500">
                    {g.released || "—"}
                  </Text>
                </Box>
                <Button
                  size="xs"
                  bg="green.500"
                  color="white"
                  _hover={{ bg: "green.600" }}
                  onClick={() => doMap(g.id)}
                  loading={busy === "map"}
                >
                  Link
                </Button>
              </Flex>
            ))}
          </VStack>
        )}
        {searched && !searching && results.length === 0 && (
          <Text mt={2} fontSize="xs" color="whiteAlpha.600">
            No matches in your library. Import it from RAWG above, or try a
            different search term.
          </Text>
        )}
      </Box>

      {msg && (
        <Text mt={2} fontSize="xs" color="orange.300">
          {msg}
        </Text>
      )}

      {manual && (
        <Box mt={3} pt={3} borderTopWidth="1px" borderColor="whiteAlpha.200">
          <ManualGameForm
            refId={item.id}
            initialName={item.rawName}
            initialCover={(item.context?.icon as string) ?? ""}
            onCreated={() => onDone(item.id)}
            onCancel={() => setManual(false)}
          />
        </Box>
      )}
    </Box>
  );
}

/** One import-issue card: a failed import, or a game that imported but had
 *  tags/genres/stores skipped because their slug isn't in our taxonomy. */
function DiagnosticCard({
  d,
  onDismiss,
}: {
  d: ImportDiagnostic;
  onDismiss: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const failed = d.outcome === "failed";
  const dismiss = async () => {
    setBusy(true);
    try {
      await dismissImportDiagnostic(d.id);
      onDismiss(d.id);
    } catch {
      setBusy(false);
    }
  };
  const kindColor = (k: string) =>
    k === "tag"
      ? "purple"
      : k === "genre"
        ? "blue"
        : k === "store"
          ? "green"
          : "gray";
  return (
    <Box
      borderWidth="1px"
      borderColor={failed ? "red.400" : "orange.400"}
      borderRadius="lg"
      p={3}
      bg="whiteAlpha.50"
    >
      <Flex justify="space-between" align="flex-start" gap={3} mb={2}>
        <HStack gap={2} wrap="wrap" flex={1} minW={0}>
          <Badge colorPalette={failed ? "red" : "orange"} variant="solid">
            {failed ? "FAILED" : "IMPORTED · GAPS"}
          </Badge>
          <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
            {d.gameName}
          </Text>
          <Text color="whiteAlpha.500" fontSize="xs">
            {timeAgo(d.createdAt)}
          </Text>
        </HStack>
        <Button size="xs" {...outlineBtn} onClick={dismiss} loading={busy}>
          Dismiss
        </Button>
      </Flex>
      {failed ? (
        <Text color="whiteAlpha.700" fontSize="sm">
          Couldn&rsquo;t import &mdash; {d.reason ?? "unknown reason"}.
        </Text>
      ) : (
        <>
          <Text color="whiteAlpha.700" fontSize="sm" mb={2}>
            Imported, but {d.dropped.length} item
            {d.dropped.length === 1 ? "" : "s"} weren&rsquo;t in your taxonomy
            and were skipped:
          </Text>
          <HStack gap={2} wrap="wrap">
            {d.dropped.map((x, i) => (
              <Badge key={i} colorPalette={kindColor(x.kind)} variant="subtle">
                {x.kind}: {x.name} ({x.slug})
              </Badge>
            ))}
          </HStack>
        </>
      )}
    </Box>
  );
}

/** Prev/Next pager for a paginated admin list. Hidden when a single page. */
function Pager({
  page,
  pageSize,
  total,
  loading,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  onPage: (p: number) => void;
}) {
  if (total <= pageSize) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <Flex justify="space-between" align="center" mt={4} gap={3} wrap="wrap">
      <Text fontSize="xs" color="whiteAlpha.600">
        {from}–{to} of {total}
      </Text>
      <HStack gap={2}>
        <Button
          size="xs"
          {...outlineBtn}
          disabled={page <= 0 || loading}
          onClick={() => onPage(page - 1)}
        >
          Prev
        </Button>
        <Text fontSize="xs" color="whiteAlpha.600">
          {page + 1} / {pages}
        </Text>
        <Button
          size="xs"
          {...outlineBtn}
          disabled={page + 1 >= pages || loading}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </HStack>
    </Flex>
  );
}

/**
 * "Missing games" queue — games referenced by content (guides/articles/picks)
 * the resolver couldn't match to a DB game. Map to an existing game (learns an
 * alias) or import it from RAWG (owner only).
 */
export default function MissingGamesPanel({ isOwner }: { isOwner: boolean }) {
  const [rows, setRows] = useState<UnresolvedGameRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [result, setResult] = useState<OpResult | null>(null);
  const [view, setView] = useState<"queue" | "issues">("queue");
  const [diags, setDiags] = useState<ImportDiagnostic[]>([]);
  const [diagsLoading, setDiagsLoading] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const PAGE_SIZE = 25;
  const [queuePage, setQueuePage] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);
  const [diagsPage, setDiagsPage] = useState(0);
  const [diagsTotal, setDiagsTotal] = useState(0);

  async function doImportAll() {
    setWorking("import");
    setNotice(null);
    setResult(null);
    try {
      const r = await importAllUnresolved(25);
      setResult({
        title: `Imported ${r.imported} of ${r.attempted} (failed ${r.failed})`,
        rows: (r.details ?? []).map((d) => ({
          label: d.rawName,
          sub: d.gameName ? `${d.result} → ${d.gameName}` : d.result,
          tone:
            d.result === "imported"
              ? "green"
              : d.result === "already in DB"
                ? "gray"
                : "red",
        })),
      });
      await load();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setWorking(null);
    }
  }

  async function doBackfill() {
    setWorking("backfill");
    setNotice(null);
    setResult(null);
    try {
      const mapRow = (d: BackfillDetail): OpRow => ({
        label: d.title,
        sub:
          d.result === "error"
            ? `error — ${d.reason ?? "failed"}`
            : d.result === "no-match"
              ? "no DB match — leave it, or link by hand"
              : d.gameName
                ? `${d.result.replace("linked-", "")} → ${d.gameName}${d.matchedOn ? ` (matched "${d.matchedOn}")` : ""}`
                : d.result,
        tone:
          d.result === "error"
            ? "red"
            : d.result === "linked-confirmed"
              ? "green"
              : d.result === "linked-suggested"
                ? "blue"
                : "orange",
      });
      // Small server batches (each returns fast); loop client-side until the
      // queue is empty so a large backfill never trips a request timeout.
      let linked = 0;
      let scanned = 0;
      let errCount = 0;
      let remaining = 0;
      const rows: OpRow[] = [];
      for (let i = 0; i < 100; i++) {
        const r = await backfillGameLinks();
        linked += r.linked;
        scanned += r.scanned;
        errCount += r.errors;
        remaining = r.remaining;
        rows.push(...(r.details ?? []).map(mapRow));
        setResult({
          title: `Backfill: linked ${linked} of ${scanned} scanned${remaining ? ` · ${remaining} to go…` : ""}${errCount ? ` · ${errCount} error${errCount === 1 ? "" : "s"}` : ""}`,
          rows,
        });
        if (r.scanned === 0 || remaining === 0) break;
      }
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setWorking(null);
    }
  }

  async function load(page = queuePage) {
    setLoading(true);
    setError(null);
    try {
      const { items, total } = await getUnresolvedGames(
        PAGE_SIZE,
        page * PAGE_SIZE,
      );
      setRows(items);
      setQueueTotal(total);
      setQueuePage(page);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDiags(page = diagsPage) {
    setDiagsLoading(true);
    try {
      const { items, total } = await getImportDiagnostics(
        PAGE_SIZE,
        page * PAGE_SIZE,
      );
      setDiags(items);
      setDiagsTotal(total);
      setDiagsPage(page);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setDiagsLoading(false);
    }
  }

  async function doDismissAllDiags() {
    setWorking("dismiss");
    try {
      await dismissAllImportDiagnostics();
      setDiags([]);
      setDiagsTotal(0);
      setDiagsPage(0);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setWorking(null);
    }
  }

  useEffect(() => {
    load();
    loadDiags();
  }, []);

  const remove = (id: string) => {
    setRows((r) => r.filter((x) => x.id !== id));
    setQueueTotal((t) => Math.max(0, t - 1));
  };
  const removeDiag = (id: string) => {
    setDiags((d) => d.filter((x) => x.id !== id));
    setDiagsTotal((t) => Math.max(0, t - 1));
  };

  // Aggregate the most-dropped slugs across the diagnostics on THIS page — the
  // candidates worth seeding (informs the later create-or-link decision).
  const dropCounts = new Map<string, number>();
  for (const d of diags)
    for (const x of d.dropped ?? [])
      dropCounts.set(x.slug, (dropCounts.get(x.slug) ?? 0) + 1);
  const topDropped = [...dropCounts.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <Box>
          <Heading size="md" color="nexzy.white">
            Missing games
          </Heading>
          <Text fontSize="sm" color="whiteAlpha.600">
            Games referenced by content but not in the DB, plus a log of import
            gaps and failures.
          </Text>
        </Box>
        <HStack gap={2}>
          {view === "queue" && isOwner && (
            <Button
              size="sm"
              {...primaryBtn}
              onClick={() => setAddingManual((v) => !v)}
            >
              <FiPlus /> Add game manually
            </Button>
          )}
          {view === "queue" && isOwner && (
            <Button
              size="sm"
              {...outlineBtn}
              onClick={doImportAll}
              loading={working === "import"}
              loadingText="Importing"
            >
              Import all
            </Button>
          )}
          {view === "queue" && isOwner && (
            <Button
              size="sm"
              {...outlineBtn}
              onClick={doBackfill}
              loading={working === "backfill"}
              loadingText="Backfilling"
            >
              Backfill links
            </Button>
          )}
          {view === "issues" && diags.length > 0 && (
            <Button
              size="sm"
              {...outlineBtn}
              onClick={doDismissAllDiags}
              loading={working === "dismiss"}
              loadingText="Clearing"
            >
              Dismiss all
            </Button>
          )}
          <Button
            size="sm"
            {...outlineBtn}
            onClick={() => (view === "queue" ? load() : loadDiags())}
            loading={view === "queue" ? loading : diagsLoading}
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {/* Sub-nav: the unresolved queue vs. the import-issues log */}
      <HStack gap={2} mb={4}>
        {(
          [
            ["queue", `Queue${rows.length ? ` (${rows.length})` : ""}`],
            [
              "issues",
              `Import issues${diags.length ? ` (${diags.length})` : ""}`,
            ],
          ] as const
        ).map(([key, label]) => {
          const active = view === key;
          return (
            <Button
              key={key}
              size="sm"
              onClick={() => setView(key)}
              bg={active ? "nexzy.blue" : "transparent"}
              color={active ? "white" : "nexzy.gray.100"}
              borderWidth="1px"
              borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
              _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
            >
              {label}
            </Button>
          );
        })}
      </HStack>

      {error && (
        <Text color="red.300" mb={3}>
          {error}
        </Text>
      )}
      {notice && (
        <Text color="nexzy.lightBlue" mb={3} fontSize="sm">
          {notice}
        </Text>
      )}

      {view === "queue" ? (
        <>
          {addingManual && isOwner && (
            <Box
              mb={4}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              p={4}
              bg="whiteAlpha.50"
            >
              <ManualGameForm
                onCreated={() => {
                  setAddingManual(false);
                  load();
                }}
                onCancel={() => setAddingManual(false)}
              />
            </Box>
          )}
          {result && (
            <Box
              mb={4}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              p={3}
              bg="whiteAlpha.50"
            >
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontWeight="600" color="nexzy.white" fontSize="sm">
                  {result.title}
                </Text>
                <Button
                  size="xs"
                  {...outlineBtn}
                  onClick={() => setResult(null)}
                >
                  Dismiss
                </Button>
              </Flex>
              {result.rows.length === 0 ? (
                <Text fontSize="sm" color="whiteAlpha.600">
                  No posts scanned.
                </Text>
              ) : (
                <VStack align="stretch" gap={1} maxH="320px" overflowY="auto">
                  {result.rows.map((row, i) => (
                    <Flex key={i} align="center" gap={2}>
                      <Box
                        boxSize="8px"
                        borderRadius="full"
                        bg={toneColor(row.tone)}
                        flexShrink={0}
                      />
                      <Box minW="0">
                        <Text fontSize="sm" color="nexzy.white" lineClamp={1}>
                          {row.label}
                        </Text>
                        {row.sub && (
                          <Text
                            fontSize="xs"
                            color="whiteAlpha.600"
                            lineClamp={1}
                          >
                            {row.sub}
                          </Text>
                        )}
                      </Box>
                    </Flex>
                  ))}
                </VStack>
              )}
            </Box>
          )}
          {loading ? (
            <Flex justify="center" py={10}>
              <Spinner />
            </Flex>
          ) : rows.length === 0 ? (
            <Text color="whiteAlpha.600" py={6}>
              Nothing unresolved — every referenced game is linked. 🎮
            </Text>
          ) : (
            <VStack align="stretch" gap={3}>
              {rows.map((r) => (
                <MissingGameCard
                  key={r.id}
                  item={r}
                  isOwner={isOwner}
                  onDone={remove}
                />
              ))}
            </VStack>
          )}
          <Pager
            page={queuePage}
            pageSize={PAGE_SIZE}
            total={queueTotal}
            loading={loading}
            onPage={(p) => load(p)}
          />
        </>
      ) : (
        <>
          {topDropped.length > 0 && (
            <Box
              mb={4}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              p={3}
              bg="whiteAlpha.50"
            >
              <Text fontWeight="600" color="nexzy.white" fontSize="sm" mb={2}>
                Most-dropped slugs (candidates to seed)
              </Text>
              <HStack gap={2} wrap="wrap">
                {topDropped.map((t) => (
                  <Badge key={t.slug} colorPalette="orange" variant="subtle">
                    {t.slug} ×{t.count}
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}
          {diagsLoading ? (
            <Flex justify="center" py={10}>
              <Spinner />
            </Flex>
          ) : diags.length === 0 ? (
            <Text color="whiteAlpha.600" py={6}>
              No import issues logged — every import came in clean. ✅
            </Text>
          ) : (
            <VStack align="stretch" gap={3}>
              {diags.map((d) => (
                <DiagnosticCard key={d.id} d={d} onDismiss={removeDiag} />
              ))}
            </VStack>
          )}
          <Pager
            page={diagsPage}
            pageSize={PAGE_SIZE}
            total={diagsTotal}
            loading={diagsLoading}
            onPage={(p) => loadDiags(p)}
          />
        </>
      )}
    </Box>
  );
}
