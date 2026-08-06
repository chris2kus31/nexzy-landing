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

export default function RepliesPanel({ isOwner }: { isOwner: boolean }) {
  const [targets, setTargets] = useState<ReplyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  const [reply, setReply] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTargets(await getReplyTargets());
    } catch {
      /* leave empty on failure */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (next: ReplyTarget[]) => {
    setSaving(true);
    try {
      setTargets(await setReplyTargets(next));
    } catch {
      /* keep local on failure */
    } finally {
      setSaving(false);
    }
  };

  const addTarget = async () => {
    const h = newHandle.trim().replace(/^@/, "");
    if (!h) return;
    const next = [
      ...targets.filter(
        (t) => !(t.platform === newPlatform && t.handle === h),
      ),
      { platform: newPlatform, handle: h, note: newNote.trim() || undefined },
    ];
    setNewHandle("");
    setNewNote("");
    await persist(next);
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
    setReply("");
  };

  const runDraft = async () => {
    if (!post.trim()) return;
    setDrafting(true);
    setReply("");
    try {
      const res = await draftReply({
        targetPost: post,
        targetHandle: handle.trim() || undefined,
        writer: writer.trim() || "Chuy",
        platform,
        angle: angle.trim() || undefined,
      });
      setReply(res.reply || "(no reply returned — try again)");
    } catch {
      setReply("(draft failed — try again)");
    } finally {
      setDrafting(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reply);
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
          posts many times over. Draft here in your writer&apos;s voice, then post
          it yourself (X keeps the edge; Threads stays warm).
        </Text>
      </Box>

      {/* Watchlist */}
      <Box
        borderTop="1px solid"
        borderColor="whiteAlpha.200"
        pt={4}
      >
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
              onChange={(e) => setPost(e.target.value)}
              placeholder="Paste the post you want to reply to…"
              rows={4}
              bg="whiteAlpha.50"
              borderColor="whiteAlpha.300"
              color="nexzy.white"
            />
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
                  {PLAT_LABEL[platform]} reply
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  color="nexzy.gray.100"
                  _hover={{ bg: "whiteAlpha.100", color: "nexzy.white" }}
                  onClick={copy}
                >
                  <FiCopy /> {copied ? "Copied" : "Copy"}
                </Button>
              </HStack>
              <Text color="nexzy.white" fontSize="sm" whiteSpace="pre-wrap">
                {reply}
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
    </VStack>
  );
}
