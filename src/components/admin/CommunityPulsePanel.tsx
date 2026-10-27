"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { FaHeart } from "react-icons/fa";
import {
  FiCornerUpLeft,
  FiEdit3,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiHeart,
  FiMessageCircle,
  FiRefreshCw,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
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

// Pulse palette (on the admin navy). Each kind has one color, used for its
// timeline marker only, so the colors mean something.
const C = {
  surface: "#222849",
  raised: "#2a3156",
  line: "rgba(255,255,255,0.08)",
  text: "#EDF2F7",
  muted: "#9AA3BF",
  faint: "#6B7394",
  gold: "#FFC400",
  heart: "#FF7A8A",
};
const KIND: Record<PulseKind, { color: string; icon: IconType }> = {
  post: { color: "#4DA3FF", icon: FiEdit3 },
  comment: { color: "#3DD6B0", icon: FiMessageCircle },
  article_comment: { color: "#B39DFF", icon: FiFileText },
  signup: { color: "#7EE2A0", icon: FiUserPlus },
  follow: { color: "#9AA3BF", icon: FiUserCheck },
};

const PAGE = 30;
const FILTERS: Array<{ label: string; kinds: PulseKind[] | null }> = [
  { label: "All", kinds: null },
  { label: "Posts", kinds: ["post"] },
  { label: "Comments", kinds: ["comment", "article_comment"] },
  { label: "Signups", kinds: ["signup"] },
  { label: "Follows", kinds: ["follow"] },
];

const itemKey = (i: PulseItem) => `${i.kind}:${i.id}`;

function timeCT(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** "Today" / "Yesterday" / "Fri, Oct 24", in Central Time. */
function dayLabel(iso: string): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { timeZone: "America/Chicago" });
  const d = new Date(iso);
  const now = new Date();
  if (fmt(d) === fmt(now)) return "Today";
  if (fmt(d) === fmt(new Date(now.getTime() - 86_400_000))) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type PostStats = NonNullable<PulseItem["post"]>["stats"];

/**
 * Admin → Pulse: what real users are doing, newest first, plus today's
 * numbers and a "waiting on you" list of posts nobody from the team has
 * answered. The owner can heart and reply as @nexzyofficial from here; those
 * go through the same API paths as the app. No background polling: it loads
 * on open, on a filter change, and on Refresh.
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
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState("");
  const [replyKey, setReplyKey] = useState<string | null>(null);
  // Bumps on every fresh load so a slow, stale response is ignored.
  const reqId = useRef(0);

  const loadFirst = useCallback(async () => {
    const id = ++reqId.current;
    const kinds = FILTERS[filter].kinds ?? undefined;
    setLoading(true);
    setErr("");
    // Drop the old cursor right away so "Load older" can't pair the previous
    // filter's cursor with the new filter while this load is in flight.
    setCursor(null);
    try {
      const [page, s] = await Promise.all([
        getPulseStream({ kinds, hideTeam: !showTeam, limit: PAGE }),
        getPulseStats(),
      ]);
      if (id !== reqId.current) return;
      setStats(s);
      setItems(page.items);
      setCursor(page.nextCursor);
      setLoadedAt(new Date().toISOString());
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

  const patchPost = (postId: string, patch: Partial<PostStats>) =>
    setItems((prev) =>
      prev.map((i) =>
        i.post?.id === postId
          ? { ...i, post: { ...i.post, stats: { ...i.post.stats, ...patch } } }
          : i,
      ),
    );

  // Posts from real users that the team hasn't answered, first posts first.
  const waiting = useMemo(
    () =>
      items
        .filter(
          (i) =>
            i.kind === "post" &&
            i.status === "visible" &&
            !i.actor.isTeam &&
            i.post &&
            !i.post.stats.repliedByOfficial,
        )
        .sort(
          (a, b) =>
            Number(!!b.post?.isFirstPost) - Number(!!a.post?.isFirstPost),
        )
        .slice(0, 6),
    [items],
  );

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: PulseItem[] }> = [];
    for (const it of items) {
      const day = dayLabel(it.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(it);
      else out.push({ day, items: [it] });
    }
    return out;
  }, [items]);

  const jumpToReply = (key: string) => {
    setReplyKey(key);
    document
      .getElementById(`pulse-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <VStack align="stretch" gap={6}>
      <Flex align="flex-end" justify="space-between" gap={4} wrap="wrap">
        <Box>
          <Heading
            fontFamily="title"
            fontSize="2xl"
            color={C.text}
            letterSpacing="0.01em"
          >
            Community Pulse
          </Heading>
          <Text fontSize="sm" color={C.muted} mt={1}>
            What real people are doing on Nexzy, newest first.
            {loadedAt && ` Loaded at ${timeCT(loadedAt)} CT.`}
          </Text>
        </Box>
        <HStack gap={2}>
          <Button
            size="sm"
            variant="outline"
            borderColor={showTeam ? KIND.post.color : C.line}
            color={showTeam ? C.text : C.muted}
            bg={showTeam ? "rgba(77,163,255,0.12)" : "transparent"}
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => setShowTeam((v) => !v)}
            aria-pressed={showTeam}
          >
            <FiUsers />
            {showTeam ? "Showing team" : "Team hidden"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            borderColor={C.line}
            color={C.text}
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => void loadFirst()}
            loading={loading}
          >
            <FiRefreshCw /> Refresh
          </Button>
        </HStack>
      </Flex>

      {stats && <StatsBand stats={stats} />}

      <HStack
        gap={1}
        p={1}
        bg={C.surface}
        borderRadius="10px"
        alignSelf="flex-start"
        maxW="full"
        overflowX="auto"
        role="tablist"
        aria-label="Filter activity"
      >
        {FILTERS.map((f, i) => (
          <Button
            key={f.label}
            size="sm"
            role="tab"
            aria-selected={i === filter}
            variant="ghost"
            borderRadius="8px"
            px={3}
            bg={i === filter ? C.raised : "transparent"}
            color={i === filter ? C.text : C.muted}
            fontWeight={i === filter ? "600" : "500"}
            _hover={{
              color: C.text,
              bg: i === filter ? C.raised : "whiteAlpha.50",
            }}
            onClick={() => setFilter(i)}
          >
            {f.label}
          </Button>
        ))}
      </HStack>

      {err && (
        <Text color="red.300" fontSize="sm">
          Couldn&apos;t load Pulse: {err}
        </Text>
      )}

      <Flex
        gap={8}
        align="flex-start"
        direction={{ base: "column", lg: "row" }}
      >
        <Box flex="1" minW={0} w="full">
          {loading && !items.length ? (
            <Spinner color="nexzy.blue" />
          ) : !items.length ? (
            <Box
              border="1px dashed"
              borderColor={C.line}
              borderRadius="12px"
              p={6}
            >
              <Text color={C.text} fontWeight="600">
                Nothing yet for this filter.
              </Text>
              <Text color={C.muted} fontSize="sm" mt={1}>
                New posts, comments and signups show up here. Hit Refresh to
                check again.
              </Text>
            </Box>
          ) : (
            <VStack align="stretch" gap={6}>
              {groups.map((g) => (
                <Box key={g.day}>
                  <Text
                    fontFamily="title"
                    fontSize="sm"
                    color={C.muted}
                    mb={3}
                    letterSpacing="0.02em"
                  >
                    {g.day}
                  </Text>
                  <Box position="relative" pl="36px">
                    <Box
                      position="absolute"
                      left="13px"
                      top="6px"
                      bottom="6px"
                      w="2px"
                      bg={C.line}
                      aria-hidden
                    />
                    <VStack align="stretch" gap={3}>
                      {g.items.map((item) => (
                        <TimelineItem
                          key={itemKey(item)}
                          item={item}
                          isOwner={isOwner}
                          replyOpen={replyKey === itemKey(item)}
                          onToggleReply={(open) =>
                            setReplyKey(open ? itemKey(item) : null)
                          }
                          onPostPatch={patchPost}
                        />
                      ))}
                    </VStack>
                  </Box>
                </Box>
              ))}
              {cursor && (
                <Button
                  size="sm"
                  variant="outline"
                  borderColor={C.line}
                  color={C.text}
                  _hover={{ bg: "whiteAlpha.100" }}
                  alignSelf="center"
                  onClick={() => void loadMore()}
                  loading={loadingMore}
                >
                  Load older
                </Button>
              )}
            </VStack>
          )}
        </Box>

        <WaitingOnYou
          items={waiting}
          canReply={isOwner}
          onReply={jumpToReply}
        />
      </Flex>
    </VStack>
  );
}

function StatsBand({ stats }: { stats: PulseStats }) {
  const main: Array<{ label: string; value: number; sub?: string }> = [
    { label: "active today", value: stats.activeToday },
    { label: "came back this week", value: stats.returning7d },
    {
      label: "signups today",
      value: stats.signupsToday,
      sub: `${stats.signups7d} this week`,
    },
    {
      label: "posts today",
      value: stats.postsToday,
      sub: `${stats.posts7d} this week`,
    },
    {
      label: "comments today",
      value: stats.commentsToday,
      sub: `${stats.comments7d} this week`,
    },
    { label: "follows today", value: stats.followsToday },
  ];
  return (
    <Box bg={C.surface} borderRadius="14px" px={{ base: 4, md: 6 }} py={4}>
      <Flex wrap="wrap" rowGap={4}>
        {main.map((m, i) => (
          <Box
            key={m.label}
            pr={{ base: 0, md: 6 }}
            mr={{ base: 0, md: 6 }}
            w={{ base: "50%", md: "auto" }}
            borderRight={{
              base: "none",
              md: i < main.length - 1 ? "1px solid" : "none",
            }}
            borderColor={C.line}
            minW="110px"
          >
            <Text
              fontFamily="title"
              fontSize="3xl"
              lineHeight="1"
              color={C.text}
            >
              {m.value}
            </Text>
            <Text fontSize="sm" color={C.muted} mt={1}>
              {m.label}
            </Text>
            {m.sub && (
              <Text fontSize="xs" color={C.faint}>
                {m.sub}
              </Text>
            )}
          </Box>
        ))}
      </Flex>
      <Text fontSize="xs" color={C.faint} mt={3}>
        {stats.active7d} people active in the last 7 days, {stats.totalUsers}{" "}
        members in total. The team and @nexzyofficial are left out. Today starts
        at midnight CT.
      </Text>
    </Box>
  );
}

function WaitingOnYou({
  items,
  canReply,
  onReply,
}: {
  items: PulseItem[];
  canReply: boolean;
  onReply: (key: string) => void;
}) {
  return (
    <Box
      w={{ base: "full", lg: "300px" }}
      flexShrink={0}
      position={{ lg: "sticky" }}
      top={{ lg: "16px" }}
      borderRadius="14px"
      border="1px solid"
      borderColor="rgba(255,196,0,0.35)"
      bg="rgba(255,196,0,0.05)"
      p={4}
    >
      <Text fontFamily="title" fontSize="md" color={C.gold}>
        Waiting on you
      </Text>
      <Text fontSize="xs" color={C.muted} mt={1} mb={3}>
        Posts the team hasn&apos;t answered yet. First posts come first; a reply
        in the first hour is what brings people back.
      </Text>
      {!items.length ? (
        <Text fontSize="sm" color={C.text}>
          You&apos;re all caught up.
        </Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {items.map((i) => (
            <Box
              key={itemKey(i)}
              borderTop="1px solid"
              borderColor={C.line}
              pt={3}
            >
              <Flex align="center" gap={2}>
                <Text fontSize="sm" fontWeight="600" color={C.text}>
                  @{i.actor.username}
                </Text>
                {i.post?.isFirstPost && (
                  <Text fontSize="xs" color={C.gold} fontWeight="600">
                    first post
                  </Text>
                )}
                <Text fontSize="xs" color={C.faint} ml="auto">
                  {ago(i.createdAt)}
                </Text>
              </Flex>
              <Text fontSize="sm" color={C.muted} mt={1} lineClamp={2}>
                {i.content}
              </Text>
              {canReply && (
                <Button
                  size="xs"
                  mt={2}
                  variant="outline"
                  borderColor="rgba(255,196,0,0.5)"
                  color={C.gold}
                  _hover={{ bg: "rgba(255,196,0,0.1)" }}
                  onClick={() => onReply(itemKey(i))}
                >
                  <FiCornerUpLeft /> Reply
                </Button>
              )}
            </Box>
          ))}
        </VStack>
      )}
    </Box>
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

function Avatar({ item }: { item: PulseItem }) {
  const [broken, setBroken] = useState(false);
  const url = item.actor.avatarUrl;
  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={28}
        height={28}
        onError={() => setBroken(true)}
        style={{ width: 28, height: 28, borderRadius: 999, objectFit: "cover" }}
      />
    );
  }
  return (
    <Flex
      w="28px"
      h="28px"
      borderRadius="full"
      bg={C.raised}
      color={C.text}
      fontSize="xs"
      fontWeight="700"
      align="center"
      justify="center"
      flexShrink={0}
    >
      {(item.actor.username || "?").charAt(0).toUpperCase()}
    </Flex>
  );
}

function TimelineItem({
  item,
  isOwner,
  replyOpen,
  onToggleReply,
  onPostPatch,
}: {
  item: PulseItem;
  isOwner: boolean;
  replyOpen: boolean;
  onToggleReply: (open: boolean) => void;
  onPostPatch: (postId: string, patch: Partial<PostStats>) => void;
}) {
  const kind = KIND[item.kind];
  const Icon = kind.icon;
  const compact = item.kind === "signup" || item.kind === "follow";
  const post = item.post;
  const firstPost = item.kind === "post" && !!post?.isFirstPost;

  const marker = (
    <Flex
      position="absolute"
      left="-36px"
      top={compact ? "1px" : "10px"}
      w="28px"
      h="28px"
      borderRadius="full"
      bg="#1a1f3a"
      border="2px solid"
      borderColor={firstPost ? C.gold : kind.color}
      color={firstPost ? C.gold : kind.color}
      align="center"
      justify="center"
      aria-hidden
    >
      <Icon size={13} />
    </Flex>
  );

  if (compact) {
    return (
      <Flex position="relative" align="center" gap={2} minH="30px" wrap="wrap">
        {marker}
        <Text fontSize="sm" color={C.text} fontWeight="600">
          @{item.actor.username}
        </Text>
        <Text fontSize="sm" color={C.muted}>
          {verb(item)}
        </Text>
        {item.actor.isTeam && <Tag color={C.muted}>team</Tag>}
        <Text
          fontSize="xs"
          color={C.faint}
          title={`${timeCT(item.createdAt)} CT`}
        >
          {ago(item.createdAt)}
        </Text>
      </Flex>
    );
  }

  return (
    <Box
      id={`pulse-${itemKey(item)}`}
      position="relative"
      bg={C.surface}
      borderRadius="12px"
      border="1px solid"
      borderColor={firstPost ? "rgba(255,196,0,0.45)" : "transparent"}
      px={4}
      py={3}
    >
      {marker}
      <Flex align="center" gap={2} wrap="wrap">
        <Avatar item={item} />
        <Text fontSize="sm" color={C.text} fontWeight="600">
          @{item.actor.username}
        </Text>
        <Text fontSize="sm" color={C.muted}>
          {verb(item)}
        </Text>
        {firstPost && <Tag color={C.gold}>first post</Tag>}
        {item.actor.isNew && <Tag color={KIND.signup.color}>new member</Tag>}
        {item.actor.isTeam && <Tag color={C.muted}>team</Tag>}
        {item.status === "flagged" && (
          <Tag color="#FFB86B">hidden by moderation</Tag>
        )}
        {item.status === "deleted" && <Tag color="#FF8A80">deleted</Tag>}
        <Text
          fontSize="xs"
          color={C.faint}
          ml="auto"
          title={`${timeCT(item.createdAt)} CT`}
        >
          {ago(item.createdAt)}
        </Text>
      </Flex>

      {item.kind === "comment" && post && (
        <Text
          fontSize="xs"
          color={C.faint}
          mt={2}
          pl={2}
          borderLeft="2px solid"
          borderColor={C.line}
          lineClamp={1}
        >
          {post.snippet}
        </Text>
      )}

      {item.content && (
        <Text
          fontSize="sm"
          color={C.text}
          mt={2}
          whiteSpace="pre-wrap"
          wordBreak="break-word"
          lineHeight="1.55"
          maxW="68ch"
        >
          {item.content}
        </Text>
      )}

      {item.kind === "article_comment" && item.article && (
        <a
          href={`/blog/${encodeURIComponent(item.article.slug)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
            fontSize: 13,
            color: KIND.article_comment.color,
          }}
        >
          {item.article.title} <FiExternalLink />
        </a>
      )}

      {item.kind === "post" && post && (
        <PostFooter
          item={item}
          isOwner={isOwner}
          replyOpen={replyOpen}
          onToggleReply={onToggleReply}
          onPostPatch={onPostPatch}
        />
      )}

      {item.kind === "comment" &&
        post &&
        isOwner &&
        item.status === "visible" && (
          <ReplyArea
            item={item}
            open={replyOpen}
            onToggle={onToggleReply}
            onPostPatch={onPostPatch}
          />
        )}
    </Box>
  );
}

function Tag({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Text
      as="span"
      fontSize="11px"
      fontWeight="600"
      color={color}
      border="1px solid"
      borderColor={color}
      borderRadius="999px"
      px={2}
      lineHeight="18px"
      opacity={0.9}
    >
      {children}
    </Text>
  );
}

function PostFooter({
  item,
  isOwner,
  replyOpen,
  onToggleReply,
  onPostPatch,
}: {
  item: PulseItem;
  isOwner: boolean;
  replyOpen: boolean;
  onToggleReply: (open: boolean) => void;
  onPostPatch: (postId: string, patch: Partial<PostStats>) => void;
}) {
  const post = item.post!;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const live = item.status === "visible";

  const toggleHeart = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = post.stats.heartedByOfficial
        ? await unlikeAsOfficial(post.id)
        : await likeAsOfficial(post.id);
      onPostPatch(post.id, {
        heartedByOfficial: res.liked,
        hearts: res.likeCount,
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Flex
        align="center"
        gap={4}
        mt={3}
        color={C.muted}
        fontSize="xs"
        wrap="wrap"
      >
        {post.game && (
          <Text color={KIND.post.color} fontWeight="600">
            {post.game.name}
          </Text>
        )}
        <HStack gap={1} title="Times shown in feeds">
          <FiEye /> <Text>{post.stats.views}</Text>
        </HStack>
        <HStack gap={1}>
          <FiHeart /> <Text>{post.stats.hearts}</Text>
        </HStack>
        <HStack gap={1}>
          <FiMessageCircle /> <Text>{post.stats.comments}</Text>
        </HStack>
        {post.stats.repliedByOfficial && (
          <Text color={KIND.comment.color}>@nexzyofficial replied</Text>
        )}
        {isOwner && live && (
          <HStack gap={1} ml="auto">
            <Button
              size="xs"
              variant="ghost"
              color={post.stats.heartedByOfficial ? C.heart : C.muted}
              _hover={{ bg: "whiteAlpha.100", color: C.heart }}
              onClick={() => void toggleHeart()}
              loading={busy}
              aria-pressed={post.stats.heartedByOfficial}
              aria-label={
                post.stats.heartedByOfficial
                  ? "Remove heart from @nexzyofficial"
                  : "Heart as @nexzyofficial"
              }
            >
              {post.stats.heartedByOfficial ? <FaHeart /> : <FiHeart />}
              {post.stats.heartedByOfficial ? "Hearted" : "Heart"}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              color={replyOpen ? C.text : C.muted}
              _hover={{ bg: "whiteAlpha.100", color: C.text }}
              onClick={() => onToggleReply(!replyOpen)}
            >
              <FiCornerUpLeft /> Reply
            </Button>
          </HStack>
        )}
      </Flex>
      {err && (
        <Text color="red.300" fontSize="xs" mt={1}>
          {err}
        </Text>
      )}
      {replyOpen && isOwner && live && (
        <ReplyBox
          item={item}
          onDone={() => onToggleReply(false)}
          onPostPatch={onPostPatch}
        />
      )}
    </>
  );
}

function ReplyArea({
  item,
  open,
  onToggle,
  onPostPatch,
}: {
  item: PulseItem;
  open: boolean;
  onToggle: (open: boolean) => void;
  onPostPatch: (postId: string, patch: Partial<PostStats>) => void;
}) {
  return (
    <>
      <Flex mt={2}>
        <Button
          size="xs"
          variant="ghost"
          ml="auto"
          color={open ? C.text : C.muted}
          _hover={{ bg: "whiteAlpha.100", color: C.text }}
          onClick={() => onToggle(!open)}
        >
          <FiCornerUpLeft /> Reply
        </Button>
      </Flex>
      {open && (
        <ReplyBox
          item={item}
          onDone={() => onToggle(false)}
          onPostPatch={onPostPatch}
        />
      )}
    </>
  );
}

function ReplyBox({
  item,
  onDone,
  onPostPatch,
}: {
  item: PulseItem;
  onDone: () => void;
  onPostPatch: (postId: string, patch: Partial<PostStats>) => void;
}) {
  const post = item.post!;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await createOfficialComment({
        postId: post.id,
        content: text.trim(),
        // Replying to a comment threads under it; to a post, top level.
        parentCommentId: item.kind === "comment" ? item.id : undefined,
      });
      onPostPatch(post.id, {
        repliedByOfficial: true,
        comments: post.stats.comments + 1,
      });
      setText("");
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box mt={3} bg={C.raised} borderRadius="10px" p={3}>
      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder={`Reply to @${item.actor.username} as @nexzyofficial`}
        bg="transparent"
        border="none"
        color={C.text}
        _placeholder={{ color: C.faint }}
        _focusVisible={{ outline: "none" }}
        resize="vertical"
        p={0}
        fontSize="sm"
      />
      <Flex justify="flex-end" gap={2} mt={2} align="center">
        {err && (
          <Text color="red.300" fontSize="xs" mr="auto">
            {err}
          </Text>
        )}
        <Button size="xs" variant="ghost" color={C.muted} onClick={onDone}>
          Cancel
        </Button>
        <Button
          size="xs"
          bg="nexzy.blue"
          color="white"
          _hover={{ opacity: 0.9 }}
          onClick={() => void send()}
          loading={busy}
          disabled={!text.trim()}
        >
          Send reply
        </Button>
      </Flex>
    </Box>
  );
}
