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
import { FiSearch, FiTrash2, FiPlus, FiExternalLink } from "react-icons/fi";
import {
  searchGamesForLink,
  getGameVideos,
  createVideo,
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
  if (v.youtubeId)
    return `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`;
  return null;
}

/**
 * Game hub — manage the videos attached to a game. Search a game, see its
 * Nexzy + external videos, add a new one (YouTube plays inline in-app; TikTok /
 * Reels are "also on" links), and remove. Talks to /newsroom/admin/videos.
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

  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [reels, setReels] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [source, setSource] = useState<"nexzy" | "external">("nexzy");
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
    await loadVideos(g.id);
  }

  function resetForm() {
    setTitle("");
    setYoutubeUrl("");
    setTiktok("");
    setReels("");
    setThumbnailUrl("");
    setSource("nexzy");
  }

  async function add() {
    if (!game || title.trim().length < 1) return;
    setSaving(true);
    setMsg(null);
    try {
      const platformLinks: Record<string, string> = {};
      if (tiktok.trim()) platformLinks.tiktok = tiktok.trim();
      if (reels.trim()) platformLinks.reels = reels.trim();
      await createVideo({
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim() || undefined,
        platformLinks: Object.keys(platformLinks).length
          ? platformLinks
          : undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        source,
        gameIds: [game.id],
        primaryGameId: game.id,
      });
      resetForm();
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
                return (
                  <Flex
                    key={v.id ?? v.youtubeId ?? v.youtubeUrl ?? ""}
                    align="center"
                    gap={3}
                    p={2}
                    borderWidth="1px"
                    borderColor="whiteAlpha.200"
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
                    {v.youtubeUrl && (
                      <Button
                        size="xs"
                        {...outlineBtn}
                        onClick={() => window.open(v.youtubeUrl!, "_blank")}
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
            borderColor="whiteAlpha.200"
            borderRadius="md"
            p={4}
          >
            <Text fontSize="sm" fontWeight="700" color="nexzy.white" mb={3}>
              Add a video
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
              <Button
                size="sm"
                {...primaryBtn}
                onClick={add}
                loading={saving}
                disabled={title.trim().length < 1}
                alignSelf="flex-start"
              >
                <FiPlus /> Add video
              </Button>
            </VStack>
          </Box>
        </>
      )}
    </Box>
  );
}
