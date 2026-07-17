"use client";

import { useState } from "react";
import NextLink from "next/link";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";
import { beatLabel } from "@/lib/blog/beats";

type TabKey = "hot" | "reads";

const TABS: { key: TabKey; label: string }[] = [
  { key: "hot", label: "🔥 Trending" },
  { key: "reads", label: "Most read" },
];

/**
 * Tabbed popularity rail for the front-page hero. "Trending" (time-decayed
 * heat, default) and "Most read" (lifetime reads) share one box and format;
 * the tab pattern leaves room for future tabs (New, By beat…). Both lists are
 * server-fetched and passed in, so switching is instant with no extra request.
 */
export default function TrendingRail({
  hot,
  reads,
  excludeSlug,
}: {
  hot: PublicPost[];
  reads: PublicPost[];
  excludeSlug?: string;
}) {
  const [tab, setTab] = useState<TabKey>("hot");
  const source = tab === "hot" ? hot : reads;
  const items = source.filter((p) => p.slug !== excludeSlug).slice(0, 4);

  return (
    <Box
      h="full"
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="orange.400/25"
      borderRadius="2xl"
      p={{ base: 5, md: 6 }}
    >
      <HStack gap={1} mb={4}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Box
              as="button"
              key={t.key}
              onClick={() => setTab(t.key)}
              px={3}
              py={1.5}
              borderRadius="full"
              fontSize="xs"
              fontWeight="700"
              letterSpacing="wide"
              textTransform="uppercase"
              transition="all 0.15s"
              color={active ? "orange.300" : "gray.500"}
              bg={active ? "orange.400/12" : "transparent"}
              _hover={{ color: active ? "orange.300" : "gray.300" }}
            >
              {t.label}
            </Box>
          );
        })}
      </HStack>

      {items.length === 0 ? (
        <Text color="gray.500" fontSize="sm">
          The charts are still counting votes. Give it a beat.
        </Text>
      ) : (
        <Flex direction="column">
          {items.map((p, i) => (
            <NextLink key={p.slug} href={`/blog/${p.slug}`}>
              <HStack
                gap={3}
                align="flex-start"
                py={3}
                borderBottom={i < items.length - 1 ? "1px solid" : "none"}
                borderColor="whiteAlpha.100"
                className="group"
              >
                <Text
                  color="nexzy.blue"
                  fontWeight="800"
                  fontSize="lg"
                  lineHeight="1.2"
                  minW="18px"
                >
                  {i + 1}
                </Text>
                <Box minW={0}>
                  <Text
                    color="gray.100"
                    fontSize="sm"
                    fontWeight="600"
                    lineHeight="1.35"
                    lineClamp={2}
                    _groupHover={{ color: "white" }}
                  >
                    {p.title}
                  </Text>
                  <Text color="gray.500" fontSize="xs" mt={1}>
                    {beatLabel(p.beat)}
                  </Text>
                </Box>
              </HStack>
            </NextLink>
          ))}
        </Flex>
      )}
    </Box>
  );
}
