"use client";

import { useState } from "react";
import { Box, Flex, HStack, Heading, Text, Button } from "@chakra-ui/react";
import { generateList, type ListKind } from "@/lib/admin/client";

const KINDS: { value: ListKind; label: string; hint: string }[] = [
  {
    value: "upcoming",
    label: "Upcoming games",
    hint: "Games with a future release date, soonest first.",
  },
  {
    value: "new",
    label: "New this week",
    hint: "Games released in the last few weeks.",
  },
];

/**
 * "Generate a list" desk. Pick a lane (upcoming / new); the ListWriter pulls
 * real games straight from the Nexzy games DB (never fabricated), writes an
 * evergreen list in Chuy's voice → Media → the review queue. Nothing publishes
 * automatically. onRan lets the parent refresh the queue.
 */
export default function ListPanel({ onRan }: { onRan?: () => void }) {
  const [kind, setKind] = useState<ListKind>("upcoming");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setSending(true);
    setMsg(null);
    try {
      await generateList(kind);
      setMsg({
        ok: true,
        text: "On it. The list is being written and illustrated from the games DB now — it'll appear in the review queue in a few minutes. Hit Refresh to check.",
      });
      onRan?.();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error)?.message || "Could not generate the list.",
      });
    } finally {
      setSending(false);
    }
  };

  const active = KINDS.find((k) => k.value === kind);

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
        Generate a list
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        Evergreen &ldquo;what to play&rdquo; lists built straight from your
        games database — no fabricated titles or dates. Published lists live at{" "}
        <Box as="span" color="nexzy.white">
          /lists
        </Box>
        .
      </Text>

      <HStack gap={2} mb={3} wrap="wrap">
        {KINDS.map((k) => (
          <Button
            key={k.value}
            size="sm"
            variant={kind === k.value ? "solid" : "outline"}
            colorPalette={kind === k.value ? "purple" : "gray"}
            color={kind === k.value ? undefined : "nexzy.white"}
            borderColor="whiteAlpha.300"
            onClick={() => setKind(k.value)}
          >
            {k.label}
          </Button>
        ))}
      </HStack>
      {active && (
        <Text color="nexzy.gray.100" fontSize="xs" mb={4}>
          {active.hint}
        </Text>
      )}

      <Flex justify="flex-end">
        <Button
          size="sm"
          colorPalette="purple"
          onClick={submit}
          loading={sending}
          loadingText="Generating…"
        >
          Generate list
        </Button>
      </Flex>

      {msg && (
        <Text mt={4} fontSize="sm" color={msg.ok ? "green.300" : "red.300"}>
          {msg.text}
        </Text>
      )}
    </Box>
  );
}
