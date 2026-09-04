"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  Input,
  Image,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import { FiSearch, FiCheck, FiX, FiStar } from "react-icons/fi";
import {
  getPostGames,
  addPostGame,
  confirmPostGame,
  removePostGame,
  searchGamesForLink,
  getGameVideos,
  getGameScreenshots,
  type PostGameLink,
  type GameLite,
  type GameVideoItem,
} from "@/lib/admin/client";

type GameAssets = {
  open: boolean;
  loading: boolean;
  loaded: boolean;
  videos: GameVideoItem[];
  shots: string[];
};

const outlineBtn = {
  variant: "outline" as const,
  color: "nexzy.gray.100",
  borderColor: "whiteAlpha.300",
  _hover: { bg: "whiteAlpha.100" },
};
const primaryBtn = {
  bg: "nexzy.blue",
  color: "white",
  _hover: { bg: "nexzy.blue", opacity: 0.9 },
};

/**
 * Post <-> game link editor (sidebar section). Shows confirmed + AI-suggested
 * links; confirm or remove suggestions, and add a game via search.
 */
export default function PostGamesEditor({
  postId,
  onReuseVideo,
  onReuseImage,
  onSetHero,
}: {
  postId: string;
  // Optional: when provided, each CONFIRMED game shows a "reuse its media"
  // palette. Clicking a thumb opens a PREVIEW with actions; nothing here changes
  // the normal add-new-video / add-new-image / hero-upload flows.
  onReuseVideo?: (url: string) => void;
  onReuseImage?: (url: string, meta?: { alt?: string }) => void;
  onSetHero?: (url: string) => Promise<void> | void;
}) {
  const [links, setLinks] = useState<PostGameLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GameLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [assets, setAssets] = useState<Record<string, GameAssets>>({});
  const [preview, setPreview] = useState<{
    kind: "image" | "video";
    url: string;
    youtubeId?: string;
    title?: string;
    gameName?: string;
  } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [heroing, setHeroing] = useState(false);
  const canReuse = !!(onReuseVideo || onReuseImage);

  async function toggleAssets(gameId: string) {
    const cur = assets[gameId];
    if (cur?.open) {
      setAssets((a) => ({ ...a, [gameId]: { ...cur, open: false } }));
      return;
    }
    if (cur?.loaded) {
      setAssets((a) => ({ ...a, [gameId]: { ...cur, open: true } }));
      return;
    }
    setAssets((a) => ({
      ...a,
      [gameId]: {
        open: true,
        loading: true,
        loaded: false,
        videos: [],
        shots: [],
      },
    }));
    try {
      const [videos, shots] = await Promise.all([
        onReuseVideo
          ? getGameVideos(gameId)
          : Promise.resolve<GameVideoItem[]>([]),
        onReuseImage
          ? getGameScreenshots(gameId)
          : Promise.resolve<string[]>([]),
      ]);
      setAssets((a) => ({
        ...a,
        [gameId]: { open: true, loading: false, loaded: true, videos, shots },
      }));
    } catch (e) {
      setMsg((e as Error).message);
      setAssets((a) => ({
        ...a,
        [gameId]: {
          open: true,
          loading: false,
          loaded: true,
          videos: [],
          shots: [],
        },
      }));
    }
  }

  async function load() {
    setLoading(true);
    try {
      setLinks(await getPostGames(postId));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function search() {
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
  async function add(gameId: string, isPrimary = false) {
    setBusy(gameId);
    setMsg(null);
    try {
      await addPostGame(postId, gameId, isPrimary);
      setResults([]);
      setQ("");
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function confirm(gameId: string) {
    setBusy(gameId);
    setMsg(null);
    try {
      await confirmPostGame(postId, gameId);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function remove(gameId: string) {
    setBusy(gameId);
    setMsg(null);
    try {
      await removePostGame(postId, gameId);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Box>
      {msg && (
        <Text fontSize="xs" color="red.400" mb={2}>
          {msg}
        </Text>
      )}
      <Text
        fontSize="xs"
        fontWeight="600"
        color="nexzy.gray.100"
        textTransform="uppercase"
        letterSpacing="wide"
        mb={2}
      >
        Linked games
      </Text>

      {loading ? (
        <Spinner size="sm" />
      ) : links.length === 0 ? (
        <Text fontSize="sm" color="whiteAlpha.500" mb={2}>
          No games linked yet.
        </Text>
      ) : (
        <VStack align="stretch" gap={2} mb={3}>
          {links.map((l) => (
            <Box
              key={l.gameId}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="md"
            >
              <Flex align="center" gap={2} p={2}>
                {l.game?.backgroundImage && (
                  <Image
                    src={l.game.backgroundImage}
                    alt=""
                    boxSize="28px"
                    borderRadius="sm"
                    objectFit="cover"
                  />
                )}
                <Box flex="1" minW="0">
                  <Text fontSize="sm" color="nexzy.white" lineClamp={1}>
                    {l.game?.name ?? l.gameId}
                  </Text>
                  <HStack gap={1} mt={1}>
                    {l.isPrimary && (
                      <Badge colorPalette="blue" variant="subtle">
                        <FiStar /> primary
                      </Badge>
                    )}
                    <Badge
                      colorPalette={
                        l.status === "confirmed"
                          ? "green"
                          : l.status === "suggested"
                            ? "orange"
                            : "gray"
                      }
                      variant="subtle"
                    >
                      {l.status}
                    </Badge>
                  </HStack>
                </Box>
                {l.status === "suggested" && (
                  <Button
                    size="xs"
                    {...primaryBtn}
                    onClick={() => confirm(l.gameId)}
                    loading={busy === l.gameId}
                    title="Confirm"
                  >
                    <FiCheck />
                  </Button>
                )}
                <Button
                  size="xs"
                  {...outlineBtn}
                  onClick={() => remove(l.gameId)}
                  loading={busy === l.gameId}
                  title="Remove"
                >
                  <FiX />
                </Button>
              </Flex>

              {l.status === "confirmed" && canReuse && (
                <Box borderTopWidth="1px" borderColor="whiteAlpha.200" p={2}>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="nexzy.blue"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() => toggleAssets(l.gameId)}
                  >
                    {assets[l.gameId]?.open
                      ? "Hide game media"
                      : "Reuse this game's media"}
                  </Button>
                  {assets[l.gameId]?.open && (
                    <Box mt={2}>
                      {assets[l.gameId]?.loading ? (
                        <Spinner size="sm" />
                      ) : (
                        <>
                          {onReuseVideo &&
                            (assets[l.gameId]?.videos.length ?? 0) > 0 && (
                              <>
                                <Text
                                  fontSize="2xs"
                                  color="whiteAlpha.600"
                                  textTransform="uppercase"
                                  letterSpacing="wide"
                                  mb={1}
                                >
                                  Videos
                                </Text>
                                <Flex wrap="wrap" gap={2} mb={2}>
                                  {assets[l.gameId]!.videos.map((v, i) => (
                                    <Image
                                      key={`v${i}`}
                                      src={v.thumbnailUrl ?? ""}
                                      alt={v.title ?? "video"}
                                      w="72px"
                                      h="41px"
                                      objectFit="cover"
                                      borderRadius="sm"
                                      borderWidth="1px"
                                      borderColor="whiteAlpha.300"
                                      cursor="pointer"
                                      _hover={{ borderColor: "nexzy.blue" }}
                                      title={v.title ?? "Preview video"}
                                      onClick={() => {
                                        setFlash(null);
                                        setPreview({
                                          kind: "video",
                                          url: v.youtubeUrl ?? "",
                                          youtubeId: v.youtubeId ?? undefined,
                                          title: v.title ?? undefined,
                                        });
                                      }}
                                    />
                                  ))}
                                </Flex>
                              </>
                            )}
                          {onReuseImage &&
                            (assets[l.gameId]?.shots.length ?? 0) > 0 && (
                              <>
                                <Text
                                  fontSize="2xs"
                                  color="whiteAlpha.600"
                                  textTransform="uppercase"
                                  letterSpacing="wide"
                                  mb={1}
                                >
                                  Screenshots
                                </Text>
                                <Flex wrap="wrap" gap={2}>
                                  {assets[l.gameId]!.shots.map((s, i) => (
                                    <Image
                                      key={`s${i}`}
                                      src={s}
                                      alt="screenshot"
                                      w="72px"
                                      h="41px"
                                      objectFit="cover"
                                      borderRadius="sm"
                                      borderWidth="1px"
                                      borderColor="whiteAlpha.300"
                                      cursor="pointer"
                                      _hover={{ borderColor: "nexzy.blue" }}
                                      title="Preview screenshot"
                                      onClick={() => {
                                        setFlash(null);
                                        setPreview({
                                          kind: "image",
                                          url: s,
                                          gameName: l.game?.name ?? undefined,
                                        });
                                      }}
                                    />
                                  ))}
                                </Flex>
                              </>
                            )}
                          {(assets[l.gameId]?.videos.length ?? 0) === 0 &&
                            (assets[l.gameId]?.shots.length ?? 0) === 0 && (
                              <Text fontSize="xs" color="whiteAlpha.500">
                                No reusable media on this game yet.
                              </Text>
                            )}
                          <Text fontSize="2xs" color="whiteAlpha.400" mt={2}>
                            Click to preview, then add — duplicates are skipped
                            automatically.
                          </Text>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          ))}
        </VStack>
      )}

      <HStack gap={2}>
        <Input
          size="sm"
          bg="whiteAlpha.50"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _placeholder={{ color: "whiteAlpha.500" }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Add a game…"
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
          }}
        />
        <Button size="sm" {...primaryBtn} onClick={search} loading={searching}>
          <FiSearch />
        </Button>
      </HStack>

      {searched && !searching && results.length === 0 && q.trim() !== "" && (
        <Text fontSize="xs" color="nexzy.gray.100" mt={2}>
          No games found for &ldquo;{q.trim()}&rdquo;. If it should exist,
          import it from the Missing games tab.
        </Text>
      )}

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
            >
              {g.backgroundImage && (
                <Image
                  src={g.backgroundImage}
                  alt=""
                  boxSize="24px"
                  borderRadius="sm"
                  objectFit="cover"
                />
              )}
              <Text flex="1" fontSize="sm" color="nexzy.white" lineClamp={1}>
                {g.name}
              </Text>
              <Button
                size="xs"
                bg="green.500"
                color="white"
                _hover={{ bg: "green.600" }}
                onClick={() => add(g.id, links.length === 0)}
                loading={busy === g.id}
              >
                Link
              </Button>
            </Flex>
          ))}
        </VStack>
      )}

      {preview && (
        <Box
          position="fixed"
          inset="0"
          zIndex={2000}
          bg="blackAlpha.800"
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
          onClick={() => {
            setPreview(null);
            setFlash(null);
          }}
        >
          <Box
            maxW="760px"
            w="100%"
            bg="gray.900"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            p={4}
            onClick={(e) => e.stopPropagation()}
          >
            {preview.kind === "image" ? (
              <Image
                src={preview.url}
                alt=""
                w="100%"
                maxH="60vh"
                objectFit="contain"
                borderRadius="md"
                bg="black"
              />
            ) : preview.youtubeId ? (
              <Box
                position="relative"
                w="100%"
                pt="56.25%"
                borderRadius="md"
                overflow="hidden"
                bg="black"
              >
                <iframe
                  src={`https://www.youtube.com/embed/${preview.youtubeId}`}
                  title={preview.title ?? "video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                  }}
                />
              </Box>
            ) : (
              <Text color="whiteAlpha.700" fontSize="sm">
                No inline preview for this video.{" "}
                {preview.url && (
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#4aa8ff" }}
                  >
                    Open in a new tab
                  </a>
                )}
              </Text>
            )}

            {flash && (
              <Text fontSize="sm" color="green.300" mt={2}>
                {flash}
              </Text>
            )}

            <Flex gap={2} mt={3} justify="flex-end" wrap="wrap">
              {preview.kind === "image" ? (
                <>
                  {onReuseImage && (
                    <Button
                      size="sm"
                      {...primaryBtn}
                      onClick={() => {
                        onReuseImage(preview.url, {
                          alt: preview.gameName
                            ? `${preview.gameName} screenshot`
                            : undefined,
                        });
                        setFlash("Added to image gallery ✓");
                      }}
                    >
                      Add to gallery
                    </Button>
                  )}
                  {onSetHero && (
                    <Button
                      size="sm"
                      {...outlineBtn}
                      loading={heroing}
                      onClick={async () => {
                        setHeroing(true);
                        try {
                          await onSetHero(preview.url);
                          setFlash("Set as hero image ✓");
                        } catch (e) {
                          setFlash((e as Error).message || "Hero set failed.");
                        } finally {
                          setHeroing(false);
                        }
                      }}
                    >
                      Set as hero
                    </Button>
                  )}
                </>
              ) : (
                onReuseVideo &&
                preview.url && (
                  <Button
                    size="sm"
                    {...primaryBtn}
                    onClick={() => {
                      onReuseVideo(preview.url);
                      setFlash("Added to video gallery ✓");
                    }}
                  >
                    Add to videos
                  </Button>
                )
              )}
              <Button
                size="sm"
                {...outlineBtn}
                onClick={() => {
                  setPreview(null);
                  setFlash(null);
                }}
              >
                Close
              </Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  );
}
