"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Container, Flex, Text, Textarea } from "@chakra-ui/react";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInPanel from "@/components/auth/SignInPanel";

interface Comment {
  id: string;
  parentId: string | null;
  content: string;
  author: { id: string; username: string };
  upvotes: number;
  downvotes: number;
  myVote: number; // -1 | 0 | 1
  createdAt: string;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Reader comments on any published content post — reused across rewind / blog /
 * guides / lists. Keyed by the post's public `slug`. Reading is open to
 * everyone; posting/voting requires the same account as the Nexzy app (Google /
 * Apple), and every comment is moderated server-side.
 */
export default function ContentComments({
  slug,
  accent = "#65b8ea",
}: {
  slug: string;
  accent?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
      if (res.ok) setComments(await res.json());
    } catch {
      // leave list as-is
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    const content = draft.trim();
    if (!content || posting) return;
    setPosting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setNotice("Please verify your Nexzy account before commenting.");
        return;
      }
      if (!res.ok) {
        setNotice(data?.message || "Couldn't post your comment.");
        return;
      }
      setDraft("");
      if (data.held) {
        setNotice("Thanks — your comment is awaiting review.");
      } else {
        await load();
      }
    } catch {
      setNotice("Network error — please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function vote(id: string, value: number) {
    if (!user) {
      setShowSignIn(true);
      return;
    }
    // optimistic
    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, myVote: c.myVote === value ? 0 : value } : c,
      ),
    );
    try {
      const res = await fetch("/api/comments/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id, value }),
      });
      if (res.ok) {
        const t = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  upvotes: t.upvotes,
                  downvotes: t.downvotes,
                  myVote: t.myVote,
                }
              : c,
          ),
        );
      } else if (res.status === 403) {
        setShowSignIn(true);
      }
    } catch {
      // revert by reloading
      load();
    }
  }

  async function remove(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/comments/${id}`, { method: "DELETE" });
    } catch {
      load();
    }
  }

  const canPost = !!user && user.isVerified !== false;

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
        <Flex align="baseline" justify="space-between" mb={5}>
          <Text
            fontFamily="heading"
            fontSize={{ base: "xl", md: "2xl" }}
            fontWeight="700"
            color="white"
          >
            Join the conversation
          </Text>
          <Text fontSize="sm" color="whiteAlpha.600">
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </Text>
        </Flex>

        {/* Composer / sign-in gate */}
        {canPost ? (
          <Box mb={8}>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Share a memory or a hot take…"
              rows={3}
              bg="whiteAlpha.100"
              border="1px solid"
              borderColor="whiteAlpha.300"
              color="white"
              _placeholder={{ color: "whiteAlpha.500" }}
              maxLength={4000}
            />
            <Flex mt={2} justify="space-between" align="center">
              <Text fontSize="xs" color="whiteAlpha.500">
                Posting as {user?.username || user?.firstName || "you"}
              </Text>
              <Button
                onClick={submit}
                loading={posting}
                disabled={!draft.trim()}
                bg={accent}
                color="nexzy.navy"
                fontWeight="700"
                borderRadius="full"
                px={6}
              >
                Post
              </Button>
            </Flex>
          </Box>
        ) : (
          <Box
            mb={8}
            p={5}
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="xl"
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
                <Text color="whiteAlpha.800" fontSize="sm" mb={3}>
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
                  Sign in
                </Button>
              </>
            )}
          </Box>
        )}

        {notice ? (
          <Text mb={5} fontSize="sm" color={accent}>
            {notice}
          </Text>
        ) : null}

        {/* List */}
        {loading ? (
          <Text color="whiteAlpha.600" fontSize="sm">
            Loading comments…
          </Text>
        ) : comments.length === 0 ? (
          <Text color="whiteAlpha.600" fontSize="sm">
            Be the first to comment.
          </Text>
        ) : (
          <Flex direction="column" gap={5}>
            {comments.map((c) => (
              <Box
                key={c.id}
                p={4}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.100"
                borderRadius="lg"
              >
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontWeight="600" color="white" fontSize="sm">
                    {c.author.username}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.500">
                    {timeAgo(c.createdAt)}
                  </Text>
                </Flex>
                <Text
                  color="whiteAlpha.900"
                  fontSize="sm"
                  whiteSpace="pre-wrap"
                >
                  {c.content}
                </Text>
                <Flex mt={3} align="center" gap={4}>
                  <Button
                    onClick={() => vote(c.id, 1)}
                    variant="ghost"
                    size="xs"
                    color={c.myVote === 1 ? accent : "whiteAlpha.700"}
                    _hover={{ color: accent, bg: "whiteAlpha.100" }}
                  >
                    ▲ {c.upvotes}
                  </Button>
                  <Button
                    onClick={() => vote(c.id, -1)}
                    variant="ghost"
                    size="xs"
                    color={c.myVote === -1 ? "red.300" : "whiteAlpha.700"}
                    _hover={{ color: "red.300", bg: "whiteAlpha.100" }}
                  >
                    ▼ {c.downvotes}
                  </Button>
                  {user && user.id === c.author.id ? (
                    <Button
                      onClick={() => remove(c.id)}
                      variant="ghost"
                      size="xs"
                      color="whiteAlpha.500"
                      _hover={{ color: "red.300", bg: "whiteAlpha.100" }}
                    >
                      Delete
                    </Button>
                  ) : null}
                </Flex>
              </Box>
            ))}
          </Flex>
        )}
      </Container>
    </Box>
  );
}
