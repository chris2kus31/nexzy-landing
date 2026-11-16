// One drop on /drops: three covers fanned like a hand of cards, the drop
// number and pick size, the tag and prompt, when it ends (or starts), its
// build count and the action. Dropping-soon cards are veiled.
import NextLink from "next/link";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import CoverTile from "@/components/drops/CoverTile";
import RemindButton from "@/components/drops/RemindButton";
import { D, num, shortDate } from "@/components/drops/tokens";
import { dropPath, type DropCard as Drop } from "@/lib/trends/types";

const FAN = [
  { rot: -9, x: "-62%", y: "8px", z: 1 },
  { rot: 0, x: "0%", y: "0px", z: 3 },
  { rot: 9, x: "62%", y: "8px", z: 2 },
];

function when(d: Drop): string {
  if (d.phase === "soon" && d.startsAt) return `Drops ${shortDate(d.startsAt)}`;
  if (d.phase === "past")
    return d.endsAt ? `Ended ${shortDate(d.endsAt)}` : "Ended";
  return d.endsAt ? `Ends ${shortDate(d.endsAt)}` : "Always on";
}

export default function DropCard({ drop }: { drop: Drop }) {
  const live = drop.phase === "live";
  const soon = drop.phase === "soon";
  const covers = drop.covers.slice(0, 3);
  return (
    <Box
      as="article"
      borderRadius="18px"
      bg={D.panel}
      border="1px solid"
      borderColor={D.line}
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      <Box
        position="relative"
        h={{ base: "200px", md: "216px" }}
        overflow="hidden"
        bg={`radial-gradient(circle at 50% 60%, ${live ? "rgba(255,210,74,0.20)" : "rgba(59,107,255,0.22)"}, transparent 70%)`}
      >
        <Text
          position="absolute"
          top={2.5}
          left={3}
          zIndex={6}
          fontFamily="title"
          fontWeight="600"
          fontSize="sm"
          color={D.muted}
        >
          Drop {String(drop.number).padStart(2, "0")}
        </Text>
        {drop.pickSize && (
          <Text
            position="absolute"
            top={2.5}
            right={3}
            zIndex={6}
            px={2}
            py={0.5}
            borderRadius="6px"
            bg="rgba(0,0,0,0.35)"
            fontSize="xs"
            fontWeight="700"
            color={D.white}
          >
            Pick {drop.pickSize}
          </Text>
        )}
        {covers.length > 0 ? (
          FAN.slice(0, Math.max(covers.length, 1)).map((f, i) => {
            const c = covers[covers.length === 1 ? 0 : i];
            if (!c) return null;
            return (
              <Box
                key={i}
                position="absolute"
                left="50%"
                top="54%"
                w="104px"
                zIndex={f.z}
                transform={`translate(-50%, -50%) translate(${f.x}, ${f.y}) rotate(${f.rot}deg)`}
                boxShadow="0 10px 24px rgba(0,0,0,0.5)"
                borderRadius="8px"
              >
                <CoverTile cover={c} />
              </Box>
            );
          })
        ) : (
          <Flex position="absolute" inset={0} align="center" justify="center">
            <Text
              fontFamily="title"
              fontWeight="700"
              fontSize="3xl"
              color="rgba(255,255,255,0.12)"
            >
              #{drop.hashtag}
            </Text>
          </Flex>
        )}
        {soon && (
          <Flex
            position="absolute"
            inset={0}
            zIndex={5}
            bg="rgba(16,19,46,0.55)"
            backdropFilter="blur(3px)"
            align="center"
            justify="center"
          >
            <Text
              fontFamily="title"
              fontWeight="700"
              fontSize="2xl"
              color={D.white}
            >
              Dropping soon
            </Text>
          </Flex>
        )}
      </Box>

      <Flex direction="column" flex="1" px={4} pt={3.5} pb={4}>
        <Text
          as="h3"
          fontFamily="title"
          fontWeight="700"
          fontSize="2xl"
          lineHeight="1"
          color={live ? D.yellow : D.white}
          wordBreak="break-word"
        >
          #{drop.hashtag}
        </Text>
        <Text fontSize="sm" color={D.dim} mt={1.5}>
          {drop.title}
        </Text>
        <Flex align="center" gap={1.5} mt={2.5} fontSize="xs" fontWeight="700">
          {live ? (
            <Box
              w="7px"
              h="7px"
              borderRadius="full"
              bg={D.green}
              boxShadow={`0 0 8px ${D.green}`}
            />
          ) : (
            <Box
              w="7px"
              h="7px"
              borderRadius="full"
              border="2px solid #6E8BFF"
            />
          )}
          {live && <Text color={D.white}>Live</Text>}
          <Text
            color={soon ? D.blueSoft : D.muted}
            fontWeight={soon ? "700" : "500"}
          >
            {when(drop)}
          </Text>
        </Flex>
        <Flex align="center" justify="space-between" mt="auto" pt={3.5} gap={2}>
          {soon ? (
            <Text fontSize="sm" color={D.muted}>
              Pick {drop.pickSize ?? "your games"}
            </Text>
          ) : (
            <Text fontSize="sm" color={D.muted}>
              <Text as="b" color={D.white}>
                {num(drop.entryCount + drop.buildCount)}
              </Text>{" "}
              builds
            </Text>
          )}
          {soon && drop.startsAt ? (
            <RemindButton
              slug={drop.slug}
              hashtag={drop.hashtag}
              title={drop.title}
              startsAt={drop.startsAt}
              size="sm"
            />
          ) : (
            <Button
              asChild
              size="sm"
              borderRadius="10px"
              bg={live ? D.yellow : "transparent"}
              color={live ? D.base : D.white}
              border={live ? "none" : `1.5px solid ${D.line}`}
              fontWeight="800"
              _hover={{ opacity: 0.9 }}
            >
              <NextLink href={`${dropPath(drop.slug)}${live ? "#make" : ""}`}>
                {live ? "Make your build" : "See builds"}
              </NextLink>
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}
