"use client";

import { useRef, useState } from "react";
import { Box, Button, Flex, Text, Textarea } from "@chakra-ui/react";
import {
  CommentT,
  avatarColor,
  createComment,
  deleteComment,
  editComment,
  fetchReplies,
  initials,
  reportComment,
  timeAgo,
  voteComment,
} from "./commentsApi";

export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const c = avatarColor(name);
  return (
    <Box
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      bg={c.bg}
      color={c.fg}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontWeight="700"
      fontSize={`${Math.round(size * 0.37)}px`}
      flexShrink={0}
    >
      {initials(name)}
    </Box>
  );
}

/** Reusable composer for a new comment or a reply. Manages its own text state. */
export function Composer({
  accent,
  placeholder,
  submitLabel = "Post",
  authorName,
  initialValue = "",
  autoFocus = false,
  onSubmit,
  onCancel,
}: {
  accent: string;
  placeholder: string;
  submitLabel?: string;
  authorName?: string;
  initialValue?: string;
  autoFocus?: boolean;
  onSubmit: (content: string) => Promise<{ held?: boolean } | void>;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setNotice(null);
    const res = await onSubmit(content);
    setBusy(false);
    if (res && res.held) {
      setNotice("Thanks — your comment is awaiting review.");
      setText("");
      return;
    }
    setText("");
  }

  return (
    <Box w="100%">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        bg="whiteAlpha.100"
        border="1px solid"
        borderColor="whiteAlpha.300"
        color="white"
        _placeholder={{ color: "whiteAlpha.500" }}
        maxLength={4000}
        borderRadius="12px"
      />
      <Flex mt={2} justify="space-between" align="center">
        <Text fontSize="xs" color="whiteAlpha.500">
          {authorName ? `Posting as ${authorName}` : ""}
        </Text>
        <Flex gap={2}>
          {onCancel ? (
            <Button
              onClick={onCancel}
              variant="ghost"
              size="sm"
              color="whiteAlpha.700"
              _hover={{ bg: "whiteAlpha.100" }}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            onClick={submit}
            loading={busy}
            disabled={!text.trim()}
            bg={accent}
            color="nexzy.navy"
            fontWeight="700"
            borderRadius="full"
            px={6}
          >
            {submitLabel}
          </Button>
        </Flex>
      </Flex>
      {notice ? (
        <Text mt={2} fontSize="sm" color={accent}>
          {notice}
        </Text>
      ) : null}
    </Box>
  );
}

export default function CommentItem({
  comment,
  currentUserId,
  authorName,
  accent,
  slug,
  isReply = false,
  requireSignIn,
  onDeleted,
  onAddReply,
}: {
  comment: CommentT;
  currentUserId?: string;
  authorName?: string;
  accent: string;
  slug: string;
  isReply?: boolean;
  requireSignIn: () => boolean; // returns true if the user must sign in first
  onDeleted: (id: string) => void;
  // Provided to reply items so replying to a reply appends to the SAME flat
  // thread (single-level nesting, YouTube-style) rather than nesting deeper.
  onAddReply?: (text: string) => Promise<{ held?: boolean } | void>;
}) {
  const [content, setContent] = useState(comment.content);
  const [editedAt, setEditedAt] = useState<string | null>(comment.editedAt);
  const [up, setUp] = useState(comment.upvotes);
  const [down, setDown] = useState(comment.downvotes);
  const [myVote, setMyVote] = useState(comment.myVote);

  const [replies, setReplies] = useState<CommentT[] | null>(null);
  const [replyCount, setReplyCount] = useState(comment.replyCount);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const busyVote = useRef(false);

  const isOwner = !!currentUserId && currentUserId === comment.author.id;

  async function vote(value: number) {
    if (requireSignIn()) return;
    if (busyVote.current) return;
    busyVote.current = true;
    // optimistic
    const nextMine = myVote === value ? 0 : value;
    setMyVote(nextMine);
    const r = await voteComment(comment.id, value);
    busyVote.current = false;
    if (r.ok) {
      setUp(r.upvotes ?? up);
      setDown(r.downvotes ?? down);
      setMyVote(r.myVote ?? nextMine);
    } else if (r.status === 403) {
      requireSignIn();
    }
  }

  async function loadReplies() {
    setLoadingReplies(true);
    const rs = await fetchReplies(comment.id);
    setReplies(rs);
    setReplyCount(rs.length);
    setShowReplies(true);
    setLoadingReplies(false);
  }

  async function submitReply(text: string) {
    if (requireSignIn()) return;
    const res = await createComment(slug, text, comment.id);
    if (!res.ok) return;
    if (!res.held) {
      // Optimistically append the new reply.
      const now = new Date().toISOString();
      const newReply: CommentT = {
        id: `tmp-${now}`,
        parentId: comment.id,
        content: text,
        author: { id: currentUserId ?? "", username: authorName ?? "you" },
        upvotes: 0,
        downvotes: 0,
        myVote: 0,
        replyCount: 0,
        editedAt: null,
        createdAt: now,
      };
      setReplies((prev) => [...(prev ?? []), newReply]);
      setReplyCount((n) => n + 1);
      setShowReplies(true);
    }
    setReplying(false);
    return { held: res.held };
  }

  async function saveEdit(text: string) {
    const res = await editComment(comment.id, text);
    if (res.ok) {
      setContent(text);
      setEditedAt(new Date().toISOString());
      setEditing(false);
    }
    return { held: res.held };
  }

  async function doDelete() {
    setMenuOpen(false);
    setDeleted(true);
    const ok = await deleteComment(comment.id);
    if (!ok) setDeleted(false);
    else onDeleted(comment.id);
  }

  async function doReport() {
    setMenuOpen(false);
    if (requireSignIn()) return;
    const ok = await reportComment(comment.id);
    if (ok) setReported(true);
  }

  if (deleted) return null;

  const avatarSize = isReply ? 30 : 38;

  return (
    <Flex gap={3} mb={isReply ? 3 : 4}>
      <Avatar name={comment.author.username} size={avatarSize} />
      <Box flex="1" minW={0}>
        <Flex align="center" gap={2} mb={1} wrap="wrap">
          <Text
            fontWeight="600"
            fontSize={isReply ? "13px" : "14px"}
            color="white"
          >
            {comment.author.username}
          </Text>
          <Text fontSize="12px" color="whiteAlpha.500">
            {timeAgo(comment.createdAt)}
          </Text>
          {editedAt ? (
            <Text fontSize="11px" color="whiteAlpha.400">
              (edited)
            </Text>
          ) : null}
        </Flex>

        {editing ? (
          <Composer
            accent={accent}
            placeholder="Edit your comment…"
            submitLabel="Save"
            initialValue={content}
            autoFocus
            onSubmit={saveEdit}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <Text
            fontSize={isReply ? "13px" : "14px"}
            lineHeight="1.6"
            color="whiteAlpha.900"
            whiteSpace="pre-wrap"
            mb={2}
          >
            {content}
          </Text>
        )}

        {!editing && (
          <Flex align="center" gap={4} fontSize="13px" color="whiteAlpha.700">
            <Flex
              align="center"
              gap={3}
              bg="whiteAlpha.100"
              borderRadius="full"
              px={3}
              py={1}
            >
              <Box
                as="button"
                onClick={() => vote(1)}
                color={myVote === 1 ? accent : "whiteAlpha.700"}
                _hover={{ color: accent }}
                display="flex"
                alignItems="center"
                gap={1}
              >
                ▲ {up}
              </Box>
              <Box w="1px" h="14px" bg="whiteAlpha.300" />
              <Box
                as="button"
                onClick={() => vote(-1)}
                color={myVote === -1 ? "red.300" : "whiteAlpha.700"}
                _hover={{ color: "red.300" }}
                display="flex"
                alignItems="center"
                gap={1}
              >
                ▼ {down}
              </Box>
            </Flex>

            {!isReply || onAddReply ? (
              <Box
                as="button"
                onClick={() => {
                  if (requireSignIn()) return;
                  setReplying((v) => !v);
                }}
                _hover={{ color: "white" }}
              >
                Reply
              </Box>
            ) : null}

            {reported ? (
              <Text fontSize="12px" color="whiteAlpha.500">
                Reported
              </Text>
            ) : (
              <Box position="relative">
                <Box
                  as="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  _hover={{ color: "white" }}
                  aria-label="More options"
                >
                  ⋯
                </Box>
                {menuOpen ? (
                  <>
                    <Box
                      position="fixed"
                      inset="0"
                      zIndex={10}
                      onClick={() => setMenuOpen(false)}
                    />
                    <Box
                      position="absolute"
                      top="22px"
                      left="0"
                      zIndex={11}
                      bg="#141a2e"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      borderRadius="10px"
                      py={1}
                      minW="140px"
                      boxShadow="0 12px 30px rgba(0,0,0,.5)"
                    >
                      {isOwner ? (
                        <>
                          <MenuItem
                            label="Edit"
                            onClick={() => {
                              setMenuOpen(false);
                              setEditing(true);
                            }}
                          />
                          <MenuItem label="Delete" danger onClick={doDelete} />
                        </>
                      ) : (
                        <MenuItem label="Report" onClick={doReport} />
                      )}
                    </Box>
                  </>
                ) : null}
              </Box>
            )}
          </Flex>
        )}

        {replying ? (
          <Box mt={3}>
            <Composer
              accent={accent}
              placeholder="Write a reply…"
              submitLabel="Reply"
              authorName={authorName}
              initialValue={isReply ? `@${comment.author.username} ` : ""}
              autoFocus
              onSubmit={async (text) => {
                const res =
                  isReply && onAddReply
                    ? await onAddReply(text)
                    : await submitReply(text);
                setReplying(false);
                return res;
              }}
              onCancel={() => setReplying(false)}
            />
          </Box>
        ) : null}

        {/* Replies */}
        {!isReply && (replyCount > 0 || showReplies) ? (
          <Box
            mt={3}
            pl={4}
            borderLeft="2px solid"
            borderColor="whiteAlpha.100"
          >
            {showReplies && replies ? (
              <>
                {replies.map((r) => (
                  <CommentItem
                    key={r.id}
                    comment={r}
                    currentUserId={currentUserId}
                    authorName={authorName}
                    accent={accent}
                    slug={slug}
                    isReply
                    requireSignIn={requireSignIn}
                    onAddReply={submitReply}
                    onDeleted={(id) =>
                      setReplies((prev) =>
                        (prev ?? []).filter((x) => x.id !== id),
                      )
                    }
                  />
                ))}
              </>
            ) : replyCount > 0 ? (
              <Box
                as="button"
                onClick={loadReplies}
                color={accent}
                fontSize="13px"
                _hover={{ textDecoration: "underline" }}
              >
                {loadingReplies
                  ? "Loading replies…"
                  : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Flex>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      display="block"
      w="100%"
      textAlign="left"
      px={3}
      py={2}
      fontSize="13px"
      color={danger ? "red.300" : "whiteAlpha.900"}
      _hover={{ bg: "whiteAlpha.100" }}
    >
      {label}
    </Box>
  );
}
