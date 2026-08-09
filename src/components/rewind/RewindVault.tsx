"use client";

import { useState } from "react";
import { Box, Flex, HStack, Image, Text } from "@chakra-ui/react";
import { deviceForYear } from "@/lib/rewind/era";
import RewindScreen from "@/components/rewind/RewindScreen";

/**
 * The vault TV — an era-adaptive set. The frame is chosen by the episode's year
 * (deviceForYear): a wood console for the 80s, a black plastic set for the 90s,
 * a silver flat-tube for the 2000s, a thin panel for modern. The screen is the
 * real YouTube player (black glossy at rest, like a set that's off) with a glass
 * sheen + era scanlines. The Nexzy badge + power LED tie it to brand.
 *
 * Multi-video: pass `vids` (ordered ids, lead first) to get a thumbnail strip
 * under the set — click a thumb to load it in the same TV. `vid` (single) still
 * works. `compact` shrinks the whole set for tight layouts (e.g. the magazine).
 */
export default function RewindVault({
  vid,
  vids,
  title,
  year,
  compact = false,
}: {
  vid?: string;
  vids?: string[];
  title: string;
  year: number | null;
  compact?: boolean;
}) {
  const list = (vids && vids.length ? vids : vid ? [vid] : []).filter(Boolean);
  const [active, setActive] = useState(0);
  if (!list.length) return null;
  const current = list[Math.min(active, list.length - 1)];

  const device = deviceForYear(year);
  const isCrt = device !== "modern";
  const radius =
    device === "wood" ? "16px" : device === "crt90" ? "14px" : "6px";
  const setMax = compact
    ? device === "modern"
      ? "460px"
      : "380px"
    : device === "modern"
      ? "760px"
      : device === "flat00"
        ? "640px"
        : "620px";

  const screen = (
    <RewindScreen
      key={current}
      vid={current}
      title={title}
      year={year}
      radius={radius}
      isCrt={isCrt}
    />
  );

  const led = (color: string) => (
    <Box
      w="8px"
      h="8px"
      borderRadius="full"
      bg={color}
      css={{ boxShadow: `0 0 8px ${color}` }}
    />
  );
  const badge = (color: string, size = "12px") => (
    <Text
      fontFamily="title"
      fontWeight="700"
      fontSize={size}
      letterSpacing="0.22em"
      color={color}
    >
      NEXZY
    </Text>
  );

  let frame = screen;
  let caption = "Pulled from the archives.";

  if (device === "wood") {
    caption = "The furniture-era set — wood cabinet, dial tuner.";
    frame = (
      <Flex
        maxW={setMax}
        gap={3}
        p={4}
        borderRadius="16px"
        boxShadow="0 16px 30px rgba(0,0,0,.5)"
        css={{
          background:
            "repeating-linear-gradient(87deg, rgba(0,0,0,.05) 0 2px, transparent 2px 8px), linear-gradient(160deg,#7a4f2a,#4a2f16)",
        }}
      >
        <Box
          flex="1"
          bg="#120a04"
          borderRadius="16px"
          p={3}
          css={{ boxShadow: "inset 0 0 0 3px #2a1a0c" }}
        >
          {screen}
        </Box>
        <Flex
          direction="column"
          align="center"
          justify="space-between"
          w="58px"
          py={1}
        >
          <Box
            w="40px"
            h="86px"
            borderRadius="5px"
            css={{
              background:
                "repeating-linear-gradient(to bottom,#3a2512 0 3px,#25170a 3px 6px)",
            }}
          />
          <Box
            w="28px"
            h="28px"
            borderRadius="full"
            boxShadow="0 2px 3px rgba(0,0,0,.6)"
            css={{
              background: "radial-gradient(circle at 35% 30%,#5a3c20,#2a1a0c)",
            }}
          />
          <Box
            w="28px"
            h="28px"
            borderRadius="full"
            boxShadow="0 2px 3px rgba(0,0,0,.6)"
            css={{
              background: "radial-gradient(circle at 35% 30%,#5a3c20,#2a1a0c)",
            }}
          />
          {badge("#caa877", "10px")}
        </Flex>
      </Flex>
    );
  } else if (device === "crt90") {
    caption = "The Saturday-morning set — black plastic, front controls.";
    frame = (
      <Box
        maxW={setMax}
        p="16px 16px 0"
        borderRadius="14px"
        css={{
          background: "linear-gradient(165deg,#2d2d31,#151517)",
          boxShadow:
            "0 16px 30px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06)",
        }}
      >
        <Box
          bg="#08080a"
          borderRadius="12px"
          p={3}
          css={{ boxShadow: "inset 0 0 0 4px #232327" }}
        >
          {screen}
        </Box>
        <Flex align="center" gap={3} p="12px 6px 14px">
          {led("#37e06a")}
          <Flex gap="5px">
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                w="16px"
                h="7px"
                borderRadius="2px"
                bg="#3a3a40"
                css={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)" }}
              />
            ))}
          </Flex>
          <Box mx="auto">{badge("#c8c8cf")}</Box>
          <Box w="10px" h="10px" borderRadius="2px" bg="#101013" />
        </Flex>
      </Box>
    );
  } else if (device === "flat00") {
    caption = "The flatscreen era — silver plastic, flat tube.";
    frame = (
      <Box
        maxW={setMax}
        p="14px 14px 0"
        borderRadius="12px"
        css={{
          background: "linear-gradient(165deg,#d3d7dd,#9aa0a8)",
          boxShadow:
            "0 16px 30px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.6)",
        }}
      >
        <Box
          bg="#111"
          borderRadius="8px"
          p={2}
          css={{ boxShadow: "inset 0 0 0 3px #444" }}
        >
          {screen}
        </Box>
        <Flex align="center" gap={2.5} p="10px 6px 12px">
          {led("#3f7bff")}
          <Box mx="auto">{badge("#5a6068")}</Box>
        </Flex>
      </Box>
    );
  } else {
    caption = "Now-ish — thin panel.";
    frame = (
      <Box
        maxW={setMax}
        p="8px 8px 0"
        borderRadius="10px"
        bg="#0c0c10"
        boxShadow="0 16px 34px rgba(0,0,0,.5)"
      >
        {screen}
        <Flex justify="center" align="center" gap={2} p="7px">
          {led("#3f7bff")}
          {badge("#5b6b86", "11px")}
        </Flex>
      </Box>
    );
  }

  return (
    <Box>
      {frame}

      {/* Multi-video: a thumbnail strip that swaps the video in the set. */}
      {list.length > 1 && (
        <HStack gap={2} mt={3} flexWrap="wrap" maxW={setMax}>
          {list.map((id, i) => {
            const on = i === active;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Play clip ${i + 1}`}
                style={{
                  position: "relative",
                  width: 72,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 4,
                  overflow: "hidden",
                  border: `2px solid ${on ? "#f5b53d" : "rgba(0,0,0,.35)"}`,
                  cursor: "pointer",
                  padding: 0,
                  opacity: on ? 1 : 0.72,
                  background: "#000",
                }}
              >
                <Image
                  src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
                  alt=""
                  w="100%"
                  h="100%"
                  objectFit="cover"
                />
              </button>
            );
          })}
        </HStack>
      )}

      <Text fontFamily="mono" fontSize="14px" color="#5a4b36" mt={2}>
        ▲ {caption}
        {list.length > 1 ? ` (${list.length} clips)` : ""}
      </Text>
    </Box>
  );
}
