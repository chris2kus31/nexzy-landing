"use client";

import { Box, Text, Input, HStack } from "@chakra-ui/react";
import { labelProps, inputProps } from "./shared";
import type { ArticleFormatData, Essentials } from "@/lib/admin/client";

/**
 * Movies & TV core-module editor: the essentials card. Leave a field blank when
 * it isn't confirmed — never guess. At least one filled field is required to
 * publish (format gate).
 */
export default function EssentialsEditor({
  value,
  onChange,
}: {
  value: ArticleFormatData;
  onChange: (fd: ArticleFormatData) => void;
}) {
  const e: Essentials = value.essentials ?? {};
  const set = (p: Partial<Essentials>) =>
    onChange({ ...value, essentials: { ...e, ...p } });

  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="md"
      p={4}
    >
      <Text {...labelProps} mb={3}>
        Movies &amp; TV — essentials
      </Text>
      <HStack gap={2} mb={2} align="start">
        <Box flex="1">
          <Text {...labelProps}>Premieres</Text>
          <Input
            value={e.premieres ?? ""}
            onChange={(ev) => set({ premieres: ev.target.value })}
            placeholder="April 2027"
            {...inputProps}
          />
        </Box>
        <Box flex="1">
          <Text {...labelProps}>Where to watch</Text>
          <Input
            value={e.whereToWatch ?? ""}
            onChange={(ev) => set({ whereToWatch: ev.target.value })}
            placeholder="HBO / Max"
            {...inputProps}
          />
        </Box>
      </HStack>
      <HStack gap={2} align="start">
        <Box flex="1">
          <Text {...labelProps}>Based on</Text>
          <Input
            value={e.basedOn ?? ""}
            onChange={(ev) => set({ basedOn: ev.target.value })}
            placeholder="The Last of Us Part II"
            {...inputProps}
          />
        </Box>
        <Box flex="1">
          <Text {...labelProps}>Cast</Text>
          <Input
            value={e.cast ?? ""}
            onChange={(ev) => set({ cast: ev.target.value })}
            placeholder="Kaitlyn Dever, Pedro Pascal"
            {...inputProps}
          />
        </Box>
      </HStack>
    </Box>
  );
}
