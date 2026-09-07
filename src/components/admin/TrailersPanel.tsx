"use client";

// Trailer monitor admin. Two views (kept separate so the daily review queue is
// never crowded by a long channel list):
//   • Inbox    — caught YouTube uploads waiting for approval. Approve links the
//                trailer to a game (from the catalog, or imported from IGDB when
//                the game isn't in our DB yet) → it becomes a video that feeds.
//   • Channels — the watched-channel registry (add by URL/ID, enable, remove).
// Nothing auto-publishes — every trailer that reaches the feed is approved here.
import { useCallback, useEffect, useMemo, useState } from "react";
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
  FiExternalLink,
  FiDownloadCloud,
} from "react-icons/fi";
import {
  getTrailerInbox,
  approveTrailer,
  approveTrailerViaIgdb,
  dismissTrailer,
  pollTrailers,
  getTrailerSources,
  addTrailerSource,
  removeTrailerSource,
  toggleTrailerSource,
  searchGamesForLink,
  searchTrailerIgdb,
  type TrailerCandidate,
  type TrailerSource,
  type GameLite,
  type TrailerIgdbResult,
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

// A resolved selection: either a catalog game (has id) or an IGDB game to import.
type Picked =
  | { kind: "catalog"; id: string; name: string }
  | { kind: "igdb"; igdbId: number; name: string; year: number | null };

// Strip common trailer-title noise so the default game search is useful.
function cleanTitle(title: string): string {
  return title
    .replace(
      /\b(official|reveal|announcement|launch|gameplay|cinematic|teaser|trailer|4k|hd|\| .*)\b/gi,
      "",
    )
    .replace(/[-–|:].*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function InboxRow({ c, onDone }: { c: TrailerCandidate; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(
    c.resolvedGameId
      ? {
          kind: "catalog",
          id: c.resolvedGameId,
          name: c.resolvedGameName ?? "Suggested game",
        }
      : null,
  );
  const [mode, setMode] = useState<"catalog" | "igdb">("catalog");
  const [q, setQ] = useState(cleanTitle(c.title));
  const [catalog, setCatalog] = useState<GameLite[]>([]);
  const [igdb, setIgdb] = useState<TrailerIgdbResult[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      if (mode === "catalog") setCatalog(await searchGamesForLink(q.trim()));
      else setIgdb(await searchTrailerIgdb(q.trim()));
    } finally {
      setSearching(false);
    }
  };

  const approve = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      if (picked.kind === "catalog") await approveTrailer(c.id, picked.id);
      else await approveTrailerViaIgdb(c.id, picked.igdbId);
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
      borderRadius="lg"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      direction={{ base: "column", md: "row" }}
    >
      <Box position="relative" flexShrink={0}>
        <Image
          src={c.thumbnailUrl ?? undefined}
          alt=""
          w={{ base: "100%", md: "168px" }}
          h={{ base: "auto", md: "94px" }}
          objectFit="cover"
          borderRadius="md"
          bg="whiteAlpha.100"
        />
        <a
          href={`https://www.youtube.com/watch?v=${c.youtubeId}`}
          target="_blank"
          rel="noreferrer"
          title="Watch on YouTube"
          style={{
            position: "absolute",
            right: 6,
            bottom: 6,
            background: "rgba(0,0,0,0.65)",
            borderRadius: 6,
            padding: "3px 6px",
            color: "#fff",
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <FiExternalLink /> Watch
        </a>
      </Box>

      <VStack align="stretch" flex="1" gap={2} minW={0}>
        <Text color="nexzy.white" fontWeight="600" lineClamp={2}>
          {c.title}
        </Text>
        <HStack gap={2} fontSize="xs" color="whiteAlpha.700">
          <Badge colorPalette="purple">{c.channelName ?? "channel"}</Badge>
          {c.videoPublishedAt && (
            <Text>{new Date(c.videoPublishedAt).toLocaleDateString()}</Text>
          )}
        </HStack>

        {/* Game selection */}
        {picked ? (
          <HStack gap={2}>
            <Text fontSize="sm" color="whiteAlpha.700">
              Game:
            </Text>
            <Badge colorPalette={picked.kind === "igdb" ? "yellow" : "blue"}>
              {picked.name}
              {picked.kind === "igdb" ? " (import from IGDB)" : ""}
            </Badge>
            <Button
              size="xs"
              variant="ghost"
              color="whiteAlpha.700"
              onClick={() => setPicked(null)}
            >
              <FiX /> change
            </Button>
          </HStack>
        ) : (
          <VStack align="stretch" gap={2}>
            {/* Catalog vs IGDB toggle */}
            <HStack gap={1}>
              {(["catalog", "igdb"] as const).map((m) => (
                <Button
                  key={m}
                  size="xs"
                  onClick={() => setMode(m)}
                  {...(mode === m ? primaryBtn : outlineBtn)}
                >
                  {m === "catalog" ? "From catalog" : "Import from IGDB"}
                </Button>
              ))}
            </HStack>
            <HStack gap={2}>
              <Input
                {...inputStyle}
                placeholder={
                  mode === "catalog"
                    ? "Search your games…"
                    : "Search IGDB by game name…"
                }
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
              <Button {...outlineBtn} size="sm" onClick={search}>
                {searching ? <Spinner size="sm" /> : <FiSearch />}
              </Button>
            </HStack>
            {mode === "catalog" && catalog.length > 0 && (
              <VStack align="stretch" gap={1} maxH="180px" overflowY="auto">
                {catalog.map((g) => (
                  <HStack
                    key={g.id}
                    p={1}
                    px={2}
                    borderRadius="md"
                    _hover={{ bg: "whiteAlpha.100" }}
                    cursor="pointer"
                    onClick={() =>
                      setPicked({ kind: "catalog", id: g.id, name: g.name })
                    }
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
            {mode === "igdb" && igdb.length > 0 && (
              <VStack align="stretch" gap={1} maxH="180px" overflowY="auto">
                {igdb.map((g) => (
                  <HStack
                    key={g.igdbId}
                    p={1}
                    px={2}
                    borderRadius="md"
                    _hover={{ bg: "whiteAlpha.100" }}
                    cursor="pointer"
                    onClick={() =>
                      setPicked({
                        kind: "igdb",
                        igdbId: g.igdbId,
                        name: g.name,
                        year: g.year,
                      })
                    }
                  >
                    <FiDownloadCloud color="#FFE14D" />
                    <Text fontSize="sm" color="nexzy.white">
                      {g.name}
                    </Text>
                    {g.year && (
                      <Text fontSize="xs" color="whiteAlpha.500">
                        {g.year}
                      </Text>
                    )}
                  </HStack>
                ))}
              </VStack>
            )}
          </VStack>
        )}

        <HStack gap={2}>
          <Button
            {...primaryBtn}
            size="sm"
            onClick={approve}
            disabled={!picked || busy}
          >
            {busy ? <Spinner size="sm" /> : <FiCheck />} Approve
          </Button>
          <Button {...outlineBtn} size="sm" onClick={dismiss} disabled={busy}>
            <FiX /> Dismiss
          </Button>
        </HStack>
      </VStack>
    </Flex>
  );
}

function ChannelsView({
  sources,
  reload,
}: {
  sources: TrailerSource[];
  reload: () => void;
}) {
  const [newInput, setNewInput] = useState("");
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!newInput.trim() || !newName.trim()) return;
    setAdding(true);
    setErr(null);
    try {
      await addTrailerSource(newInput.trim(), newName.trim());
      setNewInput("");
      setNewName("");
      reload();
    } catch (e) {
      setErr(
        (e as Error)?.message ||
          "Couldn't add — use a channel ID (UC…) or a youtube.com/channel/UC… URL.",
      );
    } finally {
      setAdding(false);
    }
  };

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f
      ? sources.filter(
          (s) =>
            s.name.toLowerCase().includes(f) ||
            s.channelId.toLowerCase().includes(f),
        )
      : sources;
  }, [sources, filter]);

  return (
    <VStack align="stretch" gap={4}>
      {/* Add row */}
      <Box
        p={3}
        bg="whiteAlpha.50"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
      >
        <Text fontSize="sm" color="whiteAlpha.800" mb={2} fontWeight="600">
          Add a channel
        </Text>
        <HStack gap={2} wrap="wrap">
          <Input
            {...inputStyle}
            placeholder="Channel ID (UC…) or youtube.com/channel/UC… URL"
            value={newInput}
            onChange={(e) => setNewInput(e.target.value)}
            flex="1"
            minW="260px"
          />
          <Input
            {...inputStyle}
            placeholder="Label (e.g. PlayStation)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxW="200px"
          />
          <Button {...primaryBtn} size="sm" onClick={add} disabled={adding}>
            {adding ? <Spinner size="sm" /> : <FiPlus />} Add
          </Button>
        </HStack>
        {err && (
          <Text fontSize="xs" color="orange.300" mt={2}>
            {err}
          </Text>
        )}
        <Text fontSize="xs" color="whiteAlpha.500" mt={2}>
          Tip: open a channel, Share → Copy channel ID, or use its
          youtube.com/channel/UC… URL. @handle links aren&apos;t supported by
          YouTube&apos;s feed.
        </Text>
      </Box>

      {/* Filter + count */}
      <HStack justify="space-between">
        <Input
          {...inputStyle}
          placeholder="Filter channels…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          maxW="280px"
        />
        <Text fontSize="sm" color="whiteAlpha.600">
          {shown.length} of {sources.length}
        </Text>
      </HStack>

      {/* Dense table */}
      <VStack align="stretch" gap={0}>
        {shown.map((s, i) => (
          <Flex
            key={s.id}
            align="center"
            gap={3}
            px={3}
            py={2}
            bg={i % 2 ? "whiteAlpha.50" : "transparent"}
            borderRadius="md"
            borderLeftWidth="3px"
            borderLeftColor={
              s.lastError
                ? "orange.400"
                : s.enabled
                  ? "green.400"
                  : "whiteAlpha.300"
            }
          >
            <VStack align="start" gap={0} flex="1" minW={0}>
              <HStack gap={2}>
                <Text color="nexzy.white" fontWeight="600" lineClamp={1}>
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
              <Text fontSize="xs" color="whiteAlpha.500" lineClamp={1}>
                {s.channelId}
                {s.lastCheckedAt
                  ? ` · checked ${new Date(s.lastCheckedAt).toLocaleDateString()}`
                  : " · not checked yet"}
                {s.lastError ? ` · ${s.lastError}` : ""}
              </Text>
            </VStack>
            <Button
              {...outlineBtn}
              size="xs"
              title={s.enabled ? "Disable" : "Enable"}
              onClick={async () => {
                await toggleTrailerSource(s.id, !s.enabled);
                reload();
              }}
            >
              {s.enabled ? <FiEyeOff /> : <FiEye />}
            </Button>
            <Button
              {...outlineBtn}
              size="xs"
              title="Remove"
              onClick={async () => {
                await removeTrailerSource(s.id);
                reload();
              }}
            >
              <FiTrash2 />
            </Button>
          </Flex>
        ))}
        {shown.length === 0 && (
          <Text fontSize="sm" color="whiteAlpha.500" py={4} textAlign="center">
            No channels{filter ? " match that filter" : " yet — add one above"}.
          </Text>
        )}
      </VStack>
    </VStack>
  );
}

export default function TrailersPanel() {
  const [view, setView] = useState<"inbox" | "channels">("inbox");
  const [inbox, setInbox] = useState<TrailerCandidate[]>([]);
  const [sources, setSources] = useState<TrailerSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

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

  return (
    <VStack align="stretch" gap={5}>
      {/* View switch + poll */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
        <HStack gap={1}>
          <Button
            size="sm"
            onClick={() => setView("inbox")}
            {...(view === "inbox" ? primaryBtn : outlineBtn)}
          >
            Inbox
            <Badge ml={2} colorPalette="blue">
              {inbox.length}
            </Badge>
          </Button>
          <Button
            size="sm"
            onClick={() => setView("channels")}
            {...(view === "channels" ? primaryBtn : outlineBtn)}
          >
            Channels
            <Badge ml={2} colorPalette="gray">
              {sources.length}
            </Badge>
          </Button>
        </HStack>
        <Button {...outlineBtn} size="sm" onClick={poll} disabled={polling}>
          {polling ? <Spinner size="sm" /> : <FiRefreshCw />} Poll now
        </Button>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}>
          <Spinner color="nexzy.blue" />
        </Flex>
      ) : view === "inbox" ? (
        inbox.length === 0 ? (
          <Text color="whiteAlpha.600" fontSize="sm" py={6} textAlign="center">
            No trailers waiting. New uploads from your watched channels land
            here for approval.
          </Text>
        ) : (
          <VStack align="stretch" gap={3}>
            {inbox.map((c) => (
              <InboxRow key={c.id} c={c} onDone={load} />
            ))}
          </VStack>
        )
      ) : (
        <ChannelsView sources={sources} reload={load} />
      )}
    </VStack>
  );
}
