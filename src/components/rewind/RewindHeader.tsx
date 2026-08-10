"use client";

import Link from "next/link";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { Press_Start_2P } from "next/font/google";
import RewindScrubber, {
  type RewindStop,
} from "@/components/rewind/RewindScrubber";
import ShareMenu from "@/components/blog/ShareMenu";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const GOLD = "#f5b53d";

/**
 * The Rewind page header (on the navy site frame, above the era skin): a back
 * link, the REWINDING wordmark + tagline, a Share action, the episode date, and
 * the timeline scrubber that jumps between published episodes across the years.
 */
export default function RewindHeader({
  dateLabel,
  slug,
  stops,
  backHref = "/rewind",
  backLabel = "Back to Rewinding",
  shareUrl,
  shareTitle,
}: {
  dateLabel: string;
  slug: string;
  stops: RewindStop[];
  backHref?: string;
  backLabel?: string;
  shareUrl: string;
  shareTitle: string;
}) {
  return (
    <Box w="100%" maxW="900px" mx="auto" color="nexzy.white">
      <Box
        display="grid"
        gridTemplateColumns={{ base: "1fr auto 1fr", md: "1fr auto 1fr" }}
        alignItems="center"
        gap={3}
      >
        <Link href={backHref}>
          <HStack
            gap={2}
            color="nexzy.gray.100"
            fontFamily="mono"
            fontSize={{ base: "12px", md: "14px" }}
            _hover={{ color: GOLD }}
          >
            <Box as="span">←</Box>
            <Box as="span">{backLabel}</Box>
          </HStack>
        </Link>

        <Box textAlign="center">
          <Text
            className={pixel.className}
            color={GOLD}
            fontSize={{ base: "18px", md: "28px" }}
            lineHeight="1"
            css={{ letterSpacing: "1px" }}
          >
            ◀◀ REWINDING
          </Text>
          <Text
            mt="6px"
            fontFamily="mono"
            fontSize={{ base: "11px", md: "13px" }}
            color="nexzy.gray.100"
          >
            Gaming moments from the past, preserved for the future.
          </Text>
        </Box>

        <Flex justify="flex-end">
          <ShareMenu url={shareUrl} title={shareTitle} />
        </Flex>
      </Box>

      {/* DATE — flanked by short gold rules */}
      <Flex align="center" justify="center" gap={4} mt={{ base: 4, md: 5 }}>
        <Box
          w={{ base: "40px", md: "80px" }}
          h="1px"
          bg="rgba(245,181,61,.5)"
        />
        <Text
          fontFamily="mono"
          fontWeight="700"
          letterSpacing="0.12em"
          color={GOLD}
          fontSize={{ base: "14px", md: "16px" }}
        >
          🗓 {dateLabel}
        </Text>
        <Box
          w={{ base: "40px", md: "80px" }}
          h="1px"
          bg="rgba(245,181,61,.5)"
        />
      </Flex>

      {/* TIMELINE — the year→NOW scrubber. Shown even with a single episode
          (it still frames how far back we've rewound). */}
      {stops.length >= 1 && (
        <Box mt={{ base: 4, md: 5 }}>
          <RewindScrubber stops={stops} currentSlug={slug} accent={GOLD} dark />
        </Box>
      )}
    </Box>
  );
}
