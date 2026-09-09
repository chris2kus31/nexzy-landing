"use client";

import { useState, type ReactNode } from "react";
import { Box } from "@chakra-ui/react";
import { FiEyeOff } from "react-icons/fi";

/**
 * Inline click-to-reveal spoiler. Authored in the body as `||hidden text||` and
 * turned into this component by the remark transform in Markdown.tsx. When
 * hidden it shows a "tap to reveal" pill so the affordance is obvious; the real
 * text stays in the DOM (visually-hidden) so it's crawlable/SEO-safe. Tap the
 * revealed text again to re-hide it.
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
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      cursor="pointer"
      display="inline"
      css={{ WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" }}
    >
      {revealed ? (
        <Box
          as="span"
          bg="nexzy.blue/20"
          color="gray.100"
          borderRadius="sm"
          px={1}
        >
          {children}
        </Box>
      ) : (
        <>
          <Box
            as="span"
            display="inline-flex"
            alignItems="center"
            gap={1}
            bg="whiteAlpha.300"
            color="gray.200"
            borderRadius="md"
            px={2}
            py={0.5}
            fontSize="sm"
            fontWeight="600"
            transition="background 0.15s"
            _hover={{ bg: "whiteAlpha.400" }}
          >
            <Box as="span" display="inline-flex" fontSize="12px">
              <FiEyeOff aria-hidden />
            </Box>
            Spoiler — tap to reveal
          </Box>
          {/* Real text kept in the DOM for crawlers/screen readers */}
          <Box
            as="span"
            css={{
              position: "absolute",
              width: "1px",
              height: "1px",
              padding: 0,
              margin: "-1px",
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            {children}
          </Box>
        </>
      )}
    </Box>
  );
}
