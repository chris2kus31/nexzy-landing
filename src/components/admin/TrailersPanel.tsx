"use client";

// Trailer monitor admin: a review INBOX of YouTube uploads the monitor caught
// (approve → creates an external video linked to a game → it feeds; or dismiss),
// plus the watched-CHANNEL registry (add/remove/enable). Nothing auto-publishes —
// every trailer that reaches the feed is approved here by a human.
import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  Image,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import {
  FiPlus,
  FiTrash2,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiSearch,
  FiEye,
  FiEyeOff,
  FiAlertTriangle,
} from "react-icons/fi";
import {
  getTrailerInbox,
  approveTrailer,
  dismissTrailer,
  pollTrailers,
  getTrailerSources,
  addTrailerSource,
  removeTrailerSource,
  toggleTrailerSource,
  searchGamesForLink,
  type TrailerCandidate,
  type TrailerSource,
  type GameLite,
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

function TrailerRow({
  c,
  onDone,
}: {
  c: TrailerCandidate;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<GameLite | null>(
    c.resolvedGameId
      ? ({
          id: c.resolvedGameId,
          name: c.resolvedGameName ?? "Suggested game",
          slug: "",
          backgroundImage: null,
          released: null,
        } as GameLite)
      : null,
  );
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GameLite[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      setResults(await searchGamesForLink(q.trim()));
    } finally {
      setSearching(false);
    }
  };

  const approve = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await approveTrailer(c.id, picked.id);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    setBusy(true);
    try {
      await dismissTrailer(c.id);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Flex
      gap={3}
      p={3}
      bg="whiteAlpha.50"
      borderRadius="md"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      direction={{ base: "column", md: "row" }}
    >
      <Image
        src={c.thumbnailUrl ?? undefined}
        alt=""
        w={{ base: "100%", md: "160px" }}
        h={{ base: "auto", md: "90px" }}
        objectFit="cover"
        borderRadius="md"
        bg="whiteAlpha.100"
      />
      <VStack align="stretch" flex="1" gap={2}>
        <Text color="nexzy.white" fontWeight="600" lineClamp={2}>
          {c.title}
        </Text>
        <HStack gap={2} fontSize="xs" color="whiteAlpha.700">
          <Badge colorPalette="purple">{c.channelName ?? "channel"}</Badge>
          {c.videoPublishedAt && (
            <Text>{new Date(c.videoPublishedAt).toLocaleDateString()}</Text>
          )}
          <a
            href={`https://www.youtube.com/watch?v=${c.youtubeId}`}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "underline" }}
          >
            watch
          </a>
        </HStack>

        {/* Game selection — defaults to the resolver's guess; searchable to override. */}
        <HStack gap={2} wrap="wrap">
          <Text fontSize="sm" color="whiteAlpha.700">
            Game:
          </Text>
          {picked ? (
            <Badge colorPalette="blue" px={2} py={1}>
              {picked.name}{" "}
              <Box
                as="span"
                cursor="pointer"
                onClick={() => setPicked(null)}
                ml={1}
              >
                <FiX style={{ display: "inline" }} />
              </Box>
            </Badge>
          ) : (
            <Badge colorPalette="orange">
              <FiAlertTriangle style={{ display: "inline", marginRight: 4 }} />
              no match — pick one
            </Badge>
          )}
        </HStack>

        {!picked && (
          <HStack gap={2}>
            <Input
              {...inputStyle}
              placeholder="Search a game…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button {...outlineBtn} size="sm" onClick={search}>
              {searching ? <Spinner size="sm" /> : <FiSearch />}
            </Button>
          </HStack>
        )}
        {!picked && results.length > 0 && (
          <VStack align="stretch" gap={1} maxH="160px" overflowY="auto">
            {results.map((g) => (
              <HStack
                key={g.id}
                p={1}
                px={2}
                borderRadius="md"
                _hover={{ bg: "whiteAlpha.100" }}
                cursor="pointer"
                onClick={() => {
                  setPicked(g);
                  setResults([]);
                  setQ("");
                }}
              >
                <Text fontSize="sm" color="nexzy.white">
                  {g.name}
                </Text>
                {g.released && (
                  <Text fontSize="xs" color="whiteAlpha.500">
                    {g.released.slice(0, 4)}
                  </Text>
                )}
              </HStack>
            ))}
          </VStack>
        )}

        <HStack gap={2}>
          <Button
            {...primaryBtn}
            size="sm"
            onClick={approve}
            disabled={!picked || busy}
          >
            <FiCheck /> Approve
          </Button>
          <Button {...outlineBtn} size="sm" onClick={dismiss} disabled={busy}>
            <FiX /> Dismiss
          </Button>
        </HStack>
      </VStack>
    </Flex>
  );
}

export default function TrailersPanel() {
  const [inbox, setInbox] = useState<TrailerCandidate[]>([]);
  const [sources, setSources] = useState<TrailerSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, s] = await Promise.all([
        getTrailerInbox(),
        getTrailerSources(),
      ]);
      setInbox(i);
      setSources(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const poll = async () => {
    setPolling(true);
    try {
      await pollTrailers();
      await load();
    } finally {
      setPolling(false);
    }
  };

  const addSource = async () => {
    if (!newId.trim() || !newName.trim()) return;
    await addTrailerSource(newId.trim(), newName.trim());
    setNewId("");
    setNewName("");
    await load();
  };

  if (loading) {
    return (
      <Flex justify="center" py={12}>
        <Spinner color="nexzy.blue" />
      </Flex>
    );
  }

  return (
    <VStack align="stretch" gap={8}>
      {/* ── Inbox ── */}
      <Box>
        <Flex justify="space-between" align="center" mb={3}>
          <Heading size="md" color="nexzy.white">
            Trailer inbox{" "}
            <Badge colorPalette="blue" ml={2}>
              {inbox.length}
            </Badge>
          </Heading>
          <Button {...outlineBtn} size="sm" onClick={poll} disabled={polling}>
            {polling ? <Spinner size="sm" /> : <FiRefreshCw />} Poll now
          </Button>
        </Flex>
        {inbox.length === 0 ? (
          <Text color="whiteAlpha.600" fontSize="sm">
            No trailers waiting. New uploads from your watched channels show up
            here for approval.
          </Text>
        ) : (
          <VStack align="stretch" gap={3}>
            {inbox.map((c) => (
              <TrailerRow key={c.id} c={c} onDone={load} />
            ))}
          </VStack>
        )}
      </Box>

      {/* ── Watched channels ── */}
      <Box>
        <Heading size="md" color="nexzy.white" mb={3}>
          Watched channels
        </Heading>
        <HStack gap={2} mb={3} wrap="wrap">
          <Input
            {...inputStyle}
            placeholder="YouTube channel ID (UC…)"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            maxW="280px"
          />
          <Input
            {...inputStyle}
            placeholder="Label (e.g. PlayStation)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxW="220px"
          />
          <Button {...primaryBtn} size="sm" onClick={addSource}>
            <FiPlus /> Add
          </Button>
        </HStack>
        <VStack align="stretch" gap={2}>
          {sources.map((s) => (
            <Flex
              key={s.id}
              justify="space-between"
              align="center"
              p={2}
              px={3}
              bg="whiteAlpha.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor={s.lastError ? "orange.400" : "whiteAlpha.200"}
            >
              <VStack align="start" gap={0}>
                <HStack gap={2}>
                  <Text color="nexzy.white" fontWeight="600">
                    {s.name}
                  </Text>
                  {!s.enabled && <Badge colorPalette="gray">off</Badge>}
                  {s.lastError && (
                    <Badge colorPalette="orange">
                      <FiAlertTriangle
                        style={{ display: "inline", marginRight: 3 }}
                      />
                      error
                    </Badge>
                  )}
                </HStack>
                <Text fontSize="xs" color="whiteAlpha.500">
                  {s.channelId}
                  {s.lastError ? ` · ${s.lastError}` : ""}
                </Text>
              </VStack>
              <HStack gap={1}>
                <Button
                  {...outlineBtn}
                  size="xs"
                  onClick={async () => {
                    await toggleTrailerSource(s.id, !s.enabled);
                    await load();
                  }}
                >
                  {s.enabled ? <FiEyeOff /> : <FiEye />}
                </Button>
                <Button
                  {...outlineBtn}
                  size="xs"
                  onClick={async () => {
                    await removeTrailerSource(s.id);
                    await load();
                  }}
                >
                  <FiTrash2 />
                </Button>
              </HStack>
            </Flex>
          ))}
        </VStack>
        <Text fontSize="xs" color="whiteAlpha.500" mt={2}>
          Tip: a channel&apos;s ID starts with “UC”. On a channel&apos;s YouTube
          page, view source and search for “channelId”, or use a channel-ID
          finder. Dead/wrong IDs show an error here.
        </Text>
      </Box>
    </VStack>
  );
}
