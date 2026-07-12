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
  Badge,
} from "@chakra-ui/react";
import StatusBadge from "@/components/admin/StatusBadge";
import { BEATS, beatLabel } from "@/lib/blog/beats";
import { approvePost, type BlogPost } from "@/lib/admin/client";

const PAGE_SIZE = 15;

const TYPE_FILTERS: { key: string; label: string }[] = [
  { key: "article", label: "News" },
  { key: "guide", label: "Guides" },
  { key: "walkthrough", label: "Walkthroughs" },
  { key: "list", label: "Lists" },
];

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
              {post.type === "walkthrough"
                ? "Walkthrough"
                : beatLabel(post.beat)}
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

/** A walkthrough shown as ONE grouped unit: the overview + its chapters. */
function WalkthroughGroup({
  parent,
  chapters,
  onChanged,
}: {
  parent: BlogPost;
  chapters: BlogPost[];
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const publishAll = async () => {
    setPublishing(true);
    try {
      await approvePost(parent.id);
      for (const c of chapters) await approvePost(c.id);
      onChanged?.();
    } finally {
      setPublishing(false);
    }
  };

  const chapterRow = (post: BlogPost, label: string): React.ReactElement => (
    <NextLink key={post.id} href={`/admin/posts/${post.id}`}>
      <Flex
        align="center"
        justify="space-between"
        bg="whiteAlpha.50"
        _hover={{ bg: "whiteAlpha.100" }}
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="md"
        p={3}
        gap={3}
      >
        <HStack gap={3} minW={0}>
          <Text
            color="nexzy.lightBlue"
            fontSize="xs"
            fontWeight="700"
            minW="72px"
          >
            {label}
          </Text>
          <Text color="nexzy.white" fontSize="sm" lineClamp={1}>
            {post.title || "(untitled)"}
          </Text>
        </HStack>
        <StatusBadge status={post.status} />
      </Flex>
    </NextLink>
  );

  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      bg="whiteAlpha.50"
    >
      <Flex align="center" justify="space-between" p={4} gap={4}>
        <Box flex={1} minW={0}>
          <HStack gap={2} mb={1}>
            <Badge colorPalette="purple" variant="subtle">
              Walkthrough
            </Badge>
            <Text color="nexzy.gray.100" fontSize="xs">
              {chapters.length} chapter{chapters.length === 1 ? "" : "s"}
            </Text>
          </HStack>
          <Text color="nexzy.white" fontWeight="600" lineClamp={1}>
            {parent.title || "(untitled)"}
          </Text>
        </Box>
        <HStack gap={2} flexShrink={0}>
          <Button
            size="xs"
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Hide" : "Chapters"}
          </Button>
          <Button
            size="xs"
            colorPalette="green"
            onClick={publishAll}
            loading={publishing}
            loadingText="Publishing…"
          >
            Publish all
          </Button>
          <StatusBadge status={parent.status} />
        </HStack>
      </Flex>

      {open && (
        <VStack align="stretch" gap={2} px={4} pb={4}>
          {chapterRow(parent, "Overview")}
          {chapters.map((c, i) =>
            chapterRow(c, `Ch. ${(c.chapterOrder ?? i) + 1}`),
          )}
        </VStack>
      )}
    </Box>
  );
}

/**
 * Searchable, filterable, paginated list of posts. Handles both the review
 * queue and the published archive so either stays scannable at scale.
 */
export default function PostBrowser({
  posts,
  empty,
  dateField = "createdAt",
  onChanged,
}: {
  posts: BlogPost[];
  empty: string;
  dateField?: DateField;
  onChanged?: () => void;
}) {
  const [q, setQ] = useState("");
  const [beat, setBeat] = useState<string | null>(null);
  const [ptype, setPtype] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter((p) => {
      if (beat && p.beat !== beat) return false;
      if (ptype && (p.type || "article") !== ptype) return false;
      if (needle && !(p.title || "").toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [posts, q, beat, ptype]);

  // Group walkthroughs: a parent (type='walkthrough', no parentId) owns its
  // chapters. Chapters render nested under the parent, not as loose rows.
  const { topLevel, chaptersByParent } = useMemo(() => {
    const chapters: BlogPost[] = [];
    const tops: BlogPost[] = [];
    for (const p of filtered) {
      if (p.type === "walkthrough" && p.parentId) chapters.push(p);
      else tops.push(p);
    }
    const parentIds = new Set(
      tops.filter((p) => p.type === "walkthrough").map((p) => p.id),
    );
    const byParent = new Map<string, BlogPost[]>();
    for (const c of chapters) {
      if (c.parentId && parentIds.has(c.parentId)) {
        const arr = byParent.get(c.parentId) || [];
        arr.push(c);
        byParent.set(c.parentId, arr);
      } else {
        tops.push(c); // orphan (parent not in this list) — show flat
      }
    }
    for (const arr of byParent.values())
      arr.sort((a, b) => (a.chapterOrder ?? 0) - (b.chapterOrder ?? 0));
    return { topLevel: tops, chaptersByParent: byParent };
  }, [filtered]);

  const shown = topLevel.slice(0, visible);

  return (
    <Box>
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
        maxW={{ md: "360px" }}
        mb={3}
      />

      <HStack gap={2} wrap="wrap" mb={3}>
        <Text color="nexzy.gray.100" fontSize="xs" mr={1} minW="36px">
          Type
        </Text>
        <Button
          size="xs"
          onClick={() => {
            setPtype(null);
            setBeat(null);
            setVisible(PAGE_SIZE);
          }}
          bg={ptype === null ? "nexzy.blue" : "transparent"}
          color={ptype === null ? "white" : "nexzy.gray.100"}
          borderWidth="1px"
          borderColor={ptype === null ? "nexzy.blue" : "whiteAlpha.300"}
          _hover={{ bg: ptype === null ? "nexzy.blue" : "whiteAlpha.100" }}
        >
          All
        </Button>
        {TYPE_FILTERS.map((t) => {
          const active = ptype === t.key;
          return (
            <Button
              key={t.key}
              size="xs"
              onClick={() => {
                setPtype(active ? null : t.key);
                setBeat(null);
                setVisible(PAGE_SIZE);
              }}
              bg={active ? "nexzy.blue" : "transparent"}
              color={active ? "white" : "nexzy.gray.100"}
              borderWidth="1px"
              borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
              _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
            >
              {t.label}
            </Button>
          );
        })}
      </HStack>

      {(ptype === null || ptype === "article") && (
        <HStack gap={2} wrap="wrap" mb={3}>
          <Text color="nexzy.gray.100" fontSize="xs" mr={1} minW="36px">
            Beat
          </Text>
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
      )}

      <Text color="nexzy.gray.100" fontSize="xs" mb={3}>
        Showing {shown.length} of {topLevel.length}
      </Text>

      {topLevel.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          {q || beat ? "No matches." : empty}
        </Text>
      ) : (
        <>
          <VStack gap={3} align="stretch">
            {shown.map((p) =>
              p.type === "walkthrough" && chaptersByParent.has(p.id) ? (
                <WalkthroughGroup
                  key={p.id}
                  parent={p}
                  chapters={chaptersByParent.get(p.id) || []}
                  onChanged={onChanged}
                />
              ) : (
                <PostRow key={p.id} post={p} dateField={dateField} />
              ),
            )}
          </VStack>
          {visible < topLevel.length && (
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
