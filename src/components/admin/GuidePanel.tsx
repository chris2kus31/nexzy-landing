"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Input,
  Textarea,
  Button,
} from "@chakra-ui/react";
import { generateGuide, proposeGuideOutline } from "@/lib/admin/client";

/**
 * "Generate a guide" desk. The Editor-in-Chief gives a game + the specific
 * boss/level/challenge, and the GuideWriter builds an evergreen, SEO-structured
 * "how to beat X" guide (grounded in real strategy) → Media → the review queue.
 * Nothing publishes automatically. onRan lets the parent refresh the queue.
 */
export default function GuidePanel({ onRan }: { onRan?: () => void }) {
  const [game, setGame] = useState("");
  const [focus, setFocus] = useState("");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [outline, setOutline] = useState<string[]>([]);
  const [proposing, setProposing] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const canSend = game.trim().length >= 2 && !sending;

  const propose = async () => {
    setProposing(true);
    setMsg(null);
    try {
      const r = await proposeGuideOutline({
        game: game.trim(),
        focus: focus.trim() || undefined,
        instructions: instructions.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setOutline(r.outline || []);
      if (!r.outline?.length)
        setMsg({ ok: false, text: "Couldn't propose an outline — try again." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error)?.message || "Outline failed." });
    } finally {
      setProposing(false);
    }
  };
  const setHeadingAt = (i: number, v: string) =>
    setOutline((o) => o.map((h, j) => (j === i ? v : h)));
  const moveHeading = (i: number, dir: -1 | 1) =>
    setOutline((o) => {
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const removeHeading = (i: number) =>
    setOutline((o) => o.filter((_, j) => j !== i));
  const addHeading = () => setOutline((o) => [...o, ""]);

  const submit = async () => {
    setSending(true);
    setMsg(null);
    try {
      const cleanOutline = outline.map((h) => h.trim()).filter(Boolean);
      await generateGuide({
        game: game.trim(),
        focus: focus.trim() || undefined,
        instructions: instructions.trim() || undefined,
        notes: notes.trim() || undefined,
        outline: cleanOutline.length ? cleanOutline : undefined,
      });
      setMsg({
        ok: true,
        text: "On it. The guide is being written and illustrated now — it'll appear in the review queue in a few minutes. Hit Refresh to check.",
      });
      setGame("");
      setFocus("");
      setInstructions("");
      setNotes("");
      setOutline([]);
      onRan?.();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error)?.message || "Could not generate the guide.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={5}
      mb={8}
    >
      <Heading size="md" color="nexzy.white" mb={1}>
        Generate a guide
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        Evergreen &ldquo;how to beat X&rdquo; guides — the high-intent SEO play.
        Give the game and the specific boss, level, or challenge; the writer
        grounds it in real strategy and it lands in your review queue. Published
        guides live at{" "}
        <Box as="span" color="nexzy.white">
          /guides
        </Box>
        .
      </Text>

      <Stack gap={4}>
        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            Game
          </Text>
          <Input
            value={game}
            onChange={(e) => setGame(e.target.value)}
            placeholder="e.g. Elden Ring"
            color="nexzy.white"
            bg="whiteAlpha.50"
            borderColor="whiteAlpha.300"
            _placeholder={{ color: "nexzy.gray.100" }}
          />
        </Box>

        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            Boss / level / challenge (optional)
          </Text>
          <Input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. Malenia, Blade of Miquella"
            color="nexzy.white"
            bg="whiteAlpha.50"
            borderColor="whiteAlpha.300"
            _placeholder={{ color: "nexzy.gray.100" }}
          />
          <Text color="nexzy.gray.100" fontSize="10px" mt={1}>
            Leave blank for a general game guide.
          </Text>
        </Box>

        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            Extra direction (optional)
          </Text>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Platform, difficulty, build focus, or angle. e.g. 'Focus on a melee/no-summons approach on PS5.'"
            rows={3}
            color="nexzy.white"
            bg="whiteAlpha.50"
            borderColor="whiteAlpha.300"
            _placeholder={{ color: "nexzy.gray.100" }}
          />
        </Box>

        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            Your notes (optional — authoritative)
          </Text>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste your own firsthand strategy here. The writer builds the guide around your notes and treats them as the source of truth — web research only fills gaps."
            rows={6}
            color="nexzy.white"
            bg="whiteAlpha.50"
            borderColor="whiteAlpha.300"
            _placeholder={{ color: "nexzy.gray.100" }}
          />
          <Text color="nexzy.gray.100" fontSize="10px" mt={1}>
            When provided, your notes lead — the AI won&rsquo;t contradict them.
          </Text>
        </Box>

        <Box>
          <Flex justify="space-between" align="center" mb={2}>
            <Text color="nexzy.gray.100" fontSize="xs">
              Outline (optional)
            </Text>
            <Button
              size="xs"
              variant="outline"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              loading={proposing}
              disabled={game.trim().length < 2 || proposing}
              onClick={propose}
            >
              {outline.length ? "Re-propose" : "Propose outline"}
            </Button>
          </Flex>
          {outline.length === 0 ? (
            <Text color="nexzy.gray.100" fontSize="10px">
              Let the AI draft a section outline you can edit and reorder before
              it writes. Skip it and the writer structures the guide itself.
            </Text>
          ) : (
            <Stack gap={2}>
              {outline.map((h, i) => (
                <Flex key={i} gap={1} align="center">
                  <Input
                    value={h}
                    onChange={(e) => setHeadingAt(i, e.target.value)}
                    size="sm"
                    color="nexzy.white"
                    bg="whiteAlpha.50"
                    borderColor="whiteAlpha.300"
                    _placeholder={{ color: "nexzy.gray.100" }}
                  />
                  <Button
                    size="xs"
                    variant="ghost"
                    color="nexzy.white"
                    disabled={i === 0}
                    onClick={() => moveHeading(i, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="nexzy.white"
                    disabled={i === outline.length - 1}
                    onClick={() => moveHeading(i, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="red.300"
                    onClick={() => removeHeading(i)}
                  >
                    ✕
                  </Button>
                </Flex>
              ))}
              <Button
                size="xs"
                variant="ghost"
                color="nexzy.lightBlue"
                alignSelf="flex-start"
                onClick={addHeading}
              >
                + Add section
              </Button>
            </Stack>
          )}
        </Box>

        <Flex justify="flex-end">
          <Button
            size="sm"
            colorPalette="blue"
            onClick={submit}
            disabled={!canSend}
            loading={sending}
            loadingText="Generating…"
          >
            Generate guide
          </Button>
        </Flex>
      </Stack>

      {msg && (
        <Text mt={4} fontSize="sm" color={msg.ok ? "green.300" : "red.300"}>
          {msg.text}
        </Text>
      )}
    </Box>
  );
}
