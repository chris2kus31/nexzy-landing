"use client";

import { useState } from "react";
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
} from "@chakra-ui/react";
import {
  FiSearch,
  FiTrash2,
  FiPlus,
  FiExternalLink,
  FiEdit2,
} from "react-icons/fi";
import {
  searchGamesForLink,
  getGameVideos,
  createVideo,
  updateVideo,
  detachVideoGame,
  type GameLite,
  type GameVideoItem,
} from "@/lib/admin/client";

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

function thumbFor(v: GameVideoItem): string | null {
  if (v.thumbnailUrl) return v.thumbnailUrl;
  if (v.youtubeId) return `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`;
  return null;
}

/**
 * Game hub — manage the videos attached to a game. Search a game, see its
 * Nexzy + external videos, add / edit / remove. YouTube plays inline in-app;
 * TikTok / Reels are "also on" links. Talks to /newsroom/admin/videos.
 */
export default function GameHubPanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GameLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [game, setGame] = useState<GameLite | null>(null);

  const [videos, setVideos] = useState<GameVideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // add / edit form (editingId null = adding, set = editing that video)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [reels, setReels] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [source, setSource] = useState<"nexzy" | "external">("nexzy");
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  async function search() {
    if (q.trim().length < 2) return;
    setSearching(true);
    setMsg(null);
    try {
      setResults(await searchGamesForLink(q));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function loadVideos(gameId: string) {
    setLoading(true);
    setMsg(null);
    try {
      setVideos(await getGameVideos(gameId));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function pick(g: GameLite) {
    setGame(g);
    setResults([]);
    setQ("");
    cancelEdit();
    await loadVideos(g.id);
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
    if (typeof window !== "undefined")
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function save() {
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

  async function remove(v: GameVideoItem) {
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

  return (
    <Box>
      <Heading size="md" color="nexzy.white" mb={1}>
        Game hub — videos
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        Attach videos to a game. The YouTube link plays inline in the app Media
        tab; TikTok / Reels show as &ldquo;also on&rdquo; links. Nexzy videos
        rank first; the RAWG trailer shows last.
      </Text>

      {msg && (
        <Text fontSize="sm" color="red.400" mb={3}>
          {msg}
        </Text>
      )}

      {!game ? (
        <Box maxW="520px">
          <HStack gap={2}>
            <Input
              {...inputStyle}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a game…"
              onKeyDown={(e) => {
                if (e.key === "Enter") search();
              }}
            />
            <Button
              size="sm"
              {...primaryBtn}
              onClick={search}
              loading={searching}
            >
              <FiSearch />
            </Button>
          </HStack>
          {results.length > 0 && (
            <VStack align="stretch" gap={1} mt={2}>
              {results.map((g) => (
                <Flex
                  key={g.id}
                  align="center"
                  gap={2}
                  p={2}
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: "whiteAlpha.100" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pick(g);
                    }
                  }}
                  onClick={() => pick(g)}
                >
                  {g.backgroundImage && (
                    <Image
                      src={g.backgroundImage}
                      alt=""
                      boxSize="28px"
                      borderRadius="sm"
                      objectFit="cover"
                    />
                  )}
                  <Text
                    flex="1"
                    fontSize="sm"
                    color="nexzy.white"
                    lineClamp={1}
                  >
                    {g.name}
                  </Text>
                  {g.released && (
                    <Text fontSize="xs" color="whiteAlpha.500">
                      {g.released.slice(0, 4)}
                    </Text>
                  )}
                </Flex>
              ))}
            </VStack>
          )}
        </Box>
      ) : (
        <>
          <Flex
            align="center"
            gap={3}
            mb={4}
            p={3}
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="md"
          >
            {game.backgroundImage && (
              <Image
                src={game.backgroundImage}
                alt=""
                boxSize="40px"
                borderRadius="md"
                objectFit="cover"
              />
            )}
            <Box flex="1" minW="0">
              <Text
                fontSize="md"
                fontWeight="700"
                color="nexzy.white"
                lineClamp={1}
              >
                {game.name}
              </Text>
              <Text fontSize="xs" color="whiteAlpha.500">
                {videos.length} video{videos.length === 1 ? "" : "s"}
              </Text>
            </Box>
            <Button
              size="xs"
              {...outlineBtn}
              onClick={() => {
                setGame(null);
                setVideos([]);
                cancelEdit();
              }}
            >
              Change game
            </Button>
          </Flex>

          {loading ? (
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
                      onClick={() => remove(v)}
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
                  onClick={save}
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
