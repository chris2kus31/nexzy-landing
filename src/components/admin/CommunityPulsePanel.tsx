"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  FiEye,
  FiHeart,
  FiMessageCircle,
  FiRefreshCw,
  FiCornerUpLeft,
  FiExternalLink,
} from "react-icons/fi";
import {
  createOfficialComment,
  getPulseStats,
  getPulseStream,
  likeAsOfficial,
  unlikeAsOfficial,
  type PulseItem,
  type PulseKind,
  type PulseStats,
} from "@/lib/admin/client";

const PAGE = 30;

const FILTERS: Array<{ label: string; kinds: PulseKind[] | null }> = [
  { label: "All", kinds: null },
  { label: "Posts", kinds: ["post"] },
  { label: "Comments", kinds: ["comment", "article_comment"] },
  { label: "Signups", kinds: ["signup"] },
  { label: "Follows", kinds: ["follow"] },
];

const card = {
  borderWidth: "1px",
  borderColor: "whiteAlpha.200",
  borderRadius: "10px",
  p: 4,
};
const outlineBtn = {
  variant: "outline" as const,
  color: "nexzy.gray.100",
  borderColor: "whiteAlpha.300",
  _hover: { bg: "whiteAlpha.100" },
};
const primaryBtn = {
  bg: "nexzy.blue",
  color: "white",
  _hover: { bg: "nexzy.blue", opacity: 0.9 },
};

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fullTimeCT(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const itemKey = (i: PulseItem) => `${i.kind}:${i.id}`;

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Box {...card} p={3}>
      <Text fontSize="xs" color="whiteAlpha.600">
        {label}
      </Text>
      <Text fontSize="xl" color="nexzy.white" fontFamily="title">
        {value}
      </Text>
      {hint && (
        <Text fontSize="10px" color="whiteAlpha.500">
          {hint}
        </Text>
      )}
    </Box>
  );
}

/**
 * Admin → Pulse: what real users are doing, newest first (posts, comments,
 * article comments, signups, follows), plus today's numbers. The owner can
 * heart and reply as @nexzyofficial right from the list; those go through the
 * same API paths as the app, so they count like real engagement. No
 * background polling: it loads on open, on a filter change, and on Refresh.
 */
export default function CommunityPulsePanel({ isOwner }: { isOwner: boolean }) {
  const [filter, setFilter] = useState(0);
  const [showTeam, setShowTeam] = useState(false);
  const [items, setItems] = useState<PulseItem[]>([]);
  const [cursor, setCursor] = useState<{
    before: string;
    beforeId: string;
  } | null>(null);
  const [stats, setStats] = useState<PulseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState("");
  // Bumps on every filter change so a slow, stale response is ignored.
  const reqId = useRef(0);

  const loadFirst = useCallback(async () => {
    const id = ++reqId.current;
    const kinds = FILTERS[filter].kinds ?? undefined;
    setLoading(true);
    setErr("");
    try {
      const [page, s] = await Promise.all([
        getPulseStream({ kinds, hideTeam: !showTeam, limit: PAGE }),
        getPulseStats(),
      ]);
      if (id !== reqId.current) return;
      setStats(s);
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (e) {
      if (id === reqId.current) setErr((e as Error).message);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [filter, showTeam]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const loadMore = async () => {
    if (!cursor) return;
    const id = reqId.current;
    setLoadingMore(true);
    try {
      const page = await getPulseStream({
        kinds: FILTERS[filter].kinds ?? undefined,
        hideTeam: !showTeam,
        limit: PAGE,
        ...cursor,
      });
      if (id !== reqId.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map(itemKey));
        return [...prev, ...page.items.filter((i) => !seen.has(itemKey(i)))];
      });
      setCursor(page.nextCursor);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const patchPost = (
    postId: string,
    patch: Partial<NonNullable<PulseItem["post"]>["stats"]>,
  ) =>
    setItems((prev) =>
      prev.map((i) =>
        i.post?.id === postId
          ? { ...i, post: { ...i.post, stats: { ...i.post.stats, ...patch } } }
          : i,
      ),
    );

  return (
    <VStack align="stretch" gap={5}>
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Community Pulse
        </Heading>
        <Text fontSize="sm" color="whiteAlpha.600">
          What real users are doing, newest first. Numbers leave out the team
          and the official account. &quot;Today&quot; starts at midnight CT. Hit
          Refresh for the latest.
        </Text>
      </Box>

      {stats && (
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
          <Stat
            label="Active today"
            value={stats.activeToday}
            hint="opened the app, posted or commented"
          />
          <Stat
            label="Came back this week"
            value={stats.returning7d}
            hint="active in 7 days, joined earlier"
          />
          <Stat
            label="New signups today"
            value={stats.signupsToday}
            hint={`${stats.signups7d} in 7 days`}
          />
          <Stat
            label="Posts today"
            value={stats.postsToday}
            hint={`${stats.posts7d} in 7 days`}
          />
          <Stat
            label="Comments today"
            value={stats.commentsToday}
            hint={`${stats.comments7d} in 7 days`}
          />
          <Stat label="Follows today" value={stats.followsToday} />
          <Stat label="Active in 7 days" value={stats.active7d} />
          <Stat label="Total users" value={stats.totalUsers} />
        </SimpleGrid>
      )}

      <Flex gap={2} wrap="wrap" align="center">
        {FILTERS.map((f, i) => (
          <Button
            key={f.label}
            size="sm"
            {...(i === filter ? primaryBtn : outlineBtn)}
            onClick={() => setFilter(i)}
          >
            {f.label}
          </Button>
        ))}
        <Box flex="1" />
        <Button
          size="sm"
          {...(showTeam ? primaryBtn : outlineBtn)}
          onClick={() => setShowTeam((v) => !v)}
        >
          {showTeam ? "Showing team" : "Team hidden"}
        </Button>
        <Button
          size="sm"
          {...outlineBtn}
          onClick={() => void loadFirst()}
          loading={loading}
        >
          <FiRefreshCw /> Refresh
        </Button>
      </Flex>

      {err && (
        <Text color="red.300" fontSize="sm">
          {err}
        </Text>
      )}

      {loading && !items.length ? (
        <Spinner color="nexzy.blue" />
      ) : !items.length ? (
        <Text color="whiteAlpha.600" fontSize="sm">
          Nothing here yet.
        </Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {items.map((item) => (
            <PulseRow
              key={itemKey(item)}
              item={item}
              isOwner={isOwner}
              onPostPatch={patchPost}
            />
          ))}
          {cursor && (
            <Button
              size="sm"
              {...outlineBtn}
              alignSelf="center"
              onClick={() => void loadMore()}
              loading={loadingMore}
            >
              Load older
            </Button>
          )}
        </VStack>
      )}
    </VStack>
  );
}

function verb(item: PulseItem): string {
  switch (item.kind) {
    case "post":
      return "posted";
    case "comment":
      return item.parentCommentId
        ? `replied on @${item.post?.authorUsername ?? "user"}'s post`
        : `commented on @${item.post?.authorUsername ?? "user"}'s post`;
    case "article_comment":
      return "commented on an article";
    case "signup":
      return "joined Nexzy";
    case "follow":
      return `followed @${item.target?.username ?? "user"}`;
  }
}

function PulseRow({
  item,
  isOwner,
  onPostPatch,
}: {
  item: PulseItem;
  isOwner: boolean;
  onPostPatch: (
    postId: string,
    patch: Partial<NonNullable<PulseItem["post"]>["stats"]>,
  ) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState("");
  const post = item.post;
  const live = item.status !== "deleted";
  const canAct =
    isOwner &&
    live &&
    !!post &&
    (item.kind === "post" || item.kind === "comment");

  const toggleHeart = async () => {
    if (!post) return;
    setBusy(true);
    setActionErr("");
    try {
      const res = post.stats.heartedByOfficial
        ? await unlikeAsOfficial(post.id)
        : await likeAsOfficial(post.id);
      onPostPatch(post.id, {
        heartedByOfficial: res.liked,
        hearts: res.likeCount,
      });
    } catch (e) {
      setActionErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!post || !reply.trim()) return;
    setBusy(true);
    setActionErr("");
    try {
      await createOfficialComment({
        postId: post.id,
        content: reply.trim(),
        // Replying to a comment threads under it; to a post, top level.
        parentCommentId: item.kind === "comment" ? item.id : undefined,
      });
      onPostPatch(post.id, {
        repliedByOfficial: true,
        comments: post.stats.comments + 1,
      });
      setReply("");
      setReplyOpen(false);
    } catch (e) {
      setActionErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const initial = (item.actor.username || "?").charAt(0).toUpperCase();

  return (
    <Box
      {...card}
      borderColor={
        item.post?.isFirstPost && item.kind === "post"
          ? "nexzy.blue"
          : "whiteAlpha.200"
      }
    >
      <HStack align="start" gap={3}>
        <Flex
          w="36px"
          h="36px"
          flexShrink={0}
          borderRadius="full"
          bg="whiteAlpha.200"
          align="center"
          justify="center"
          color="nexzy.white"
          fontWeight="700"
        >
          {initial}
        </Flex>
        <Box flex="1" minW={0}>
          <Flex gap={2} wrap="wrap" align="center">
            <Text color="nexzy.white" fontWeight="600" fontSize="sm">
              @{item.actor.username}
            </Text>
            <Text color="whiteAlpha.700" fontSize="sm">
              {verb(item)}
            </Text>
            {item.kind === "post" && post?.isFirstPost && (
              <Badge colorPalette="blue" size="sm">
                First post
              </Badge>
            )}
            {item.actor.isNew && item.kind !== "signup" && (
              <Badge colorPalette="green" size="sm">
                New member
              </Badge>
            )}
            {item.actor.isTeam && (
              <Badge colorPalette="purple" size="sm">
                Team
              </Badge>
            )}
            {item.status === "flagged" && (
              <Badge colorPalette="orange" size="sm">
                Hidden by moderation
              </Badge>
            )}
            {item.status === "deleted" && (
              <Badge colorPalette="red" size="sm">
                Deleted
              </Badge>
            )}
            <Text
              color="whiteAlpha.500"
              fontSize="xs"
              title={fullTimeCT(item.createdAt)}
            >
              {timeAgo(item.createdAt)}
            </Text>
          </Flex>

          {item.content && (
            <Text
              color="nexzy.gray.100"
              fontSize="sm"
              mt={1}
              whiteSpace="pre-wrap"
              wordBreak="break-word"
            >
              {item.content}
            </Text>
          )}

          {item.kind === "comment" && post && (
            <Text color="whiteAlpha.500" fontSize="xs" mt={1}>
              On: {post.snippet}
            </Text>
          )}

          {item.kind === "article_comment" && item.article && (
            <Text fontSize="xs" mt={1}>
              <a
                href={`/blog/${encodeURIComponent(item.article.slug)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--chakra-colors-nexzy-blue)" }}
              >
                {item.article.title}{" "}
                <FiExternalLink style={{ display: "inline" }} />
              </a>
            </Text>
          )}

          {item.kind === "post" && post && (
            <HStack gap={4} mt={2} color="whiteAlpha.600" fontSize="xs">
              {post.game && <Text>Game: {post.game.name}</Text>}
              <HStack gap={1}>
                <FiEye /> <Text>{post.stats.views}</Text>
              </HStack>
              <HStack gap={1}>
                <FiHeart /> <Text>{post.stats.hearts}</Text>
              </HStack>
              <HStack gap={1}>
                <FiMessageCircle /> <Text>{post.stats.comments}</Text>
              </HStack>
            </HStack>
          )}

          {canAct && post && (
            <HStack gap={2} mt={3} wrap="wrap">
              {item.kind === "post" && (
                <Button
                  size="xs"
                  {...(post.stats.heartedByOfficial ? primaryBtn : outlineBtn)}
                  onClick={() => void toggleHeart()}
                  loading={busy && !replyOpen}
                >
                  <FiHeart />
                  {post.stats.heartedByOfficial ? "Hearted" : "Heart"}
                </Button>
              )}
              <Button
                size="xs"
                {...outlineBtn}
                onClick={() => setReplyOpen((v) => !v)}
              >
                <FiCornerUpLeft /> Reply
              </Button>
              {item.kind === "post" && post.stats.repliedByOfficial && (
                <Text fontSize="xs" color="green.300">
                  @nexzyofficial already replied
                </Text>
              )}
            </HStack>
          )}

          {replyOpen && canAct && (
            <VStack align="stretch" gap={2} mt={2}>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Reply as @nexzyofficial"
                bg="whiteAlpha.50"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                size="sm"
              />
              <HStack>
                <Button
                  size="xs"
                  {...primaryBtn}
                  onClick={() => void sendReply()}
                  loading={busy}
                  disabled={!reply.trim()}
                >
                  Send reply
                </Button>
                <Button
                  size="xs"
                  {...outlineBtn}
                  onClick={() => setReplyOpen(false)}
                >
                  Cancel
                </Button>
              </HStack>
            </VStack>
          )}

          {actionErr && (
            <Text color="red.300" fontSize="xs" mt={1}>
              {actionErr}
            </Text>
          )}
        </Box>
      </HStack>
    </Box>
  );
}
