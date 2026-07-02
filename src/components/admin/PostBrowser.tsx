"use client";

import { useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  Input,
} from "@chakra-ui/react";
import StatusBadge from "@/components/admin/StatusBadge";
import { BEATS, beatLabel } from "@/lib/blog/beats";
import type { BlogPost } from "@/lib/admin/client";

const PAGE_SIZE = 15;

function PostRow({
  post,
  dateField,
}: {
  post: BlogPost;
  dateField: DateField;
}) {
  const dateVal = post[dateField] || post.createdAt;
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
              {beatLabel(post.beat)}
            </Text>
            <Text color="nexzy.gray.100" fontSize="xs">
              {new Date(dateVal).toLocaleDateString()}
            </Text>
          </HStack>
        </Box>
        <StatusBadge status={post.status} />
      </Flex>
    </NextLink>
  );
}

type DateField = "createdAt" | "publishedAt";

/**
 * Searchable, filterable, paginated list of posts. Handles both the review
 * queue and the published archive so either stays scannable at scale.
 */
export default function PostBrowser({
  posts,
  empty,
  dateField = "createdAt",
}: {
  posts: BlogPost[];
  empty: string;
  dateField?: DateField;
}) {
  const [q, setQ] = useState("");
  const [beat, setBeat] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter((p) => {
      if (beat && p.beat !== beat) return false;
      if (needle && !(p.title || "").toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [posts, q, beat]);

  const shown = filtered.slice(0, visible);

  return (
    <Box>
      <Flex gap={3} mb={3} direction={{ base: "column", md: "row" }}>
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder="Search by title…"
          color="nexzy.white"
          bg="whiteAlpha.50"
          borderColor="whiteAlpha.300"
          _placeholder={{ color: "nexzy.gray.100" }}
          size="sm"
          maxW={{ md: "320px" }}
        />
        <HStack gap={2} wrap="wrap">
          <Button
            size="xs"
            onClick={() => {
              setBeat(null);
              setVisible(PAGE_SIZE);
            }}
            bg={beat === null ? "nexzy.blue" : "transparent"}
            color={beat === null ? "white" : "nexzy.gray.100"}
            borderWidth="1px"
            borderColor={beat === null ? "nexzy.blue" : "whiteAlpha.300"}
            _hover={{ bg: beat === null ? "nexzy.blue" : "whiteAlpha.100" }}
          >
            All beats
          </Button>
          {BEATS.map((b) => {
            const active = beat === b.key;
            return (
              <Button
                key={b.key}
                size="xs"
                onClick={() => {
                  setBeat(active ? null : b.key);
                  setVisible(PAGE_SIZE);
                }}
                bg={active ? "nexzy.blue" : "transparent"}
                color={active ? "white" : "nexzy.gray.100"}
                borderWidth="1px"
                borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
                _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
              >
                {b.label}
              </Button>
            );
          })}
        </HStack>
      </Flex>

      <Text color="nexzy.gray.100" fontSize="xs" mb={3}>
        Showing {shown.length} of {filtered.length}
        {filtered.length !== posts.length ? ` (${posts.length} total)` : ""}
      </Text>

      {filtered.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          {q || beat ? "No matches." : empty}
        </Text>
      ) : (
        <>
          <VStack gap={3} align="stretch">
            {shown.map((p) => (
              <PostRow key={p.id} post={p} dateField={dateField} />
            ))}
          </VStack>
          {visible < filtered.length && (
            <Flex justify="center" mt={4}>
              <Button
                size="sm"
                variant="outline"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                _hover={{ bg: "whiteAlpha.100" }}
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Show more
              </Button>
            </Flex>
          )}
        </>
      )}
    </Box>
  );
}
