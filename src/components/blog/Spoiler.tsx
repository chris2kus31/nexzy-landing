"use client";

import { useState, type ReactNode } from "react";
import { Box } from "@chakra-ui/react";

/**
 * Inline click-to-reveal spoiler. Authored in the body as `||hidden text||` and
 * turned into this component by the remark transform in Markdown.tsx. The text
 * stays in the DOM (server-rendered) so it's crawlable/SEO-safe — it's only
 * visually blacked out until the reader taps it. Tap again to re-hide.
 */
export default function Spoiler({ children }: { children?: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const toggle = () => setRevealed((r) => !r);
  return (
    <Box
      as="span"
      role="button"
      tabIndex={0}
      aria-label={revealed ? "Hide spoiler" : "Reveal spoiler"}
      title={revealed ? "Hide spoiler" : "Reveal spoiler"}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      cursor="pointer"
      borderRadius="sm"
      px={1}
      transition="color .12s, background .12s"
      bg={revealed ? "nexzy.blue/20" : "whiteAlpha.400"}
      color={revealed ? "gray.100" : "transparent"}
      css={{
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
        userSelect: revealed ? "auto" : "none",
      }}
    >
      {children}
    </Box>
  );
}
