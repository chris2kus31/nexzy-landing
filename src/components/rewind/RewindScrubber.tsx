"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export interface RewindStop {
  year: number;
  slug: string;
}

/**
 * The "REWIND scrubber" — the interactive time control. Drag the slider (or tap a
 * year tick) to travel across every year that has a published episode on this
 * calendar date; each move navigates to that year's episode. Hidden when there's
 * only one year to show (nothing to scrub). Era accent colors the fill + active
 * year. Client component: it navigates on change.
 */
export default function RewindScrubber({
  stops,
  currentSlug,
  accent,
}: {
  stops: RewindStop[];
  currentSlug: string;
  accent: string;
}) {
  const router = useRouter();
  const sorted = useMemo(
    () => [...stops].sort((a, b) => a.year - b.year),
    [stops],
  );
  const idx = Math.max(
    0,
    sorted.findIndex((s) => s.slug === currentSlug),
  );

  if (sorted.length < 2) return null;

  const go = (i: number) => {
    const s = sorted[i];
    if (s && s.slug !== currentSlug) router.push(`/rewind/${s.slug}`);
  };

  return (
    <Box
      mt={4}
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={{ base: 3, md: 4 }}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Text
          fontFamily="mono"
          fontSize="sm"
          letterSpacing="0.12em"
          color={accent}
        >
          ◀◀ REWIND THROUGH THE YEARS
        </Text>
        <Text
          fontFamily="title"
          fontSize="xl"
          fontWeight="800"
          color="nexzy.white"
          letterSpacing="0.08em"
        >
          {sorted[idx].year}
        </Text>
      </Flex>

      <input
        type="range"
        min={0}
        max={sorted.length - 1}
        step={1}
        value={idx}
        aria-label="Rewind through the years"
        onChange={(e) => go(parseInt(e.target.value, 10))}
        style={{ width: "100%", accentColor: accent, cursor: "pointer" }}
      />

      <Flex justify="space-between" mt={2} gap={2} wrap="wrap">
        {sorted.map((s, i) => (
          <button
            type="button"
            key={s.slug}
            onClick={() => go(i)}
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "12px",
              color: i === idx ? accent : "rgba(255,255,255,.55)",
              fontWeight: i === idx ? 700 : 400,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            {s.year}
          </button>
        ))}
      </Flex>
    </Box>
  );
}
