"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Container, Flex, Text } from "@chakra-ui/react";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInPanel from "@/components/auth/SignInPanel";
import CommentItem, { Avatar, Composer } from "./CommentItem";
import { CommentSort, CommentT, createComment, fetchPage } from "./commentsApi";

const SORTS: { key: CommentSort; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
];

/**
 * Rich reader-comments section for any published content post (rewind/blog/
 * guides/lists). Sort, cursor-paginated infinite scroll, threaded replies,
 * avatars, optimistic votes, edit/report/delete. Reading is open; posting and
 * voting require the same Nexzy account as the app.
 */
export default function ContentComments({
  slug,
  accent = "#65b8ea",
}: {
  slug: string;
  accent?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CommentT[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [sort, setSort] = useState<CommentSort>("top");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  const sentinel = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const authorName = user?.username || user?.firstName || "you";
  const canPost = !!user && user.isVerified !== false;

  // Returns true (and reveals the sign-in panel) if the user must sign in.
  const requireSignIn = useCallback(() => {
    if (user && user.isVerified !== false) return false;
    setShowSignIn(true);
    return true;
  }, [user]);

  const loadFirst = useCallback(
    async (nextSort: CommentSort) => {
      setLoading(true);
      loadingRef.current = true;
      const page = await fetchPage(slug, nextSort, null);
      loadingRef.current = false;
      setLoading(false);
      if (!page) return;
      setItems(page.items);
      setTotal(page.total);
      setCursor(page.nextCursor);
      cursorRef.current = page.nextCursor;
    },
    [slug],
  );

  useEffect(() => {
    loadFirst(sort);
  }, [sort, loadFirst]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !cursorRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    const page = await fetchPage(slug, sort, cursorRef.current);
    loadingRef.current = false;
    setLoadingMore(false);
    if (!page) return;
    setItems((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
    cursorRef.current = page.nextCursor;
  }, [slug, sort]);

  // Infinite scroll — load the next page when the sentinel enters view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  async function submitTop(text: string) {
    if (requireSignIn()) return;
    const res = await createComment(slug, text);
    if (!res.ok) return;
    if (!res.held && user) {
      const now = new Date().toISOString();
      const optimistic: CommentT = {
        id: `tmp-${now}`,
        parentId: null,
        content: text,
        author: { id: user.id, username: authorName },
        upvotes: 0,
        downvotes: 0,
        myVote: 0,
        replyCount: 0,
        editedAt: null,
        createdAt: now,
      };
      setItems((prev) => [optimistic, ...prev]);
      setTotal((t) => t + 1);
    }
    return { held: res.held };
  }

  function onDeleted(id: string) {
    setItems((prev) => prev.filter((c) => c.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }

  return (
    <Box
      as="section"
      bg="nexzy.navy"
      borderTop="1px solid"
      borderColor="whiteAlpha.200"
      py={{ base: 10, md: 14 }}
      px={{ base: 3, md: 6 }}
    >
      <Container maxW="3xl" p="0">
        <Flex align="center" justify="space-between" mb={5} gap={3}>
          <Text
            fontFamily="heading"
            fontSize={{ base: "xl", md: "2xl" }}
            fontWeight="700"
            color="white"
          >
            Join the conversation
          </Text>
          <Flex align="center" gap={3}>
            <Text fontSize="sm" color="whiteAlpha.600">
              {total} {total === 1 ? "comment" : "comments"}
            </Text>
            <Box position="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as CommentSort)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#c7d4e8",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: "999px",
                  padding: "6px 12px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {SORTS.map((s) => (
                  <option
                    key={s.key}
                    value={s.key}
                    style={{ background: "#0b1526" }}
                  >
                    {s.label}
                  </option>
                ))}
              </select>
            </Box>
          </Flex>
        </Flex>

        {/* Composer / sign-in gate */}
        {canPost ? (
          <Flex gap={3} mb={8}>
            <Avatar name={authorName} />
            <Composer
              accent={accent}
              placeholder="Share a memory or a hot take…"
              authorName={authorName}
              onSubmit={submitTop}
            />
          </Flex>
        ) : (
          <Box
            mb={8}
            p={5}
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="16px"
            textAlign="center"
          >
            {authLoading ? (
              <Text color="whiteAlpha.700" fontSize="sm">
                Loading…
              </Text>
            ) : user && user.isVerified === false ? (
              <Text color="whiteAlpha.800" fontSize="sm">
                Please verify your Nexzy account to join the conversation.
              </Text>
            ) : showSignIn ? (
              <SignInPanel onDone={() => setShowSignIn(false)} />
            ) : (
              <>
                <Text color="white" fontSize="md" fontWeight="600" mb={1}>
                  Jump in — what did this take you back to?
                </Text>
                <Text color="whiteAlpha.700" fontSize="sm" mb={3}>
                  Sign in with your Nexzy account to comment and vote.
                </Text>
                <Button
                  onClick={() => setShowSignIn(true)}
                  bg={accent}
                  color="nexzy.navy"
                  fontWeight="700"
                  borderRadius="full"
                  px={6}
                >
                  Sign in to comment
                </Button>
              </>
            )}
          </Box>
        )}

        {/* List */}
        {loading ? (
          <Text color="whiteAlpha.600" fontSize="sm">
            Loading comments…
          </Text>
        ) : items.length === 0 ? (
          <Text color="whiteAlpha.600" fontSize="sm">
            Be the first to comment.
          </Text>
        ) : (
          <Box>
            {items.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                currentUserId={user?.id}
                authorName={authorName}
                accent={accent}
                slug={slug}
                requireSignIn={requireSignIn}
                onDeleted={onDeleted}
              />
            ))}
            <Box ref={sentinel} h="1px" />
            {loadingMore ? (
              <Text
                textAlign="center"
                fontSize="13px"
                color="whiteAlpha.500"
                pt={4}
              >
                Loading more…
              </Text>
            ) : null}
          </Box>
        )}
      </Container>
    </Box>
  );
}
