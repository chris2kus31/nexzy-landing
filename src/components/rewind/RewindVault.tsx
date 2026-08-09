"use client";

import { useState } from "react";
import { Box, Flex, HStack, Image, Text } from "@chakra-ui/react";
import { deviceForYear } from "@/lib/rewind/era";
import RewindScreen from "@/components/rewind/RewindScreen";

/**
 * The vault TV — an era-adaptive set. The frame is chosen by the episode's year
 * (deviceForYear): a black-plastic set with a round speaker for the 80s, a
 * black plastic front-control set for the 90s,
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
      : device === "wood"
        ? "580px"
        : "380px"
    : device === "modern"
      ? "760px"
      : device === "flat00"
        ? "640px"
        : device === "wood"
          ? "780px"
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
    caption = "The 80s set — black plastic, channel buttons, round speaker.";
    const chBtn = (n: number) => (
      <Box
        key={n}
        w="9px"
        h="12px"
        borderRadius="2px"
        bg="#3a3a40"
        display="flex"
        alignItems="center"
        justifyContent="center"
        css={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,.14), 0 1px 1px rgba(0,0,0,.6)",
        }}
      >
        <Text fontFamily="mono" fontSize="6px" lineHeight="1" color="#a2a2aa">
          {n}
        </Text>
      </Box>
    );
    const knob = (i: number) => (
      <Box
        key={i}
        position="relative"
        w="16px"
        h="16px"
        borderRadius="full"
        css={{
          background: "radial-gradient(circle at 36% 30%,#4c4c52,#141416)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.14)",
        }}
      >
        <Box
          position="absolute"
          top="2px"
          left="50%"
          w="1.5px"
          h="5px"
          bg="#d0d0d6"
          css={{ transform: "translateX(-50%)" }}
        />
      </Box>
    );
    frame = (
      <Flex
        maxW={setMax}
        position="relative"
        align="center"
        gap={3}
        p={4}
        borderRadius="18px"
        boxShadow="0 16px 30px rgba(0,0,0,.55)"
        css={{
          background:
            "linear-gradient(165deg,#2b2b2f,#111113), radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,.05), transparent 60%)",
        }}
      >
        {/* SCREEN — bulging tube in a thick black bezel */}
        <Box
          flex="1"
          bg="#0a0a0c"
          borderRadius="18px"
          p={3}
          css={{
            boxShadow: "inset 0 0 0 4px #1c1c20, inset 0 0 26px rgba(0,0,0,.8)",
          }}
        >
          {screen}
        </Box>

        {/* CONTROL COLUMN — channel buttons, knobs, LEDs, round speaker */}
        <Flex
          direction="column"
          align="center"
          w={{ base: "108px", md: "134px" }}
          py={1}
          gap={3}
        >
          <Flex wrap="wrap" gap="4px" justify="center" maxW="120px">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(chBtn)}
          </Flex>
          <Flex gap="8px" justify="center">
            {[0, 1, 2, 3].map(knob)}
          </Flex>
          <Flex gap="4px">
            <Box
              w="10px"
              h="4px"
              borderRadius="1px"
              bg="#c0392b"
              css={{ boxShadow: "0 0 5px rgba(192,57,43,.85)" }}
            />
            <Box
              w="10px"
              h="4px"
              borderRadius="1px"
              bg="#37e06a"
              css={{ boxShadow: "0 0 5px rgba(55,224,106,.85)" }}
            />
            <Box
              w="10px"
              h="4px"
              borderRadius="1px"
              bg="#37e06a"
              css={{ boxShadow: "0 0 5px rgba(55,224,106,.85)" }}
            />
          </Flex>
          <Box
            mt="auto"
            w={{ base: "74px", md: "94px" }}
            h={{ base: "74px", md: "94px" }}
            borderRadius="full"
            css={{
              background:
                "radial-gradient(#26262b 1.1px, transparent 1.4px) 0 0/4px 4px, radial-gradient(circle at 40% 34%,#343439,#0b0b0e 72%)",
              boxShadow:
                "inset 0 0 0 2px #050506, inset 0 6px 14px rgba(0,0,0,.7)",
            }}
          />
          {badge("#8a8a92", "9px")}
        </Flex>

        {/* FEET */}
        <Box
          position="absolute"
          bottom="-6px"
          left="24%"
          w="26px"
          h="7px"
          borderRadius="0 0 4px 4px"
          bg="#0b0b0d"
        />
        <Box
          position="absolute"
          bottom="-6px"
          right="24%"
          w="26px"
          h="7px"
          borderRadius="0 0 4px 4px"
          bg="#0b0b0d"
        />
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
