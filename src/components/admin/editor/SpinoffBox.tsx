"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { FiCopy } from "react-icons/fi";
import { getMe, spinoffPost, type BlogPost } from "@/lib/admin/client";

type Kind = "guide" | "review" | "video_lead";

/**
 * "CREATE MORE FROM THIS" — spin a guide, review or video lead off the post
 * being edited. Pre-filled server-side with the post's brief facts + angle;
 * your notes stay the authoritative source. Owner-only (token spend); each
 * spin-off rides its existing pipeline and lands in the review queue (guide,
 * review) or Content Studio -> Leads (video lead).
 */
export default function SpinoffBox({ post }: { post: BlogPost }) {
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState<Kind | null>(null);
  const [game, setGame] = useState("");
  const [focus, setFocus] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(8);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [made, setMade] = useState<Set<Kind>>(new Set());

  useEffect(() => {
    getMe()
      .then((m) => setIsOwner(!!m.isOwner))
      .catch(() => setIsOwner(false));
  }, []);

  // Walkthrough spin-offs arrive with the guide-pipeline fixes (Phase 3).
  if (!isOwner || ["walkthrough", "rewind"].includes(post.type ?? "")) {
    return null;
  }

  const pick = (k: Kind) => {
    setMsg(null);
    setOpen((cur) => (cur === k ? null : k));
    setGame(post.tags?.[0] ?? "");
  };

  const go = async (k: Kind) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await spinoffPost(post.id, {
        type: k,
        game: game.trim() || undefined,
        focus: k === "guide" ? focus.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
        rating: k === "review" ? rating : undefined,
      });
      if (!r.ok) {
        setMsg({ ok: false, text: r.reason || "The generator refused." });
        return;
      }
      setMade((prev) => new Set(prev).add(k));
      setMsg({
        ok: true,
        text:
          k === "video_lead"
            ? "Video lead created — it's in Content Studio → Leads."
            : `${k === "guide" ? "Guide" : "Review"} queued — it lands in the review queue.`,
      });
      setOpen(null);
      setNotes("");
      setFocus("");
    } catch (e) {
      setMsg({ ok: false, text: (e as Error)?.message || "Spin-off failed." });
    } finally {
      setBusy(false);
    }
  };

  const label: Record<Kind, string> = {
    guide: "Guide",
    review: "Review",
    video_lead: "Video lead",
  };

  return (
    <Box
      p={3}
      borderRadius="md"
      border="1px solid"
      borderColor="whiteAlpha.200"
      bg="whiteAlpha.50"
    >
      <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={2}>
        <FiCopy aria-hidden style={{ display: "inline" }} /> CREATE MORE FROM
        THIS
      </Text>
      <HStack gap={2} wrap="wrap">
        {(Object.keys(label) as Kind[]).map((k) => (
          <Button
            key={k}
            size="xs"
            variant={open === k ? "solid" : "outline"}
            bg={open === k ? "nexzy.blue" : "transparent"}
            color={open === k ? "white" : "nexzy.gray.100"}
            borderColor="whiteAlpha.300"
            _hover={{ bg: open === k ? "nexzy.blue" : "whiteAlpha.100" }}
            disabled={made.has(k)}
            onClick={() => pick(k)}
          >
            {made.has(k) ? `${label[k]} created` : `+ ${label[k]}`}
          </Button>
        ))}
      </HStack>

      {open && (
        <Box mt={3}>
          {(open === "guide" || open === "review") && (
            <Input
              size="sm"
              mb={2}
              bg="nexzy.navy"
              borderColor="whiteAlpha.300"
              color="nexzy.white"
              placeholder={open === "guide" ? "Game" : "Game / subject"}
              value={game}
              onChange={(e) => setGame(e.target.value)}
            />
          )}
          {open === "guide" && (
            <Input
              size="sm"
              mb={2}
              bg="nexzy.navy"
              borderColor="whiteAlpha.300"
              color="nexzy.white"
              placeholder="Focus (boss / level / task) — optional"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            />
          )}
          {open === "review" && (
            <Flex align="center" gap={2} mb={2}>
              <Text color="nexzy.gray.100" fontSize="xs">
                Your rating:
              </Text>
              <Input
                size="sm"
                w="70px"
                type="number"
                min={1}
                max={10}
                bg="nexzy.navy"
                borderColor="whiteAlpha.300"
                color="nexzy.white"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value) || 5)}
              />
              <Text color="whiteAlpha.600" fontSize="xs">
                / 10
              </Text>
            </Flex>
          )}
          <Textarea
            size="sm"
            rows={3}
            bg="nexzy.navy"
            borderColor="whiteAlpha.300"
            color="nexzy.white"
            placeholder={
              open === "review"
                ? "Your notes (required) — your real take; the writer grounds on them…"
                : "Your notes (optional) — play notes, strategy, what to cover…"
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Text color="whiteAlpha.600" fontSize="xs" mt={1}>
            The article&apos;s facts and angle come along automatically.
          </Text>
          <Button
            size="xs"
            mt={2}
            variant="solid"
            bg="nexzy.blue"
            color="white"
            _hover={{ bg: "blue.600" }}
            loading={busy}
            disabled={open === "review" && !notes.trim()}
            onClick={() => void go(open)}
          >
            Create {label[open].toLowerCase()}
          </Button>
        </Box>
      )}
      {msg && (
        <Text color={msg.ok ? "green.300" : "red.300"} fontSize="xs" mt={2}>
          {msg.text}
        </Text>
      )}
    </Box>
  );
}
