// "Inside their 9": each pick with the newest Nexzy piece about it (a mega hub
// walkthrough, a guide or the latest news). Games with a story come first,
// rank kept; four show, the rest open on tap. A game with nothing recent gets
// a quiet "follow it" line, still a reason to get the app.
"use client";
import { useState } from "react";
import NextLink from "next/link";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { FiChevronRight } from "react-icons/fi";
import CoverTile from "@/components/drops/CoverTile";
import { D } from "@/components/drops/tokens";
import {
  STORY_LABEL,
  gameHref,
  type BuildPick,
  type GameStory,
} from "@/lib/trends/types";

const SHOWN = 4;

export default function GameStories({
  picks,
  stories,
  title = "Inside their 9",
}: {
  picks: BuildPick[];
  stories: Record<string, GameStory>;
  title?: string;
}) {
  const [all, setAll] = useState(false);
  const rows = picks
    .map((p, i) => ({ p, rank: p.badge ?? String(i + 1), s: stories[p.id] }))
    .sort((a, b) => Number(!!b.s) - Number(!!a.s));
  const visible = all ? rows : rows.slice(0, SHOWN);

  return (
    <Box>
      <Flex justify="space-between" align="baseline" mb={2} gap={3}>
        <Text fontFamily="title" fontWeight="700" fontSize="xl">
          {title}
        </Text>
        <Text fontSize="xs" color={D.muted}>
          Latest from Nexzy, one per game
        </Text>
      </Flex>
      <Stack gap={2}>
        {visible.map(({ p, rank, s }) => {
          const href = s?.path ?? gameHref(p);
          const body = (
            <Flex
              gap={3}
              align="center"
              p={2.5}
              borderRadius="12px"
              bg={s ? D.panel : "transparent"}
              border="1px solid"
              borderColor={s ? "transparent" : D.line}
              borderStyle={s ? "solid" : "dashed"}
              _hover={href ? { bg: "#232A5C" } : undefined}
              transition="background 0.15s"
            >
              <Flex
                w="24px"
                h="24px"
                flexShrink={0}
                borderRadius="7px"
                bg={D.yellow}
                color={D.base}
                fontFamily="title"
                fontWeight="700"
                fontSize="xs"
                align="center"
                justify="center"
              >
                {rank}
              </Flex>
              <Box w="34px" flexShrink={0}>
                <CoverTile cover={p.cover} name={p.name} radius="5px" />
              </Box>
              <Box minW={0} flex="1">
                <Text fontWeight="700" fontSize="sm" truncate>
                  {p.name}
                </Text>
                {s ? (
                  <Text fontSize="sm" color={D.dim} lineClamp={2}>
                    <Text
                      as="span"
                      color={D.yellow}
                      fontWeight="800"
                      fontSize="2xs"
                      letterSpacing="0.08em"
                      textTransform="uppercase"
                      mr={1.5}
                    >
                      {STORY_LABEL[s.type] ?? "Story"}
                    </Text>
                    {s.title}
                  </Text>
                ) : (
                  <Text fontSize="sm" color={D.muted}>
                    Nothing new yet. Follow it in the app to get the next one.
                  </Text>
                )}
              </Box>
              {href && (
                <Box color={D.muted} flexShrink={0}>
                  <FiChevronRight />
                </Box>
              )}
            </Flex>
          );
          return href ? (
            <NextLink key={p.id} href={href} style={{ display: "block" }}>
              {body}
            </NextLink>
          ) : (
            <Box key={p.id}>{body}</Box>
          );
        })}
      </Stack>
      {rows.length > SHOWN && (
        <Button
          mt={2}
          variant="plain"
          color={D.yellow}
          fontSize="sm"
          px={0}
          h="auto"
          onClick={() => setAll((v) => !v)}
        >
          {all ? "Show less" : `Show all ${rows.length}`}
        </Button>
      )}
    </Box>
  );
}
