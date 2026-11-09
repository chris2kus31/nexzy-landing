"use client";

// Map picker for the full map page: one native select grouped into World,
// the entry types that own maps (Regions, Dungeons...) and More maps, plus a
// one-tap way back to the world map. A native select is the phone's own
// picker (full screen list on iOS and Android, in-app browsers included), so
// 30+ maps never turn into a wall of buttons.
import { Box, Flex, NativeSelect } from "@chakra-ui/react";
import { FiArrowLeft, FiMap } from "react-icons/fi";
import type { MapSection } from "@/lib/hub-engine/maps";
import { G } from "@/components/games/guide/GuideBits";

export default function GuideMapPicker({
  sections,
  current,
  onPick,
}: {
  sections: MapSection[];
  /** The picker key of the map on screen (a group's first floor). */
  current: string;
  onPick: (key: string) => void;
}) {
  const all = sections.flatMap((s) => s.items);
  if (all.length < 2) return null;
  const world = sections.find((s) => s.label === "World")?.items[0];
  const onWorld = !world || world.key === current;
  return (
    <Flex gap={2} mb={3} align="center" wrap="wrap">
      {!onWorld && world && (
        <Box
          as="button"
          onClick={() => onPick(world.key)}
          display="inline-flex"
          alignItems="center"
          gap={1.5}
          minH="40px"
          px={3}
          borderRadius="10px"
          border="1px solid"
          borderColor={G.line}
          bg={G.card}
          color={G.text}
          fontSize="sm"
          fontWeight="700"
          cursor="pointer"
          _hover={{ borderColor: G.gold }}
        >
          <FiArrowLeft aria-hidden />
          {world.label}
        </Box>
      )}
      <Flex
        align="center"
        gap={2}
        flex={{ base: "1 1 220px", md: "0 1 auto" }}
        minW={{ base: 0, md: "280px" }}
      >
        <Box color={G.gold} flexShrink={0}>
          <FiMap aria-hidden />
        </Box>
        <NativeSelect.Root size="md" width="100%">
          <NativeSelect.Field
            aria-label="Choose a map"
            value={current}
            onChange={(e) => e.target.value && onPick(e.target.value)}
            bg={G.card}
            color="white"
            fontWeight="700"
            borderColor="rgba(255,215,0,0.45)"
            minH="40px"
          >
            {sections.map((s) => (
              <optgroup key={s.label} label={s.label}>
                {s.items.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator color={G.gold} />
        </NativeSelect.Root>
      </Flex>
    </Flex>
  );
}
