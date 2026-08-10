"use client";

import { useState } from "react";
import NextLink from "next/link";
import { Box, Container, Flex, HStack, Text } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";
import { beatLabel } from "@/lib/blog/beats";

type TabKey = "hot" | "reads";

/**
 * Horizontal "Trending" bar for the home page — sits below the hero (featured
 * article + latest block). A compact popularity strip: orange label + a
 * Trending / Most-read toggle, then a numbered horizontal list of posts.
 */
export default function TrendingBar({
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
  const items = source.filter((p) => p.slug !== excludeSlug).slice(0, 6);
  if (!hot.length && !reads.length) return null;

  return (
    <Box
      as="section"
      bg="#0f1a30"
      borderTop="1px solid"
      borderBottom="1px solid"
      borderColor="whiteAlpha.100"
    >
      <Container maxW="container.xl" px={{ base: 4, md: 6 }} py={3}>
        <Flex align="center" gap={{ base: 3, md: 5 }} wrap="wrap">
          {/* Label + toggle */}
          <HStack gap={3} flexShrink={0}>
            <HStack
              gap={1.5}
              bg="orange.400/15"
              color="orange.300"
              px={3}
              py={1}
              borderRadius="full"
              fontSize="xs"
              fontWeight="800"
              letterSpacing="0.08em"
              textTransform="uppercase"
            >
              <Box as="span">🔥</Box>
              <Box as="span">Trending</Box>
            </HStack>
            <HStack gap={1}>
              {(["hot", "reads"] as TabKey[]).map((k) => (
                <Box
                  as="button"
                  key={k}
                  onClick={() => setTab(k)}
                  fontSize="xs"
                  fontWeight="700"
                  color={tab === k ? "white" : "gray.500"}
                  _hover={{ color: tab === k ? "white" : "gray.300" }}
                >
                  {k === "hot" ? "Now" : "Most read"}
                </Box>
              ))}
            </HStack>
          </HStack>

          {/* Ticker list */}
          <Flex
            align="center"
            gap={{ base: 4, md: 6 }}
            flex="1"
            minW={0}
            overflowX="auto"
            css={{
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {items.map((p, i) => (
              <NextLink
                key={p.slug}
                href={`/blog/${p.slug}`}
                style={{ flexShrink: 0 }}
              >
                <HStack gap={2} className="group" whiteSpace="nowrap">
                  <Text color="nexzy.blue" fontWeight="800" fontSize="sm">
                    {i + 1}
                  </Text>
                  <Text
                    color="gray.200"
                    fontSize="sm"
                    fontWeight="600"
                    _groupHover={{ color: "white" }}
                    maxW={{ base: "200px", md: "260px" }}
                    lineClamp={1}
                  >
                    {p.title}
                  </Text>
                  <Text
                    color="gray.500"
                    fontSize="11px"
                    display={{ base: "none", md: "block" }}
                  >
                    · {beatLabel(p.beat)}
                  </Text>
                </HStack>
              </NextLink>
            ))}
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
