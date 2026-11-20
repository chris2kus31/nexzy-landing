"use client";

// ============================================
// FILE: components/ReaderRow.tsx
// The slim "reader row" under a guide's title: one quiet line that the page
// is also in the Nexzy app (links to the /app page, which explains the app
// and has the store buttons), plus the Google
// "preferred source" button. Inline, scrolls away with the page: never a
// popup, never floating, nothing to dismiss.
//
// Mounted by the PAGE files only (guides, walkthroughs, reviews, lists, blog
// and every mega hub sub-page), never inside the hub components, so the hubs
// themselves are untouched.
//
// `kind` keeps the copy honest:
//   - "progress": mega hub guide pages, map, checklists, entries. Found
//     ticks really do sync between the site and the app (same account).
//   - "follow": blog-style content. The app can follow the game, so that is
//     the promise, nothing more.
// Clicks fire GA4 `app_nudge_click` with the location (also kept on the
// /app URL as ?src= so the page view shows where the reader came from).
// ============================================
import { Box, Flex, Text } from "@chakra-ui/react";
import { track } from "@/lib/analytics";
import PreferredSourceButton from "@/components/PreferredSourceButton";

export default function ReaderRow({
  location,
  kind = "follow",
  game,
  line: custom,
  mb = 6,
}: {
  /** Attribution tag, e.g. "hub_map", "guides". [a-z0-9_-], max 40. */
  location: string;
  kind?: "progress" | "follow";
  /** Game name for the "follow" copy; generic copy when absent. */
  game?: string | null;
  /** Page-specific line (e.g. a walkthrough's step count); wins over kind. */
  line?: string;
  mb?: number;
}) {
  const line =
    custom ||
    (kind === "progress"
      ? "This guide is in the Nexzy app, and your progress syncs."
      : game
        ? `Follow ${game} in the Nexzy app for every update.`
        : "Follow the games you love in the Nexzy app.");
  const src = location.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "reader";
  return (
    <Flex
      mb={mb}
      px={{ base: 3, md: 4 }}
      py={2.5}
      gap={{ base: 2.5, md: 3 }}
      align={{ base: "stretch", md: "center" }}
      direction={{ base: "column", md: "row" }}
      bg="rgba(77,163,255,0.08)"
      border="1px solid"
      borderColor="rgba(77,163,255,0.2)"
      borderRadius="12px"
    >
      <Flex align="center" gap={2.5} flex="1" minW={0}>
        <Box
          flex="0 0 auto"
          w="26px"
          h="26px"
          borderRadius="7px"
          bg="nexzy.yellow"
          color="nexzy.navy"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontWeight="800"
          fontSize="sm"
          aria-hidden
        >
          N
        </Box>
        <Text fontSize="sm" color="gray.200" lineHeight="1.4">
          {line}{" "}
          <a
            href={`/app?src=${src}`}
            onClick={() => track("app_nudge_click", { location: src })}
            style={{ color: "#7cc4ff", fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Get the app
          </a>
        </Text>
      </Flex>
      <Box flex="0 0 auto">
        <PreferredSourceButton size="sm" label="Add Nexzy on Google" />
      </Box>
    </Flex>
  );
}
