"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Spinner,
  Separator,
} from "@chakra-ui/react";
import AdminShell from "@/components/admin/AdminShell";
import StatusBadge from "@/components/admin/StatusBadge";
import { getQueue, getPublished, type BlogPost } from "@/lib/admin/client";

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
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getQueue(), getPublished()])
      .then(([q, p]) => {
        setQueue(q);
        setPublished(p);
      })
      .catch((e) => setError(e?.message || "Failed to load."));
  }, []);

  if (error) {
    return (
      <Text color="red.300" fontSize="sm">
        {error}
      </Text>
    );
  }
  if (!queue || !published) {
    return (
      <Flex justify="center" py={12}>
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }

  return (
    <>
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
