"use client";
// The next scheduled drop with a live countdown (minutes) and "Remind me".
// Server HTML shows the date; the countdown fills in after load.
import { useEffect, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import CoverTile from "@/components/drops/CoverTile";
import RemindButton from "@/components/drops/RemindButton";
import { D, shortDate } from "@/components/drops/tokens";
import type { DropCard } from "@/lib/trends/types";

function parts(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return {
    days: Math.floor(m / 1440),
    hrs: Math.floor((m % 1440) / 60),
    min: m % 60,
  };
}

export default function NextDropStrip({
  drop,
  label = "Next drop",
}: {
  drop: Pick<DropCard, "slug" | "hashtag" | "title" | "startsAt" | "covers">;
  label?: string;
}) {
  const start = Date.parse(drop.startsAt ?? "");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const left = now === null ? null : parts(start - now);
  return (
    <Flex
      borderRadius="18px"
      border="1px solid rgba(110,139,255,0.45)"
      bg="linear-gradient(90deg, rgba(59,107,255,0.20), rgba(26,31,71,0.7))"
      px={{ base: 4, md: 5 }}
      py={4}
      gap={{ base: 3, md: 5 }}
      align={{ base: "flex-start", md: "center" }}
      direction={{ base: "column", md: "row" }}
    >
      {drop.covers.length > 0 && (
        <Flex display={{ base: "none", md: "flex" }} flexShrink={0}>
          {drop.covers.slice(0, 3).map((c, i) => (
            <Box
              key={i}
              w="44px"
              ml={i ? "-14px" : 0}
              transform={`rotate(${[-6, 0, 6][i]}deg)`}
            >
              <CoverTile cover={c} radius="5px" />
            </Box>
          ))}
        </Flex>
      )}
      <Box flex="1" minW={0}>
        <Text fontSize="xs" color={D.blueSoft} fontWeight="700">
          {label}, {drop.startsAt ? shortDate(drop.startsAt) : "soon"}
        </Text>
        <Text fontSize={{ base: "md", md: "lg" }} fontWeight="800" mt={0.5}>
          <Text
            as="span"
            fontFamily="title"
            fontSize={{ base: "lg", md: "xl" }}
          >
            #{drop.hashtag}
          </Text>{" "}
          {drop.title}
        </Text>
      </Box>
      <Flex gap={2} align="center" w={{ base: "100%", md: "auto" }}>
        {left && (
          <Flex gap={2} aria-label="Time until it drops">
            {(
              [
                [left.days, "days"],
                [left.hrs, "hrs"],
                [left.min, "min"],
              ] as const
            ).map(([v, u]) => (
              <Box
                key={u}
                w="56px"
                py={1.5}
                borderRadius="10px"
                bg="rgba(0,0,0,0.3)"
                textAlign="center"
              >
                <Text
                  fontFamily="title"
                  fontWeight="700"
                  fontSize="2xl"
                  lineHeight="1"
                >
                  {String(v).padStart(2, "0")}
                </Text>
                <Text fontSize="10px" color={D.muted} mt={0.5}>
                  {u}
                </Text>
              </Box>
            ))}
          </Flex>
        )}
        {drop.startsAt && (
          <Box ml={{ base: "auto", md: 2 }}>
            <RemindButton
              slug={drop.slug}
              hashtag={drop.hashtag}
              title={drop.title}
              startsAt={drop.startsAt}
            />
          </Box>
        )}
      </Flex>
    </Flex>
  );
}
