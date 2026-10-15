"use client";

import { useState } from "react";
import { Box, Button, Flex, HStack, Link, Text } from "@chakra-ui/react";
import { FiCheck, FiExternalLink } from "react-icons/fi";
import { setKeyOfferClaimed, type ContentSuggestion } from "@/lib/admin/client";

/** "Nov 4, 2026" from an ISO date, or the raw phrase when there is no ISO. */
function fmtDay(iso: string | null, phrase: string | null): string | null {
  if (iso) {
    const d = new Date(iso);
    if (!isNaN(+d)) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    }
  }
  return phrase;
}

/**
 * The key-offer strip on a Content Studio lead: what the platform offered,
 * where to claim it, and whether the context still needs the real detail.
 * Claiming happens on the platform (a human act); "Mark claimed" just records it.
 */
export default function KeyOfferBox({
  s,
  isOwner,
  onChanged,
}: {
  s: ContentSuggestion;
  isOwner: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const k = s.payload?.keyOffer;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!k) return null;
  const claimed = k.state === "claimed";
  const release = fmtDay(k.release, k.releasePhrase);
  const embargo = fmtDay(k.embargo, k.embargoPhrase);

  const toggleClaimed = async () => {
    setBusy(true);
    setErr(null);
    try {
      await setKeyOfferClaimed(s.id, !claimed);
      await onChanged();
    } catch (e) {
      setErr((e as Error)?.message || "Could not update the key offer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      mt={3}
      mb={3}
      p={3}
      borderRadius="md"
      border="1px solid"
      borderColor={claimed ? "green.400/50" : "teal.400/50"}
      bg="whiteAlpha.50"
    >
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
        <Box minW={0}>
          <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={1}>
            KEY OFFER VIA {k.platformLabel.toUpperCase()}
            {k.seenCount > 1 ? ` · SEEN ${k.seenCount}x` : ""}
          </Text>
          <Text color="nexzy.white" fontSize="sm" fontWeight="700">
            {k.game}
          </Text>
          <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
            {[
              k.platforms.length ? k.platforms.join(", ") : null,
              release ? `Release: ${release}` : null,
              embargo ? `Embargo: ${embargo}` : null,
            ]
              .filter(Boolean)
              .join("  ·  ") || "No platform or dates in the email."}
          </Text>
          <Text color="teal.200" fontSize="xs" mt={1}>
            Fit {k.fit}/10
            {k.fitReasons.length ? ` · ${k.fitReasons.join(" · ")}` : ""}
          </Text>
        </Box>
        <HStack gap={2} flexShrink={0}>
          <Link
            href={k.claimUrl}
            target="_blank"
            rel="noopener noreferrer"
            _hover={{ textDecoration: "none" }}
          >
            <Button
              size="xs"
              variant="outline"
              color="nexzy.white"
              borderColor="teal.400"
              _hover={{ bg: "whiteAlpha.100" }}
            >
              Claim on {k.platformLabel} <FiExternalLink aria-hidden />
            </Button>
          </Link>
          {isOwner && (
            <Button
              size="xs"
              variant={claimed ? "solid" : "outline"}
              bg={claimed ? "green.600" : "transparent"}
              color="white"
              borderColor="green.400"
              _hover={{ bg: claimed ? "green.700" : "whiteAlpha.100" }}
              loading={busy}
              onClick={() => void toggleClaimed()}
              title={
                claimed ? "Undo: mark as not claimed" : "I requested the key"
              }
            >
              <FiCheck aria-hidden /> {claimed ? "Claimed" : "Mark claimed"}
            </Button>
          )}
        </HStack>
      </Flex>
      {!k.contextAdded && (
        <Text
          color="orange.200"
          fontSize="xs"
          mt={2}
          p={2}
          borderRadius="sm"
          bg="rgba(255,159,64,0.10)"
          border="1px solid rgba(255,159,64,0.4)"
        >
          The offer email is thin. Before Generate, use Edit context below and
          paste the store page, press kit or your play notes.
        </Text>
      )}
      {err && (
        <Text color="red.300" fontSize="xs" mt={2}>
          {err}
        </Text>
      )}
    </Box>
  );
}
