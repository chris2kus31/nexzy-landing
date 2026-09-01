"use client";

// ============================================
// FILE: components/admin/IndexingRitualPanel.tsx
// The daily "request indexing" ritual card. Shows today's 10-URL batch with
// copy buttons + step-by-step instructions, and a "Mark today done" button
// that logs completion (streak + total tracked server-side). Why: Google has
// crawled almost none of the site; Request Indexing in Search Console is the
// only sanctioned per-URL accelerator (~10/day, manual by design).
// ============================================

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Link,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  getIndexingRitual,
  completeIndexingRitual,
  markIndexUrl,
  getBacklogNewsStatus,
  hideExistingNews,
  type IndexingRitual,
} from "@/lib/admin/client";

function UrlRow({
  url,
  requested,
  onToggle,
}: {
  url: string;
  requested: boolean;
  onToggle: (url: string, requested: boolean) => void;
}) {
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
      bg={requested ? "rgba(72,187,120,0.08)" : "whiteAlpha.50"}
      border="1px solid"
      borderColor={requested ? "rgba(72,187,120,0.35)" : "whiteAlpha.100"}
    >
      <Text
        color={requested ? "whiteAlpha.600" : "nexzy.white"}
        fontSize="sm"
        fontFamily="mono"
        lineClamp={1}
        minW={0}
        textDecoration={requested ? "line-through" : undefined}
      >
        {url}
      </Text>
      <HStack gap={2} flexShrink={0}>
        <Button
          size="xs"
          variant="outline"
          color={copied ? "green.300" : "nexzy.lightBlue"}
          borderColor="whiteAlpha.300"
          onClick={copy}
        >
          {copied ? "Copied ✓" : "Copy"}
        </Button>
        <Button
          size="xs"
          variant={requested ? "solid" : "outline"}
          bg={requested ? "green.600" : undefined}
          color={requested ? "white" : "green.300"}
          borderColor="rgba(72,187,120,0.5)"
          _hover={{ bg: requested ? "green.700" : "rgba(72,187,120,0.12)" }}
          onClick={() => onToggle(url, !requested)}
        >
          {requested ? "Requested ✓" : "Mark requested"}
        </Button>
      </HStack>
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

  // Plain-language reference modal ("How this works").
  const [showHelp, setShowHelp] = useState(false);

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

  const toggleUrl = async (url: string, requested: boolean) => {
    // Optimistic — flip locally, then persist + refresh.
    setData((d) =>
      d
        ? {
            ...d,
            requestedUrls: requested
              ? [...new Set([...d.requestedUrls, url])]
              : d.requestedUrls.filter((u) => u !== url),
          }
        : d,
    );
    try {
      await markIndexUrl(url, requested);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      load();
    }
  };

  if (error)
    return (
      <Text color="red.300" fontSize="sm">
        {error}
      </Text>
    );
  if (!data) return <Spinner color="nexzy.blue" />;

  const requestedSet = new Set(data.requestedUrls);
  const requestedCount = data.urls.filter((u) => requestedSet.has(u)).length;
  const done = data.urls.length > 0 && requestedCount === data.urls.length;

  return (
    <Stack gap={5} maxW="3xl">
      <Box>
        <Flex align="center" gap={3} mb={1} wrap="wrap">
          <Heading size="md" color="nexzy.white">
            Daily indexing ritual{" "}
            {done ? "— done for today ✓" : "— not done yet"}
          </Heading>
          <Button
            size="xs"
            variant="outline"
            color="nexzy.lightBlue"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => setShowHelp(true)}
          >
            ⓘ How this works
          </Button>
        </Flex>
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
            3. Click <b>Request Indexing</b> in Search Console.
          </Text>
          <Text color="nexzy.gray.100" fontSize="sm">
            4. Back here, hit <b>Mark requested ✓</b> on that URL. Do each one
            as you go — no need to finish them all at once. New articles you
            publish today just get added to the list.
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
        <Flex align="center" justify="space-between" gap={3} wrap="wrap">
          <Text
            color="nexzy.blue"
            fontSize="xs"
            fontWeight="800"
            letterSpacing="0.1em"
            textTransform="uppercase"
          >
            Today&apos;s batch — {data.day}
          </Text>
          {data.urls.length > 0 && (
            <Text color="nexzy.gray.100" fontSize="xs">
              {requestedCount}/{data.urls.length} requested
            </Text>
          )}
        </Flex>
        {data.urls.length === 0 ? (
          <Text color="whiteAlpha.500" fontSize="sm">
            Nothing to request right now. New articles you publish will appear
            here.
          </Text>
        ) : (
          data.urls.map((u) => (
            <UrlRow
              key={u}
              url={u}
              requested={requestedSet.has(u)}
              onToggle={toggleUrl}
            />
          ))
        )}
      </Stack>

      {data.urls.length > 0 && (
        <Box>
          <Button
            onClick={markDone}
            loading={saving}
            disabled={done}
            variant="outline"
            color="nexzy.gray.100"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            borderRadius="full"
            px={6}
          >
            {done ? "All requested ✓" : "Mark all requested"}
          </Button>
          <Text color="whiteAlpha.500" fontSize="xs" mt={2}>
            Only use this once you&apos;ve requested every URL above — it just
            checks them all off at once.
          </Text>
        </Box>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </Stack>
  );
}

/** Plain-language reference for the whole Indexing tab. Click "How this works"
 *  to open it anytime. No jargon — this is the "what does all this mean" card. */
function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={2000}
      bg="rgba(0,0,0,0.6)"
      display="flex"
      alignItems="flex-start"
      justifyContent="center"
      p={4}
      overflowY="auto"
      onClick={onClose}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        bg="#141127"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="xl"
        maxW="640px"
        w="full"
        my={8}
        p={6}
        boxShadow="0 20px 60px rgba(0,0,0,0.5)"
      >
        <Flex align="center" justify="space-between" mb={4}>
          <Heading size="md" color="nexzy.white">
            What this tab does
          </Heading>
          <Button
            size="sm"
            variant="outline"
            color="nexzy.gray.100"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={onClose}
          >
            Close ✕
          </Button>
        </Flex>

        <Stack gap={5}>
          <Box>
            <Text color="nexzy.gray.100" fontSize="sm" lineHeight="1.6">
              Google has barely crawled Nexzy. This tab is where you push your
              good pages to Google and keep the junk out — so Google spends its
              limited attention on pages that can actually rank.
            </Text>
          </Box>

          <HelpItem title="🔴 Start fresh with Google (the red box)">
            One button that hides <b>every old news article</b> from Google —
            drops them from the sitemap and tags them &quot;noindex.&quot; Your
            guides &amp; lists stay visible. Use it once to wipe the slate. Once
            all news is hidden it says &quot;All news already hidden&quot; and
            greys out. Nothing is deleted — readers can still open the pages,
            they just won&apos;t show in Google.
          </HelpItem>

          <HelpItem title="📋 Today's batch (the URL list)">
            Up to 10 pages a day that Google is <b>allowed</b> to index (guides,
            lists, and new articles) and hasn&apos;t been asked about yet. This
            list rebuilds itself every time you open the tab, so anything
            you&apos;ve hidden drops off automatically. Hit <b>Copy</b> on each
            one. If the list is short or empty, that&apos;s fine — it just means
            there&apos;s little new to push right now.
          </HelpItem>

          <HelpItem title="🔍 The 4 steps / “Request Indexing”">
            &quot;Request Indexing&quot; in Google Search Console is you telling
            Google <b>&quot;come crawl this page now&quot;</b> — it jumps the
            line and usually gets crawled in a day or two instead of weeks. For
            each URL: open Search Console → paste it in the top bar → Enter →
            click <b>Request Indexing</b>.
          </HelpItem>

          <HelpItem title="✅ Mark requested (per URL) + Streak">
            After you Request-Index a URL in Search Console, hit{" "}
            <b>Mark requested ✓</b> on that row. Do them one at a time — the day
            marks itself done once every URL is checked. Publish another article
            later and it just gets added to the list. The <b>streak</b> and{" "}
            <b>total requested</b> track how consistently you do it.
          </HelpItem>

          <HelpItem title="📊 Scoreboard — is it working?">
            Once it appears, it shows how many of the URLs you&apos;ve requested
            Google has <b>actually indexed</b>. That number going up over the
            weeks is the whole goal.
          </HelpItem>

          <HelpItem title="What shows in Google going forward">
            <b>Visible:</b> new news articles you publish (unless they&apos;re
            deals or patch notes), plus all guides, lists, and reviews.
            <br />
            <b>Hidden:</b> all your old news, plus deals, patch notes, and
            Rewind pages (those hide automatically, always).
          </HelpItem>

          <HelpItem title="How long until old pages disappear from Google">
            Hiding is instant on your side, but Google only drops a page the
            next time it recrawls it — a few days to a few weeks. To force it
            fast, Request-Index that page (same steps as above); Google
            recrawls, sees the &quot;noindex,&quot; and drops it, often within a
            day.
          </HelpItem>
        </Stack>
      </Box>
    </Box>
  );
}

function HelpItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Text color="nexzy.white" fontWeight="700" fontSize="sm" mb={1}>
        {title}
      </Text>
      <Text color="nexzy.gray.100" fontSize="sm" lineHeight="1.6">
        {children}
      </Text>
    </Box>
  );
}
