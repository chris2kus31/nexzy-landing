"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Spinner,
} from "@chakra-ui/react";
import StatusBadge from "@/components/admin/StatusBadge";
import CopyLinkButton from "@/components/admin/CopyLinkButton";
import { BEATS, beatLabel } from "@/lib/blog/beats";
import { publicPathForType } from "@/lib/blog/publicPath";
import { approvePost, getPostsPage, type BlogPost } from "@/lib/admin/client";

const PAGE_SIZE = 15;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

/** Full public share URL for a published post, correct per content type. */
function publicUrlFor(post: BlogPost): string {
  return `${SITE_URL}${publicPathForType(post.type)}/${post.slug}`;
}

const TYPE_FILTERS: { key: string; label: string }[] = [
  { key: "article", label: "News" },
  { key: "guide", label: "Guides" },
  { key: "walkthrough", label: "Walkthroughs" },
  { key: "list", label: "Lists" },
];

type DateField = "createdAt" | "publishedAt";

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
        <HStack gap={2} flexShrink={0}>
          {post.status === "published" && (
            <CopyLinkButton url={publicUrlFor(post)} />
          )}
          <StatusBadge status={post.status} />
        </HStack>
      </Flex>
    </NextLink>
  );
}

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
  const [pubErr, setPubErr] = useState<string | null>(null);

  const publishAll = async () => {
    setPublishing(true);
    setPubErr(null);
    try {
      await approvePost(parent.id);
      for (const c of chapters) await approvePost(c.id);
      onChanged?.();
    } catch (e) {
      setPubErr(
        e instanceof Error ? e.message : "Failed to publish walkthrough.",
      );
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
          {parent.status === "published" && (
            <CopyLinkButton url={publicUrlFor(parent)} />
          )}
          <StatusBadge status={parent.status} />
        </HStack>
      </Flex>

      {pubErr && (
        <Text color="red.300" fontSize="xs" px={4} pb={2}>
          {pubErr}
        </Text>
      )}

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
 * Server-driven browser for the review queue / published archive. Search,
 * filters, and pagination all run in SQL — only one page of rows ever travels
 * the wire, so the admin stays fast no matter how large the archive grows.
 */
export default function PostBrowser({
  mode,
  empty,
  refreshKey = 0,
  onChanged,
}: {
  /** Which list to browse — decides endpoint, sort order, and date shown. */
  mode: "queue" | "published";
  empty: string;
  /** Bump to force a refetch (parent Refresh button). */
  refreshKey?: number;
  /** Called after an in-list action (e.g. publish) so the parent can refresh stats. */
  onChanged?: () => void;
}) {
  const dateField: DateField = mode === "queue" ? "createdAt" : "publishedAt";

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [beat, setBeat] = useState<string | null>(null);
  const [ptype, setPtype] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<BlogPost[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Guards against out-of-order responses (slow page 1 landing after page 2).
  const requestSeq = useRef(0);
  const [reloadTick, setReloadTick] = useState(0);

  // Debounce typing so we don't fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    getPostsPage(mode, {
      offset: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      q: debouncedQ || undefined,
      beat: beat || undefined,
      type: ptype || undefined,
    })
      .then((res) => {
        if (seq !== requestSeq.current) return; // stale response
        setItems(res.items);
        setTotal(res.total);
        setError(null);
      })
      .catch((e) => {
        if (seq !== requestSeq.current) return;
        setError((e as Error)?.message || "Failed to load posts.");
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  }, [mode, page, debouncedQ, beat, ptype, refreshKey, reloadTick]);

  const reload = () => {
    setReloadTick((t) => t + 1);
    onChanged?.();
  };

  // Group walkthroughs: a parent (type='walkthrough', no parentId) owns its
  // chapters (the server sends chapters riding along with their page parents).
  const { topLevel, chaptersByParent } = useMemo(() => {
    const all = items || [];
    const chapters: BlogPost[] = [];
    const tops: BlogPost[] = [];
    for (const p of all) {
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
        tops.push(c); // orphan (parent not on this page) — show flat
      }
    }
    for (const arr of byParent.values())
      arr.sort((a, b) => (a.chapterOrder ?? 0) - (b.chapterOrder ?? 0));
    return { topLevel: tops, chaptersByParent: byParent };
  }, [items]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE + topLevel.length);
  const filtered = Boolean(debouncedQ || beat || ptype);

  return (
    <Box>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
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
            setPage(0);
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
                setPage(0);
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
              setPage(0);
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
                  setPage(0);
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

      {error && (
        <Text color="red.300" fontSize="sm" mb={3}>
          {error}
        </Text>
      )}

      {items === null ? (
        <Flex justify="center" py={8}>
          <Spinner color="nexzy.blue" />
        </Flex>
      ) : topLevel.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          {filtered ? "No matches." : empty}
        </Text>
      ) : (
        <>
          <Text color="nexzy.gray.100" fontSize="xs" mb={3}>
            Showing {from}–{to} of {total}
          </Text>
          <VStack gap={3} align="stretch" opacity={loading ? 0.6 : 1}>
            {topLevel.map((p) =>
              p.type === "walkthrough" && chaptersByParent.has(p.id) ? (
                <WalkthroughGroup
                  key={p.id}
                  parent={p}
                  chapters={chaptersByParent.get(p.id) || []}
                  onChanged={reload}
                />
              ) : (
                <PostRow key={p.id} post={p} dateField={dateField} />
              ),
            )}
          </VStack>
          {pageCount > 1 && (
            <Flex justify="center" align="center" gap={3} mt={4}>
              <Button
                size="sm"
                variant="outline"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                _hover={{ bg: "whiteAlpha.100" }}
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Prev
              </Button>
              <Text color="nexzy.gray.100" fontSize="sm">
                Page {page + 1} of {pageCount}
              </Text>
              <Button
                size="sm"
                variant="outline"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                _hover={{ bg: "whiteAlpha.100" }}
                disabled={page + 1 >= pageCount || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </Button>
            </Flex>
          )}
        </>
      )}
    </Box>
  );
}
