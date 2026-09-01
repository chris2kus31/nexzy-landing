"use client";

// ============================================
// FILE: components/admin/IndexingRitualPanel.tsx
// The daily "request indexing" ritual card. Shows today's 10-URL batch with
// copy buttons + step-by-step instructions, and a "Mark today done" button
// that logs completion (streak + total tracked server-side). Why: Google has
// crawled almost none of the site; Request Indexing in Search Console is the
// only sanctioned per-URL accelerator (~10/day, manual by design).
// ============================================

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  getIndexingRitual,
  completeIndexingRitual,
  getBacklogNewsStatus,
  hideExistingNews,
  type IndexingRitual,
} from "@/lib/admin/client";

function UrlRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [url]);
  return (
    <Flex
      align="center"
      justify="space-between"
      gap={3}
      px={3}
      py={2}
      borderRadius="md"
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.100"
    >
      <Text
        color="nexzy.white"
        fontSize="sm"
        fontFamily="mono"
        lineClamp={1}
        minW={0}
      >
        {url}
      </Text>
      <Button
        size="xs"
        variant="outline"
        color={copied ? "green.300" : "nexzy.lightBlue"}
        borderColor="whiteAlpha.300"
        onClick={copy}
        flexShrink={0}
      >
        {copied ? "Copied ✓" : "Copy"}
      </Button>
    </Flex>
  );
}

export default function IndexingRitualPanel() {
  const [data, setData] = useState<IndexingRitual | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Clean-slate ("hide all existing news from Google") — owner-only. Loads its
  // own count; stays hidden for non-owners (the endpoint 403s → status null).
  const [newsStatus, setNewsStatus] = useState<{
    visible: number;
    hidden: number;
    total: number;
  } | null>(null);
  const [confirmHide, setConfirmHide] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [hideMsg, setHideMsg] = useState("");

  const load = useCallback(() => {
    getIndexingRitual()
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      );
    getBacklogNewsStatus()
      .then(setNewsStatus)
      .catch(() => setNewsStatus(null)); // non-owner or error → hide the card
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runHide = async () => {
    setHiding(true);
    setHideMsg("");
    try {
      const { hidden } = await hideExistingNews();
      setHideMsg(
        `Hid ${hidden} news article${hidden === 1 ? "" : "s"} from Google. They'll drop out of the sitemap within ~5 min and deindex on Google's next crawl.`,
      );
      setConfirmHide(false);
      // Refresh both the count AND today's batch — the server just recomputed
      // the batch to drop the pages we hid, so reload it here too.
      load();
    } catch (e) {
      setHideMsg(e instanceof Error ? e.message : "Failed to hide");
    } finally {
      setHiding(false);
    }
  };

  const markDone = async () => {
    setSaving(true);
    try {
      await completeIndexingRitual();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (error)
    return (
      <Text color="red.300" fontSize="sm">
        {error}
      </Text>
    );
  if (!data) return <Spinner color="nexzy.blue" />;

  const done = !!data.completedAt;

  return (
    <Stack gap={5} maxW="3xl">
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Daily indexing ritual {done ? "— done for today ✓" : "— not done yet"}
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          Google has crawled almost none of the site. Requesting indexing in
          Search Console is the only sanctioned way to push specific pages into
          its crawl queue (~10/day). Streak:{" "}
          <Text as="span" color="nexzy.gold" fontWeight="700">
            {data.streakDays} day{data.streakDays === 1 ? "" : "s"}
          </Text>{" "}
          · Total URLs requested:{" "}
          <Text as="span" color="nexzy.gold" fontWeight="700">
            {data.totalRequestedEver}
          </Text>
        </Text>
      </Box>

      {/* Clean slate — hide all existing news from Google (owner-only). */}
      {newsStatus && (
        <Box
          bg="rgba(255,90,90,0.06)"
          border="1px solid"
          borderColor="rgba(255,90,90,0.35)"
          borderRadius="lg"
          p={4}
        >
          <Text
            color="#FF8A8A"
            fontSize="xs"
            fontWeight="800"
            letterSpacing="0.1em"
            textTransform="uppercase"
            mb={2}
          >
            Start fresh with Google
          </Text>
          <Text color="nexzy.gray.100" fontSize="sm" mb={3}>
            Hides <b>every existing news article</b> from Google in one click —
            drops them from the sitemap and adds a noindex tag so Google
            deindexes them. Your guides &amp; lists stay visible, and anything
            you publish from today on shows up normally. Right now{" "}
            <Text as="span" color="nexzy.white" fontWeight="700">
              {newsStatus.visible}
            </Text>{" "}
            news article{newsStatus.visible === 1 ? " is" : "s are"} visible
            {newsStatus.hidden > 0
              ? ` (${newsStatus.hidden} already hidden)`
              : ""}
            .
          </Text>
          {hideMsg && (
            <Text color="nexzy.lightBlue" fontSize="sm" mb={3}>
              {hideMsg}
            </Text>
          )}
          {!confirmHide ? (
            <Button
              size="sm"
              variant="outline"
              color="#FF8A8A"
              borderColor="rgba(255,90,90,0.5)"
              _hover={{ bg: "rgba(255,90,90,0.1)" }}
              onClick={() => {
                setHideMsg("");
                setConfirmHide(true);
              }}
              disabled={newsStatus.visible === 0}
            >
              {newsStatus.visible === 0
                ? "All news already hidden ✓"
                : `Hide all ${newsStatus.visible} news articles from Google`}
            </Button>
          ) : (
            <Flex gap={2} align="center" wrap="wrap">
              <Text color="nexzy.white" fontSize="sm" fontWeight="700">
                Hide {newsStatus.visible} articles — sure?
              </Text>
              <Button
                size="sm"
                bg="#E24"
                color="white"
                _hover={{ bg: "#F35" }}
                onClick={runHide}
                loading={hiding}
              >
                Yes, hide them
              </Button>
              <Button
                size="sm"
                variant="outline"
                color="nexzy.gray.100"
                borderColor="whiteAlpha.300"
                onClick={() => setConfirmHide(false)}
                disabled={hiding}
              >
                Cancel
              </Button>
            </Flex>
          )}
        </Box>
      )}

      <Box
        bg="nexzy.blue/10"
        border="1px solid"
        borderColor="nexzy.blue/30"
        borderRadius="lg"
        p={4}
      >
        <Text color="nexzy.white" fontSize="sm" fontWeight="700" mb={2}>
          How (desktop or mobile browser, ~5 min):
        </Text>
        <Stack gap={1}>
          <Text color="nexzy.gray.100" fontSize="sm">
            1. Open{" "}
            <Link
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              color="nexzy.lightBlue"
              fontWeight="700"
            >
              Google Search Console ↗
            </Link>{" "}
            (property: www.nexzyapp.com).
          </Text>
          <Text color="nexzy.gray.100" fontSize="sm">
            2. Paste a URL below into the top &quot;Inspect any URL&quot; bar →
            Enter.
          </Text>
          <Text color="nexzy.gray.100" fontSize="sm">
            3. Click <b>Request Indexing</b>. Repeat for all {data.urls.length}.
          </Text>
          <Text color="nexzy.gray.100" fontSize="sm">
            4. Come back and hit <b>Mark today done</b>.
          </Text>
        </Stack>
      </Box>

      {/* Scoreboard — of everything we've requested, how many did Google
          actually index? Appears after the first daily growth collection. */}
      {data.scoreboard && (
        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          p={4}
        >
          <Text
            color="nexzy.blue"
            fontSize="xs"
            fontWeight="800"
            letterSpacing="0.1em"
            textTransform="uppercase"
            mb={2}
          >
            Scoreboard — is it working?
          </Text>
          <Flex align="baseline" gap={3} wrap="wrap">
            <Text color="nexzy.gold" fontSize="3xl" fontWeight="800">
              {data.scoreboard.indexed}
            </Text>
            <Text color="nexzy.white" fontSize="md" fontWeight="600">
              of {data.scoreboard.tracked} requested URLs indexed by Google
            </Text>
          </Flex>
          {data.scoreboard.trend.length > 1 && (
            <Text color="nexzy.gray.100" fontSize="sm" mt={1}>
              Trend:{" "}
              {data.scoreboard.trend
                .map((t) => `${t.day.slice(5)}: ${t.indexed}`)
                .join(" → ")}
            </Text>
          )}
          {data.scoreboard.lastChecked && (
            <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
              Last checked:{" "}
              {new Date(data.scoreboard.lastChecked).toLocaleString()}
            </Text>
          )}
        </Box>
      )}

      <Stack gap={2}>
        <Text
          color="nexzy.blue"
          fontSize="xs"
          fontWeight="800"
          letterSpacing="0.1em"
          textTransform="uppercase"
        >
          Today&apos;s batch — {data.day}
        </Text>
        {data.urls.map((u) => (
          <UrlRow key={u} url={u} />
        ))}
      </Stack>

      <Box>
        <Button
          onClick={markDone}
          loading={saving}
          disabled={done}
          bg={done ? "whiteAlpha.200" : "nexzy.gold"}
          color={done ? "nexzy.gray.100" : "nexzy.navy"}
          fontWeight="800"
          borderRadius="full"
          px={6}
        >
          {done ? `Done ✓ (${data.completedBy ?? ""})` : "Mark today done"}
        </Button>
      </Box>
    </Stack>
  );
}
