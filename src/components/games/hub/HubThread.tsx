"use client";

// Launch-night thread (Phase 2 step 4): the @nexzyofficial post pinned on
// the hub and its replies, newest first. Replies are ordinary feed comments,
// so they also show under the post in the app. Reads/writes go through
// /api/hubs/<slug>/thread (BFF). Fetched once on view (no polling); readers
// can refresh by hand. Hides itself if the thread is gone.
import { useCallback, useEffect, useState } from "react";
import { Box, Flex, HStack, Heading, Stack, Text, Textarea, chakra } from "@chakra-ui/react";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInModal from "@/components/auth/SignInModal";
import { track } from "@/lib/analytics";
import {
  THREAD_REPLY_MAX,
  type HubPerson,
  type HubThread as Thread,
  type HubThreadComment,
} from "@/lib/hubs/social";

const C = {
  panel: "#1a1f3a",
  card: "#11152b",
  line: "rgba(255,255,255,0.12)",
  muted: "#9aa3bf",
  text: "#EDF2F7",
  gold: "#FFD700",
  ink: "#0b0e1d",
};

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function PersonAvatar({ p, size = 32 }: { p: HubPerson | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (p?.avatarUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={p.avatarUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      bg="#2a3156"
      color={C.text}
      fontSize="xs"
      fontWeight="700"
      align="center"
      justify="center"
      flexShrink={0}
      aria-hidden
    >
      {(p?.username || "?").charAt(0).toUpperCase()}
    </Flex>
  );
}

function Button(props: {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <chakra.button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      bg={props.primary ? C.gold : "transparent"}
      color={props.primary ? C.ink : C.text}
      fontWeight={props.primary ? "700" : "500"}
      border="1px solid"
      borderColor={props.primary ? C.gold : C.line}
      borderRadius="10px"
      px={props.small ? 3 : 4}
      py={props.small ? 1 : 2}
      fontSize="sm"
      cursor="pointer"
      _hover={props.primary ? {} : { borderColor: C.gold }}
      _disabled={{ opacity: 0.6, cursor: "default" }}
    >
      {props.children}
    </chakra.button>
  );
}

function Composer({
  placeholder,
  busy,
  onSend,
  onCancel,
  autoFocus,
}: {
  placeholder: string;
  busy: boolean;
  onSend: (text: string) => Promise<boolean>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <Box>
      <Textarea
        value={text}
        maxLength={THREAD_REPLY_MAX}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={2}
        autoFocus={autoFocus}
        bg="#0d1124"
        color={C.text}
        borderColor={C.line}
        _placeholder={{ color: C.muted }}
      />
      <HStack justify="flex-end" gap={2} mt={2}>
        {onCancel && (
          <Button small onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button
          primary
          small
          disabled={busy || !text.trim()}
          onClick={async () => {
            if (await onSend(text)) setText("");
          }}
        >
          {busy ? "Posting..." : "Reply"}
        </Button>
      </HStack>
    </Box>
  );
}

function CommentItem({
  c,
  isReply,
  replyOpen,
  onReplyToggle,
  replyComposer,
}: {
  c: HubThreadComment;
  isReply?: boolean;
  replyOpen?: boolean;
  onReplyToggle?: () => void;
  replyComposer?: React.ReactNode;
}) {
  return (
    <Box>
      <HStack align="start" gap={3}>
        <PersonAvatar p={c.author} size={isReply ? 24 : 30} />
        <Box minW={0} flex="1">
          <HStack gap={2} flexWrap="wrap">
            <Text fontSize="sm" fontWeight="600" color={c.deleted ? C.muted : C.text}>
              {c.author ? `@${c.author.username}` : "[deleted]"}
            </Text>
            <Text fontSize="xs" color={C.muted}>
              {ago(c.createdAt)}
              {c.edited ? " · edited" : ""}
            </Text>
          </HStack>
          {!c.deleted && (
            <Text fontSize="sm" color="#c7cde0" whiteSpace="pre-wrap" wordBreak="break-word" mt={1}>
              {c.content}
            </Text>
          )}
          {!isReply && !c.deleted && onReplyToggle && (
            <chakra.button
              type="button"
              onClick={onReplyToggle}
              bg="transparent"
              color={C.muted}
              fontSize="xs"
              mt={1}
              cursor="pointer"
              _hover={{ color: C.gold }}
            >
              {replyOpen ? "Cancel reply" : "Reply"}
            </chakra.button>
          )}
          {replyComposer}
          {c.replies.length > 0 && (
            <Stack gap={3} mt={3} pl={3} borderLeft="2px solid" borderColor={C.line}>
              {c.replies.map((r) => (
                <CommentItem key={r.id} c={r} isReply />
              ))}
            </Stack>
          )}
        </Box>
      </HStack>
    </Box>
  );
}

type Pending = { text: string; parentId?: string } | null;

export default function HubThread({ slug, gameName }: { slug: string; gameName: string }) {
  const { user, loading } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  // Bumped after a successful post so composers start empty again (also
  // after a post sent on the reader's behalf right after signing in).
  const [resetKey, setResetKey] = useState(0);

  const load = useCallback(async () => {
    const r = await fetch(`/api/hubs/${slug}/thread`, { cache: "no-store" }).catch(() => null);
    if (!r) return;
    if (r.status === 404) {
      setGone(true);
      return;
    }
    if (r.ok) setThread((await r.json()) as Thread);
  }, [slug]);

  // Once per view, and again when the reader signs in or out (block rules).
  useEffect(() => {
    if (loading) return;
    void load();
  }, [load, loading, user]);

  const post = useCallback(
    async (text: string, parentId?: string): Promise<boolean> => {
      setBusy(true);
      setError(null);
      setNote(null);
      try {
        const r = await fetch(`/api/hubs/${slug}/thread/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, ...(parentId ? { parentCommentId: parentId } : {}) }),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok) {
          setError(
            r.status === 401
              ? "Sign in again to reply."
              : r.status === 429
                ? "Slow down a sec, then try again."
                : (typeof d?.message === "string" && d.message) || "That didn't go through. Try again.",
          );
          return false;
        }
        track("hub_thread_reply", { slug, threaded: parentId ? "true" : "false" });
        if (d?.flagged) {
          setNote("Your reply is being checked and will show once it clears.");
        }
        setReplyTo(null);
        setResetKey((k) => k + 1);
        await load();
        return true;
      } catch {
        setError("Couldn't reach Nexzy. Try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [slug, load],
  );

  const send = useCallback(
    async (text: string, parentId?: string): Promise<boolean> => {
      if (!user) {
        setPending({ text, parentId });
        return false;
      }
      return post(text, parentId);
    },
    [user, post],
  );

  const more = useCallback(async () => {
    if (!thread?.nextCursor) return;
    const r = await fetch(
      `/api/hubs/${slug}/thread?cursor=${encodeURIComponent(thread.nextCursor)}`,
      { cache: "no-store" },
    ).catch(() => null);
    if (!r || !r.ok) return;
    const d = (await r.json()) as Thread;
    setThread((t) =>
      t
        ? {
            ...t,
            comments: [...t.comments, ...d.comments.filter((x) => !t.comments.some((y) => y.id === x.id))],
            nextCursor: d.nextCursor,
          }
        : d,
    );
  }, [thread, slug]);

  if (gone) return null;

  return (
    <Box
      as="section"
      id="launch-thread"
      aria-labelledby="launch-thread-h"
      bg={C.panel}
      borderRadius="18px"
      border="1px solid"
      borderColor="rgba(255,215,0,0.35)"
      p={{ base: 5, md: 6 }}
      scrollMarginTop="80px"
    >
      <HStack justify="space-between" align="baseline" flexWrap="wrap" gap={2} mb={4}>
        <Heading as="h2" id="launch-thread-h" fontFamily="heading" fontSize={{ base: "xl", md: "2xl" }} color="white">
          {gameName} launch night
        </Heading>
        <chakra.button
          type="button"
          onClick={() => void load()}
          bg="transparent"
          color={C.muted}
          fontSize="sm"
          cursor="pointer"
          _hover={{ color: C.gold }}
        >
          Refresh
        </chakra.button>
      </HStack>

      {!thread ? (
        <Text fontSize="sm" color={C.muted}>
          Loading the thread...
        </Text>
      ) : (
        <>
          <Box bg={C.card} borderRadius="14px" p={4} border="1px solid" borderColor={C.line}>
            <HStack gap={3} mb={2}>
              <PersonAvatar p={thread.post.author} size={36} />
              <Box>
                <Text fontSize="sm" fontWeight="700" color={C.text}>
                  @{thread.post.author.username}
                </Text>
                <Text fontSize="xs" color={C.muted}>
                  Pinned · {ago(thread.post.createdAt)}
                </Text>
              </Box>
            </HStack>
            <Text color={C.text} whiteSpace="pre-wrap" wordBreak="break-word" lineHeight="1.6">
              {thread.post.content}
            </Text>
            <Text fontSize="xs" color={C.muted} mt={2}>
              {thread.post.commentCount.toLocaleString("en-US")}{" "}
              {thread.post.commentCount === 1 ? "reply" : "replies"} · also in the Nexzy app
            </Text>
          </Box>

          <Box mt={4}>
            <Composer
              key={`main-${resetKey}`}
              placeholder={`How's ${gameName} running for you?`}
              busy={busy}
              onSend={(t) => send(t)}
            />
            {note && (
              <Text fontSize="sm" color={C.muted} mt={2}>
                {note}
              </Text>
            )}
            {error && (
              <Text fontSize="sm" color="red.300" mt={2} role="alert">
                {error}
              </Text>
            )}
          </Box>

          {thread.comments.length > 0 && (
            <Stack gap={5} mt={5}>
              {thread.comments.map((c) => (
                <CommentItem
                  key={c.id}
                  c={c}
                  replyOpen={replyTo === c.id}
                  onReplyToggle={() => setReplyTo((r) => (r === c.id ? null : c.id))}
                  replyComposer={
                    replyTo === c.id ? (
                      <Box mt={2}>
                        <Composer
                          placeholder={`Reply to @${c.author?.username ?? "player"}`}
                          busy={busy}
                          autoFocus
                          onSend={(t) => send(t, c.id)}
                          onCancel={() => setReplyTo(null)}
                        />
                      </Box>
                    ) : null
                  }
                />
              ))}
            </Stack>
          )}
          {thread.nextCursor && (
            <Box mt={4}>
              <Button onClick={() => void more()}>Older replies</Button>
            </Box>
          )}
        </>
      )}

      <SignInModal
        open={pending !== null}
        onClose={() => setPending(null)}
        onSignedIn={async () => {
          const p = pending;
          setPending(null);
          if (p) await post(p.text, p.parentId);
        }}
        title="Join the launch-night thread"
        subtitle="Sign in to reply. Same account as the Nexzy app."
      />
    </Box>
  );
}
