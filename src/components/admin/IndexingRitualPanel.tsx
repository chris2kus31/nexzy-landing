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

  const load = useCallback(() => {
    getIndexingRitual()
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
