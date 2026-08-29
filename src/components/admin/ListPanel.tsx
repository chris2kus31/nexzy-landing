"use client";

import { useState } from "react";
import { Box, Flex, HStack, Heading, Text, Button } from "@chakra-ui/react";
import { FiList, FiFilm } from "react-icons/fi";
import { generateList, runRetroAd } from "@/lib/admin/client";

// Retro nostalgia theme presets — keys must match RETRO_THEMES in the API's
// list-writer.service.ts. Used by both the retro-list and retro-ads sections.
const RETRO_THEMES: { key: string; label: string }[] = [
  { key: "forgotten-ps1", label: "Forgotten PS1 Gems" },
  { key: "snes-classics", label: "16-Bit Nintendo Classics" },
  { key: "n64-classics", label: "N64 Classics" },
  { key: "ps2-underrated", label: "Underrated PS2 Games" },
  { key: "sega-genesis", label: "Sega Genesis Gems" },
];

function ThemeButtons({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <HStack gap={2} mb={3} wrap="wrap">
      {RETRO_THEMES.map((t) => {
        const on = selected === t.key;
        return (
          <Button
            key={t.key}
            size="sm"
            variant={on ? "solid" : "outline"}
            colorPalette={on ? "purple" : "gray"}
            color={on ? undefined : "nexzy.white"}
            borderColor="whiteAlpha.300"
            onClick={() => onSelect(t.key)}
          >
            {t.label}
          </Button>
        );
      })}
    </HStack>
  );
}

/**
 * Content-from-the-games-DB desk. Three separate, single-purpose sections:
 *   1. What to play — upcoming / new-this-week list article (→ /lists)
 *   2. Retro ranked list — a nostalgia list of real era games (→ /lists)
 *   3. Retro ads video — a compilation lead you finish by pasting the ad
 *      transcript at Produce (→ Content Studio → Video Leads)
 * Everything is real games from the DB, never fabricated. Nothing auto-publishes.
 */
export default function ListPanel({ onRan }: { onRan?: () => void }) {
  const [currentKind, setCurrentKind] = useState<"upcoming" | "new">(
    "upcoming",
  );
  const [listTheme, setListTheme] = useState<string | null>(null);
  const [adTheme, setAdTheme] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "current" | "list" | "ad">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const runCurrent = async () => {
    setBusy("current");
    setMsg(null);
    try {
      await generateList(currentKind);
      setMsg({
        ok: true,
        text: "Generating your list from the games DB — it'll land in the Review queue shortly. Hit Refresh to check.",
      });
      onRan?.();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error)?.message || "Could not generate.",
      });
    } finally {
      setBusy("");
    }
  };

  const runRetroList = async () => {
    if (!listTheme) return;
    setBusy("list");
    setMsg(null);
    try {
      await generateList("retro", listTheme);
      setMsg({
        ok: true,
        text: "Generating your retro list from the games DB — it'll land in the Review queue and publish to /lists. Hit Refresh to check.",
      });
      onRan?.();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error)?.message || "Could not generate.",
      });
    } finally {
      setBusy("");
    }
  };

  const runAds = async () => {
    if (!adTheme) return;
    setBusy("ad");
    setMsg(null);
    try {
      const lead = await runRetroAd(adTheme);
      setMsg({
        ok: !!lead,
        text: lead
          ? "Draft created — find it in the Review queue. Publish it and it becomes a video lead in Content Studio → Video Leads; when you Generate, paste each ad's transcript + timestamps into the steer box so it's grounded in the real ad."
          : "Not enough era games with a notability score for this theme yet (the IGDB enrichment backfill fills this in).",
      });
      onRan?.();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error)?.message || "Could not create the retro-ads lead.",
      });
    } finally {
      setBusy("");
    }
  };

  const sectionBorder = {
    borderTop: "1px solid",
    borderColor: "whiteAlpha.200",
    pt: 5,
    mt: 5,
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
        Generate content from your games DB
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm">
        Real games only, never fabricated. Nothing publishes automatically.
      </Text>

      {/* 1. WHAT TO PLAY */}
      <Box {...sectionBorder}>
        <Heading size="sm" color="nexzy.white" mb={1}>
          1 · What to play
        </Heading>
        <Text color="nexzy.gray.100" fontSize="xs" mb={3}>
          A &ldquo;what to play&rdquo; list article → published to{" "}
          <Box as="span" color="nexzy.white">
            /lists
          </Box>
          .
        </Text>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <HStack gap={2} wrap="wrap">
            {(
              [
                { v: "upcoming", label: "Upcoming games" },
                { v: "new", label: "New this week" },
              ] as const
            ).map((k) => (
              <Button
                key={k.v}
                size="sm"
                variant={currentKind === k.v ? "solid" : "outline"}
                colorPalette={currentKind === k.v ? "purple" : "gray"}
                color={currentKind === k.v ? undefined : "nexzy.white"}
                borderColor="whiteAlpha.300"
                onClick={() => setCurrentKind(k.v)}
              >
                {k.label}
              </Button>
            ))}
          </HStack>
          <Button
            size="sm"
            colorPalette="purple"
            onClick={runCurrent}
            loading={busy === "current"}
            loadingText="Generating…"
          >
            <FiList /> Generate list
          </Button>
        </Flex>
      </Box>

      {/* 2. RETRO RANKED LIST */}
      <Box {...sectionBorder}>
        <Heading size="sm" color="nexzy.white" mb={1}>
          2 · Retro ranked list
        </Heading>
        <Text color="nexzy.gray.100" fontSize="xs" mb={3}>
          A nostalgia list of real era games, ranked by IGDB notability →
          published to{" "}
          <Box as="span" color="nexzy.white">
            /lists
          </Box>
          . Pick a theme:
        </Text>
        <ThemeButtons selected={listTheme} onSelect={setListTheme} />
        <Flex justify="flex-end">
          <Button
            size="sm"
            colorPalette="purple"
            onClick={runRetroList}
            loading={busy === "list"}
            loadingText="Generating…"
            disabled={!listTheme}
          >
            <FiList /> Generate retro list
          </Button>
        </Flex>
      </Box>

      {/* 3. RETRO ADS VIDEO */}
      <Box {...sectionBorder}>
        <Heading size="sm" color="nexzy.white" mb={1}>
          3 · Retro ads video
        </Heading>
        <Text color="nexzy.gray.100" fontSize="xs" mb={3}>
          A vintage-commercials compilation lead. You finish it by pasting each
          ad&rsquo;s transcript + timestamps into the steer box when you Produce
          it → lands in{" "}
          <Box as="span" color="nexzy.white">
            Content Studio → Video Leads
          </Box>
          . Pick a theme:
        </Text>
        <ThemeButtons selected={adTheme} onSelect={setAdTheme} />
        <Flex justify="flex-end">
          <Button
            size="sm"
            variant="outline"
            colorPalette="orange"
            borderColor="whiteAlpha.300"
            color="nexzy.white"
            onClick={runAds}
            loading={busy === "ad"}
            loadingText="Creating…"
            disabled={!adTheme}
          >
            <FiFilm /> Generate ads video
          </Button>
        </Flex>
      </Box>

      {msg && (
        <Text mt={5} fontSize="sm" color={msg.ok ? "green.300" : "red.300"}>
          {msg.text}
        </Text>
      )}
    </Box>
  );
}
