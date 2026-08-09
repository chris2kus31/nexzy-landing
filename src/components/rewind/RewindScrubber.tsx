"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export interface RewindStop {
  year: number;
  slug: string;
}

const PAPER2 = "#e5dcc2";
const RULE = "#c7b48a";
const INK = "#241c12";
const INK2 = "#5a4b36";

/**
 * The REWIND scrubber — a timeline from the oldest episode up to the present
 * (NOW). The handle sits where the current episode's year falls between then and
 * now; dragging rewinds and snaps to the nearest year with a published episode,
 * navigating on release. Year ticks are placed along the line and clickable.
 */
export default function RewindScrubber({
  stops,
  currentSlug,
  accent,
  dark = false,
}: {
  stops: RewindStop[];
  currentSlug: string;
  accent: string;
  dark?: boolean;
}) {
  const router = useRouter();
  const c = dark
    ? {
        bg: "rgba(15,28,51,.55)",
        border: "#2A4F7A",
        ink: "#E3E7EF",
        ink2: "#A3B0C7",
      }
    : { bg: PAPER2, border: RULE, ink: INK, ink2: INK2 };
  const sorted = useMemo(
    () => [...stops].sort((a, b) => a.year - b.year),
    [stops],
  );
  const current = sorted.find((s) => s.slug === currentSlug) ?? sorted[0];
  const [dragYear, setDragYear] = useState<number>(current?.year ?? 0);

  if (!current) return null;

  const nowY = new Date().getFullYear();
  const minY = sorted[0].year;
  const maxY = Math.max(nowY, sorted[sorted.length - 1].year);
  const span = Math.max(1, maxY - minY);
  const pct = (y: number) => ((y - minY) / span) * 100;

  const nearest = (y: number) =>
    sorted.reduce(
      (best, s) => (Math.abs(s.year - y) < Math.abs(best.year - y) ? s : best),
      sorted[0],
    );
  const go = (slug: string) => {
    if (slug !== currentSlug) router.push(`/rewind/${slug}`);
  };
  const commit = () => go(nearest(dragYear).slug);

  return (
    <Box
      mt={4}
      bg={c.bg}
      border="1px solid"
      borderColor={c.border}
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
          ◀◀ REWINDING TO
        </Text>
        <Text
          fontFamily="title"
          fontSize="xl"
          fontWeight="800"
          color={c.ink}
          letterSpacing="0.08em"
        >
          {nearest(dragYear).year}
        </Text>
      </Flex>

      <input
        type="range"
        min={minY}
        max={maxY}
        step={1}
        value={dragYear}
        aria-label="Rewind through the years"
        onChange={(e) => setDragYear(parseInt(e.target.value, 10))}
        onMouseUp={commit}
        onTouchEnd={commit}
        onKeyUp={commit}
        style={{ width: "100%", accentColor: accent, cursor: "pointer" }}
      />

      <Box position="relative" h="20px" mt={1}>
        {sorted.map((s) => (
          <button
            type="button"
            key={s.slug}
            onClick={() => go(s.slug)}
            style={{
              position: "absolute",
              left: `${pct(s.year)}%`,
              transform: "translateX(-50%)",
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              fontWeight: s.slug === current.slug ? 700 : 400,
              color: s.slug === current.slug ? accent : c.ink2,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              padding: 0,
            }}
          >
            {s.year}
          </button>
        ))}
        <Text
          position="absolute"
          right="0"
          fontFamily="mono"
          fontSize="11px"
          color={c.ink2}
          whiteSpace="nowrap"
        >
          NOW · {nowY}
        </Text>
      </Box>
    </Box>
  );
}
