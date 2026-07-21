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
  getGuideCadence,
  mineGuideFocus,
  refreshGuideTargets,
  approveContentGuide,
  skipContentSuggestion,
  type ContentSuggestion,
  type GuideCadence,
} from "@/lib/admin/client";

/**
 * "Guide Targets" — this week's recently-released games that don't have a guide
 * yet, freshest first. A weekly cron refreshes the batch; this is the
 * daily-viewable board where you pick what to write. One click generates a
 * GUIDE or a WALKTHROUGH (owner-only) → it lands in the Review queue.
 */

// Audience / skill presets. "General" = a natural, non-level-specific guide;
// the others pitch the whole guide at that level.
const AUDIENCE_PRESETS = [
  "General",
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

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
  // Audience: a preset or a free-text custom band. Custom wins; "General" sends
  // nothing (a natural, non-level-specific guide).
  const [showAudience, setShowAudience] = useState(false);
  const [audience, setAudience] = useState<string>("General");
  const [audienceCustom, setAudienceCustom] = useState("");
  const audienceValue =
    audienceCustom.trim() || (audience === "General" ? undefined : audience);
  // Guides default to an uploaded screenshot, so skip the AI hero by default.
  const [noImage, setNoImage] = useState(true);
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
        noImage,
        audience: audienceValue,
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
      opacity={s.covered ? 0.6 : 1}
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
        {s.payload?.focus && (
          <Badge
            colorPalette="cyan"
            variant="subtle"
            fontSize="10px"
            textTransform="none"
            mt={1}
          >
            {s.payload.focus}
          </Badge>
        )}
        {s.covered && (
          <Badge
            colorPalette="green"
            variant="subtle"
            fontSize="10px"
            textTransform="none"
            mt={1}
          >
            ✓ Already has a guide
          </Badge>
        )}
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

      {/* Optional audience/level — collapsed by default */}
      {showAudience && (
        <Box>
          <HStack gap={1.5} wrap="wrap">
            {AUDIENCE_PRESETS.map((a) => {
              const on = !audienceCustom.trim() && audience === a;
              return (
                <Button
                  key={a}
                  size="xs"
                  variant={on ? "solid" : "outline"}
                  colorPalette={on ? "blue" : undefined}
                  color={on ? undefined : "nexzy.white"}
                  borderColor="whiteAlpha.300"
                  onClick={() => {
                    setAudience(a);
                    setAudienceCustom("");
                  }}
                >
                  {a}
                </Button>
              );
            })}
          </HStack>
          <Input
            mt={1.5}
            size="sm"
            value={audienceCustom}
            onChange={(e) => setAudienceCustom(e.target.value)}
            placeholder="…or a custom band, e.g. 'level 1–20'"
            color="nexzy.white"
            bg="whiteAlpha.50"
            borderColor="whiteAlpha.300"
            _placeholder={{ color: "nexzy.gray.100" }}
          />
        </Box>
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
          <HStack gap={1}>
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
            <Button
              size="xs"
              variant="ghost"
              px={1}
              color={audienceValue ? "nexzy.lightBlue" : "nexzy.gray.100"}
              _hover={{ bg: "transparent", color: "nexzy.white" }}
              onClick={() => setShowAudience((v) => !v)}
              disabled={!!busy}
              title="Set the audience / skill level for this guide"
            >
              {audienceValue
                ? `Level: ${audienceValue}`
                : showAudience
                  ? "− Level"
                  : "+ Level"}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              px={1}
              color={noImage ? "nexzy.gray.100" : "nexzy.lightBlue"}
              _hover={{ bg: "transparent", color: "nexzy.white" }}
              onClick={() => setNoImage((v) => !v)}
              disabled={!!busy}
              title="Toggle AI hero image"
            >
              {noImage ? "No AI image" : "AI image on"}
            </Button>
          </HStack>
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
  const [cadence, setCadence] = useState<GuideCadence | null>(null);
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
    try {
      setCadence(await getGuideCadence());
    } catch {
      setCadence(null);
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

  const [mining, setMining] = useState(false);
  const [mineMsg, setMineMsg] = useState("");
  const mine = async () => {
    setMining(true);
    setErr("");
    setMineMsg("");
    try {
      const r = await mineGuideFocus();
      setMineMsg(
        r.created > 0
          ? `Found ${r.created} new topic${r.created === 1 ? "" : "s"} from ${r.scanned} game${r.scanned === 1 ? "" : "s"}.`
          : `No new topics (scanned ${r.scanned} game${r.scanned === 1 ? "" : "s"}).`,
      );
      await load();
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't mine topics.");
    } finally {
      setMining(false);
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
        <HStack gap={2}>
          {isOwner && (
            <Button
              size="sm"
              bg="nexzy.blue"
              color="white"
              borderRadius="md"
              _hover={{ bg: "nexzy.lightBlue" }}
              onClick={mine}
              loading={mining}
              loadingText="Mining…"
              title="Mine Ask-Nexzy questions into specific guide topics (uses AI)"
            >
              ✨ Find guide topics
            </Button>
          )}
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
        </HStack>
      </Flex>
      {mineMsg && (
        <Text color="nexzy.lightBlue" fontSize="sm" mb={3}>
          {mineMsg}
        </Text>
      )}

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
            {targets.length} target{targets.length === 1 ? "" : "s"}
            {cadence
              ? ` · ${cadence.generatedThisWeek} of ${cadence.target} guides this week`
              : ""}
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
