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
import BackfillAuthorsButton from "@/components/admin/BackfillAuthorsButton";
import LeadsBoard from "@/components/admin/LeadsBoard";
import PostBrowser from "@/components/admin/PostBrowser";
import {
  getQueue,
  getPublished,
  getStats,
  type BlogPost,
  type AdminStats,
} from "@/lib/admin/client";

type Tab =
  | "leads"
  | "queue"
  | "published"
  | "subscribers"
  | "analytics"
  | "tools";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      px={4}
      py={3}
    >
      <Text
        color="nexzy.white"
        fontSize="2xl"
        fontWeight="700"
        lineHeight="1.1"
      >
        {value}
      </Text>
      <Text color="nexzy.gray.100" fontSize="xs">
        {label}
      </Text>
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
  const [tab, setTab] = useState<Tab>("leads");

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
      <SimpleGrid columns={{ base: 3 }} gap={3} mb={6}>
        <StatCard label="Awaiting review" value={stats.awaitingReview} />
        <StatCard label="In progress" value={stats.inProgress} />
        <StatCard label="Published" value={stats.published} />
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
            label="Analytics"
            active={tab === "analytics"}
            onClick={() => setTab("analytics")}
          />
          <TabButton
            label="Tools"
            active={tab === "tools"}
            onClick={() => setTab("tools")}
          />
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

      {tab === "leads" && <LeadsBoard />}

      {tab === "queue" && (
        <Box>
          <Heading size="md" color="nexzy.white" mb={3}>
            Awaiting review
          </Heading>
          <PostBrowser
            posts={queue}
            empty="Nothing in the queue right now."
            dateField="createdAt"
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

      {tab === "analytics" && <AnalyticsPanel />}

      {tab === "tools" && (
        <VStack align="stretch" gap={6}>
          <Box>
            <Heading size="md" color="nexzy.white" mb={1}>
              Newsroom tools
            </Heading>
            <Text color="nexzy.gray.100" fontSize="sm">
              Run the pipeline, commission a story, and maintain the article
              archive.
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
