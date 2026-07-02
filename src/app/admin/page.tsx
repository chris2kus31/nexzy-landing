"use client";

import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
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
  Separator,
} from "@chakra-ui/react";
import AdminShell from "@/components/admin/AdminShell";
import StatusBadge from "@/components/admin/StatusBadge";
import RunPipelinePanel from "@/components/admin/RunPipelinePanel";
import CommissionPanel from "@/components/admin/CommissionPanel";
import HealthPanel from "@/components/admin/HealthPanel";
import {
  getQueue,
  getPublished,
  getStats,
  type BlogPost,
  type AdminStats,
} from "@/lib/admin/client";

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

function PostRow({ post }: { post: BlogPost }) {
  return (
    <NextLink href={`/admin/posts/${post.id}`} style={{ width: "100%" }}>
      <Flex
        align="center"
        justify="space-between"
        bg="whiteAlpha.50"
        _hover={{ bg: "whiteAlpha.100" }}
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        p={4}
        gap={4}
      >
        <Box flex={1} minW={0}>
          <Text color="nexzy.white" fontWeight="600" lineClamp={1}>
            {post.title || "(untitled)"}
          </Text>
          <HStack gap={3} mt={1}>
            <Text color="nexzy.gray.100" fontSize="xs">
              {post.beat}
            </Text>
            <Text color="nexzy.gray.100" fontSize="xs">
              {new Date(post.createdAt).toLocaleDateString()}
            </Text>
          </HStack>
        </Box>
        <StatusBadge status={post.status} />
      </Flex>
    </NextLink>
  );
}

function Section({
  title,
  posts,
  empty,
}: {
  title: string;
  posts: BlogPost[];
  empty: string;
}) {
  return (
    <Box mb={8}>
      <Heading size="md" color="nexzy.white" mb={3}>
        {title}{" "}
        <Text as="span" color="nexzy.gray.100" fontSize="md" fontWeight="400">
          ({posts.length})
        </Text>
      </Heading>
      {posts.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          {empty}
        </Text>
      ) : (
        <VStack gap={3} align="stretch">
          {posts.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
        </VStack>
      )}
    </Box>
  );
}

function QueueContent() {
  const [queue, setQueue] = useState<BlogPost[] | null>(null);
  const [published, setPublished] = useState<BlogPost[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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

      <RunPipelinePanel onRan={load} />
      <CommissionPanel onRan={load} />

      <Flex align="center" justify="space-between" mb={3}>
        <Heading size="lg" color="nexzy.white">
          Review queue
        </Heading>
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
      </Flex>

      <Section
        title="Awaiting review"
        posts={queue}
        empty="Nothing in the queue right now."
      />
      <Separator borderColor="whiteAlpha.200" mb={8} />
      <Section
        title="Published"
        posts={published}
        empty="No published articles yet."
      />

      <HealthPanel />
    </>
  );
}

export default function AdminQueuePage() {
  return (
    <AdminShell>
      <QueueContent />
    </AdminShell>
  );
}
