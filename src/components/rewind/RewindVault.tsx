"use client";

import { useState } from "react";
import { Box, Flex, Image, Text } from "@chakra-ui/react";
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
    caption = "The 90s set — black plastic, bottom speaker grilles + AV jacks.";
    const grille = (
      <Box
        flex="1"
        minW="40px"
        h={{ base: "26px", md: "34px" }}
        borderRadius="4px"
        css={{
          background:
            "radial-gradient(#1b1b1f 1px, transparent 1.3px) 0 0/4px 4px, linear-gradient(180deg,#232327,#161618)",
          boxShadow: "inset 0 0 0 1px #0b0b0d, inset 0 2px 5px rgba(0,0,0,.6)",
        }}
      />
    );
    const smBtn = (i: number) => (
      <Box
        key={i}
        w="13px"
        h="13px"
        borderRadius="full"
        css={{
          background: "radial-gradient(circle at 36% 30%,#4a4a50,#151517)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.12)",
        }}
      />
    );
    const tiny = (t: string) => (
      <Text
        fontFamily="mono"
        fontSize="6px"
        letterSpacing="0.08em"
        lineHeight="1"
        color="#8a8a92"
      >
        {t}
      </Text>
    );
    frame = (
      <Box
        maxW={setMax}
        position="relative"
        p="16px 16px 0"
        borderRadius="16px"
        css={{
          background:
            "linear-gradient(165deg,#2d2d31,#141416), radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,.05), transparent 60%)",
          boxShadow:
            "0 16px 30px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06)",
        }}
      >
        {/* SCREEN — big tube, thick black bezel */}
        <Box
          bg="#08080a"
          borderRadius="12px"
          p={3}
          css={{
            boxShadow: "inset 0 0 0 4px #202024, inset 0 0 26px rgba(0,0,0,.8)",
          }}
        >
          {screen}
        </Box>

        {/* BOTTOM STRIP — grille · controls · grille · AV jacks */}
        <Flex align="center" gap={3} p="14px 8px 18px">
          {grille}
          <Flex direction="column" align="center" gap="5px" flexShrink={0}>
            <Flex align="center" gap="7px">
              {[0, 1, 2, 3, 4].map(smBtn)}
            </Flex>
            <Flex align="center" gap="12px">
              {tiny("PRESET")}
              {tiny("VOL")}
              {tiny("CH")}
            </Flex>
            {badge("#9a9aa2", "8px")}
          </Flex>
          {grille}
          <Flex direction="column" align="center" gap="4px" flexShrink={0}>
            <Flex gap="5px">
              <Box
                w="11px"
                h="11px"
                borderRadius="full"
                bg="#e8c33a"
                css={{ boxShadow: "inset 0 0 0 2px #0c0c0e" }}
              />
              <Box
                w="11px"
                h="11px"
                borderRadius="full"
                bg="#c94b4b"
                css={{ boxShadow: "inset 0 0 0 2px #0c0c0e" }}
              />
            </Flex>
            {tiny("VIDEO · AUDIO")}
          </Flex>
        </Flex>

        {/* FEET */}
        <Box
          position="absolute"
          bottom="-6px"
          left="26%"
          w="26px"
          h="7px"
          borderRadius="0 0 4px 4px"
          bg="#0b0b0d"
        />
        <Box
          position="absolute"
          bottom="-6px"
          right="26%"
          w="26px"
          h="7px"
          borderRadius="0 0 4px 4px"
          bg="#0b0b0d"
        />
      </Box>
    );
  } else if (device === "flat00") {
    caption = "The 2000s set — silver rear-projection, center control bar.";
    const vBtn = (i: number) => (
      <Box
        key={i}
        w="10px"
        h="3px"
        borderRadius="1px"
        bg="#6b7078"
        css={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)" }}
      />
    );
    frame = (
      <Box maxW={setMax} position="relative">
        {/* SCREEN CABINET — thin silver bezel, dark flat tube */}
        <Box
          position="relative"
          zIndex={2}
          p="12px 12px 10px"
          borderRadius="12px 12px 6px 6px"
          css={{
            background: "linear-gradient(180deg,#e4e7ec,#b7bcc4)",
            boxShadow:
              "0 14px 26px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.75)",
          }}
        >
          <Box
            bg="#0b0c0e"
            borderRadius="6px"
            p="8px"
            css={{
              boxShadow:
                "inset 0 0 0 2px #5b616b, inset 0 0 22px rgba(0,0,0,.85)",
            }}
          >
            {screen}
          </Box>
          <Flex align="center" justify="center" pt="7px">
            {badge("#6b7078", "10px")}
          </Flex>

          {/* CENTER CONTROL BAR — straddles the screen/base seam */}
          <Flex
            position="absolute"
            bottom="-30px"
            left="50%"
            zIndex={3}
            direction="column"
            align="center"
            justify="center"
            gap="4px"
            w="20px"
            py="7px"
            borderRadius="10px"
            css={{
              transform: "translateX(-50%)",
              background: "linear-gradient(180deg,#eef1f5,#b6bcc4)",
              boxShadow:
                "0 3px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.85)",
            }}
          >
            {[0, 1, 2, 3, 4, 5].map(vBtn)}
          </Flex>
        </Box>

        {/* BASE PEDESTAL — silver, speaker-cloth mesh, winged top */}
        <Box
          mt="-4px"
          mx="auto"
          w="94%"
          h={{ base: "66px", md: "88px" }}
          borderRadius="0 0 14px 14px"
          css={{
            background:
              "radial-gradient(#c4c9d0 1px, transparent 1.4px) 0 0/5px 5px, linear-gradient(180deg,#d9dde3,#abb1b9)",
            boxShadow:
              "0 14px 22px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.55)",
            clipPath:
              "polygon(0 0, 42% 12px, 58% 12px, 100% 0, 100% 100%, 0 100%)",
          }}
        />
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
    <Box w="100%">
      {/* TV pinned left; when there's more than one clip, a playlist to the
          right (wraps below the set on narrow screens). */}
      <Flex gap={4} align="flex-start" justify="flex-start" flexWrap="wrap">
        <Box flexShrink={0} w={setMax} maxW="100%">
          {frame}
        </Box>

        {list.length > 1 && (
          <Flex
            direction={{ base: "row", md: "column" }}
            flexWrap="wrap"
            gap={2}
            maxW={{ base: setMax, md: "160px" }}
            flexShrink={0}
          >
            <Text
              w="100%"
              fontFamily="mono"
              fontSize="11px"
              letterSpacing="0.14em"
              color="#5a4b36"
            >
              CLIPS ({list.length})
            </Text>
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
                    width: 112,
                    height: 63,
                    flexShrink: 0,
                    borderRadius: 5,
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
          </Flex>
        )}
      </Flex>

      <Text fontFamily="mono" fontSize="14px" color="#5a4b36" mt={3}>
        ▲ {caption}
        {list.length > 1 ? ` (${list.length} clips)` : ""}
      </Text>
    </Box>
  );
}
