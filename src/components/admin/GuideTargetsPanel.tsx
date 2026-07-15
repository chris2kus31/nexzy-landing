"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [focus, setFocus] = useState("");
  const game = s.payload?.game ?? s.title.replace(/^Guide:\s*/i, "");
  const released = s.payload?.released ?? null;
  const angles = s.payload?.angles ?? [];
  const genres = s.payload?.genres ?? [];

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

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <Flex justify="space-between" align="flex-start" gap={3} mb={2}>
        <HStack gap={2} wrap="wrap" flex={1} minW={0}>
          <Badge colorPalette="cyan" variant="solid">
            GUIDE TARGET
          </Badge>
          <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
            {game}
          </Text>
        </HStack>
        {released && (
          <Badge colorPalette="purple" variant="subtle" flexShrink={0}>
            Released {released}
          </Badge>
        )}
      </Flex>

      {s.rationale && (
        <Text color="nexzy.gray.100" fontSize="sm" mb={2}>
          {s.rationale}
        </Text>
      )}

      {(angles.length > 0 || genres.length > 0) && (
        <HStack gap={2} wrap="wrap" mb={3}>
          {angles.map((a) => (
            <Badge key={`a-${a}`} colorPalette="gray" variant="subtle">
              {a}
            </Badge>
          ))}
          {genres.map((g) => (
            <Badge key={`g-${g}`} colorPalette="blue" variant="subtle">
              {g}
            </Badge>
          ))}
        </HStack>
      )}

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Optional focus (boss / level / system) — blank for a general guide
      </Text>
      <Input
        value={focus}
        onChange={(e) => setFocus(e.target.value)}
        placeholder={`e.g. a specific boss in ${game}`}
        color="nexzy.white"
        bg="whiteAlpha.50"
        borderColor="whiteAlpha.300"
        _placeholder={{ color: "nexzy.gray.100" }}
        mb={3}
      />

      <HStack gap={2} justify="flex-end" wrap="wrap">
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
              Generate guide
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
              Generate walkthrough
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
    </Box>
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
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
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
