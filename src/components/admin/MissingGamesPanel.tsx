"use client";

import { useEffect, useState } from "react";
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
import { FiSearch, FiDownloadCloud, FiX, FiLink } from "react-icons/fi";
import {
  getUnresolvedGames,
  searchGamesForLink,
  mapUnresolvedGame,
  importUnresolvedGame,
  skipUnresolvedGame,
  backfillGameLinks,
  type BackfillDetail,
  importAllUnresolved,
  type UnresolvedGameRef,
  type GameLite,
} from "@/lib/admin/client";

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  size: "sm" as const,
};

// Explicit colors — the admin theme is dark, so buttons must set text/bg
// or the label renders invisible (dark-on-dark).
const primaryBtn = {
  bg: "nexzy.blue",
  color: "white",
  _hover: { bg: "nexzy.blue", opacity: 0.9 },
};
const outlineBtn = {
  variant: "outline" as const,
  color: "nexzy.gray.100",
  borderColor: "whiteAlpha.300",
  _hover: { bg: "whiteAlpha.100" },
};

type OpRow = { label: string; sub?: string; tone: string };
type OpResult = { title: string; rows: OpRow[] };
function toneColor(t: string): string {
  return t === "green"
    ? "green.400"
    : t === "blue"
      ? "nexzy.lightBlue"
      : t === "orange"
        ? "orange.300"
        : t === "red"
          ? "red.300"
          : "whiteAlpha.400";
}

function timeAgo(iso: string): string {
  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function MissingGameCard({
  item,
  isOwner,
  onDone,
}: {
  item: UnresolvedGameRef;
  isOwner: boolean;
  onDone: (id: string) => void;
}) {
  const [q, setQ] = useState(item.rawName);
  const [results, setResults] = useState<GameLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function doSearch() {
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

  async function doMap(gameId: string) {
    setBusy("map");
    try {
      await mapUnresolvedGame(item.id, gameId);
      onDone(item.id);
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(null);
    }
  }

  async function doImport() {
    setBusy("import");
    setMsg(null);
    try {
      const r = await importUnresolvedGame(item.id);
      const res = r?.result;
      if (res?.imported || res?.reason === "already_exists") {
        onDone(item.id);
      } else {
        setMsg(
          res?.reason === "no_rawg_match"
            ? "No RAWG match — try mapping to an existing game."
            : res?.reason === "no_api_key"
              ? "RAWG_API_KEY is not set on the API."
              : "Import failed — try again or map manually.",
        );
        setBusy(null);
      }
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(null);
    }
  }

  async function doSkip() {
    setBusy("skip");
    try {
      await skipUnresolvedGame(item.id);
      onDone(item.id);
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <Box
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={4}
      bg="whiteAlpha.50"
    >
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
        <Box>
          <Heading size="sm" color="nexzy.white">
            {item.rawName}
          </Heading>
          <HStack gap={2} mt={1}>
            <Badge colorPalette="orange" variant="subtle">
              {item.sourceType}
            </Badge>
            <Text fontSize="xs" color="whiteAlpha.600">
              {timeAgo(item.createdAt)}
            </Text>
          </HStack>
        </Box>
        <HStack gap={2}>
          {isOwner && (
            <Button
              size="sm"
              {...primaryBtn}
              onClick={doImport}
              loading={busy === "import"}
              loadingText="Importing"
            >
              <FiDownloadCloud /> Import from RAWG
            </Button>
          )}
          <Button
            size="sm"
            {...outlineBtn}
            onClick={doSkip}
            loading={busy === "skip"}
          >
            <FiX /> Skip
          </Button>
        </HStack>
      </Flex>

      {(item.candidateGameIds?.length ?? 0) > 0 && (
        <VStack align="stretch" mt={3} gap={1}>
          <Text fontSize="xs" color="whiteAlpha.600">
            Suggested matches
          </Text>
          {item.candidateGameIds!.map((c) => (
            <Button
              key={c.gameId}
              size="xs"
              {...outlineBtn}
              justifyContent="flex-start"
              onClick={() => doMap(c.gameId)}
              loading={busy === "map"}
            >
              <FiLink /> {c.name}
            </Button>
          ))}
        </VStack>
      )}

      <Box mt={3}>
        <HStack gap={2}>
          <Input
            {...inputProps}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your games DB…"
            onKeyDown={(e) => {
              if (e.key === "Enter") doSearch();
            }}
          />
          <Button
            size="sm"
            {...primaryBtn}
            onClick={doSearch}
            loading={searching}
          >
            <FiSearch /> Search
          </Button>
        </HStack>
        {results.length > 0 && (
          <VStack align="stretch" mt={2} gap={1}>
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
                    boxSize="32px"
                    borderRadius="sm"
                    objectFit="cover"
                  />
                )}
                <Box flex="1">
                  <Text fontSize="sm" color="nexzy.white">
                    {g.name}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.500">
                    {g.released || "—"}
                  </Text>
                </Box>
                <Button
                  size="xs"
                  bg="green.500"
                  color="white"
                  _hover={{ bg: "green.600" }}
                  onClick={() => doMap(g.id)}
                  loading={busy === "map"}
                >
                  Link
                </Button>
              </Flex>
            ))}
          </VStack>
        )}
      </Box>

      {msg && (
        <Text mt={2} fontSize="xs" color="orange.300">
          {msg}
        </Text>
      )}
    </Box>
  );
}

/**
 * "Missing games" queue — games referenced by content (guides/articles/picks)
 * the resolver couldn't match to a DB game. Map to an existing game (learns an
 * alias) or import it from RAWG (owner only).
 */
export default function MissingGamesPanel({ isOwner }: { isOwner: boolean }) {
  const [rows, setRows] = useState<UnresolvedGameRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [result, setResult] = useState<OpResult | null>(null);

  async function doImportAll() {
    setWorking("import");
    setNotice(null);
    setResult(null);
    try {
      const r = await importAllUnresolved(25);
      setResult({
        title: `Imported ${r.imported} of ${r.attempted} (failed ${r.failed})`,
        rows: (r.details ?? []).map((d) => ({
          label: d.rawName,
          sub: d.gameName ? `${d.result} → ${d.gameName}` : d.result,
          tone:
            d.result === "imported"
              ? "green"
              : d.result === "already in DB"
                ? "gray"
                : "red",
        })),
      });
      await load();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setWorking(null);
    }
  }

  async function doBackfill() {
    setWorking("backfill");
    setNotice(null);
    setResult(null);
    try {
      const mapRow = (d: BackfillDetail): OpRow => ({
        label: d.title,
        sub:
          d.result === "error"
            ? `error — ${d.reason ?? "failed"}`
            : d.result === "no-match"
              ? "no DB match — leave it, or link by hand"
              : d.gameName
                ? `${d.result.replace("linked-", "")} → ${d.gameName}${d.matchedOn ? ` (matched "${d.matchedOn}")` : ""}`
                : d.result,
        tone:
          d.result === "error"
            ? "red"
            : d.result === "linked-confirmed"
              ? "green"
              : d.result === "linked-suggested"
                ? "blue"
                : "orange",
      });
      // Small server batches (each returns fast); loop client-side until the
      // queue is empty so a large backfill never trips a request timeout.
      let linked = 0;
      let scanned = 0;
      let errCount = 0;
      let remaining = 0;
      const rows: OpRow[] = [];
      for (let i = 0; i < 100; i++) {
        const r = await backfillGameLinks();
        linked += r.linked;
        scanned += r.scanned;
        errCount += r.errors;
        remaining = r.remaining;
        rows.push(...(r.details ?? []).map(mapRow));
        setResult({
          title: `Backfill: linked ${linked} of ${scanned} scanned${remaining ? ` \u00b7 ${remaining} to go\u2026` : ""}${errCount ? ` \u00b7 ${errCount} error${errCount === 1 ? "" : "s"}` : ""}`,
          rows,
        });
        if (r.scanned === 0 || remaining === 0) break;
      }
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setWorking(null);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(await getUnresolvedGames());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const remove = (id: string) => setRows((r) => r.filter((x) => x.id !== id));

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Heading size="md" color="nexzy.white">
            Missing games
          </Heading>
          <Text fontSize="sm" color="whiteAlpha.600">
            Referenced by content but not in the DB. Map to an existing game or
            import from RAWG.
          </Text>
        </Box>
        <HStack gap={2}>
          {isOwner && (
            <Button
              size="sm"
              {...outlineBtn}
              onClick={doImportAll}
              loading={working === "import"}
              loadingText="Importing"
            >
              Import all
            </Button>
          )}
          {isOwner && (
            <Button
              size="sm"
              {...outlineBtn}
              onClick={doBackfill}
              loading={working === "backfill"}
              loadingText="Backfilling"
            >
              Backfill links
            </Button>
          )}
          <Button size="sm" {...outlineBtn} onClick={load} loading={loading}>
            Refresh
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Text color="red.300" mb={3}>
          {error}
        </Text>
      )}
      {notice && (
        <Text color="nexzy.lightBlue" mb={3} fontSize="sm">
          {notice}
        </Text>
      )}
      {result && (
        <Box
          mb={4}
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          p={3}
          bg="whiteAlpha.50"
        >
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontWeight="600" color="nexzy.white" fontSize="sm">
              {result.title}
            </Text>
            <Button size="xs" {...outlineBtn} onClick={() => setResult(null)}>
              Dismiss
            </Button>
          </Flex>
          {result.rows.length === 0 ? (
            <Text fontSize="sm" color="whiteAlpha.600">
              No posts scanned.
            </Text>
          ) : (
            <VStack align="stretch" gap={1} maxH="320px" overflowY="auto">
              {result.rows.map((row, i) => (
                <Flex key={i} align="center" gap={2}>
                  <Box
                    boxSize="8px"
                    borderRadius="full"
                    bg={toneColor(row.tone)}
                    flexShrink={0}
                  />
                  <Box minW="0">
                    <Text fontSize="sm" color="nexzy.white" lineClamp={1}>
                      {row.label}
                    </Text>
                    {row.sub && (
                      <Text fontSize="xs" color="whiteAlpha.600" lineClamp={1}>
                        {row.sub}
                      </Text>
                    )}
                  </Box>
                </Flex>
              ))}
            </VStack>
          )}
        </Box>
      )}
      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner />
        </Flex>
      ) : rows.length === 0 ? (
        <Text color="whiteAlpha.600" py={6}>
          Nothing unresolved — every referenced game is linked. 🎮
        </Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {rows.map((r) => (
            <MissingGameCard
              key={r.id}
              item={r}
              isOwner={isOwner}
              onDone={remove}
            />
          ))}
        </VStack>
      )}
    </Box>
  );
}
