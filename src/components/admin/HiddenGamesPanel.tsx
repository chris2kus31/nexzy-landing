"use client";

// Admin manager for games the app hides because they carry an adult-content
// tag (nudity, sexual-content, nsfw, ...). Built for volume: filter by the
// blocking tag, name search, per-row checkboxes with select-page, and bulk
// "Show in app" / "Hide" for the selection OR for everything matching the
// current filter (one call, not 133 pages). Server-side pagination; mutations
// owner-locked; any admin can view.
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
import {
  FiCheckSquare,
  FiEye,
  FiEyeOff,
  FiSearch,
  FiSquare,
  FiX,
} from "react-icons/fi";
import {
  bulkSetGameVisibility,
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
  const [tags, setTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status>("all");
  const [tag, setTag] = useState<string>("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // debounced q actually sent
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState<null | boolean>(null); // allow value awaiting confirm
  const [notice, setNotice] = useState("");
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
        tag: tag || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
      setTags(res.tags);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load hidden games");
    }
  }, [page, query, status, tag]);

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

  // A filter change invalidates the selection and any pending confirm.
  useEffect(() => {
    setSelected(new Set());
    setConfirmAll(null);
  }, [query, status, tag]);

  const toggleOne = async (g: HiddenGame) => {
    setBusy(true);
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
      setBusy(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageIds = (items ?? []).map((g) => g.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleSelectPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const runBulk = async (body: Parameters<typeof bulkSetGameVisibility>[0]) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await bulkSetGameVisibility(body);
      setNotice(
        `${res.updated} game${res.updated === 1 ? "" : "s"} ${
          body.allow ? "shown in app" : "hidden"
        }.`,
      );
      setSelected(new Set());
      setConfirmAll(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk update failed");
    } finally {
      setBusy(false);
    }
  };

  const bulkSelected = (allow: boolean) =>
    runBulk({ allow, ids: [...selected] });

  const bulkAllMatching = (allow: boolean) =>
    runBulk({
      allow,
      filter: { q: query, status, tag: tag || undefined },
    });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Box>
      <Heading size="md" color="nexzy.white" mb={1}>
        Hidden games
      </Heading>
      <Text fontSize="sm" color="whiteAlpha.700" mb={4}>
        Games the app hides everywhere (search, browse, feeds, picks) because
        they carry an adult-content tag. Grant exceptions one by one, by
        selection, or for everything matching the current filter.
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
      {notice && (
        <Text fontSize="sm" color="green.300" mb={3}>
          {notice}
        </Text>
      )}

      <Flex align="center" gap={3} mb={3} wrap="wrap">
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

      <HStack gap={1} mb={4} wrap="wrap">
        <Button
          size="xs"
          bg={tag === "" ? "nexzy.blue" : "whiteAlpha.100"}
          color="nexzy.white"
          _hover={{ opacity: 0.85 }}
          onClick={() => {
            setTag("");
            setPage(1);
          }}
        >
          All tags
        </Button>
        {tags.map((t) => (
          <Button
            key={t}
            size="xs"
            bg={tag === t ? "nexzy.blue" : "whiteAlpha.100"}
            color="nexzy.white"
            _hover={{ opacity: 0.85 }}
            onClick={() => {
              setTag(t);
              setPage(1);
            }}
          >
            {t}
          </Button>
        ))}
      </HStack>

      {isOwner && (
        <Flex
          align="center"
          gap={2}
          mb={3}
          p={2}
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          borderRadius="md"
          bg="whiteAlpha.50"
          wrap="wrap"
        >
          <Button
            size="xs"
            variant="outline"
            color="nexzy.gray.100"
            borderColor="whiteAlpha.300"
            onClick={toggleSelectPage}
            disabled={busy || pageIds.length === 0}
          >
            {allOnPageSelected ? <FiCheckSquare /> : <FiSquare />} Select page
          </Button>
          <Text fontSize="xs" color="whiteAlpha.700">
            {selected.size} selected
          </Text>
          {selected.size > 0 && (
            <>
              <Button
                size="xs"
                bg="nexzy.blue"
                color="nexzy.white"
                _hover={{ opacity: 0.85 }}
                disabled={busy}
                onClick={() => bulkSelected(true)}
              >
                <FiEye /> Show selected
              </Button>
              <Button
                size="xs"
                variant="outline"
                color="nexzy.gray.100"
                borderColor="whiteAlpha.300"
                disabled={busy}
                onClick={() => bulkSelected(false)}
              >
                <FiEyeOff /> Hide selected
              </Button>
              <Button
                size="xs"
                variant="outline"
                color="nexzy.gray.100"
                borderColor="whiteAlpha.300"
                disabled={busy}
                onClick={() => setSelected(new Set())}
              >
                <FiX /> Clear
              </Button>
            </>
          )}
          <Box flex="1" />
          {confirmAll === null ? (
            <>
              <Button
                size="xs"
                variant="outline"
                color="nexzy.gray.100"
                borderColor="whiteAlpha.300"
                disabled={busy || total === 0}
                onClick={() => setConfirmAll(true)}
              >
                <FiEye /> Show ALL {total} matching
              </Button>
              <Button
                size="xs"
                variant="outline"
                color="nexzy.gray.100"
                borderColor="whiteAlpha.300"
                disabled={busy || total === 0}
                onClick={() => setConfirmAll(false)}
              >
                <FiEyeOff /> Hide ALL {total} matching
              </Button>
            </>
          ) : (
            <HStack gap={2}>
              <Text fontSize="xs" color="orange.300">
                {confirmAll ? "Show" : "Hide"} all {total} games matching the
                current filter?
              </Text>
              <Button
                size="xs"
                bg={confirmAll ? "nexzy.blue" : "red.700"}
                color="nexzy.white"
                _hover={{ opacity: 0.85 }}
                disabled={busy}
                onClick={() => bulkAllMatching(confirmAll)}
              >
                {busy ? <Spinner size="xs" /> : "Confirm"}
              </Button>
              <Button
                size="xs"
                variant="outline"
                color="nexzy.gray.100"
                borderColor="whiteAlpha.300"
                disabled={busy}
                onClick={() => setConfirmAll(null)}
              >
                Cancel
              </Button>
            </HStack>
          )}
        </Flex>
      )}

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
              borderColor={selected.has(g.id) ? "nexzy.blue" : "whiteAlpha.200"}
              borderRadius="md"
              bg="whiteAlpha.50"
            >
              {isOwner && (
                <Button
                  size="xs"
                  variant="ghost"
                  color={
                    selected.has(g.id) ? "nexzy.lightBlue" : "whiteAlpha.600"
                  }
                  onClick={() => toggleSelect(g.id)}
                  aria-label={selected.has(g.id) ? "Deselect" : "Select"}
                  px={1}
                >
                  {selected.has(g.id) ? (
                    <FiCheckSquare size={16} />
                  ) : (
                    <FiSquare size={16} />
                  )}
                </Button>
              )}
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
                  disabled={busy}
                  onClick={() => toggleOne(g)}
                >
                  {g.matureOverride ? (
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
