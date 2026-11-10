"use client";

// Admin manager for games the app hides because they carry an adult-content
// tag (nudity, sexual-content, nsfw, ...). Lists every blocked game with the
// tags that block it; the owner can grant an exception ("Show in app") that
// makes the game visible in search, browse, feeds, picks and newsroom lists
// without loosening the blocklist itself. Server-side pagination: this set
// can be thousands of rows. Mutations are owner-locked; any admin can view.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Image,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiEye, FiEyeOff, FiSearch } from "react-icons/fi";
import {
  listHiddenGames,
  setGameVisibilityException,
  type HiddenGame,
} from "@/lib/admin/client";

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
} as const;

const PAGE_SIZE = 25;
const year = (d: string | null) => (d ? d.slice(0, 4) : "TBD");

type Status = "all" | "hidden" | "allowed";

const STATUS_TABS: Array<{ key: Status; label: string }> = [
  { key: "all", label: "All" },
  { key: "hidden", label: "Hidden" },
  { key: "allowed", label: "Allowed" },
];

export default function HiddenGamesPanel({ isOwner }: { isOwner: boolean }) {
  const [items, setItems] = useState<HiddenGame[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status>("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // debounced q actually sent
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await listHiddenGames({
        page,
        limit: PAGE_SIZE,
        q: query,
        status,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load hidden games");
    }
  }, [page, query, status]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce typing into one request, and reset to page 1 on a new search.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPage(1);
      setQuery(q);
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  const toggle = async (g: HiddenGame) => {
    setBusyId(g.id);
    setError("");
    try {
      const res = await setGameVisibilityException(g.id, !g.matureOverride);
      setItems(
        (prev) =>
          prev?.map((row) =>
            row.id === g.id
              ? { ...row, matureOverride: res.matureOverride }
              : row,
          ) ?? null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toggle failed");
    } finally {
      setBusyId(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Box>
      <Heading size="md" color="nexzy.white" mb={1}>
        Hidden games
      </Heading>
      <Text fontSize="sm" color="whiteAlpha.700" mb={4}>
        Games the app hides everywhere (search, browse, feeds, picks) because
        they carry an adult-content tag. Flip a game to Shown to grant an
        exception without loosening the blocklist - e.g. AAA titles tagged
        nudity.
      </Text>

      {!isOwner && (
        <Text fontSize="sm" color="nexzy.lightBlue" mb={4}>
          Read-only - only the owner can change game visibility.
        </Text>
      )}

      {error && (
        <Text fontSize="sm" color="red.300" mb={3}>
          {error}
        </Text>
      )}

      <Flex align="center" gap={3} mb={4} wrap="wrap">
        <HStack gap={1}>
          {STATUS_TABS.map((t) => (
            <Button
              key={t.key}
              size="xs"
              bg={status === t.key ? "nexzy.blue" : "whiteAlpha.100"}
              color="nexzy.white"
              _hover={{ opacity: 0.85 }}
              onClick={() => {
                setStatus(t.key);
                setPage(1);
              }}
            >
              {t.label}
            </Button>
          ))}
        </HStack>
        <Flex align="center" gap={2} flex="1" minW="220px">
          <FiSearch color="var(--chakra-colors-whiteAlpha-500)" />
          <Input
            {...inputProps}
            size="sm"
            placeholder="Search hidden games by name..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Flex>
        <Text fontSize="xs" color="whiteAlpha.500">
          {total} game{total === 1 ? "" : "s"}
        </Text>
      </Flex>

      {items === null ? (
        <Spinner size="sm" color="nexzy.lightBlue" />
      ) : items.length === 0 ? (
        <Text fontSize="sm" color="whiteAlpha.500">
          Nothing here - no games match this filter.
        </Text>
      ) : (
        <VStack align="stretch" gap={2}>
          {items.map((g) => (
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
                <HStack gap={2} mt={1} wrap="wrap">
                  <Text fontSize="xs" color="whiteAlpha.500">
                    {year(g.released)}
                  </Text>
                  {g.notabilityScore != null && g.notabilityScore > 0 && (
                    <Badge
                      bg="whiteAlpha.200"
                      color="nexzy.white"
                      borderRadius="md"
                      fontSize="10px"
                    >
                      notability {g.notabilityScore}
                    </Badge>
                  )}
                  {(g.blockingTags ?? []).map((t) => (
                    <Badge
                      key={t}
                      bg="red.900"
                      color="red.200"
                      borderRadius="md"
                      fontSize="10px"
                    >
                      {t}
                    </Badge>
                  ))}
                </HStack>
              </Box>
              {g.matureOverride ? (
                <Badge bg="green.700" color="green.100" borderRadius="md">
                  Shown
                </Badge>
              ) : (
                <Badge
                  bg="whiteAlpha.200"
                  color="whiteAlpha.700"
                  borderRadius="md"
                >
                  Hidden
                </Badge>
              )}
              {isOwner && (
                <Button
                  size="xs"
                  variant={g.matureOverride ? "outline" : "solid"}
                  bg={g.matureOverride ? "transparent" : "nexzy.blue"}
                  color={g.matureOverride ? "nexzy.gray.100" : "nexzy.white"}
                  borderColor="whiteAlpha.300"
                  _hover={{ opacity: 0.85 }}
                  disabled={busyId === g.id}
                  onClick={() => toggle(g)}
                >
                  {busyId === g.id ? (
                    <Spinner size="xs" />
                  ) : g.matureOverride ? (
                    <>
                      <FiEyeOff /> Hide
                    </>
                  ) : (
                    <>
                      <FiEye /> Show in app
                    </>
                  )}
                </Button>
              )}
            </Flex>
          ))}
        </VStack>
      )}

      {pages > 1 && (
        <Flex justify="center" align="center" gap={3} mt={4} wrap="wrap">
          <Button
            size="sm"
            variant="outline"
            color="nexzy.gray.100"
            borderColor="whiteAlpha.300"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>
          <Text fontSize="sm" color="whiteAlpha.700">
            Page {page} of {pages}
          </Text>
          <Button
            size="sm"
            variant="outline"
            color="nexzy.gray.100"
            borderColor="whiteAlpha.300"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
          >
            Next
          </Button>
        </Flex>
      )}
    </Box>
  );
}
