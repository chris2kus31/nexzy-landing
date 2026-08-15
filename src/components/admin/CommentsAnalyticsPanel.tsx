"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  SimpleGrid,
  Text,
  Button,
  Badge,
  Link,
  Spinner,
} from "@chakra-ui/react";
import {
  getCommentsOverview,
  getCommentsByPost,
  getCommentsFeed,
  type CommentsOverview,
  type CommentsByPostItem,
  type AdminFeedComment,
} from "@/lib/admin/client";
import { beatLabel } from "@/lib/blog/beats";
import { publicPathForType } from "@/lib/blog/publicPath";
import { num, Metric, Pager } from "./analyticsUi";

const LIMIT = 20;

type View = "by-post" | "feed";

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function BeatBadge({
  beat,
  type,
}: {
  beat?: string | null;
  type?: string | null;
}) {
  return (
    <Badge colorPalette="purple" variant="subtle">
      {(beat && beatLabel(beat)) || type || "post"}
    </Badge>
  );
}

function SegBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      borderRadius="md"
      bg={active ? "nexzy.blue" : "transparent"}
      color={active ? "white" : "nexzy.gray.100"}
      fontWeight={active ? "700" : "500"}
      _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
      px={4}
    >
      {label}
    </Button>
  );
}

/* ---- By-article list ---- */

function ByPostRow({
  item,
  onOpen,
}: {
  item: CommentsByPostItem;
  onOpen: () => void;
}) {
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={4}
    >
      <Flex justify="space-between" gap={3} wrap="wrap">
        <Box flex="1" minW={0}>
          <HStack gap={2} mb={1} wrap="wrap">
            <BeatBadge beat={item.beat} type={item.type} />
            <Link
              href={`${publicPathForType(item.type)}/${item.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              color="nexzy.white"
              fontWeight="600"
              fontSize="sm"
              lineClamp={1}
              _hover={{ color: "nexzy.lightBlue" }}
            >
              {item.title}
            </Link>
          </HStack>
          <HStack gap={4} color="nexzy.gray.100" fontSize="xs" wrap="wrap">
            <Text>
              <Text as="span" color="nexzy.white" fontWeight="700">
                {num(item.total)}
              </Text>{" "}
              comments
            </Text>
            <Text>
              <Text as="span" color="nexzy.white" fontWeight="700">
                {num(item.uniqueCommenters)}
              </Text>{" "}
              people
            </Text>
            {item.hidden > 0 && (
              <Text color="orange.300">{num(item.hidden)} hidden</Text>
            )}
            {item.reported > 0 && (
              <Text color="red.300">{num(item.reported)} reported</Text>
            )}
            <Text opacity={0.7}>{timeAgo(item.lastCommentAt)}</Text>
          </HStack>
        </Box>
        <Button
          size="xs"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          flexShrink={0}
          alignSelf="center"
          onClick={onOpen}
        >
          View comments →
        </Button>
      </Flex>
    </Box>
  );
}

/* ---- Comment feed ---- */

function FeedRow({ c }: { c: AdminFeedComment }) {
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor={c.deleted ? "red.900" : "whiteAlpha.200"}
      borderRadius="lg"
      p={4}
      opacity={c.deleted ? 0.6 : 1}
    >
      <Flex justify="space-between" gap={3} mb={2} wrap="wrap">
        <HStack gap={2} wrap="wrap">
          <Text color="nexzy.white" fontWeight="600" fontSize="sm">
            {c.author.username}
          </Text>
          {c.parentId && (
            <Badge colorPalette="gray" variant="subtle">
              reply
            </Badge>
          )}
          {c.hidden && (
            <Badge colorPalette="orange" variant="subtle">
              hidden
            </Badge>
          )}
          {c.deleted && (
            <Badge colorPalette="red" variant="subtle">
              deleted
            </Badge>
          )}
          {c.reportCount > 0 && (
            <Badge colorPalette="red" variant="subtle">
              {c.reportCount} reports
            </Badge>
          )}
        </HStack>
        <Text color="nexzy.gray.100" fontSize="xs" flexShrink={0}>
          {timeAgo(c.createdAt)}
          {c.editedAt ? " · edited" : ""}
        </Text>
      </Flex>

      <Text color="nexzy.gray.100" fontSize="sm" mb={2} whiteSpace="pre-wrap">
        {c.content}
      </Text>

      <Flex justify="space-between" gap={3} wrap="wrap">
        <HStack gap={2}>
          <BeatBadge beat={c.beat} type={c.type} />
          {c.postSlug && c.type ? (
            <Link
              href={`${publicPathForType(c.type)}/${c.postSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              color="nexzy.gray.100"
              fontSize="xs"
              lineClamp={1}
              _hover={{ color: "nexzy.lightBlue" }}
            >
              {c.postTitle || c.postSlug}
            </Link>
          ) : (
            <Text color="nexzy.gray.100" fontSize="xs">
              {c.postTitle || "—"}
            </Text>
          )}
        </HStack>
        <HStack gap={3} color="nexzy.gray.100" fontSize="xs" flexShrink={0}>
          <Text>▲ {num(c.upvotes)}</Text>
          <Text>▼ {num(c.downvotes)}</Text>
        </HStack>
      </Flex>
    </Box>
  );
}

export default function CommentsAnalyticsPanel() {
  const [overview, setOverview] = useState<CommentsOverview | null>(null);
  const [view, setView] = useState<View>("by-post");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // by-post
  const [posts, setPosts] = useState<CommentsByPostItem[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsOffset, setPostsOffset] = useState(0);

  // feed
  const [feed, setFeed] = useState<AdminFeedComment[]>([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedOffset, setFeedOffset] = useState(0);
  const [filter, setFilter] = useState<{ id: string; title: string } | null>(
    null,
  );

  const loadByPost = async (nextOffset = postsOffset) => {
    const d = await getCommentsByPost(LIMIT, nextOffset);
    setPosts(d.items);
    setPostsTotal(d.total);
    setPostsOffset(nextOffset);
  };

  const loadFeed = async (
    postId: string | null,
    nextOffset = 0,
  ): Promise<void> => {
    const d = await getCommentsFeed(postId, LIMIT, nextOffset);
    setFeed(d.items);
    setFeedTotal(d.total);
    setFeedOffset(nextOffset);
  };

  const loadAll = async () => {
    setRefreshing(true);
    try {
      const [ov] = await Promise.all([
        getCommentsOverview(),
        view === "by-post"
          ? loadByPost(postsOffset)
          : loadFeed(filter?.id ?? null, feedOffset),
      ]);
      setOverview(ov);
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Failed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPostFeed = (item: CommentsByPostItem) => {
    setFilter({ id: item.postId, title: item.title });
    setView("feed");
    loadFeed(item.postId, 0).catch((e) =>
      setError((e as Error)?.message || "Failed."),
    );
  };

  const switchView = (v: View) => {
    setView(v);
    if (v === "feed") {
      loadFeed(filter?.id ?? null, 0).catch((e) =>
        setError((e as Error)?.message || "Failed."),
      );
    } else {
      loadByPost(0).catch((e) => setError((e as Error)?.message || "Failed."));
    }
  };

  const clearFilter = () => {
    setFilter(null);
    loadFeed(null, 0).catch((e) =>
      setError((e as Error)?.message || "Failed."),
    );
  };

  if (loading) {
    return (
      <Flex justify="center" py={10}>
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }

  return (
    <VStack align="stretch" gap={5}>
      <Flex justify="space-between" align="center" gap={2} wrap="wrap">
        <HStack
          gap={1}
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          p={1}
        >
          <SegBtn
            label="By article"
            active={view === "by-post"}
            onClick={() => switchView("by-post")}
          />
          <SegBtn
            label="All comments"
            active={view === "feed"}
            onClick={() => switchView("feed")}
          />
        </HStack>
        <Button
          size="sm"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={loadAll}
          loading={refreshing}
          loadingText="Refreshing…"
        >
          ↻ Refresh
        </Button>
      </Flex>

      {error && (
        <Text color="red.300" fontSize="sm">
          {error}
        </Text>
      )}

      {overview && (
        <SimpleGrid columns={{ base: 2, md: 4, lg: 7 }} gap={3}>
          <Metric label="Comments" value={num(overview.totalComments)} />
          <Metric label="· 7 days" value={num(overview.comments7d)} />
          <Metric label="· 30 days" value={num(overview.comments30d)} />
          <Metric label="Commenters" value={num(overview.uniqueCommenters)} />
          <Metric label="Replies" value={num(overview.replies)} />
          <Metric label="Hidden" value={num(overview.hiddenCount)} />
          <Metric label="Reported" value={num(overview.reportedCount)} />
        </SimpleGrid>
      )}

      {view === "by-post" &&
        (posts.length === 0 ? (
          <EmptyState text="No comments yet on any article." />
        ) : (
          <>
            <VStack align="stretch" gap={3}>
              {posts.map((p) => (
                <ByPostRow
                  key={p.postId}
                  item={p}
                  onOpen={() => openPostFeed(p)}
                />
              ))}
            </VStack>
            <Pager
              offset={postsOffset}
              limit={LIMIT}
              total={postsTotal}
              onPage={(n) =>
                loadByPost(n).catch((e) =>
                  setError((e as Error)?.message || "Failed."),
                )
              }
              loading={refreshing}
            />
          </>
        ))}

      {view === "feed" && (
        <>
          {filter && (
            <Flex
              align="center"
              justify="space-between"
              bg="whiteAlpha.100"
              borderRadius="md"
              px={3}
              py={2}
            >
              <Text color="nexzy.gray.100" fontSize="sm" lineClamp={1}>
                Showing comments on:{" "}
                <Text as="span" color="nexzy.white" fontWeight="600">
                  {filter.title}
                </Text>
              </Text>
              <Button
                size="xs"
                variant="ghost"
                color="nexzy.lightBlue"
                _hover={{ bg: "whiteAlpha.100" }}
                onClick={clearFilter}
              >
                Clear ✕
              </Button>
            </Flex>
          )}
          {feed.length === 0 ? (
            <EmptyState text="No comments to show." />
          ) : (
            <>
              <VStack align="stretch" gap={3}>
                {feed.map((c) => (
                  <FeedRow key={c.id} c={c} />
                ))}
              </VStack>
              <Pager
                offset={feedOffset}
                limit={LIMIT}
                total={feedTotal}
                onPage={(n) =>
                  loadFeed(filter?.id ?? null, n).catch((e) =>
                    setError((e as Error)?.message || "Failed."),
                  )
                }
                loading={refreshing}
              />
            </>
          )}
        </>
      )}
    </VStack>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Box
      border="1px dashed"
      borderColor="whiteAlpha.300"
      borderRadius="xl"
      py={10}
      textAlign="center"
    >
      <Text color="nexzy.gray.100" fontSize="sm">
        {text}
      </Text>
    </Box>
  );
}
