"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  Spinner,
} from "@chakra-ui/react";
import { FiCopy, FiTrash2, FiPlus, FiRefreshCw } from "react-icons/fi";
import {
  getReplyTargets,
  setReplyTargets,
  draftReply,
  type ReplyTarget,
} from "@/lib/admin/client";

/**
 * Replies (Phase 6) — the reply engine. Two jobs, both manual-ship by design:
 *   1) A target-account WATCHLIST (bigger gaming accounts worth replying to),
 *      persisted server-side. Click one to pre-fill the drafter.
 *   2) A reply DRAFTER: paste a target's post → get a genuine, value-add reply
 *      in the chosen writer's voice — X keeps the edge, Threads goes warm.
 * A reply that earns the author's reply-back is the cheapest reach on X/Threads;
 * the engine drafts, a human still posts it.
 */

type Platform = "x" | "threads";

const PLAT_LABEL: Record<Platform, string> = { x: "X", threads: "Threads" };

// Cap on the pasted post — long enough for any X/Threads post (and a long X
// Premium post), short enough to keep the draft prompt bounded.
const POST_MAX = 4000;

const errText = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

export default function RepliesPanel({ isOwner }: { isOwner: boolean }) {
  const [targets, setTargets] = useState<ReplyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // New-target inputs
  const [newPlatform, setNewPlatform] = useState<Platform>("x");
  const [newHandle, setNewHandle] = useState("");
  const [newNote, setNewNote] = useState("");

  // Drafter
  const [platform, setPlatform] = useState<Platform>("x");
  const [writer, setWriter] = useState("Chuy");
  const [handle, setHandle] = useState("");
  const [post, setPost] = useState("");
  const [angle, setAngle] = useState("");
  // The draft remembers which platform it was written for (the toggle can
  // change afterwards) and whether it is an error message (never copyable).
  const [reply, setReply] = useState<{
    text: string;
    platform: Platform;
    error: boolean;
  } | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      setTargets(await getReplyTargets());
    } catch (e) {
      setLoadErr(errText(e, "Couldn't load the watchlist."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Save the watchlist; true on success. On failure the list is unchanged
   *  and the reason is shown. */
  const persist = async (next: ReplyTarget[]): Promise<boolean> => {
    setSaving(true);
    setSaveErr(null);
    try {
      setTargets(await setReplyTargets(next));
      return true;
    } catch (e) {
      setSaveErr(`Couldn't save the watchlist: ${errText(e, "unknown error")}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addTarget = async () => {
    const h = newHandle.trim().replace(/^@/, "");
    if (!h) return;
    const next = [
      ...targets.filter((t) => !(t.platform === newPlatform && t.handle === h)),
      { platform: newPlatform, handle: h, note: newNote.trim() || undefined },
    ];
    // Clear the inputs only once the save succeeded, so a failed save
    // doesn't lose the typed handle (CA-25).
    if (await persist(next)) {
      setNewHandle("");
      setNewNote("");
    }
  };

  const removeTarget = async (t: ReplyTarget) => {
    await persist(
      targets.filter(
        (x) => !(x.platform === t.platform && x.handle === t.handle),
      ),
    );
  };

  const useTarget = (t: ReplyTarget) => {
    setPlatform(t.platform);
    setHandle(t.handle);
    setReply(null);
  };

  const runDraft = async () => {
    if (!post.trim()) return;
    setDrafting(true);
    setReply(null);
    const forPlatform = platform;
    try {
      const res = await draftReply({
        targetPost: post.slice(0, POST_MAX),
        targetHandle: handle.trim() || undefined,
        writer: writer.trim() || "Chuy",
        platform: forPlatform,
        angle: angle.trim() || undefined,
      });
      setReply(
        res.reply
          ? { text: res.reply, platform: forPlatform, error: false }
          : {
              text: "No reply came back — try again.",
              platform: forPlatform,
              error: true,
            },
      );
    } catch (e) {
      setReply({
        text: `Draft failed: ${errText(e, "unknown error")} — try again.`,
        platform: forPlatform,
        error: true,
      });
    } finally {
      setDrafting(false);
    }
  };

  const copy = async () => {
    if (!reply || reply.error) return;
    try {
      await navigator.clipboard.writeText(reply.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const PlatformToggle = ({
    value,
    onChange,
  }: {
    value: Platform;
    onChange: (p: Platform) => void;
  }) => (
    <HStack gap={2}>
      {(["x", "threads"] as Platform[]).map((p) => (
        <Button
          key={p}
          size="sm"
          variant={value === p ? "solid" : "outline"}
          bg={value === p ? "nexzy.blue" : "transparent"}
          color={value === p ? "white" : "nexzy.gray.100"}
          borderColor="whiteAlpha.300"
          _hover={{ bg: value === p ? "nexzy.blue" : "whiteAlpha.100" }}
          onClick={() => onChange(p)}
        >
          {PLAT_LABEL[p]}
        </Button>
      ))}
    </HStack>
  );

  if (!isOwner) {
    return (
      <Text color="nexzy.gray.100" fontSize="sm">
        The reply engine is owner-only.
      </Text>
    );
  }

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Reply engine
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          Replies to bigger gaming accounts are the cheapest reach on X and
          Threads — a reply the author replies back to out-reaches your own
          posts many times over. Draft here in your writer&apos;s voice, then
          post it yourself (X keeps the edge; Threads stays warm).
        </Text>
      </Box>

      {/* Watchlist */}
      <Box borderTop="1px solid" borderColor="whiteAlpha.200" pt={4}>
        <HStack justify="space-between" mb={3}>
          <Heading size="sm" color="nexzy.white">
            Target watchlist{" "}
            {saving && <Spinner size="xs" color="nexzy.gray.100" />}
          </Heading>
          <Button
            size="xs"
            variant="ghost"
            color="nexzy.gray.100"
            _hover={{ bg: "whiteAlpha.100", color: "nexzy.white" }}
            onClick={load}
          >
            <FiRefreshCw /> Refresh
          </Button>
        </HStack>

        {loadErr && (
          <Text color="red.300" fontSize="xs" mb={2}>
            {loadErr}
          </Text>
        )}
        {loading ? (
          <Spinner size="sm" color="nexzy.gray.100" />
        ) : targets.length === 0 ? (
          <Text color="nexzy.gray.100" fontSize="sm" mb={3}>
            No targets yet. Add the bigger gaming accounts you want to reply to.
          </Text>
        ) : (
          <VStack align="stretch" gap={2} mb={3}>
            {targets.map((t) => (
              <HStack
                key={`${t.platform}:${t.handle}`}
                justify="space-between"
                bg="whiteAlpha.50"
                borderRadius="md"
                px={3}
                py={2}
              >
                <Box>
                  <Text color="nexzy.white" fontSize="sm">
                    <b>{PLAT_LABEL[t.platform]}</b> · @{t.handle}
                  </Text>
                  {t.note && (
                    <Text color="nexzy.gray.100" fontSize="xs">
                      {t.note}
                    </Text>
                  )}
                </Box>
                <HStack gap={1}>
                  <Button
                    size="xs"
                    variant="outline"
                    borderColor="whiteAlpha.300"
                    color="nexzy.gray.100"
                    _hover={{ bg: "whiteAlpha.100", color: "nexzy.white" }}
                    onClick={() => useTarget(t)}
                  >
                    Reply
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="nexzy.gray.100"
                    _hover={{ bg: "whiteAlpha.100", color: "red.300" }}
                    onClick={() => removeTarget(t)}
                    aria-label="Remove target"
                  >
                    <FiTrash2 />
                  </Button>
                </HStack>
              </HStack>
            ))}
          </VStack>
        )}

        {/* Add a target */}
        <HStack gap={2} wrap="wrap" align="flex-end">
          <PlatformToggle value={newPlatform} onChange={setNewPlatform} />
          <Input
            size="sm"
            placeholder="handle (no @)"
            value={newHandle}
            onChange={(e) => setNewHandle(e.target.value)}
            maxW="180px"
            bg="whiteAlpha.50"
            borderColor="whiteAlpha.300"
            color="nexzy.white"
          />
          <Input
            size="sm"
            placeholder="note (optional)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            maxW="220px"
            bg="whiteAlpha.50"
            borderColor="whiteAlpha.300"
            color="nexzy.white"
          />
          <Button
            size="sm"
            bg="nexzy.blue"
            color="white"
            _hover={{ bg: "nexzy.blue" }}
            onClick={addTarget}
            disabled={!newHandle.trim() || saving}
          >
            <FiPlus /> Add
          </Button>
        </HStack>
        {saveErr && (
          <Text color="red.300" fontSize="xs" mt={2}>
            {saveErr}
          </Text>
        )}
      </Box>

      {/* Drafter */}
      <Box borderTop="1px solid" borderColor="whiteAlpha.200" pt={4}>
        <Heading size="sm" color="nexzy.white" mb={3}>
          Draft a reply
        </Heading>
        <VStack align="stretch" gap={3}>
          <HStack gap={3} wrap="wrap" align="flex-end">
            <Box>
              <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
                Platform
              </Text>
              <PlatformToggle value={platform} onChange={setPlatform} />
            </Box>
            <Box>
              <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
                Writer
              </Text>
              <Input
                size="sm"
                value={writer}
                onChange={(e) => setWriter(e.target.value)}
                maxW="140px"
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.300"
                color="nexzy.white"
              />
            </Box>
            <Box>
              <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
                Their handle (optional)
              </Text>
              <Input
                size="sm"
                placeholder="handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                maxW="160px"
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.300"
                color="nexzy.white"
              />
            </Box>
          </HStack>

          <Box>
            <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
              Their post (paste it)
            </Text>
            <Textarea
              value={post}
              onChange={(e) => setPost(e.target.value.slice(0, POST_MAX))}
              maxLength={POST_MAX}
              placeholder="Paste the post you want to reply to…"
              rows={4}
              bg="whiteAlpha.50"
              borderColor="whiteAlpha.300"
              color="nexzy.white"
            />
            <Text
              fontSize="10px"
              mt={0.5}
              color={post.length >= POST_MAX ? "orange.300" : "whiteAlpha.500"}
            >
              {post.length.toLocaleString()}/{POST_MAX.toLocaleString()}
              {post.length >= POST_MAX ? " — trimmed to the limit" : ""}
            </Text>
          </Box>

          <Box>
            <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
              Angle (optional — a fact or take to weave in)
            </Text>
            <Input
              size="sm"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="e.g. point out the patch already nerfed this"
              bg="whiteAlpha.50"
              borderColor="whiteAlpha.300"
              color="nexzy.white"
            />
          </Box>

          <HStack>
            <Button
              bg="nexzy.blue"
              color="white"
              _hover={{ bg: "nexzy.blue" }}
              onClick={runDraft}
              disabled={!post.trim() || drafting}
            >
              {drafting ? <Spinner size="sm" /> : "Draft reply"}
            </Button>
          </HStack>

          {reply && (
            <Box
              bg="whiteAlpha.50"
              borderRadius="md"
              borderColor="whiteAlpha.200"
              borderWidth="1px"
              p={3}
            >
              <HStack justify="space-between" mb={2}>
                <Text color="nexzy.gray.100" fontSize="xs">
                  {reply.error
                    ? "No draft"
                    : `${PLAT_LABEL[reply.platform]} reply`}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  color="nexzy.gray.100"
                  _hover={{ bg: "whiteAlpha.100", color: "nexzy.white" }}
                  onClick={copy}
                  disabled={reply.error}
                >
                  <FiCopy /> {copied ? "Copied" : "Copy"}
                </Button>
              </HStack>
              <Text
                color={reply.error ? "red.300" : "nexzy.white"}
                fontSize="sm"
                whiteSpace="pre-wrap"
              >
                {reply.text}
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
    </VStack>
  );
}
