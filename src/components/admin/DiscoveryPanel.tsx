"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Spinner,
  Image,
  Badge,
  SimpleGrid,
} from "@chakra-ui/react";
import { FiDownloadCloud, FiX, FiRefreshCw, FiCalendar } from "react-icons/fi";
import {
  getDiscoveryCandidates,
  scanDiscovery,
  importDiscoveryCandidate,
  dismissDiscoveryCandidate,
  type DiscoveryCandidate,
} from "@/lib/admin/client";

// Dark admin theme — buttons must set explicit text/bg or labels render invisible.
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

const PAGE = 24;

// Major platforms for the quick filter (our slugs).
const PLATFORM_FILTERS: { label: string; slug: string }[] = [
  { label: "PS5", slug: "playstation5" },
  { label: "Xbox Series", slug: "xbox-series-x" },
  { label: "Switch", slug: "nintendo-switch" },
  { label: "PC", slug: "pc" },
];

function fmtDate(d: string | null): string {
  if (!d) return "TBD";
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function DiscoveryPanel({ isOwner }: { isOwner: boolean }) {
  const [items, setItems] = useState<DiscoveryCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDiscoveryCandidates(PAGE, offset, platform);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load candidates.");
    } finally {
      setLoading(false);
    }
  }, [offset, platform]);

  useEffect(() => {
    void load();
  }, [load]);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      await scanDiscovery(200);
      setOffset(0);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  };

  const act = async (id: string, fn: (id: string) => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn(id);
      // Drop it from the list immediately (it's no longer pending).
      setItems((prev) => prev.filter((c) => c.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const page = Math.floor(offset / PAGE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={2}>
        <Box>
          <Heading size="md" color="nexzy.white">
            Discovery Desk
          </Heading>
          <Text fontSize="sm" color="nexzy.gray.100">
            Upcoming games we don&apos;t have yet — {total} awaiting review.
          </Text>
        </Box>
        {isOwner && (
          <Button
            size="sm"
            {...primaryBtn}
            onClick={runScan}
            loading={scanning}
            loadingText="Scanning"
          >
            <FiRefreshCw /> Scan IGDB now
          </Button>
        )}
      </Flex>

      {/* Platform filter */}
      <HStack gap={2} mb={4} wrap="wrap">
        <Button
          size="xs"
          {...(platform === undefined ? primaryBtn : outlineBtn)}
          onClick={() => {
            setPlatform(undefined);
            setOffset(0);
          }}
        >
          All
        </Button>
        {PLATFORM_FILTERS.map((p) => (
          <Button
            key={p.slug}
            size="xs"
            {...(platform === p.slug ? primaryBtn : outlineBtn)}
            onClick={() => {
              setPlatform(p.slug);
              setOffset(0);
            }}
          >
            {p.label}
          </Button>
        ))}
      </HStack>

      {error && (
        <Text color="red.300" fontSize="sm" mb={3}>
          {error}
        </Text>
      )}

      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner color="nexzy.blue" />
        </Flex>
      ) : items.length === 0 ? (
        <Text color="nexzy.gray.100" py={10} textAlign="center">
          No candidates. {isOwner ? "Run a scan to find upcoming games." : ""}
        </Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          {items.map((c) => (
            <Box
              key={c.id}
              bg="whiteAlpha.50"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              overflow="hidden"
            >
              {c.coverUrl && (
                <Image
                  src={c.coverUrl}
                  alt={c.name}
                  w="100%"
                  h="140px"
                  objectFit="cover"
                />
              )}
              <VStack align="stretch" p={3} gap={2}>
                <Text fontWeight="700" color="nexzy.white" lineClamp={1}>
                  {c.name}
                </Text>
                <HStack gap={2} color="nexzy.gray.100" fontSize="xs">
                  <FiCalendar />
                  <Text>{fmtDate(c.released)}</Text>
                </HStack>
                {c.platformSlugs.length > 0 && (
                  <HStack gap={1} wrap="wrap">
                    {c.platformSlugs.slice(0, 4).map((s) => (
                      <Badge
                        key={s}
                        bg="whiteAlpha.200"
                        color="nexzy.lightBlue"
                        fontSize="0.6rem"
                      >
                        {s}
                      </Badge>
                    ))}
                  </HStack>
                )}
                {c.summary && (
                  <Text fontSize="xs" color="nexzy.gray.100" lineClamp={3}>
                    {c.summary}
                  </Text>
                )}
                <HStack gap={2} pt={1}>
                  {isOwner && (
                    <Button
                      size="xs"
                      {...primaryBtn}
                      flex={1}
                      loading={busyId === c.id}
                      onClick={() => act(c.id, importDiscoveryCandidate)}
                    >
                      <FiDownloadCloud /> Import
                    </Button>
                  )}
                  <Button
                    size="xs"
                    {...outlineBtn}
                    flex={isOwner ? undefined : 1}
                    disabled={busyId === c.id}
                    onClick={() => act(c.id, dismissDiscoveryCandidate)}
                  >
                    <FiX /> Dismiss
                  </Button>
                </HStack>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {/* Pager */}
      {pages > 1 && (
        <Flex justify="center" align="center" gap={3} mt={5}>
          <Button
            size="xs"
            {...outlineBtn}
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}
          >
            Prev
          </Button>
          <Text fontSize="sm" color="nexzy.gray.100">
            {page} / {pages}
          </Text>
          <Button
            size="xs"
            {...outlineBtn}
            disabled={page >= pages}
            onClick={() => setOffset(offset + PAGE)}
          >
            Next
          </Button>
        </Flex>
      )}
    </Box>
  );
}
