"use client";

import { HStack, Text } from "@chakra-ui/react";
import { FiShare2 } from "react-icons/fi";
import { track } from "@/lib/analytics";

const GOLD = "#f5b53d";

/** Share the Rewind series page (native share, clipboard fallback). */
export default function ShareRewind() {
  const onShare = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/rewind`;
    const method =
      typeof navigator.share === "function" ? "native" : "clipboard";
    track("rewind_share", { target: "series", method });
    if (navigator.share) {
      navigator.share({ title: "Nexzy Rewind — This Day in Gaming", url });
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  };
  return (
    <HStack
      as="button"
      onClick={onShare}
      gap={1}
      color="#7fb0ff"
      fontWeight="700"
      fontSize="sm"
      _hover={{ color: GOLD }}
      css={{ cursor: "pointer" }}
    >
      <Text>Share Rewinding</Text>
      <FiShare2 />
    </HStack>
  );
}
