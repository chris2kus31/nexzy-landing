import { Box, Text, SimpleGrid } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";

type Essentials = NonNullable<
  NonNullable<PublicPost["formatData"]>["essentials"]
>;

/**
 * Movies & TV core module: the "essentials" card (premiere / where to watch /
 * based-on / cast). The trailer leads via the media gallery; this answers the
 * watch-decision at a glance. Renders only the fields that are confirmed.
 */
export default function EssentialsBlock({
  essentials,
}: {
  essentials?: Essentials | null;
}) {
  if (!essentials) return null;
  const cells = [
    { k: "Premieres", v: essentials.premieres },
    { k: "Where to watch", v: essentials.whereToWatch },
    { k: "Based on", v: essentials.basedOn },
    { k: "Cast", v: essentials.cast },
  ].filter((c) => c.v && String(c.v).trim());
  if (cells.length === 0) return null;

  return (
    <Box
      my={8}
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      overflow="hidden"
    >
      <SimpleGrid columns={{ base: 1, sm: 2 }} gap="1px" bg="whiteAlpha.200">
        {cells.map((c) => (
          <Box key={c.k} bg="nexzy.navy" p={4}>
            <Text
              fontSize="11px"
              textTransform="uppercase"
              letterSpacing="wide"
              color="gray.500"
              mb={1}
            >
              {c.k}
            </Text>
            <Text color="white" fontWeight="500" fontSize="md">
              {c.v}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
