"use client";

// "I'm in, day one" — the acquisition moment on a mega hub. Signed-in only (the
// count is real accounts); signed-out clicks open the sign-in popup and finish
// the join after. Optional platform pick once you're in.
import { useState } from "react";
import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { FiCheck, FiShare2 } from "react-icons/fi";
import { useHubLive } from "./HubLiveProvider";
import type { DayOnePlatform } from "@/lib/hubs/types";
import { track } from "@/lib/analytics";

/** Below this, a small number reads as an empty room: show a call instead. */
const SHOW_COUNT_AT = 25;

const PLATFORM_LABEL: Record<DayOnePlatform, string> = {
  ps5: "PS5",
  xbox: "Xbox",
  switch: "Switch",
  switch2: "Switch 2",
  pc: "PC",
};

export default function DayOneCard({
  platforms,
}: {
  /** Platforms to offer (subset of DayOnePlatform), from the game. */
  platforms: DayOnePlatform[];
}) {
  const { live, me, busy, error, gameName, slug, joinDayOne, leaveDayOne } =
    useHubLive();
  const [copied, setCopied] = useState(false);
  const inIt = !!me?.dayOne;

  async function share() {
    const url = `${window.location.origin}/games/${slug}`;
    const text = `I'm playing ${gameName} day one. You in?`;
    track("hub_share", { slug });
    try {
      if (navigator.share) {
        await navigator.share({ title: gameName, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* share sheet dismissed */
    }
  }

  return (
    <Box
      bg="#11152b"
      border="1px solid"
      borderColor="rgba(255,215,0,0.35)"
      borderRadius="16px"
      p={{ base: 4, md: 5 }}
    >
      <HStack justify="space-between" align="center" gap={4} flexWrap="wrap">
        {live.dayOne >= SHOW_COUNT_AT ? (
          <Box>
            <Text
              fontFamily="title"
              fontSize={{ base: "3xl", md: "4xl" }}
              color="#FFD700"
              lineHeight="1"
              style={{ fontVariantNumeric: "tabular-nums" }}
              aria-live="polite"
            >
              {live.dayOne.toLocaleString("en-US")}
            </Text>
            <Text fontSize="sm" color="#c7cde0" mt={1}>
              players are playing {gameName} day one
            </Text>
          </Box>
        ) : (
          <Box>
            <Text
              fontFamily="title"
              fontSize={{ base: "xl", md: "2xl" }}
              color="#FFD700"
              lineHeight="1.15"
            >
              {inIt ? "You're one of the first" : "Be one of the first"}
            </Text>
            <Text fontSize="sm" color="#c7cde0" mt={1}>
              {inIt
                ? `You're playing ${gameName} day one. Bring your squad.`
                : `Say you're playing ${gameName} day one.`}
            </Text>
          </Box>
        )}
        <HStack gap={2} flexWrap="wrap">
          {inIt ? (
            <Button
              onClick={leaveDayOne}
              disabled={busy}
              variant="outline"
              borderColor="#FFD700"
              color="#FFD700"
              _hover={{ bg: "rgba(255,215,0,0.08)" }}
              borderRadius="10px"
              title="Tap to leave"
            >
              <FiCheck /> You&apos;re in
            </Button>
          ) : (
            <Button
              onClick={() => joinDayOne()}
              disabled={busy || live.locked}
              bg="#FFD700"
              color="#11152b"
              fontWeight="700"
              _hover={{ bg: "#ffe24d" }}
              borderRadius="10px"
            >
              I&apos;m in, day one
            </Button>
          )}
          <Button
            onClick={share}
            variant="outline"
            borderColor="whiteAlpha.300"
            color="white"
            _hover={{ bg: "whiteAlpha.100" }}
            borderRadius="10px"
          >
            <FiShare2 /> {copied ? "Link copied" : "Share"}
          </Button>
        </HStack>
      </HStack>

      {inIt && platforms.length > 1 && (
        <HStack gap={2} mt={4} flexWrap="wrap">
          <Text fontSize="xs" color="#9aa3bf" mr={1}>
            Playing on
          </Text>
          {platforms.map((p) => {
            const on = me?.platform === p;
            return (
              <Box
                key={p}
                as="button"
                onClick={() => !on && joinDayOne(p)}
                aria-pressed={on}
                px={3}
                py={1}
                borderRadius="999px"
                fontSize="xs"
                fontWeight="600"
                bg={on ? "rgba(255,215,0,0.16)" : "whiteAlpha.100"}
                color={on ? "#FFD700" : "#c7cde0"}
                border="1px solid"
                borderColor={on ? "rgba(255,215,0,0.5)" : "transparent"}
                cursor={on ? "default" : "pointer"}
              >
                {PLATFORM_LABEL[p]}
              </Box>
            );
          })}
        </HStack>
      )}
      {error && (
        <Text fontSize="xs" color="red.300" mt={3}>
          {error}
        </Text>
      )}
    </Box>
  );
}
