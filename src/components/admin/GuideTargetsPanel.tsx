"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Heading,
  Button,
  Badge,
  Input,
  Spinner,
  SimpleGrid,
} from "@chakra-ui/react";
import {
  getGuideTargets,
  refreshGuideTargets,
  approveContentGuide,
  skipContentSuggestion,
  type ContentSuggestion,
} from "@/lib/admin/client";

/**
 * "Guide Targets" — this week's recently-released games that don't have a guide
 * yet, freshest first. A weekly cron refreshes the batch; this is the
 * daily-viewable board where you pick what to write. One click generates a
 * GUIDE or a WALKTHROUGH (owner-only) → it lands in the Review queue.
 */

// Angles arrive as full sentences that repeat the game name
// ("Beginner's guide to The Alters: Last Variable"). Strip the game name and
// leading connectors so the chip reads as a tight label ("Beginner's guide").
function tightenAngle(angle: string, game: string): string {
  let a = angle.trim();
  if (game) {
    const g = game.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    a = a.replace(new RegExp(`\\s*(?:to|for|in|of|:)?\\s*${g}\\b`, "ig"), " ");
  }
  a = a
    .replace(/\s{2,}/g, " ")
    .replace(/[\s:–—-]+$/g, "")
    .trim();
  if (!a) return angle.trim();
  return a.charAt(0).toUpperCase() + a.slice(1);
}

function TargetCard({
  s,
  onDone,
  isOwner,
}: {
  s: ContentSuggestion;
  onDone: (id: string) => void;
  isOwner: boolean;
}) {
  const [busy, setBusy] = useState<"guide" | "walkthrough" | "skip" | null>(
    null,
  );
  const [showFocus, setShowFocus] = useState(false);
  const [focus, setFocus] = useState("");
  const game = s.payload?.game ?? s.title.replace(/^Guide:\s*/i, "");
  const released = s.payload?.released ?? null;
  const genres = s.payload?.genres ?? [];

  // De-dupe + tighten angle labels, cap the visible set so the card stays short.
  const angles = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of s.payload?.angles ?? []) {
      const t = tightenAngle(raw, game);
      const key = t.toLowerCase();
      if (t && !seen.has(key)) {
        seen.add(key);
        out.push(t);
      }
    }
    return out;
  }, [s.payload?.angles, game]);
  const shownAngles = angles.slice(0, 3);
  const extraAngles = angles.length - shownAngles.length;

  const generate = async (format: "guide" | "walkthrough") => {
    setBusy(format);
    try {
      await approveContentGuide(s.id, {
        focus: focus.trim() || undefined,
        format,
      });
      onDone(s.id);
    } catch {
      setBusy(null);
    }
  };
  const skip = async () => {
    setBusy("skip");
    try {
      await skipContentSuggestion(s.id);
      onDone(s.id);
    } catch {
      setBusy(null);
    }
  };

  // Compact meta line: release date first, then genres, dot-separated.
  const meta: string[] = [];
  if (released) meta.push(`Released ${released}`);
  for (const g of genres.slice(0, 3)) meta.push(g);

  return (
    <Flex
      direction="column"
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={3.5}
      gap={2.5}
      transition="border-color 0.15s"
      _hover={{ borderColor: "whiteAlpha.300" }}
    >
      {/* Title + meta */}
      <Box>
        <Text
          color="nexzy.white"
          fontWeight="700"
          fontSize="md"
          lineHeight="1.25"
          lineClamp={2}
          title={game}
        >
          {game}
        </Text>
        {meta.length > 0 && (
          <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
            {meta.join("  ·  ")}
          </Text>
        )}
      </Box>

      {/* Angle labels */}
      {shownAngles.length > 0 && (
        <HStack gap={1.5} wrap="wrap">
          {shownAngles.map((a) => (
            <Badge
              key={a}
              colorPalette="gray"
              variant="subtle"
              fontSize="10px"
              textTransform="none"
            >
              {a}
            </Badge>
          ))}
          {extraAngles > 0 && (
            <Text color="nexzy.gray.100" fontSize="10px">
              +{extraAngles} more
            </Text>
          )}
        </HStack>
      )}

      {/* Optional focus — collapsed by default to keep the card short */}
      {showFocus && (
        <Input
          size="sm"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder={`Focus, e.g. a specific boss in ${game}`}
          color="nexzy.white"
          bg="whiteAlpha.50"
          borderColor="whiteAlpha.300"
          _placeholder={{ color: "nexzy.gray.100" }}
          autoFocus
        />
      )}

      {/* Actions */}
      <Flex
        align="center"
        justify="space-between"
        gap={2}
        mt="auto"
        wrap="wrap"
      >
        {isOwner ? (
          <Button
            size="xs"
            variant="ghost"
            color="nexzy.gray.100"
            px={1}
            _hover={{ bg: "transparent", color: "nexzy.white" }}
            onClick={() => setShowFocus((v) => !v)}
            disabled={!!busy}
          >
            {showFocus ? "− Focus" : "+ Focus"}
          </Button>
        ) : (
          <Box />
        )}
        <HStack gap={2}>
          {isOwner && (
            <>
              <Button
                size="xs"
                colorPalette="cyan"
                onClick={() => generate("guide")}
                loading={busy === "guide"}
                loadingText="Generating…"
                disabled={!!busy}
              >
                Guide
              </Button>
              <Button
                size="xs"
                colorPalette="purple"
                variant="outline"
                onClick={() => generate("walkthrough")}
                loading={busy === "walkthrough"}
                loadingText="Generating…"
                disabled={!!busy}
              >
                Walkthrough
              </Button>
            </>
          )}
          <Button
            size="xs"
            variant="ghost"
            color="nexzy.gray.100"
            _hover={{ bg: "whiteAlpha.100", color: "red.300" }}
            onClick={skip}
            loading={busy === "skip"}
            loadingText="…"
            disabled={!!busy}
          >
            Skip
          </Button>
        </HStack>
      </Flex>
    </Flex>
  );
}

export default function GuideTargetsPanel({ isOwner }: { isOwner: boolean }) {
  const [targets, setTargets] = useState<ContentSuggestion[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      setTargets(await getGuideTargets());
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't load guide targets.");
      setTargets([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    setErr("");
    try {
      setTargets(await refreshGuideTargets());
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't refresh.");
    } finally {
      setRefreshing(false);
    }
  };

  const removeOne = (id: string) =>
    setTargets((t) => (t ? t.filter((x) => x.id !== id) : t));

  return (
    <Box>
      <Flex justify="space-between" align="center" gap={3} mb={4} wrap="wrap">
        <Box>
          <Heading size="md" color="nexzy.white">
            Guide targets — this week
          </Heading>
          <Text color="nexzy.gray.100" fontSize="sm">
            Recently released games with no guide yet. Pick one → generate a
            guide or walkthrough → it lands in the Review queue.
          </Text>
        </Box>
        <Button
          size="sm"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={refresh}
          loading={refreshing}
          loadingText="Refreshing…"
        >
          Refresh targets
        </Button>
      </Flex>

      {err && (
        <Text color="red.300" fontSize="sm" mb={3}>
          {err}
        </Text>
      )}

      {targets === null ? (
        <HStack color="nexzy.gray.100" gap={2}>
          <Spinner size="sm" />
          <Text>Loading targets…</Text>
        </HStack>
      ) : targets.length === 0 ? (
        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="xl"
          p={6}
          textAlign="center"
        >
          <Text color="nexzy.gray.100">
            No fresh guide targets right now. Hit “Refresh targets” to scan
            recent releases, or check back after the weekly run.
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={3}>
          <Text color="nexzy.gray.100" fontSize="sm">
            {targets.length} target{targets.length === 1 ? "" : "s"} · aim for
            2–4 guides/week
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
            {targets.map((s) => (
              <TargetCard
                key={s.id}
                s={s}
                onDone={removeOne}
                isOwner={isOwner}
              />
            ))}
          </SimpleGrid>
        </VStack>
      )}
    </Box>
  );
}
