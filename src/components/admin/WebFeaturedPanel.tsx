"use client";

// Admin picker for the WEBSITE's /games "Featured" row. Separate from
// FeaturedPanel (the mobile app's Discover hero): the website and the app are
// curated independently. Only games with a website page can be pinned (the
// API refuses others). Owner-locked mutations; any admin can view. Talks to
// /api/newsroom/admin/web-featured* via the same-origin proxy.
import { useCallback, useEffect, useRef, useState } from "react";
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
} from "@chakra-ui/react";
import {
  FiSearch,
  FiPlus,
  FiX,
  FiArrowUp,
  FiArrowDown,
  FiExternalLink,
} from "react-icons/fi";
import {
  listWebFeaturedGames,
  addWebFeaturedGame,
  removeWebFeaturedGame,
  reorderWebFeaturedGames,
  searchGamesForLink,
  type WebFeaturedGame,
  type GameLite,
} from "@/lib/admin/client";

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
} as const;

const year = (d: string | null) => (d ? d.slice(0, 4) : "—");

export default function WebFeaturedPanel({ isOwner }: { isOwner: boolean }) {
  const [featured, setFeatured] = useState<WebFeaturedGame[] | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GameLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      setFeatured(await listWebFeaturedGames());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load featured games",
      );
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchGamesForLink(q));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  const featuredIds = new Set((featured ?? []).map((g) => g.id));

  const run = async (fn: () => Promise<WebFeaturedGame[]>) => {
    setBusy(true);
    setError("");
    try {
      setFeatured(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const add = (id: string) => run(() => addWebFeaturedGame(id));
  const remove = (id: string) => run(() => removeWebFeaturedGame(id));
  const move = (idx: number, dir: -1 | 1) => {
    if (!featured) return;
    const j = idx + dir;
    if (j < 0 || j >= featured.length) return;
    const ids = featured.map((g) => g.id);
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    return run(() => reorderWebFeaturedGames(ids));
  };

  return (
    <Box>
      <Heading size="md" color="nexzy.white" mb={1}>
        Featured on the website
      </Heading>
      <Text fontSize="sm" color="whiteAlpha.700" mb={4}>
        The Featured row at the top of nexzyapp.com/games, up to 4 games, in the
        order below. Only games with a page on the website can be pinned. With
        nothing pinned, the newest live mega hubs fill the row. This does not
        change the app (that is the Featured (app) tab).
      </Text>

      {!isOwner && (
        <Text fontSize="sm" color="nexzy.lightBlue" mb={4}>
          Read-only: only the owner can change the website's featured games.
        </Text>
      )}

      {error && (
        <Text fontSize="sm" color="red.300" mb={3}>
          {error}
        </Text>
      )}

      {isOwner && (
        <Box mb={6}>
          <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
            Add a game
          </Text>
          <Flex align="center" gap={2}>
            <FiSearch color="var(--chakra-colors-whiteAlpha-500)" />
            <Input
              {...inputProps}
              size="sm"
              placeholder="Search games by name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Flex>

          {(searching || results.length > 0) && (
            <VStack
              align="stretch"
              gap={1}
              mt={2}
              p={2}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="md"
              bg="whiteAlpha.50"
            >
              {searching && (
                <HStack color="whiteAlpha.500" fontSize="sm">
                  <Spinner size="xs" /> <Text>Searching…</Text>
                </HStack>
              )}
              {results.map((g) => {
                const already = featuredIds.has(g.id);
                return (
                  <Flex key={g.id} align="center" gap={3} py={1}>
                    <Image
                      src={g.backgroundImage || ""}
                      alt=""
                      boxSize="40px"
                      borderRadius="md"
                      objectFit="cover"
                      bg="whiteAlpha.100"
                    />
                    <Box flex="1" minW={0}>
                      <Text fontSize="sm" color="nexzy.white" truncate>
                        {g.name}
                      </Text>
                      <Text fontSize="xs" color="whiteAlpha.500">
                        {year(g.released)}
                      </Text>
                    </Box>
                    <Button
                      size="xs"
                      disabled={already || busy}
                      bg={already ? "whiteAlpha.100" : "nexzy.blue"}
                      color="nexzy.white"
                      _hover={{ opacity: 0.85 }}
                      onClick={() => add(g.id)}
                    >
                      <FiPlus /> {already ? "Featured" : "Feature"}
                    </Button>
                  </Flex>
                );
              })}
            </VStack>
          )}
        </Box>
      )}

      <Text fontSize="xs" color="whiteAlpha.700" mb={2}>
        Currently featured
      </Text>

      {featured === null ? (
        <Spinner size="sm" color="nexzy.lightBlue" />
      ) : featured.length === 0 ? (
        <Text fontSize="sm" color="whiteAlpha.500">
          No featured games yet. Search above to pin your first pick.
        </Text>
      ) : (
        <VStack align="stretch" gap={2}>
          {featured.map((g, i) => (
            <Flex
              key={g.id}
              align="center"
              gap={3}
              p={2}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="md"
              bg="whiteAlpha.50"
            >
              <Badge bg="nexzy.blue" color="nexzy.white" borderRadius="md">
                {i + 1}
              </Badge>
              <Image
                src={g.backgroundImage || ""}
                alt=""
                boxSize="48px"
                borderRadius="md"
                objectFit="cover"
                bg="whiteAlpha.100"
              />
              <Box flex="1" minW={0}>
                <Text fontSize="sm" color="nexzy.white" truncate>
                  {g.name}
                </Text>
                <HStack gap={2} color="whiteAlpha.500" fontSize="xs">
                  <Text>{year(g.released)}</Text>
                  {g.covered ? (
                    <a
                      href={`/games/${g.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", gap: 4 }}
                    >
                      <FiExternalLink /> /games/{g.slug}
                    </a>
                  ) : (
                    <Badge bg="red.700" color="white" size="sm">
                      No website page: hidden from the row
                    </Badge>
                  )}
                </HStack>
              </Box>
              {isOwner && (
                <HStack gap={1}>
                  <Button
                    size="xs"
                    variant="outline"
                    color="nexzy.gray.100"
                    borderColor="whiteAlpha.300"
                    disabled={busy || i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    <FiArrowUp />
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    color="nexzy.gray.100"
                    borderColor="whiteAlpha.300"
                    disabled={busy || i === featured.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    <FiArrowDown />
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    color="red.300"
                    borderColor="whiteAlpha.300"
                    disabled={busy}
                    onClick={() => remove(g.id)}
                    aria-label="Remove"
                  >
                    <FiX />
                  </Button>
                </HStack>
              )}
            </Flex>
          ))}
        </VStack>
      )}
    </Box>
  );
}
