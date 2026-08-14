import { Box, Flex, Text, VStack, Link } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";

type Patch = NonNullable<NonNullable<PublicPost["formatData"]>["patch"]>;

const KIND_STYLE: Record<string, { color: string; label: string }> = {
  buff: { color: "green.300", label: "▲ BUFF" },
  nerf: { color: "red.300", label: "▼ NERF" },
  rework: { color: "blue.300", label: "◆ REWORK" },
};

/**
 * Patch Notes core module: the TL;DR of what matters, the structured
 * buffs/nerfs, and the meta-impact note. Renders nothing without changes.
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
          borderLeft="4px solid"
          borderLeftColor="orange.400"
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

      <Box
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="xl"
        px={{ base: 4, md: 5 }}
        py={2}
      >
        {changes.map((c, i) => {
          const style = KIND_STYLE[c.kind] ?? KIND_STYLE.rework;
          return (
            <Flex
              key={i}
              gap={3}
              align="baseline"
              py={2.5}
              borderBottom={i < changes.length - 1 ? "1px solid" : "none"}
              borderColor="whiteAlpha.100"
            >
              <Text
                color={style.color}
                fontWeight="700"
                fontSize="xs"
                minW="64px"
                flexShrink={0}
              >
                {style.label}
              </Text>
              <Text fontSize="sm" color="gray.300" lineHeight="1.5">
                <Text as="span" color="white" fontWeight="600">
                  {c.name}
                </Text>
                {c.detail ? ` — ${c.detail}` : ""}
              </Text>
            </Flex>
          );
        })}
      </Box>

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
