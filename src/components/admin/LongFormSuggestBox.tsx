"use client";

import { useState } from "react";
import { Box, Button, Flex, HStack, Text, Textarea } from "@chakra-ui/react";
import { FiFilm } from "react-icons/fi";
import {
  runCountdown,
  runExplainer,
  useContentSuggestion,
  type ContentSuggestion,
} from "@/lib/admin/client";

/**
 * The long-form suggestion strip on a Content Studio lead (Monday cron):
 * what to make and why, plus one-click Commission where the generator needs
 * no extra input. Commission spends writer tokens (owner-only); Skip is the
 * card's normal Skip. Chronicles points at its panel (facts are required there).
 */
export default function LongFormSuggestBox({
  s,
  isOwner,
  onDone,
}: {
  s: ContentSuggestion;
  isOwner: boolean;
  /** Remove the card from the board after a successful commission. */
  onDone: (id: string) => void;
}) {
  const lf = s.payload?.longformSuggest;
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  if (!lf) return null;

  const kindLabel =
    lf.kind === "explainer"
      ? "Everything We Know"
      : lf.kind === "countdown"
        ? "Nexzy Countdown"
        : "Game Chronicles";

  const commission = async () => {
    setBusy(true);
    setErr(null);
    try {
      const made =
        lf.kind === "countdown"
          ? await runCountdown({ template: lf.templateKey || "" })
          : await runExplainer({
              subject: lf.subject,
              notes: notes.trim() || undefined,
            });
      if (!made) {
        setErr(
          lf.kind === "countdown"
            ? "The generator refused (unknown template or too few games)."
            : "The generator refused (empty subject).",
        );
        return;
      }
      await useContentSuggestion(s.id).catch(() => undefined);
      setDone(true);
      onDone(s.id);
    } catch (e) {
      setErr((e as Error)?.message || "Commission failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      mt={3}
      mb={3}
      p={3}
      borderRadius="md"
      border="1px solid"
      borderColor="purple.400/50"
      bg="whiteAlpha.50"
    >
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
        <Box minW={0}>
          <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={1}>
            <FiFilm aria-hidden style={{ display: "inline" }} /> LONG-FORM
            SUGGESTION · {kindLabel.toUpperCase()}
          </Text>
          <Text color="nexzy.white" fontSize="sm" fontWeight="700">
            {s.title}
          </Text>
          <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
            {lf.reason}
          </Text>
        </Box>
        {isOwner && lf.kind !== "chronicles" && (
          <HStack gap={2} flexShrink={0}>
            <Button
              size="xs"
              variant="solid"
              bg="purple.600"
              color="white"
              _hover={{ bg: "purple.700" }}
              loading={busy}
              disabled={done}
              onClick={() => void commission()}
              title="Runs the writer now (spends tokens); the draft lands in the review queue"
            >
              {done ? "Commissioned" : "Commission now"}
            </Button>
          </HStack>
        )}
      </Flex>
      {isOwner && lf.kind === "explainer" && !done && (
        <Box mt={2}>
          <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={1}>
            YOUR NOTES (optional but recommended — the writer grounds on them)
          </Text>
          <Textarea
            size="sm"
            rows={3}
            bg="nexzy.navy"
            borderColor="whiteAlpha.300"
            color="nexzy.white"
            placeholder="Paste confirmed facts, trailer notes, dates — anything real about the game…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Box>
      )}
      {lf.kind === "chronicles" && (
        <Text color="nexzy.lightBlue" fontSize="xs" mt={2}>
          Commission this one in Guides &amp; Walkthroughs → Game Chronicles
          (episode {lf.nextEpisode ?? "?"} of &quot;{lf.arc}&quot; — sourced
          facts required there).
        </Text>
      )}
      {err && (
        <Text color="red.300" fontSize="xs" mt={2}>
          {err}
        </Text>
      )}
    </Box>
  );
}
