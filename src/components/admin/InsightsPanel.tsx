"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  type AdminVideo,
  type PlatformInsights,
} from "@/lib/admin/client";
import {
  errorMessage,
  getVideoInsightsScanStatus,
  startVideoInsightsScan,
} from "@/lib/admin/client-content";
import { FiExternalLink, FiRefreshCw } from "react-icons/fi";

// "Scan now" runs in the background on the server (K8); poll its status.
const SCAN_POLL_MS = 4000;
const SCAN_POLL_CAP_MS = 10 * 60_000;

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

/** True if this video has anything we can measure (so it belongs on Performance).
 *  External videos (trailers, other channels) are never ours to measure — any
 *  stored insights on them are old scan errors, so they never show here. */
function isMeasurable(v: AdminVideo): boolean {
  if (v.source && v.source !== "nexzy") return false;
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
  const [err, setErr] = useState<string | null>(null);
  const platforms = measurablePlatforms(v);

  const refresh = async () => {
    setBusy(true);
    setErr(null);
    try {
      const updated = await refreshVideoInsights(v.id);
      setInsights(updated.insights ?? []);
      setFetchedAt(updated.insightsFetchedAt ?? new Date().toISOString());
    } catch (e) {
      setErr(errorMessage(e, "Refresh failed."));
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
          <FiRefreshCw aria-hidden /> Refresh
        </Button>
      </Flex>
      {err && (
        <Text fontSize="xs" color="red.300" mb={1}>
          {err}
        </Text>
      )}

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
            Watch <FiExternalLink aria-hidden />
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

  // Unmount guard for the status poll (the tab can be closed mid-scan).
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const scanAll = async () => {
    setScanning(true);
    setScanNote("");
    try {
      const start = await startVideoInsightsScan();
      // Older API: the scan ran inside the request and returned {scanned}.
      if (typeof start.scanned === "number" && !start.running) {
        await load();
        setScanNote(
          start.scanned > 0
            ? `Scanned ${start.scanned} video${start.scanned === 1 ? "" : "s"}.`
            : "No videos to scan yet.",
        );
        return;
      }
      if (!start.started && start.running) {
        setScanNote("A scan is already running — waiting for it to finish.");
      }
      const deadline = Date.now() + SCAN_POLL_CAP_MS;
      let st = await getVideoInsightsScanStatus();
      while (alive.current && st?.running && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, SCAN_POLL_MS));
        if (!alive.current) return;
        st = await getVideoInsightsScanStatus();
      }
      if (!alive.current) return;
      await load();
      if (st?.running) {
        setScanNote("Still scanning on the server — check back in a bit.");
      } else if (st) {
        setScanNote(
          st.scanned > 0
            ? `Scanned ${st.scanned} video${st.scanned === 1 ? "" : "s"}${st.errors ? ` (${st.errors} with errors)` : ""}.`
            : "No videos to scan yet.",
        );
      } else {
        setScanNote("Scan finished.");
      }
    } catch (e) {
      if (alive.current)
        setScanNote(`Scan failed: ${errorMessage(e)} — try again.`);
    } finally {
      if (alive.current) setScanning(false);
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
              <FiRefreshCw aria-hidden /> Scan now
            </Button>
          </HStack>
        </Flex>
        <Text color="nexzy.gray.100" fontSize="sm">
          Your Video Library with real numbers — YouTube analytics for videos on
          our channel, plus Facebook / Instagram / Threads for posts carried
          over at publish. Auto-refreshes daily; <b>Scan now</b> pulls the
          latest for every video, or use a row&rsquo;s own Refresh.
        </Text>
      </Box>
      {videos.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          Nothing to measure yet. Produce a video (with a YouTube URL, or after
          publishing the card to Facebook/Instagram/Threads) and it&rsquo;ll
          show up here with its real numbers.
        </Text>
      ) : (
        // Keyed on the fetch time too, so a reload after a scan re-seeds the
        // row's numbers instead of keeping the first render's state (M19).
        videos.map((v) => (
          <PerfRow key={`${v.id}:${v.insightsFetchedAt ?? ""}`} v={v} />
        ))
      )}
    </VStack>
  );
}
