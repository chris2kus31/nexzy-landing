"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Box, HStack, Text, Badge } from "@chakra-ui/react";

export interface HubTab {
  key: string;
  label: string;
  count?: number;
}

/**
 * App-style tab bar for the game hub. Renders ALL panels in the DOM and toggles
 * visibility (never lazy-loads), so every linked guide/walkthrough stays in the
 * server HTML and crawlable — the tabs are UX only, not a content gate.
 */
export default function HubTabs({
  tabs,
  panels,
}: {
  tabs: HubTab[];
  panels: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  if (tabs.length === 0) return null;

  return (
    <Box>
      <HStack
        gap={{ base: 5, md: 8 }}
        borderBottom="1px solid"
        borderColor="whiteAlpha.200"
        mb={8}
        overflowX="auto"
        css={{
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <Box
              key={t.key}
              as="button"
              onClick={() => setActive(t.key)}
              py={3}
              position="relative"
              cursor="pointer"
              whiteSpace="nowrap"
            >
              <HStack gap={2}>
                <Text
                  fontWeight="700"
                  fontSize={{ base: "sm", md: "md" }}
                  color={on ? "nexzy.yellow" : "gray.400"}
                  _hover={{ color: on ? "nexzy.yellow" : "gray.200" }}
                >
                  {t.label}
                </Text>
                {t.count != null && (
                  <Badge colorPalette={on ? "yellow" : "gray"} variant="subtle">
                    {t.count}
                  </Badge>
                )}
              </HStack>
              {on && (
                <Box
                  position="absolute"
                  bottom="-1px"
                  left={0}
                  right={0}
                  h="2px"
                  bg="nexzy.yellow"
                  borderRadius="full"
                />
              )}
            </Box>
          );
        })}
      </HStack>

      {tabs.map((t) => (
        <Box key={t.key} display={t.key === active ? "block" : "none"}>
          {panels[t.key]}
        </Box>
      ))}
    </Box>
  );
}
