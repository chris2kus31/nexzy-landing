"use client";

// The mega hub's "on this page" bar: sticks under the site header and
// jumps to each section. Built from the sections the page actually shows
// (passed by the server), so every game gets the same bar with only its
// own modules. The current section is highlighted as the reader scrolls.
import { useEffect, useState } from "react";
import { Box, Flex } from "@chakra-ui/react";

export type HubNavItem = { id: string; label: string };

// Height of the fixed site header (Navigation: h=16 + 1px border).
const HEADER_PX = 65;

export default function HubNav({
  items,
  right,
  ariaLabel,
}: {
  items: HubNavItem[];
  right?: React.ReactNode;
  /** From the hub's wording (nav.aria.web). */
  ariaLabel?: string;
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    // Callbacks only report sections whose state changed, so keep every
    // section's on-screen state and pick the last one (page order) that is
    // showing: nested sections (Map inside Guide) win over their parent.
    const showing = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => showing.set(e.target.id, e.isIntersecting));
        const on = items.filter((i) => showing.get(i.id));
        if (on.length) setActive(on[on.length - 1].id);
      },
      { rootMargin: `-${HEADER_PX + 60}px 0px -55% 0px` },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);

  if (items.length < 2) return null;
  return (
    <Box
      position="sticky"
      top={`${HEADER_PX}px`}
      zIndex={900}
      bg="rgba(15,18,38,0.96)"
      borderTop="1px solid"
      borderBottom="1px solid"
      borderColor="whiteAlpha.100"
      mx={{ base: -4, md: 0 }}
      px={{ base: 2, md: 3 }}
      borderRadius={{ base: 0, md: "12px" }}
      style={{ backdropFilter: "blur(8px)" }}
    >
      <Flex align="center" gap={2} wrap="wrap">
        <Flex
          as="nav"
          aria-label={ariaLabel || undefined}
          flex="1"
          minW={0}
          overflowX="auto"
          gap={1}
          css={{ scrollbarWidth: "none" }}
        >
          {items.map((i) => {
            const on = i.id === active;
            return (
              <Box
                asChild
                key={i.id}
                px={3}
                py={3}
                whiteSpace="nowrap"
                fontSize="sm"
                fontWeight={on ? "700" : "600"}
                color={on ? "#FFD700" : "#cfd5e6"}
                borderBottom="2px solid"
                borderColor={on ? "#FFD700" : "transparent"}
                _hover={{ color: "white" }}
              >
                <a
                  href={`#${i.id}`}
                  aria-current={on ? "location" : undefined}
                  onClick={() => setActive(i.id)}
                >
                  {i.label}
                </a>
              </Box>
            );
          })}
        </Flex>
        {right}
      </Flex>
    </Box>
  );
}
