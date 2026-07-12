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
  type PostGameLink,
  type GameLite,
} from "@/lib/admin/client";

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
export default function PostGamesEditor({ postId }: { postId: string }) {
  const [links, setLinks] = useState<PostGameLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GameLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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
            <Flex
              key={l.gameId}
              align="center"
              gap={2}
              p={2}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="md"
            >
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
    </Box>
  );
}
