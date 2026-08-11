"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  SimpleGrid,
  Heading,
  Text,
  Button,
  Spinner,
} from "@chakra-ui/react";
import AdminShell from "@/components/admin/AdminShell";
import RunPipelinePanel from "@/components/admin/RunPipelinePanel";
import CommissionPanel from "@/components/admin/CommissionPanel";
import SubscribersPanel from "@/components/admin/SubscribersPanel";
import AnalyticsPanel from "@/components/admin/AnalyticsPanel";
import GrowthPanel from "@/components/admin/GrowthPanel";
import AiVisibilityPanel from "@/components/admin/AiVisibilityPanel";
import MissingGamesPanel from "@/components/admin/MissingGamesPanel";
import DiscoveryPanel from "@/components/admin/DiscoveryPanel";
import GameHubPanel from "@/components/admin/GameHubPanel";
import NotifyPanel from "@/components/admin/NotifyPanel";
import TrendingPanel from "@/components/admin/TrendingPanel";
import MarketingPanel from "@/components/admin/MarketingPanel";
import ContentStudioPanel from "@/components/admin/ContentStudioPanel";
import BackfillAuthorsButton from "@/components/admin/BackfillAuthorsButton";
import LeadsBoard from "@/components/admin/LeadsBoard";
import PostBrowser from "@/components/admin/PostBrowser";
import ForumModerationPanel from "@/components/admin/ForumModerationPanel";
import ForumSeedsPanel from "@/components/admin/ForumSeedsPanel";
import CommentsModerationPanel from "@/components/admin/CommentsModerationPanel";
import WritersPanel from "@/components/admin/WritersPanel";
import RewindPanel from "@/components/admin/RewindPanel";
import {
  getQueue,
  getPublished,
  getStats,
  getMe,
  type BlogPost,
  type AdminStats,
} from "@/lib/admin/client";

type Tab =
  | "leads"
  | "queue"
  | "published"
  | "subscribers"
  | "marketing"
  | "content-studio"
  | "forum"
  | "analytics"
  | "growth"
  | "ai-visibility"
  | "games"
  | "discovery"
  | "gamehub"
  | "writers"
  | "tools"
  | "notify"
  | "trending"
  | "rewind";

function StatCard({
  label,
  value,
  alert,
  hint,
}: {
  label: string;
  value: number;
  alert?: boolean;
  hint?: string;
}) {
  const on = alert && value > 0;
  return (
    <Box
      bg={on ? "red.500/10" : "whiteAlpha.50"}
      border="1px solid"
      borderColor={on ? "red.400/50" : "whiteAlpha.200"}
      borderRadius="lg"
      px={4}
      py={3}
    >
      <Text
        color={on ? "red.300" : "nexzy.white"}
        fontSize="2xl"
        fontWeight="700"
        lineHeight="1.1"
      >
        {value}
      </Text>
      <Text color="nexzy.gray.100" fontSize="xs">
        {label}
      </Text>
      {hint && on && (
        <Text color="red.300" fontSize="10px" mt={0.5}>
          {hint}
        </Text>
      )}
    </Box>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      size="sm"
      variant="ghost"
      borderRadius="0"
      borderBottom="2px solid"
      borderColor={active ? "nexzy.blue" : "transparent"}
      color={active ? "nexzy.white" : "nexzy.gray.100"}
      fontWeight={active ? "700" : "500"}
      _hover={{ bg: "whiteAlpha.100" }}
      px={3}
    >
      {label}
      {typeof count === "number" && (
        <Box
          as="span"
          ml={2}
          px={2}
          py="1px"
          borderRadius="full"
          bg={active ? "nexzy.blue" : "whiteAlpha.200"}
          color={active ? "white" : "nexzy.gray.100"}
          fontSize="xs"
        >
          {count}
        </Box>
      )}
    </Button>
  );
}

function AdminContent() {
  const [queue, setQueue] = useState<BlogPost[] | null>(null);
  const [published, setPublished] = useState<BlogPost[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [tab, _setTab] = useState<Tab>("leads");
  const setTab = useCallback((t: Tab) => {
    _setTab(t);
    if (typeof window !== "undefined")
      window.history.replaceState(null, "", `/admin?tab=${t}`);
  }, []);
  useEffect(() => {
    // Old bookmarks (?tab=content|videos|guides) now live inside Content Studio.
    const LEGACY: Record<string, string> = {
      content: "suggestions",
      videos: "library",
      guides: "guides",
    };
    const readTab = () => {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (!t) return;
      const legacySub = LEGACY[t];
      if (legacySub) {
        _setTab("content-studio");
        const p = new URLSearchParams(window.location.search);
        p.set("tab", "content-studio");
        p.set("sub", legacySub);
        window.history.replaceState(null, "", `/admin?${p.toString()}`);
      } else {
        _setTab(t as Tab);
      }
    };
    readTab();
    window.addEventListener("popstate", readTab);
    return () => window.removeEventListener("popstate", readTab);
  }, []);
  const [forumView, setForumView] = useState<
    "seeds" | "moderation" | "comments"
  >("seeds");
  // Owner = the account allowed to trigger token-spending actions (scans,
  // pipeline runs, content generation). A second admin (editor) sees a
  // review-only UI. Enforced server-side too — this just hides the buttons.
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    getMe()
      .then((m) => setIsOwner(!!m.isOwner))
      .catch(() => setIsOwner(false));
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [q, p, s] = await Promise.all([
        getQueue(),
        getPublished(),
        getStats(),
      ]);
      setQueue(q);
      setPublished(p);
      setStats(s);
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Failed to load.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <Text color="red.300" fontSize="sm">
        {error}
      </Text>
    );
  }
  if (!queue || !published || !stats) {
    return (
      <Flex justify="center" py={12}>
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }

  return (
    <>
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} mb={6}>
        <StatCard label="Awaiting review" value={stats.awaitingReview} />
        <StatCard label="In progress" value={stats.inProgress} />
        <StatCard label="Published" value={stats.published} />
        <StatCard
          label="Stuck / failed jobs"
          value={stats.failedJobs}
          alert
          hint="Check Bull Board → Retry"
        />
      </SimpleGrid>

      {/* Tab bar */}
      <Flex
        align="center"
        justify="space-between"
        borderBottom="1px solid"
        borderColor="whiteAlpha.200"
        mb={6}
        gap={2}
        wrap="wrap"
      >
        <HStack gap={1} wrap="wrap">
          <TabButton
            label="Leads"
            active={tab === "leads"}
            onClick={() => setTab("leads")}
          />
          <TabButton
            label="Rewind"
            active={tab === "rewind"}
            onClick={() => setTab("rewind")}
          />
          <TabButton
            label="Review queue"
            count={queue.length}
            active={tab === "queue"}
            onClick={() => setTab("queue")}
          />
          <TabButton
            label="Published"
            count={published.length}
            active={tab === "published"}
            onClick={() => setTab("published")}
          />
          <TabButton
            label="Subscribers"
            active={tab === "subscribers"}
            onClick={() => setTab("subscribers")}
          />
          <TabButton
            label="Marketing"
            active={tab === "marketing"}
            onClick={() => setTab("marketing")}
          />
          <TabButton
            label="Content Studio"
            active={tab === "content-studio"}
            onClick={() => setTab("content-studio")}
          />
          <TabButton
            label="Forum"
            active={tab === "forum"}
            onClick={() => setTab("forum")}
          />
          <TabButton
            label="Analytics"
            active={tab === "analytics"}
            onClick={() => setTab("analytics")}
          />
          <TabButton
            label="Growth"
            active={tab === "growth"}
            onClick={() => setTab("growth")}
          />
          <TabButton
            label="AI Visibility"
            active={tab === "ai-visibility"}
            onClick={() => setTab("ai-visibility")}
          />
          <TabButton
            label="Missing games"
            active={tab === "games"}
            onClick={() => setTab("games")}
          />
          <TabButton
            label="Discovery"
            active={tab === "discovery"}
            onClick={() => setTab("discovery")}
          />
          <TabButton
            label="Game hub"
            active={tab === "gamehub"}
            onClick={() => setTab("gamehub")}
          />
          {isOwner && (
            <TabButton
              label="Writers"
              active={tab === "writers"}
              onClick={() => setTab("writers")}
            />
          )}
          {isOwner && (
            <TabButton
              label="Tools"
              active={tab === "tools"}
              onClick={() => setTab("tools")}
            />
          )}
          {isOwner && (
            <TabButton
              label="Trending"
              active={tab === "trending"}
              onClick={() => setTab("trending")}
            />
          )}
          {isOwner && (
            <TabButton
              label="Notify"
              active={tab === "notify"}
              onClick={() => setTab("notify")}
            />
          )}
        </HStack>
        {(tab === "queue" || tab === "published") && (
          <Button
            size="sm"
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={load}
            loading={refreshing}
            loadingText="Refreshing…"
          >
            Refresh
          </Button>
        )}
      </Flex>

      {tab === "leads" && <LeadsBoard isOwner={isOwner} />}

      {tab === "rewind" && <RewindPanel isOwner={isOwner} />}

      {tab === "queue" && (
        <Box>
          <Heading size="md" color="nexzy.white" mb={3}>
            Awaiting review
          </Heading>
          <PostBrowser
            posts={queue}
            empty="Nothing in the queue right now."
            dateField="createdAt"
            onChanged={load}
          />
        </Box>
      )}

      {tab === "published" && (
        <Box>
          <Heading size="md" color="nexzy.white" mb={3}>
            Published articles
          </Heading>
          <PostBrowser
            posts={published}
            empty="No published articles yet."
            dateField="publishedAt"
          />
        </Box>
      )}

      {tab === "subscribers" && <SubscribersPanel />}

      {tab === "marketing" && <MarketingPanel />}

      {tab === "content-studio" && (
        <ContentStudioPanel isOwner={isOwner} onRefresh={load} />
      )}

      {tab === "forum" && (
        <VStack align="stretch" gap={6}>
          <HStack gap={2}>
            <Button
              size="sm"
              variant={forumView === "seeds" ? "solid" : "outline"}
              bg={forumView === "seeds" ? "nexzy.blue" : "transparent"}
              color={forumView === "seeds" ? "white" : "nexzy.gray.100"}
              borderColor="whiteAlpha.300"
              _hover={{
                bg: forumView === "seeds" ? "nexzy.blue" : "whiteAlpha.100",
              }}
              onClick={() => setForumView("seeds")}
            >
              Seeds to approve
            </Button>
            <Button
              size="sm"
              variant={forumView === "moderation" ? "solid" : "outline"}
              bg={forumView === "moderation" ? "nexzy.blue" : "transparent"}
              color={forumView === "moderation" ? "white" : "nexzy.gray.100"}
              borderColor="whiteAlpha.300"
              _hover={{
                bg:
                  forumView === "moderation" ? "nexzy.blue" : "whiteAlpha.100",
              }}
              onClick={() => setForumView("moderation")}
            >
              Moderation
            </Button>
            <Button
              size="sm"
              variant={forumView === "comments" ? "solid" : "outline"}
              bg={forumView === "comments" ? "nexzy.blue" : "transparent"}
              color={forumView === "comments" ? "white" : "nexzy.gray.100"}
              borderColor="whiteAlpha.300"
              _hover={{
                bg: forumView === "comments" ? "nexzy.blue" : "whiteAlpha.100",
              }}
              onClick={() => setForumView("comments")}
            >
              Reported comments
            </Button>
          </HStack>
          {forumView === "seeds" ? (
            <ForumSeedsPanel />
          ) : forumView === "comments" ? (
            <CommentsModerationPanel />
          ) : (
            <ForumModerationPanel />
          )}
        </VStack>
      )}

      {tab === "analytics" && <AnalyticsPanel />}
      {tab === "growth" && <GrowthPanel isOwner={isOwner} />}
      {tab === "ai-visibility" && <AiVisibilityPanel isOwner={isOwner} />}
      {tab === "games" && <MissingGamesPanel isOwner={isOwner} />}
      {tab === "discovery" && <DiscoveryPanel isOwner={isOwner} />}
      {tab === "gamehub" && <GameHubPanel />}

      {tab === "writers" && isOwner && <WritersPanel />}

      {tab === "trending" && isOwner && <TrendingPanel />}

      {tab === "notify" && isOwner && <NotifyPanel />}

      {tab === "tools" && isOwner && (
        <VStack align="stretch" gap={6}>
          <Box>
            <Heading size="md" color="nexzy.white" mb={1}>
              Newsroom tools
            </Heading>
            <Text color="nexzy.gray.100" fontSize="sm">
              Run the pipeline, commission a story, and maintain the article
              archive. (Guides, walkthroughs &amp; lists moved to Content Studio
              → Guides &amp; Walkthroughs.)
            </Text>
          </Box>
          <RunPipelinePanel onRan={load} />
          <CommissionPanel onRan={load} />
          <BackfillAuthorsButton />
        </VStack>
      )}
    </>
  );
}

export default function AdminQueuePage() {
  return (
    <AdminShell>
      <AdminContent />
    </AdminShell>
  );
}
