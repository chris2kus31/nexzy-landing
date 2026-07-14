"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Stack,
  Heading,
  Text,
  Input,
  Textarea,
  Button,
} from "@chakra-ui/react";
import { commissionStory, getWriterNames } from "@/lib/admin/client";
import { BEATS } from "@/lib/blog/beats";

/**
 * "Commission a story" desk. The Editor-in-Chief hands the newsroom a seed —
 * the angle, an optional source link, the target beat — and the AI staff
 * researches → writes → edits → images it. It lands in the review queue and is
 * never auto-rejected. onRan lets the parent refresh the queue afterward.
 */
export default function CommissionPanel({ onRan }: { onRan?: () => void }) {
  const [beat, setBeat] = useState(BEATS[0].key);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [author, setAuthor] = useState("");
  const [authors, setAuthors] = useState<string[]>([]);
  useEffect(() => {
    getWriterNames()
      .then(setAuthors)
      .catch(() => {});
  }, []);

  const canSend = instructions.trim().length >= 10 && !sending;

  const submit = async () => {
    setSending(true);
    setMsg(null);
    try {
      await commissionStory({
        beat,
        instructions: instructions.trim(),
        sourceUrl: sourceUrl.trim() || undefined,
        workingTitle: title.trim() || undefined,
        author: author || undefined,
      });
      setMsg({
        ok: true,
        text: "Commissioned. The newsroom is researching and writing it now — it'll appear in the review queue below in a few minutes. Hit Refresh to check.",
      });
      setTitle("");
      setSourceUrl("");
      setInstructions("");
      onRan?.();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error)?.message || "Could not commission the story.",
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
        Commission a story
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        Found a story you want covered? Give your staff the angle (and a source
        link if you have one). They&apos;ll research, write, edit, and
        illustrate it — then it lands in your review queue to publish.
      </Text>

      <Stack gap={4}>
        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            Beat
          </Text>
          <HStack gap={2} wrap="wrap">
            {BEATS.map((b) => {
              const active = beat === b.key;
              return (
                <Button
                  key={b.key}
                  size="sm"
                  onClick={() => setBeat(b.key)}
                  bg={active ? "nexzy.blue" : "transparent"}
                  color={active ? "white" : "nexzy.gray.100"}
                  borderWidth="1px"
                  borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
                  _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
                >
                  {b.label}
                </Button>
              );
            })}
          </HStack>
        </Box>

        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            Writer (optional — the desk picks by default)
          </Text>
          <HStack gap={2} wrap="wrap">
            <Button
              size="sm"
              onClick={() => setAuthor("")}
              bg={author === "" ? "nexzy.blue" : "transparent"}
              color={author === "" ? "white" : "nexzy.gray.100"}
              borderWidth="1px"
              borderColor={author === "" ? "nexzy.blue" : "whiteAlpha.300"}
              _hover={{ bg: author === "" ? "nexzy.blue" : "whiteAlpha.100" }}
            >
              Auto
            </Button>
            {authors.map((a) => {
              const active = author === a;
              return (
                <Button
                  key={a}
                  size="sm"
                  onClick={() => setAuthor(a)}
                  bg={active ? "nexzy.blue" : "transparent"}
                  color={active ? "white" : "nexzy.gray.100"}
                  borderWidth="1px"
                  borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
                  _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
                >
                  {a}
                </Button>
              );
            })}
          </HStack>
        </Box>

        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            Working title (optional)
          </Text>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. GTA 6 delayed again"
            color="nexzy.white"
            bg="whiteAlpha.50"
            borderColor="whiteAlpha.300"
            _placeholder={{ color: "nexzy.gray.100" }}
          />
        </Box>

        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            Source link (optional)
          </Text>
          <Input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
            color="nexzy.white"
            bg="whiteAlpha.50"
            borderColor="whiteAlpha.300"
            _placeholder={{ color: "nexzy.gray.100" }}
          />
        </Box>

        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            What&apos;s the story + your angle
          </Text>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Tell your staff what to cover and how to frame it. e.g. 'Rockstar just pushed GTA 6 to late 2026. Cover the new date, why it slipped, and what it means for the delay-weary fanbase — keep it sharp.'"
            rows={4}
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
            loadingText="Commissioning…"
          >
            Commission story
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
