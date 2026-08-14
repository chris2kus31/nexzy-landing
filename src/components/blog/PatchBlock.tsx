import { Box, Flex, Text, VStack, Link } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";

type Patch = NonNullable<NonNullable<PublicPost["formatData"]>["patch"]>;

const KIND: Record<
  string,
  { label: string; color: string; bg: string; border: string; pillBg: string }
> = {
  buff: {
    label: "▲ BUFF",
    color: "green.300",
    bg: "green.400/8",
    border: "green.400/25",
    pillBg: "green.400/15",
  },
  nerf: {
    label: "▼ NERF",
    color: "red.300",
    bg: "red.400/8",
    border: "red.400/25",
    pillBg: "red.400/15",
  },
  rework: {
    label: "◆ REWORK",
    color: "blue.300",
    bg: "blue.400/8",
    border: "blue.400/25",
    pillBg: "blue.400/15",
  },
  new: {
    label: "✦ NEW",
    color: "teal.300",
    bg: "teal.400/8",
    border: "teal.400/25",
    pillBg: "teal.400/15",
  },
  change: {
    label: "● CHANGE",
    color: "gray.300",
    bg: "whiteAlpha.50",
    border: "whiteAlpha.200",
    pillBg: "whiteAlpha.100",
  },
};

/**
 * Patch Notes core module: the TL;DR of what matters, a color-coded buff/nerf
 * "scoreboard" (green up / red down / blue rework), and the meta-impact note.
 * Renders nothing without changes.
 */
export default function PatchBlock({ patch }: { patch?: Patch | null }) {
  const changes = patch?.changes ?? [];
  if (!patch || changes.length === 0) return null;
  const tldr = (patch.tldr ?? []).filter(Boolean);

  return (
    <Box my={8}>
      {tldr.length > 0 && (
        <Box
          bg="orange.400/10"
          border="1px solid"
          borderColor="orange.400/30"
          borderRadius="xl"
          p={{ base: 4, md: 5 }}
          mb={5}
        >
          <Text
            fontFamily="title"
            fontSize="xs"
            letterSpacing="wider"
            textTransform="uppercase"
            color="orange.300"
            fontWeight="700"
            mb={2}
          >
            TL;DR — what matters
          </Text>
          <VStack align="stretch" gap={1.5}>
            {tldr.map((t, i) => (
              <Text key={i} color="gray.200" fontSize="sm" lineHeight="1.5">
                • {t}
              </Text>
            ))}
          </VStack>
        </Box>
      )}

      {/* Buff / nerf scoreboard */}
      <VStack align="stretch" gap={2}>
        {changes.map((c, i) => {
          const k = KIND[c.kind] ?? KIND.rework;
          return (
            <Flex
              key={i}
              gap={3}
              align="center"
              bg={k.bg}
              border="1px solid"
              borderColor={k.border}
              borderRadius="lg"
              px={3.5}
              py={2.5}
            >
              <Text
                as="span"
                color={k.color}
                bg={k.pillBg}
                fontWeight="700"
                fontSize="10px"
                letterSpacing="0.04em"
                px={2.5}
                py={1}
                borderRadius="full"
                flexShrink={0}
                minW="66px"
                textAlign="center"
              >
                {k.label}
              </Text>
              <Text fontSize="sm" color="gray.300" lineHeight="1.4">
                <Text as="span" color="white" fontWeight="600">
                  {c.name}
                </Text>
                {c.detail ? ` — ${c.detail}` : ""}
              </Text>
            </Flex>
          );
        })}
      </VStack>

      {patch.metaNote && (
        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="xl"
          p={{ base: 4, md: 5 }}
          mt={5}
        >
          <Text
            fontFamily="title"
            fontSize="xs"
            letterSpacing="wide"
            textTransform="uppercase"
            color="nexzy.gold"
            fontWeight="700"
            mb={1.5}
          >
            What it means for the meta
          </Text>
          <Text color="gray.300" fontSize="sm" lineHeight="1.7">
            {patch.metaNote}
          </Text>
        </Box>
      )}

      {patch.fullChangelogUrl && (
        <Link
          href={patch.fullChangelogUrl}
          target="_blank"
          rel="noopener noreferrer"
          color="nexzy.lightBlue"
          fontSize="sm"
          mt={3}
          display="inline-block"
        >
          Full changelog →
        </Link>
      )}
    </Box>
  );
}
