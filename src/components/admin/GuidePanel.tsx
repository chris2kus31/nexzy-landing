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
import { generateGuide } from "@/lib/admin/client";

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
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const canSend = game.trim().length >= 2 && !sending;

  const submit = async () => {
    setSending(true);
    setMsg(null);
    try {
      await generateGuide({
        game: game.trim(),
        focus: focus.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
      setMsg({
        ok: true,
        text: "On it. The guide is being written and illustrated now — it'll appear in the review queue in a few minutes. Hit Refresh to check.",
      });
      setGame("");
      setFocus("");
      setInstructions("");
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
