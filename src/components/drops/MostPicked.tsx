"use client";
// Most picked games, one drop at a time (chips switch the drop). Each row
// links to the game's Nexzy page.
import { useState } from "react";
import NextLink from "next/link";
import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import CoverTile from "@/components/drops/CoverTile";
import { D } from "@/components/drops/tokens";
import { gameHref, type TrendPick } from "@/lib/trends/types";

export interface MostPickedDrop {
  slug: string;
  hashtag: string;
  picks: TrendPick[];
}

export default function MostPicked({
  drops,
  rows = 6,
}: {
  drops: MostPickedDrop[];
  rows?: number;
}) {
  const [i, setI] = useState(0);
  const d = drops[i] ?? drops[0];
  if (!d) return null;
  return (
    <Box>
      {drops.length > 1 && (
        <Flex gap={2} wrap="wrap" mb={3}>
          {drops.map((x, k) => (
            <chakra.button
              key={x.slug}
              type="button"
              onClick={() => setI(k)}
              aria-pressed={k === i}
              px={3}
              py={1.5}
              borderRadius="full"
              fontSize="sm"
              fontWeight={k === i ? "800" : "600"}
              bg={k === i ? D.yellow : "transparent"}
              color={k === i ? D.base : D.dim}
              border="1px solid"
              borderColor={k === i ? D.yellow : D.line}
            >
              #{x.hashtag}
            </chakra.button>
          ))}
        </Flex>
      )}
      <Box
        borderRadius="18px"
        bg={D.panel}
        border="1px solid"
        borderColor={D.line}
      >
        {d.picks.slice(0, rows).map((p, k) => {
          const href = gameHref(p);
          const row = (
            <Flex
              align="center"
              gap={3}
              px={4}
              py={2.5}
              borderTop={k ? "1px solid" : "none"}
              borderColor={D.line}
              _hover={href ? { bg: "rgba(255,255,255,0.03)" } : undefined}
            >
              <Text
                fontFamily="title"
                fontWeight="700"
                fontSize="xl"
                w="24px"
                color={k < 3 ? D.yellow : D.muted}
              >
                {k + 1}
              </Text>
              <Box w="40px" flexShrink={0}>
                <CoverTile cover={p.cover} name={p.name} radius="5px" />
              </Box>
              <Box flex="1" minW={0}>
                <Text fontWeight="700" truncate>
                  {p.name}
                </Text>
                <Text fontSize="xs" color={D.muted}>
                  On {p.percent}% of #{d.hashtag} builds
                </Text>
                <Box
                  h="5px"
                  borderRadius="3px"
                  bg="rgba(255,255,255,0.07)"
                  mt={1.5}
                >
                  <Box
                    h="100%"
                    w={`${Math.max(2, p.percent)}%`}
                    borderRadius="3px"
                    bg={k < 3 ? D.yellow : "#5A64A8"}
                  />
                </Box>
              </Box>
            </Flex>
          );
          return href ? (
            <NextLink key={p.gameId} href={href} style={{ display: "block" }}>
              {row}
            </NextLink>
          ) : (
            <Box key={p.gameId}>{row}</Box>
          );
        })}
      </Box>
    </Box>
  );
}
