"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, Flex, HStack } from "@chakra-ui/react";
import { dateSlug, monthName } from "@/lib/rewind/era";

const GOLD = "#f5b53d";
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
// Day count per month (leap-safe: Feb allows 29 for the "on this day" concept).
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function shift(month: number, day: number, delta: number) {
  // Reference leap year so Feb 29 round-trips; wraps months/years correctly.
  const d = new Date(Date.UTC(2000, month - 1, day));
  d.setUTCDate(d.getUTCDate() + delta);
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
const href = (m: number, d: number) => `/rewind/day/${dateSlug(m, d)}`;

/**
 * Day navigator for the Rewind hub: jump to the previous/next day, pick any
 * month + day, or snap back to Today. All destinations are the existing
 * /rewind/day/[date] pages (today links to /rewind).
 */
export default function RewindDayNav({
  month,
  day,
}: {
  month: number;
  day: number;
}) {
  const router = useRouter();
  const prev = shift(month, day, -1);
  const next = shift(month, day, 1);
  const now = new Date();
  const isToday = now.getMonth() + 1 === month && now.getDate() === day;

  const go = (m: number, d: number) => {
    const t = new Date();
    if (t.getMonth() + 1 === m && t.getDate() === d) router.push("/rewind");
    else router.push(href(m, d));
  };
  const maxDay = DAYS_IN[month - 1];
  const safeDay = Math.min(day, maxDay);

  const selectStyle: React.CSSProperties = {
    background: "transparent",
    color: "#fff",
    border: "none",
    fontFamily: "ui-monospace, monospace",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
    appearance: "none",
    textAlign: "center",
    padding: "0 4px",
  };
  const arrow = {
    w: "38px",
    h: "38px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "md",
    border: "1px solid",
    borderColor: "whiteAlpha.300",
    color: "nexzy.white",
    _hover: { borderColor: GOLD, color: GOLD },
  } as const;

  return (
    <Flex justify="center" mb={{ base: 6, md: 8 }}>
      <HStack gap={2} align="center">
        <Link href={href(prev.month, prev.day)} aria-label="Previous day">
          <Flex {...arrow}>‹</Flex>
        </Link>

        <Flex
          align="center"
          gap={1}
          border="1px solid"
          borderColor="whiteAlpha.300"
          borderRadius="md"
          px={2}
          py="7px"
          css={{ background: "rgba(255,255,255,.04)" }}
        >
          <Box as="span" color={GOLD} mr={1} display="inline-flex">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <rect x="3" y="4.5" width="18" height="16" rx="2" />
              <path d="M3 9h18M8 2.5v4M16 2.5v4" />
            </svg>
          </Box>
          <select
            aria-label="Month"
            value={month}
            onChange={(e) => go(parseInt(e.target.value, 10), safeDay)}
            style={selectStyle}
          >
            {MONTHS.map((m) => (
              <option key={m} value={m} style={{ color: "#000" }}>
                {monthName(m)}
              </option>
            ))}
          </select>
          <select
            aria-label="Day"
            value={safeDay}
            onChange={(e) => go(month, parseInt(e.target.value, 10))}
            style={selectStyle}
          >
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d} style={{ color: "#000" }}>
                {d}
              </option>
            ))}
          </select>
        </Flex>

        <Link href={href(next.month, next.day)} aria-label="Next day">
          <Flex {...arrow}>›</Flex>
        </Link>

        <Link href="/rewind">
          <Flex
            px={4}
            h="38px"
            align="center"
            borderRadius="md"
            fontFamily="mono"
            fontWeight="700"
            fontSize="14px"
            border="1px solid"
            borderColor={isToday ? GOLD : "whiteAlpha.300"}
            color={isToday ? GOLD : "nexzy.white"}
            _hover={{ borderColor: GOLD, color: GOLD }}
          >
            Today
          </Flex>
        </Link>
      </HStack>
    </Flex>
  );
}
