"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  SimpleGrid,
  Heading,
  Text,
  Button,
  Input,
  Image,
  Badge,
  Spinner,
  Textarea,
} from "@chakra-ui/react";
import {
  FiTrash2,
  FiPlus,
  FiExternalLink,
  FiEdit2,
  FiArrowLeft,
  FiRefreshCw,
  FiUpload,
  FiYoutube,
} from "react-icons/fi";
import {
  getGameVideos,
  createVideo,
  updateVideo,
  detachVideoGame,
  listHubGames,
  getHubGame,
  updateHubGame,
  uploadHubGameCover,
  refreshHubGameIgdb,
  getPlatformFamilies,
  type GameVideoItem,
  type HubGameRow,
  type HubGameDetail,
} from "@/lib/admin/client";

const PAGE_SIZE = 30;

const primaryBtn = {
  bg: "nexzy.blue",
  color: "white",
  _hover: { bg: "nexzy.blue", opacity: 0.9 },
};
const outlineBtn = {
  variant: "outline" as const,
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _hover: { bg: "whiteAlpha.100" },
};
const inputStyle = {
  size: "sm" as const,
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
};

function chipProps(active: boolean) {
  return active ? primaryBtn : outlineBtn;
}

function thumbFor(v: GameVideoItem): string | null {
  if (v.thumbnailUrl) return v.thumbnailUrl;
  if (v.youtubeId) return `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`;
  return null;
}

const NEEDS_FILTERS: { key: string; label: string }[] = [
  { key: "any", label: "Needs anything" },
  { key: "description", label: "No description" },
  { key: "cover", label: "No cover" },
  { key: "screenshots", label: "No screenshots" },
  { key: "videos", label: "No videos" },
  { key: "content", label: "No content" },
];

/**
 * Game hub — the game workbench. Browse the catalog (latest / upcoming /
 * recently imported, platform + health filters), then open a game to fix its
 * description, cover, trailer, and manage its videos. Talks to
 * /newsroom/admin/games/hub + /newsroom/admin/videos.
 */
export default function GameHubPanel() {
  // ── Browse state ──
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [win, setWin] = useState<"released" | "upcoming">("released");
  const [sort, setSort] = useState<"released" | "imported">("released");
  const [family, setFamily] = useState<string | null>(null);
  const [needs, setNeeds] = useState<string | null>(null);
  const [families, setFamilies] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<HubGameRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);
  const requestSeq = useRef(0);

  // Row quick actions (browse list)
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [trailerFor, setTrailerFor] = useState<string | null>(null);
  const [trailerUrl, setTrailerUrl] = useState("");
  const [trailerSaving, setTrailerSaving] = useState(false);

  // ── Selected game (workbench) ──
  const [game, setGame] = useState<HubGameDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Overview edit fields
  const [desc, setDesc] = useState("");
  const [website, setWebsite] = useState("");
  const [releasedInput, setReleasedInput] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaMsg, setMetaMsg] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Videos (unchanged behavior)
  const [videos, setVideos] = useState<GameVideoItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // video add / edit form (editingId null = adding)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [reels, setReels] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [source, setSource] = useState<"nexzy" | "external">("nexzy");
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Browse wiring ──
  useEffect(() => {
    getPlatformFamilies()
      .then(setFamilies)
      .catch(() => setFamilies([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    setListLoading(true);
    listHubGames({
      q: debouncedQ || undefined,
      sort,
      window: win,
      family: family || undefined,
      needs: (needs as never) || undefined,
      offset: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (seq !== requestSeq.current) return;
        setRows(res.items);
        setTotal(res.total);
      })
      .catch((e) => {
        if (seq !== requestSeq.current) return;
        setMsg((e as Error).message);
      })
      .finally(() => {
        if (seq === requestSeq.current) setListLoading(false);
      });
  }, [debouncedQ, sort, win, family, needs, page, reloadTick]);

  // ── Row quick actions ──
  async function repullRow(g: HubGameRow) {
    if (rowBusy) return;
    setRowBusy(g.id);
    setMsg(null);
    try {
      const res = await refreshHubGameIgdb(g.id);
      if (res.ok) {
        const parts = [
          `cover ${res.coverUpdated ? "updated" : "unchanged"}`,
          res.screenshotsAdded ? `+${res.screenshotsAdded} screenshots` : null,
          res.descriptionRefreshed ? "description refreshed" : null,
          res.trailerFilled ? "trailer filled" : null,
        ].filter(Boolean);
        setMsg(`Re-pulled “${g.name}” — ${parts.join(", ")}.`);
        setReloadTick((t) => t + 1); // refresh the page so the new cover shows
      } else if (res.reason === "already_running") {
        setMsg(`A re-pull is already running for “${g.name}”.`);
      } else {
        setMsg(res.message || `Re-pull failed: ${res.reason}`);
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setRowBusy(null);
    }
  }

  async function saveRowTrailer(g: HubGameRow) {
    if (!trailerUrl.trim()) return;
    setTrailerSaving(true);
    setMsg(null);
    try {
      await updateHubGame(g.id, { youtube: trailerUrl.trim() });
      setRows(
        (prev) =>
          prev?.map((r) => (r.id === g.id ? { ...r, hasTrailer: true } : r)) ??
          prev,
      );
      setMsg(`Trailer added to “${g.name}”.`);
      setTrailerFor(null);
      setTrailerUrl("");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setTrailerSaving(false);
    }
  }

  // ── Workbench wiring ──
  function seedEditFields(d: HubGameDetail) {
    setDesc(d.description ?? "");
    setWebsite(d.website ?? "");
    setReleasedInput(d.released ?? "");
    setYoutubeInput(d.clipUrl ?? "");
  }

  async function pick(row: HubGameRow) {
    setDetailLoading(true);
    setMsg(null);
    setMetaMsg(null);
    cancelEdit();
    try {
      const d = await getHubGame(row.id);
      if (!d) throw new Error("Game not found");
      setGame(d);
      seedEditFields(d);
      await loadVideos(d.id);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }

  function backToList() {
    setGame(null);
    setVideos([]);
    setMetaMsg(null);
    cancelEdit();
  }

  async function reloadDetail(id: string) {
    const d = await getHubGame(id);
    if (d) {
      setGame(d);
      seedEditFields(d);
    }
  }

  async function saveMeta() {
    if (!game) return;
    setSavingMeta(true);
    setMetaMsg(null);
    try {
      const d = await updateHubGame(game.id, {
        description: desc,
        website,
        released: releasedInput,
        youtube: youtubeInput,
      });
      setGame(d);
      seedEditFields(d);
      setMetaMsg("Saved.");
    } catch (e) {
      setMetaMsg((e as Error).message);
    } finally {
      setSavingMeta(false);
    }
  }

  function onPickCover(file: File | null) {
    if (!file || !game) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setCoverBusy(true);
      setMetaMsg(null);
      try {
        await uploadHubGameCover(game.id, String(reader.result));
        await reloadDetail(game.id);
        setMetaMsg("Cover replaced.");
      } catch (e) {
        setMetaMsg((e as Error).message);
      } finally {
        setCoverBusy(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function repullIgdb() {
    if (!game) return;
    setRefreshing(true);
    setMetaMsg(null);
    try {
      const res = await refreshHubGameIgdb(game.id);
      if (res.ok) {
        await reloadDetail(game.id);
        const parts = [
          `cover ${res.coverUpdated ? "updated" : "unchanged"}`,
          res.screenshotsAdded ? `+${res.screenshotsAdded} screenshots` : null,
          res.descriptionRefreshed ? "description refreshed" : null,
          res.websiteFilled ? "website filled" : null,
          res.trailerFilled ? "trailer filled" : null,
        ].filter(Boolean);
        setMetaMsg(`Re-pulled from IGDB — ${parts.join(", ")}.`);
      } else if (res.reason === "already_running") {
        setMetaMsg("A re-pull is already running for this game — hang on.");
      } else {
        setMetaMsg(res.message || `Re-pull failed: ${res.reason}`);
      }
    } catch (e) {
      setMetaMsg((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  // ── Videos (existing behavior, unchanged endpoints) ──
  async function loadVideos(gameId: string) {
    setVideosLoading(true);
    try {
      setVideos(await getGameVideos(gameId));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setVideosLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setYoutubeUrl("");
    setTiktok("");
    setReels("");
    setThumbnailUrl("");
    setSource("nexzy");
    setFeatured(false);
  }
  function cancelEdit() {
    setEditingId(null);
    resetForm();
  }
  function startEdit(v: GameVideoItem) {
    if (!v.id) return;
    setEditingId(v.id);
    setTitle(v.title ?? "");
    setYoutubeUrl(v.youtubeUrl ?? "");
    setTiktok(v.platformLinks?.tiktok ?? "");
    setReels(v.platformLinks?.reels ?? "");
    setThumbnailUrl(v.thumbnailUrl ?? "");
    setSource(v.source === "external" ? "external" : "nexzy");
    setFeatured(!!v.featured);
    setMsg(null);
  }

  async function saveVideo() {
    if (!game || title.trim().length < 1) return;
    setSaving(true);
    setMsg(null);
    try {
      const platformLinks: Record<string, string> = {};
      if (tiktok.trim()) platformLinks.tiktok = tiktok.trim();
      if (reels.trim()) platformLinks.reels = reels.trim();
      const payload = {
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        platformLinks,
        thumbnailUrl: thumbnailUrl.trim(),
        source,
        featured,
      };
      if (editingId) {
        await updateVideo(editingId, payload);
      } else {
        await createVideo({
          ...payload,
          gameIds: [game.id],
          primaryGameId: game.id,
        });
      }
      cancelEdit();
      await loadVideos(game.id);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeVideo(v: GameVideoItem) {
    if (!game || !v.id) return;
    setBusy(v.id);
    setMsg(null);
    try {
      await detachVideoGame(v.id, game.id);
      if (editingId === v.id) cancelEdit();
      await loadVideos(game.id);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ─────────────────────────── render ───────────────────────────
  return (
    <Box>
      <Heading size="md" color="nexzy.white" mb={1}>
        Game hub
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        The game workbench — browse the latest catalog, spot games that need
        attention, and fix their description, cover, trailer, and videos.
      </Text>

      {msg && (
        <Text
          fontSize="sm"
          color={
            /^(Re-pulled|Trailer added|A re-pull)/.test(msg)
              ? "green.300"
              : "red.400"
          }
          mb={3}
        >
          {msg}
        </Text>
      )}

      {!game ? (
        <>
          {/* ── Browse controls ── */}
          <Input
            {...inputStyle}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name…"
            maxW={{ md: "360px" }}
            mb={3}
          />

          <HStack gap={1.5} wrap="wrap" mb={2}>
            <Text color="nexzy.gray.100" fontSize="xs" minW="44px">
              Show
            </Text>
            <Button
              size="2xs"
              onClick={() => {
                setWin("released");
                setSort("released");
                setPage(0);
              }}
              {...chipProps(win === "released" && sort === "released")}
            >
              Latest releases
            </Button>
            <Button
              size="2xs"
              onClick={() => {
                setWin("upcoming");
                setSort("released");
                setPage(0);
              }}
              {...chipProps(win === "upcoming" && sort === "released")}
            >
              Upcoming
            </Button>
            <Button
              size="2xs"
              onClick={() => {
                setSort("imported");
                setWin("released");
                setPage(0);
              }}
              {...chipProps(sort === "imported")}
              title="What the nightly IGDB sync brought in, newest first"
            >
              Recently imported
            </Button>
          </HStack>

          {families.length > 0 && (
            <HStack gap={1.5} wrap="wrap" mb={2}>
              <Text color="nexzy.gray.100" fontSize="xs" minW="44px">
                Platform
              </Text>
              <Button
                size="2xs"
                onClick={() => {
                  setFamily(null);
                  setPage(0);
                }}
                {...chipProps(family === null)}
              >
                All
              </Button>
              {families.map((f) => (
                <Button
                  key={f.slug}
                  size="2xs"
                  onClick={() => {
                    setFamily(family === f.slug ? null : f.slug);
                    setPage(0);
                  }}
                  {...chipProps(family === f.slug)}
                >
                  {f.name}
                </Button>
              ))}
            </HStack>
          )}

          <HStack gap={1.5} wrap="wrap" mb={3}>
            <Text color="nexzy.gray.100" fontSize="xs" minW="44px">
              Health
            </Text>
            <Button
              size="2xs"
              onClick={() => {
                setNeeds(null);
                setPage(0);
              }}
              {...chipProps(needs === null)}
            >
              All games
            </Button>
            {NEEDS_FILTERS.map((n) => (
              <Button
                key={n.key}
                size="2xs"
                onClick={() => {
                  setNeeds(needs === n.key ? null : n.key);
                  setPage(0);
                }}
                {...(needs === n.key
                  ? {
                      bg: "orange.500",
                      color: "white",
                      _hover: { opacity: 0.9 },
                    }
                  : {
                      ...outlineBtn,
                      color: "orange.300",
                      borderColor: "orange.700",
                    })}
              >
                {n.label}
              </Button>
            ))}
          </HStack>

          {/* ── Browse list ── */}
          {rows === null ? (
            <Flex justify="center" py={8}>
              <Spinner color="nexzy.blue" />
            </Flex>
          ) : rows.length === 0 ? (
            <Text fontSize="sm" color="whiteAlpha.500">
              No games match these filters.
            </Text>
          ) : (
            <>
              <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
                Showing {page * PAGE_SIZE + 1}–
                {Math.min(total, page * PAGE_SIZE + rows.length)} of {total}
              </Text>
              <VStack
                align="stretch"
                gap={2}
                opacity={listLoading ? 0.6 : 1}
                mb={4}
              >
                {rows.map((g) => (
                  <Box
                    key={g.id}
                    borderWidth="1px"
                    borderColor="whiteAlpha.200"
                    borderRadius="md"
                  >
                    <Flex
                      align="center"
                      gap={3}
                      p={2}
                      cursor="pointer"
                      _hover={{ bg: "whiteAlpha.100" }}
                      onClick={() => pick(g)}
                    >
                      {g.backgroundImage ? (
                        <Image
                          src={g.backgroundImage}
                          alt=""
                          w="42px"
                          h="56px"
                          borderRadius="sm"
                          objectFit="cover"
                          flexShrink={0}
                          loading="lazy"
                        />
                      ) : (
                        <Flex
                          w="42px"
                          h="56px"
                          borderRadius="sm"
                          bg="whiteAlpha.100"
                          align="center"
                          justify="center"
                          flexShrink={0}
                        >
                          <Text fontSize="10px" color="whiteAlpha.500">
                            n/a
                          </Text>
                        </Flex>
                      )}
                      <Box flex="1" minW="0">
                        <HStack gap={2}>
                          <Text
                            fontSize="sm"
                            fontWeight="600"
                            color="nexzy.white"
                            lineClamp={1}
                          >
                            {g.name}
                          </Text>
                        </HStack>
                        <HStack gap={2} mt={0.5} wrap="wrap">
                          <Text fontSize="xs" color="whiteAlpha.600">
                            {g.released ?? "TBD"}
                          </Text>
                          {g.families.map((f) => (
                            <Badge
                              key={f}
                              colorPalette="blue"
                              variant="subtle"
                              fontSize="10px"
                            >
                              {f}
                            </Badge>
                          ))}
                          <Text fontSize="11px" color="whiteAlpha.500">
                            {g.screenshotCount} shots · {g.videoCount} vids ·{" "}
                            {g.contentCount} content
                          </Text>
                        </HStack>
                        {/* Health: only what's MISSING screams */}
                        <HStack gap={1} mt={1} wrap="wrap">
                          {!g.hasDescription && (
                            <Badge colorPalette="orange" variant="subtle">
                              no description
                            </Badge>
                          )}
                          {!g.hasCover && (
                            <Badge colorPalette="red" variant="subtle">
                              no cover
                            </Badge>
                          )}
                          {g.screenshotCount === 0 && (
                            <Badge colorPalette="orange" variant="subtle">
                              no screenshots
                            </Badge>
                          )}
                          {g.videoCount === 0 && (
                            <Badge colorPalette="yellow" variant="subtle">
                              no videos
                            </Badge>
                          )}
                          {g.contentCount === 0 && (
                            <Badge colorPalette="purple" variant="subtle">
                              no content
                            </Badge>
                          )}
                          {!g.hasTrailer && (
                            <Badge colorPalette="cyan" variant="subtle">
                              no trailer
                            </Badge>
                          )}
                        </HStack>
                      </Box>
                      <HStack gap={1} flexShrink={0}>
                        <Button
                          size="xs"
                          {...outlineBtn}
                          loading={rowBusy === g.id}
                          disabled={g.igdbId == null || !!rowBusy}
                          title={
                            g.igdbId == null
                              ? "No IGDB id on this game"
                              : "Re-pull cover + metadata from IGDB"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            repullRow(g);
                          }}
                        >
                          <FiRefreshCw />
                        </Button>
                        <Button
                          size="xs"
                          {...(trailerFor === g.id ? primaryBtn : outlineBtn)}
                          title={
                            g.hasTrailer
                              ? "Replace the trailer (YouTube URL)"
                              : "Add a trailer (YouTube URL)"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            setTrailerFor(trailerFor === g.id ? null : g.id);
                            setTrailerUrl("");
                          }}
                        >
                          <FiYoutube />
                        </Button>
                        <Button size="xs" {...outlineBtn}>
                          Open
                        </Button>
                      </HStack>
                    </Flex>
                    {/* Inline trailer quick-add */}
                    {trailerFor === g.id && (
                      <Flex
                        gap={2}
                        p={2}
                        pt={0}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          {...inputStyle}
                          autoFocus
                          value={trailerUrl}
                          onChange={(e) => setTrailerUrl(e.target.value)}
                          placeholder="YouTube trailer URL or 11-char video id"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRowTrailer(g);
                            if (e.key === "Escape") setTrailerFor(null);
                          }}
                        />
                        <Button
                          size="sm"
                          {...primaryBtn}
                          onClick={() => saveRowTrailer(g)}
                          loading={trailerSaving}
                          disabled={!trailerUrl.trim()}
                        >
                          Save
                        </Button>
                      </Flex>
                    )}
                  </Box>
                ))}
              </VStack>
              {pageCount > 1 && (
                <Flex justify="center" align="center" gap={3} mb={4}>
                  <Button
                    size="sm"
                    {...outlineBtn}
                    disabled={page === 0 || listLoading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    ← Prev
                  </Button>
                  <Text color="nexzy.gray.100" fontSize="sm">
                    Page {page + 1} of {pageCount}
                  </Text>
                  <Button
                    size="sm"
                    {...outlineBtn}
                    disabled={page + 1 >= pageCount || listLoading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </Flex>
              )}
            </>
          )}
          {detailLoading && <Spinner size="sm" color="nexzy.blue" />}
        </>
      ) : (
        <>
          {/* ── Workbench header ── */}
          <Button size="xs" {...outlineBtn} mb={3} onClick={backToList}>
            <FiArrowLeft /> Back to list
          </Button>

          <Flex
            gap={4}
            mb={4}
            p={3}
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="md"
            align="flex-start"
            wrap={{ base: "wrap", md: "nowrap" }}
          >
            <Box flexShrink={0}>
              {game.backgroundImage ? (
                <Image
                  src={game.backgroundImage}
                  alt=""
                  w="120px"
                  h="160px"
                  borderRadius="md"
                  objectFit="cover"
                />
              ) : (
                <Flex
                  w="120px"
                  h="160px"
                  borderRadius="md"
                  bg="whiteAlpha.100"
                  align="center"
                  justify="center"
                >
                  <Text fontSize="xs" color="whiteAlpha.500">
                    no cover
                  </Text>
                </Flex>
              )}
              <VStack gap={1} mt={2} align="stretch">
                <Button
                  size="xs"
                  {...outlineBtn}
                  onClick={() => coverInputRef.current?.click()}
                  loading={coverBusy}
                >
                  <FiUpload /> Replace cover
                </Button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    onPickCover(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <Button
                  size="xs"
                  {...outlineBtn}
                  onClick={repullIgdb}
                  loading={refreshing}
                  disabled={game.igdbId == null}
                  title={
                    game.igdbId == null
                      ? "No IGDB id on this game"
                      : "Re-download cover (box art) + metadata from IGDB"
                  }
                >
                  <FiRefreshCw /> Re-pull from IGDB
                </Button>
              </VStack>
            </Box>

            <Box flex="1" minW="240px">
              <Text fontSize="lg" fontWeight="700" color="nexzy.white">
                {game.name}
              </Text>
              <HStack gap={2} mt={1} wrap="wrap">
                <Text fontSize="xs" color="whiteAlpha.600">
                  {game.released ?? "TBD"}
                </Text>
                {game.platforms.map((p) => (
                  <Badge
                    key={p}
                    colorPalette="blue"
                    variant="subtle"
                    fontSize="10px"
                  >
                    {p}
                  </Badge>
                ))}
                {game.igdbId != null && (
                  <Badge
                    bg="whiteAlpha.200"
                    color="whiteAlpha.900"
                    fontSize="10px"
                  >
                    IGDB #{game.igdbId}
                  </Badge>
                )}
                {game.isMature && (
                  <Badge colorPalette="red" variant="subtle" fontSize="10px">
                    Mature
                  </Badge>
                )}
              </HStack>
              {game.genres.length > 0 && (
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  {game.genres.join(" · ")}
                  {game.stores.length > 0 && `  —  ${game.stores.join(" · ")}`}
                </Text>
              )}

              {/* Screenshots strip (read-only in Phase 1) */}
              {game.screenshots.length > 0 && (
                <HStack gap={1.5} mt={3} overflowX="auto">
                  {game.screenshots.map((s) => (
                    <Image
                      key={s.id}
                      src={s.url}
                      alt=""
                      h="52px"
                      w="92px"
                      borderRadius="sm"
                      objectFit="cover"
                      flexShrink={0}
                      loading="lazy"
                    />
                  ))}
                </HStack>
              )}
            </Box>
          </Flex>

          {/* ── Overview editor ── */}
          <Box
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="md"
            p={4}
            mb={5}
          >
            <Text fontSize="sm" fontWeight="700" color="nexzy.white" mb={1}>
              Game details
            </Text>
            <Text fontSize="xs" color="whiteAlpha.500" mb={3}>
              {game.descriptionSource === "nexzy"
                ? "Description is Nexzy-authored (your words win everywhere)."
                : game.description
                  ? "Description is imported — editing it saves your version, which wins everywhere. Clearing your version falls back to the imported one."
                  : "No description yet — write one and it shows in the app."}
            </Text>
            {metaMsg && (
              <Text
                fontSize="sm"
                color={
                  /Saved|replaced|Re-pulled/i.test(metaMsg)
                    ? "green.300"
                    : "red.400"
                }
                mb={2}
              >
                {metaMsg}
              </Text>
            )}
            <VStack align="stretch" gap={2}>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Description shown in the app…"
                rows={5}
                bg="whiteAlpha.50"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                _placeholder={{ color: "whiteAlpha.500" }}
                fontSize="sm"
              />
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={2}>
                <Input
                  {...inputStyle}
                  value={releasedInput}
                  onChange={(e) => setReleasedInput(e.target.value)}
                  placeholder="Release date (YYYY-MM-DD, empty = TBD)"
                />
                <Input
                  {...inputStyle}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="Official website (optional)"
                />
                <Input
                  {...inputStyle}
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  placeholder="Trailer — YouTube URL or video id"
                />
              </SimpleGrid>
              <HStack>
                <Button
                  size="sm"
                  {...primaryBtn}
                  onClick={saveMeta}
                  loading={savingMeta}
                >
                  Save details
                </Button>
              </HStack>
            </VStack>
          </Box>

          {/* ── Videos (same behavior as before) ── */}
          <Text fontSize="sm" fontWeight="700" color="nexzy.white" mb={2}>
            Videos ({videos.length})
          </Text>
          {videosLoading ? (
            <Spinner size="sm" color="nexzy.blue" />
          ) : videos.length === 0 ? (
            <Text fontSize="sm" color="whiteAlpha.500" mb={4}>
              No videos on this game yet.
            </Text>
          ) : (
            <VStack align="stretch" gap={2} mb={6}>
              {videos.map((v) => {
                const thumb = thumbFor(v);
                const isEditing = editingId === v.id;
                return (
                  <Flex
                    key={v.id ?? v.youtubeId ?? v.youtubeUrl ?? ""}
                    align="center"
                    gap={3}
                    p={2}
                    borderWidth="1px"
                    borderColor={isEditing ? "nexzy.blue" : "whiteAlpha.200"}
                    borderRadius="md"
                  >
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt=""
                        w="64px"
                        h="36px"
                        borderRadius="sm"
                        objectFit="cover"
                      />
                    ) : (
                      <Box
                        w="64px"
                        h="36px"
                        borderRadius="sm"
                        bg="whiteAlpha.100"
                      />
                    )}
                    <Box flex="1" minW="0">
                      <Text fontSize="sm" color="nexzy.white" lineClamp={1}>
                        {v.title ?? "(untitled)"}
                      </Text>
                      <HStack gap={1} mt={1}>
                        <Badge
                          colorPalette={v.source === "nexzy" ? "blue" : "gray"}
                          variant="subtle"
                        >
                          {v.source}
                        </Badge>
                        {v.featured && (
                          <Badge colorPalette="yellow" variant="solid">
                            ★ Featured
                          </Badge>
                        )}
                        {v.isShort && (
                          <Badge colorPalette="pink" variant="subtle">
                            Short
                          </Badge>
                        )}
                        {v.platformLinks?.tiktok && (
                          <Badge colorPalette="pink" variant="subtle">
                            TikTok
                          </Badge>
                        )}
                        {v.platformLinks?.reels && (
                          <Badge colorPalette="purple" variant="subtle">
                            Reels
                          </Badge>
                        )}
                      </HStack>
                    </Box>
                    <Button
                      size="xs"
                      {...outlineBtn}
                      onClick={() => startEdit(v)}
                      title="Edit"
                    >
                      <FiEdit2 />
                    </Button>
                    {v.youtubeUrl && (
                      <Button
                        size="xs"
                        {...outlineBtn}
                        onClick={() =>
                          window.open(
                            v.youtubeUrl!,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        title="Open on YouTube"
                      >
                        <FiExternalLink />
                      </Button>
                    )}
                    <Button
                      size="xs"
                      {...outlineBtn}
                      onClick={() => removeVideo(v)}
                      loading={busy === v.id}
                      title="Remove from game"
                    >
                      <FiTrash2 />
                    </Button>
                  </Flex>
                );
              })}
            </VStack>
          )}

          <Box
            borderWidth="1px"
            borderColor={editingId ? "nexzy.blue" : "whiteAlpha.200"}
            borderRadius="md"
            p={4}
          >
            <Text fontSize="sm" fontWeight="700" color="nexzy.white" mb={3}>
              {editingId ? "Edit video" : "Add a video"}
            </Text>
            <VStack align="stretch" gap={2}>
              <Input
                {...inputStyle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title *"
              />
              <Input
                {...inputStyle}
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="YouTube URL (plays inline in the app)"
              />
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={2}>
                <Input
                  {...inputStyle}
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="TikTok URL (optional)"
                />
                <Input
                  {...inputStyle}
                  value={reels}
                  onChange={(e) => setReels(e.target.value)}
                  placeholder="Instagram Reels URL (optional)"
                />
              </SimpleGrid>
              <Input
                {...inputStyle}
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Thumbnail URL (optional — YouTube auto-derives)"
              />
              <HStack gap={2}>
                <Text fontSize="xs" color="nexzy.gray.100">
                  Source:
                </Text>
                <Button
                  size="xs"
                  onClick={() => setSource("nexzy")}
                  {...(source === "nexzy" ? primaryBtn : outlineBtn)}
                >
                  Nexzy-made
                </Button>
                <Button
                  size="xs"
                  onClick={() => setSource("external")}
                  {...(source === "external" ? primaryBtn : outlineBtn)}
                >
                  External
                </Button>
              </HStack>
              <Text fontSize="xs" color="whiteAlpha.500">
                Nexzy-made = a video you produced (ranks first in the app).
                External = a hand-picked third-party YouTube video.
              </Text>
              <HStack gap={2}>
                <Text fontSize="xs" color="nexzy.gray.100">
                  Featured:
                </Text>
                <Button
                  size="xs"
                  onClick={() => setFeatured((f) => !f)}
                  {...(featured ? primaryBtn : outlineBtn)}
                >
                  {featured ? "★ Featured" : "Not featured"}
                </Button>
                <Text fontSize="xs" color="whiteAlpha.500">
                  Featured videos headline the /videos hub &amp; home rail.
                </Text>
              </HStack>
              <HStack gap={2}>
                <Button
                  size="sm"
                  {...primaryBtn}
                  onClick={saveVideo}
                  loading={saving}
                  disabled={title.trim().length < 1}
                >
                  {editingId ? (
                    <>
                      <FiEdit2 /> Save changes
                    </>
                  ) : (
                    <>
                      <FiPlus /> Add video
                    </>
                  )}
                </Button>
                {editingId && (
                  <Button size="sm" {...outlineBtn} onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </HStack>
            </VStack>
          </Box>
        </>
      )}
    </Box>
  );
}
