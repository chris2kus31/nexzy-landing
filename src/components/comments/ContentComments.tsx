"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Container, Flex, Text } from "@chakra-ui/react";
import { FaRegUser } from "react-icons/fa";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInModal from "@/components/auth/SignInModal";
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
  const { user, signOut } = useAuth();
  const [items, setItems] = useState<CommentT[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [sort, setSort] = useState<CommentSort>("top");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const sentinel = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const authorName = user?.username || user?.firstName || "you";
  const canPost = !!user && user.isVerified !== false;

  // Returns true (and opens the sign-in popup) if the user must sign in first.
  const requireSignIn = useCallback(() => {
    if (user && user.isVerified !== false) return false;
    setAuthModalOpen(true);
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
    if (requireSignIn()) return { blocked: true };
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

        {/* Composer — everyone can type; posting/voting opens the sign-in popup */}
        <Box mb={8}>
          {canPost ? (
            <Flex justify="flex-end" mb={2}>
              <Text fontSize="xs" color="whiteAlpha.500">
                Signed in as{" "}
                <Box as="span" color="whiteAlpha.700">
                  {authorName}
                </Box>{" "}
                ·{" "}
                <Box
                  as="button"
                  onClick={() => signOut()}
                  color={accent}
                  _hover={{ textDecoration: "underline" }}
                >
                  Sign out
                </Box>
              </Text>
            </Flex>
          ) : null}
          <Flex gap={3}>
            {canPost ? (
              <Avatar name={authorName} />
            ) : (
              <Flex
                w="38px"
                h="38px"
                borderRadius="full"
                bg="whiteAlpha.200"
                color="whiteAlpha.700"
                align="center"
                justify="center"
                flexShrink={0}
              >
                <FaRegUser />
              </Flex>
            )}
            <Composer
              accent={accent}
              placeholder="Share a memory or a hot take…"
              authorName={canPost ? authorName : undefined}
              onSubmit={submitTop}
            />
          </Flex>
        </Box>

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

      <SignInModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSignedIn={() => loadFirst(sort)}
      />
    </Box>
  );
}
