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

// Retro nostalgia themes (kind='retro'). Each is a preset filter (platform era +
// IGDB notability band) — keys must match RETRO_THEMES in list-writer.service.ts.
const RETRO_THEMES: { key: string; label: string; hint: string }[] = [
  {
    key: "forgotten-ps1",
    label: "Forgotten PS1 Gems",
    hint: "Underrated PlayStation 1-era games (1994–2000), by notability.",
  },
  {
    key: "snes-classics",
    label: "16-Bit Nintendo Classics",
    hint: "The defining 16-bit Nintendo classics (1990–1996).",
  },
  {
    key: "n64-classics",
    label: "N64 Classics",
    hint: "Nintendo 64 classics that defined a generation (1996–2001).",
  },
  {
    key: "ps2-underrated",
    label: "Underrated PS2 Games",
    hint: "PlayStation 2-era games that got lost in a stacked library.",
  },
  {
    key: "sega-genesis",
    label: "Sega Genesis Gems",
    hint: "Sega Genesis / Mega Drive gems (1989–1996).",
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
  const [theme, setTheme] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setSending(true);
    setMsg(null);
    try {
      await generateList(
        kind,
        kind === "retro" ? (theme ?? undefined) : undefined,
      );
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

  const activeHint =
    kind === "retro"
      ? theme
        ? RETRO_THEMES.find((t) => t.key === theme)?.hint
        : "Pick a retro theme above."
      : KINDS.find((k) => k.value === kind)?.hint;

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
            onClick={() => {
              setKind(k.value);
              setTheme(null);
            }}
          >
            {k.label}
          </Button>
        ))}
      </HStack>

      <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
        Retro nostalgia lists (real games, ranked by notability):
      </Text>
      <HStack gap={2} mb={3} wrap="wrap">
        {RETRO_THEMES.map((t) => {
          const on = kind === "retro" && theme === t.key;
          return (
            <Button
              key={t.key}
              size="sm"
              variant={on ? "solid" : "outline"}
              colorPalette={on ? "purple" : "gray"}
              color={on ? undefined : "nexzy.white"}
              borderColor="whiteAlpha.300"
              onClick={() => {
                setKind("retro");
                setTheme(t.key);
              }}
            >
              {t.label}
            </Button>
          );
        })}
      </HStack>

      {activeHint && (
        <Text color="nexzy.gray.100" fontSize="xs" mb={4}>
          {activeHint}
        </Text>
      )}

      <Flex justify="flex-end">
        <Button
          size="sm"
          colorPalette="purple"
          onClick={submit}
          loading={sending}
          loadingText="Generating…"
          disabled={kind === "retro" && !theme}
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
