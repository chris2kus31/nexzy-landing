"use client";

import { useState } from "react";
import { Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import TrackedLink from "@/components/TrackedLink";
import type { RewindTimelineItem } from "@/lib/blog/api";
import { eraForYear } from "@/lib/rewind/era";

const BATCH = 8;

/**
 * The "more episodes on this date" list, revealed in batches so a day that has
 * accumulated many years stays tidy. Same card styling as before.
 */
export default function RewindMoreEpisodes({
  items,
}: {
  items: RewindTimelineItem[];
}) {
  const [visible, setVisible] = useState(BATCH);
  const shown = items.slice(0, visible);
  const remaining = items.length - shown.length;

  return (
    <>
      <VStack align="stretch" gap={2}>
        {shown.map((t, i) => {
          const accent = eraForYear(t.year).accent;
          return (
            <TrackedLink
              key={`${t.slug ?? t.title}-${i}`}
              href={`/rewind/${t.slug}`}
              event="content_click"
              params={{
                content_type: "rewind",
                slug: t.slug ?? "",
                from: "rewind_dayhub",
              }}
            >
              <Flex
                align="center"
                gap={3}
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
                p={3}
                _hover={{ borderColor: accent }}
              >
                <Text
                  fontFamily="mono"
                  fontWeight="800"
                  color="nexzy.gold"
                  minW="12"
                >
                  {t.year ?? "—"}
                </Text>
                <Box flex="1">
                  <Text color="nexzy.white" fontWeight="600">
                    {t.title}
                  </Text>
                  <HStack gap={2}>
                    <Text
                      fontSize="10px"
                      fontFamily="mono"
                      color="nexzy.gray.100"
                      textTransform="uppercase"
                    >
                      {t.category.replace(/_/g, " ")}
                    </Text>
                    {t.verified && (
                      <Text fontSize="10px" color="green.300">
                        ✓ verified
                      </Text>
                    )}
                  </HStack>
                </Box>
                <Text fontSize="xs" color={accent} whiteSpace="nowrap">
                  Full episode ▸
                </Text>
              </Flex>
            </TrackedLink>
          );
        })}
      </VStack>

      {remaining > 0 && (
        <Flex justify="center" mt={4}>
          <Button
            size="sm"
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ borderColor: "nexzy.gold", color: "nexzy.gold" }}
            onClick={() => setVisible((v) => v + BATCH)}
          >
            Show {Math.min(BATCH, remaining)} more ▾
          </Button>
        </Flex>
      )}
    </>
  );
}
