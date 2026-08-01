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
  Badge,
  Link,
  Spinner,
} from "@chakra-ui/react";
import {
  listVideos,
  refreshVideoInsights,
  scanVideoInsights,
  type AdminVideo,
  type PlatformInsights,
} from "@/lib/admin/client";

const PLATFORM_COLOR: Record<string, string> = {
  facebook: "blue",
  instagram: "pink",
  threads: "gray",
  youtube: "red",
  tiktok: "purple",
  reels: "pink",
};

/** Which platforms we can pull real numbers for, from this video's sources. */
function measurablePlatforms(v: AdminVideo): string[] {
  const out: string[] = [];
  if (v.youtubeUrl && v.source === "nexzy") out.push("youtube");
  const ids = v.platformPostIds ?? {};
  for (const p of ["facebook", "instagram", "threads"]) {
    if (ids[p]) out.push(p);
  }
  return out;
}

/** True if this video has anything we can measure (so it belongs on Performance). */
function isMeasurable(v: AdminVideo): boolean {
  return (
    measurablePlatforms(v).length > 0 || !!(v.insights && v.insights.length)
  );
}

/** One published video: what it can be measured on + its real numbers. */
function PerfRow({ v }: { v: AdminVideo }) {
  const [insights, setInsights] = useState<PlatformInsights[]>(
    v.insights ?? [],
  );
  const [fetchedAt, setFetchedAt] = useState<string | null>(
    v.insightsFetchedAt ?? null,
  );
  const [busy, setBusy] = useState(false);
  const platforms = measurablePlatforms(v);

  const refresh = async () => {
    setBusy(true);
    try {
      const updated = await refreshVideoInsights(v.id);
      setInsights(updated.insights ?? []);
      setFetchedAt(updated.insightsFetchedAt ?? new Date().toISOString());
    } catch {
      /* leave as-is */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <Flex justify="space-between" align="flex-start" gap={3} mb={2}>
        <HStack gap={2} wrap="wrap" flex={1} minW={0}>
          {platforms.map((p) => (
            <Badge
              key={p}
              colorPalette={PLATFORM_COLOR[p] || "gray"}
              variant="solid"
            >
              {p}
            </Badge>
          ))}
          <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
            {v.title}
          </Text>
        </HStack>
        <Button
          size="xs"
          variant="outline"
          color="nexzy.gray.100"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={refresh}
          loading={busy}
          loadingText="…"
        >
          ↻ Refresh
        </Button>
      </Flex>

      {insights.length === 0 ? (
        <Text fontSize="xs" color="whiteAlpha.500">
          No numbers yet — hit Refresh (they mature over a day or two).
        </Text>
      ) : (
        <VStack align="stretch" gap={0.5}>
          {insights.map((it, i) => (
            <Text key={i} fontSize="xs" color="nexzy.gray.100">
              <Text as="span" color="nexzy.white" fontWeight="600">
                {it.platform}:
              </Text>{" "}
              {it.error
                ? `— (${it.error})`
                : Object.entries(it.metrics)
                    .map(([k, val]) => `${k} ${val.toLocaleString()}`)
                    .join(" · ") || "—"}
            </Text>
          ))}
        </VStack>
      )}

      <Flex justify="space-between" align="center" mt={2}>
        {v.youtubeUrl ? (
          <Link
            href={v.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            color="nexzy.lightBlue"
            fontSize="xs"
          >
            Watch ↗
          </Link>
        ) : (
          <Box />
        )}
        {fetchedAt && (
          <Text fontSize="10px" color="whiteAlpha.400">
            updated {new Date(fetchedAt).toLocaleString()}
          </Text>
        )}
      </Flex>
    </Box>
  );
}

/**
 * Performance — reads the Video Library. Every video you've produced shows here
 * with its real numbers: YouTube analytics for videos on our channel, plus
 * Facebook / Instagram / Threads for the posts carried over when you published
 * the card. Auto-refreshes daily; Scan now pulls the latest on demand, and each
 * row has its own Refresh.
 */
export default function InsightsPanel() {
  const [videos, setVideos] = useState<AdminVideo[] | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState("");

  const load = useCallback(async () => {
    try {
      const all = await listVideos(200);
      setVideos(all.filter(isMeasurable));
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Failed to load performance.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scanAll = async () => {
    setScanning(true);
    setScanNote("");
    try {
      const { scanned } = await scanVideoInsights();
      await load();
      setScanNote(
        scanned > 0
          ? `Scanned ${scanned} video${scanned === 1 ? "" : "s"}.`
          : "No videos to scan yet.",
      );
    } catch {
      setScanNote("Scan failed — try again.");
    } finally {
      setScanning(false);
    }
  };

  if (error) {
    return (
      <Text color="red.300" fontSize="sm">
        {error}
      </Text>
    );
  }
  if (!videos) {
    return (
      <Flex justify="center" py={12}>
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }

  return (
    <VStack align="stretch" gap={4}>
      <Box>
        <Flex justify="space-between" align="flex-start" gap={3} mb={1}>
          <Heading size="md" color="nexzy.white">
            Performance
          </Heading>
          <HStack gap={2} flexShrink={0}>
            {scanNote && (
              <Text fontSize="xs" color="whiteAlpha.600">
                {scanNote}
              </Text>
            )}
            <Button
              size="sm"
              colorPalette="green"
              onClick={scanAll}
              loading={scanning}
              loadingText="Scanning…"
            >
              ↻ Scan now
            </Button>
          </HStack>
        </Flex>
        <Text color="nexzy.gray.100" fontSize="sm">
          Your Video Library with real numbers — YouTube analytics for videos on
          our channel, plus Facebook / Instagram / Threads for posts carried over
          at publish. Auto-refreshes daily; <b>Scan now</b> pulls the latest for
          every video, or use a row&rsquo;s own Refresh.
        </Text>
      </Box>
      {videos.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          Nothing to measure yet. Produce a video (with a YouTube URL, or after
          publishing the card to Facebook/Instagram/Threads) and it&rsquo;ll show
          up here with its real numbers.
        </Text>
      ) : (
        videos.map((v) => <PerfRow key={v.id} v={v} />)
      )}
    </VStack>
  );
}
