"use client";

import { useEffect, useState } from "react";
import { Box, Text, VStack, HStack } from "@chakra-ui/react";
import { track } from "@/lib/analytics";
import type { PublicPost } from "@/lib/blog/api";

type Poll = NonNullable<PublicPost["poll"]>;

/**
 * A stable anonymous visitor id, one per browser (shared across every poll, not
 * per-slug). Lets the server dedup and count unique voters without any PII. Best
 * effort — private mode / no storage just returns null and the vote stays
 * anonymous-untracked.
 */
function getAnonId(): string | null {
  try {
    const k = "nx_vid";
    let v = localStorage.getItem(k);
    if (!v) {
      v =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return null;
  }
}

/**
 * The reader poll (shared chassis). Nexzy reports; the reader delivers the take.
 * One vote per browser (localStorage dedup, same posture as the view count).
 * Shows the options as buttons until you vote, then the live results as bars.
 */
export default function PollBlock({
  slug,
  poll,
}: {
  slug: string;
  poll: Poll;
}) {
  const key = `nx_poll_${slug}`;
  const [chosen, setChosen] = useState<number | null>(null);
  const [votes, setVotes] = useState<number[]>(poll.votes ?? []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setChosen(Number(stored));
    } catch {
      /* private mode — fall through, they can still vote this session */
    }
  }, [key]);

  const total = votes.reduce((a, b) => a + b, 0);
  const voted = chosen !== null;

  const vote = async (i: number) => {
    if (voted || busy) return;
    setBusy(true);
    // Optimistic: mark chosen immediately so the UI flips to results.
    setChosen(i);
    try {
      localStorage.setItem(key, String(i));
    } catch {
      /* ignore */
    }
    track("poll_vote", { slug, option_index: i });
    try {
      const res = await fetch("/api/blog/poll-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, optionIndex: i, anonId: getAnonId() }),
      });
      const data = await res.json().catch(() => null);
      if (data?.votes) setVotes(data.votes);
    } catch {
      /* keep the optimistic state — the vote just didn't persist */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="2xl"
      p={{ base: 5, md: 6 }}
      my={8}
    >
      <Text
        fontFamily="heading"
        fontWeight="600"
        fontSize="lg"
        color="white"
        mb={1}
      >
        {poll.question}
      </Text>
      <Text fontSize="xs" color="gray.500" mb={4}>
        {voted
          ? `${total.toLocaleString()} vote${total === 1 ? "" : "s"}`
          : "You tell us — tap to vote"}
      </Text>

      <VStack align="stretch" gap={2.5}>
        {poll.options.map((label, i) => {
          const count = votes[i] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          if (!voted) {
            return (
              <Box
                key={i}
                as="button"
                onClick={() => vote(i)}
                textAlign="left"
                bg="whiteAlpha.100"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
                px={4}
                py={3}
                color="gray.100"
                fontSize="sm"
                fontWeight="500"
                cursor="pointer"
                _hover={{
                  bg: "whiteAlpha.200",
                  borderColor: "nexzy.lightBlue",
                }}
              >
                {label}
              </Box>
            );
          }
          const isChosen = i === chosen;
          return (
            <Box
              key={i}
              position="relative"
              bg="whiteAlpha.100"
              borderRadius="lg"
              overflow="hidden"
              px={4}
              py={3}
              border="1px solid"
              borderColor={isChosen ? "nexzy.lightBlue" : "whiteAlpha.200"}
            >
              <Box
                position="absolute"
                inset={0}
                w={`${pct}%`}
                bg={isChosen ? "nexzy.blue/40" : "whiteAlpha.200"}
              />
              <HStack position="relative" justify="space-between">
                <Text
                  fontSize="sm"
                  color="white"
                  fontWeight={isChosen ? "600" : "500"}
                >
                  {isChosen ? "✓ " : ""}
                  {label}
                </Text>
                <Text fontSize="sm" color="gray.200" fontWeight="600">
                  {pct}%
                </Text>
              </HStack>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
