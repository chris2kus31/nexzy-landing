"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  createOfficialComment,
  createOfficialPost,
  getOfficialStatus,
  searchGamesForLink,
  type GameLite,
  type OfficialStatus,
} from "@/lib/admin/client";

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  size: "sm" as const,
};
const primaryBtn = {
  bg: "nexzy.blue",
  color: "white",
  _hover: { bg: "nexzy.blue", opacity: 0.9 },
};
const outlineBtn = {
  variant: "outline" as const,
  color: "nexzy.gray.100",
  borderColor: "whiteAlpha.300",
  _hover: { bg: "whiteAlpha.100" },
};
const card = {
  borderWidth: "1px",
  borderColor: "whiteAlpha.200",
  borderRadius: "10px",
  p: 4,
};

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

/** Pull a post id out of a pasted id or any link that contains one. */
function extractUuid(s: string): string | null {
  const m = s.match(UUID_RE);
  return m ? m[0].toLowerCase() : null;
}

/** Friendly copy for the API's post error codes. */
function postError(msg: string): string {
  if (msg.includes("POST_BLOCKED_MODERATION"))
    return "Moderation blocked this post. Reword it and try again.";
  if (msg.includes("SPAM_DUPLICATE_POST"))
    return "You already posted this exact text in the last 24 hours.";
  return msg;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Box {...card} p={3}>
      <Text fontSize="xs" color="whiteAlpha.600">
        {label}
      </Text>
      <Text fontSize="xl" color="nexzy.white" fontFamily="title">
        {value}
      </Text>
    </Box>
  );
}

/** Admin → Official: the @nexzy account. Post and reply as @nexzy. */
export default function OfficialPanel() {
  const [status, setStatus] = useState<OfficialStatus | null>(null);
  const [loadErr, setLoadErr] = useState("");

  const load = useCallback(() => {
    setLoadErr("");
    getOfficialStatus()
      .then(setStatus)
      .catch((e: Error) => setLoadErr(e.message));
  }, []);
  useEffect(load, [load]);

  if (loadErr) {
    return (
      <Text color="red.300" fontSize="sm">
        {loadErr}
      </Text>
    );
  }
  if (!status) return <Spinner color="nexzy.blue" />;

  return (
    <VStack align="stretch" gap={6} maxW="720px">
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Official account
        </Heading>
        <Text fontSize="sm" color="whiteAlpha.600">
          Post and reply as{" "}
          {status.user ? `@${status.user.username}` : "the official account"}.
          Posts go through the same moderation and spam rules as any user.
        </Text>
      </Box>

      {!status.configured ? (
        <Box {...card} borderColor="orange.400">
          <Text color="nexzy.white" fontSize="sm" mb={1}>
            Not configured yet.
          </Text>
          <Text color="whiteAlpha.700" fontSize="sm">
            Create the @nexzy account through normal signup in the app, then set
            NEXZY_OFFICIAL_USER_ID to its user id on the API and restart.
          </Text>
        </Box>
      ) : (
        <>
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
            <Stat label="Followers" value={status.followers} />
            <Stat label="Games followed" value={status.gamesFollowed} />
            <Stat
              label="Auto-follow on signup"
              value={status.autoFollowEnabled ? "On" : "Off"}
            />
            <Stat
              label="Welcome on first post"
              value={status.welcomeEnabled ? "On" : "Off"}
            />
          </SimpleGrid>
          <ComposePost onDone={load} />
          <ReplyBox />
        </>
      )}
    </VStack>
  );
}

function ComposePost({ onDone }: { onDone: () => void }) {
  const [content, setContent] = useState("");
  const [isPoll, setIsPoll] = useState(false);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [game, setGame] = useState<GameLite | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GameLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const search = async () => {
    if (!q.trim()) return;
    try {
      setResults(await searchGamesForLink(q.trim()));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
  const canPost =
    !!content.trim() &&
    !busy &&
    (!isPoll || (cleanOptions.length >= 2 && cleanOptions.length <= 4));

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await createOfficialPost({
        type: isPoll ? "poll" : game ? "game" : "text",
        content: content.trim(),
        gameId: game?.id,
        options: isPoll ? cleanOptions : undefined,
      });
      setContent("");
      setOptions(["", ""]);
      setIsPoll(false);
      setGame(null);
      setMsg({ ok: true, text: "Posted to the feed." });
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: postError((e as Error).message) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box {...card}>
      <Text color="nexzy.white" fontWeight="semibold" mb={3}>
        New post
      </Text>
      <VStack align="stretch" gap={3}>
        <Textarea
          {...inputProps}
          rows={4}
          maxLength={2000}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            isPoll
              ? "Poll question, e.g. Who is buying GTA 6 day one?"
              : "What's on your mind?"
          }
        />

        <HStack gap={2}>
          <Button
            size="sm"
            {...(isPoll ? outlineBtn : primaryBtn)}
            onClick={() => setIsPoll(false)}
          >
            Post
          </Button>
          <Button
            size="sm"
            {...(isPoll ? primaryBtn : outlineBtn)}
            onClick={() => setIsPoll(true)}
          >
            Poll
          </Button>
        </HStack>

        {isPoll && (
          <VStack align="stretch" gap={2}>
            {options.map((o, i) => (
              <Input
                key={i}
                {...inputProps}
                maxLength={80}
                value={o}
                onChange={(e) =>
                  setOptions(
                    options.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
                placeholder={`Option ${i + 1}`}
              />
            ))}
            {options.length < 4 && (
              <Button
                size="xs"
                {...outlineBtn}
                alignSelf="flex-start"
                onClick={() => setOptions([...options, ""])}
              >
                Add option
              </Button>
            )}
          </VStack>
        )}

        <Box>
          <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
            Tag a game (optional)
          </Text>
          {game ? (
            <HStack gap={2}>
              <Text color="nexzy.white" fontSize="sm">
                {game.name}
              </Text>
              <Button size="xs" {...outlineBtn} onClick={() => setGame(null)}>
                Remove
              </Button>
            </HStack>
          ) : (
            <>
              <HStack gap={2}>
                <Input
                  {...inputProps}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder="Search games"
                />
                <Button size="sm" {...outlineBtn} onClick={search}>
                  Search
                </Button>
              </HStack>
              {results.length > 0 && (
                <VStack align="stretch" gap={1} mt={2}>
                  {results.slice(0, 8).map((g) => (
                    <Button
                      key={g.id}
                      size="xs"
                      {...outlineBtn}
                      justifyContent="flex-start"
                      onClick={() => {
                        setGame(g);
                        setResults([]);
                        setQ("");
                      }}
                    >
                      {g.name}
                      {g.released ? ` (${g.released.slice(0, 4)})` : ""}
                    </Button>
                  ))}
                </VStack>
              )}
            </>
          )}
        </Box>

        <HStack gap={3}>
          <Button
            size="sm"
            {...primaryBtn}
            disabled={!canPost}
            onClick={submit}
          >
            {busy ? "Posting..." : "Post as @nexzy"}
          </Button>
          {msg && (
            <Text fontSize="sm" color={msg.ok ? "green.300" : "red.300"}>
              {msg.text}
            </Text>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}

function ReplyBox() {
  const [target, setTarget] = useState("");
  const [parent, setParent] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const postId = extractUuid(target);
  const parentId = parent.trim() ? extractUuid(parent) : null;
  const parentInvalid = !!parent.trim() && !parentId;
  const canSend = !!postId && !!content.trim() && !parentInvalid && !busy;

  const submit = async () => {
    if (!postId) return;
    setBusy(true);
    setMsg(null);
    try {
      await createOfficialComment({
        postId,
        content: content.trim(),
        parentCommentId: parentId ?? undefined,
      });
      setContent("");
      setMsg({ ok: true, text: "Reply posted." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box {...card}>
      <Text color="nexzy.white" fontWeight="semibold" mb={1}>
        Reply as @nexzy
      </Text>
      <Text fontSize="xs" color="whiteAlpha.600" mb={3}>
        Paste a post id or any link that contains it. Community Pulse will add
        one-click replies later.
      </Text>
      <VStack align="stretch" gap={3}>
        <Input
          {...inputProps}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Post id or link"
        />
        {target.trim() && !postId && (
          <Text fontSize="xs" color="red.300">
            No post id found in that text.
          </Text>
        )}
        <Input
          {...inputProps}
          value={parent}
          onChange={(e) => setParent(e.target.value)}
          placeholder="Reply to a comment instead (optional comment id)"
        />
        {parentInvalid && (
          <Text fontSize="xs" color="red.300">
            That comment id is not valid.
          </Text>
        )}
        <Textarea
          {...inputProps}
          rows={3}
          maxLength={2000}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Your reply"
        />
        <HStack gap={3}>
          <Button
            size="sm"
            {...primaryBtn}
            disabled={!canSend}
            onClick={submit}
          >
            {busy ? "Sending..." : "Reply"}
          </Button>
          {msg && (
            <Text fontSize="sm" color={msg.ok ? "green.300" : "red.300"}>
              {msg.text}
            </Text>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}
