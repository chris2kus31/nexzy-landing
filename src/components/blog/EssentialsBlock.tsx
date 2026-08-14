import { Box, Flex, Text } from "@chakra-ui/react";
import { FaRegCalendarAlt, FaPlay, FaGamepad, FaUsers } from "react-icons/fa";
import type { IconType } from "react-icons";
import type { PublicPost } from "@/lib/blog/api";

type Essentials = NonNullable<
  NonNullable<PublicPost["formatData"]>["essentials"]
>;

/**
 * Movies & TV core module: the "essentials" as a quick-facts STRIP — rounded
 * icon chips that wrap like a movie-page info bar, not a spec table. The trailer
 * leads via the media gallery; this answers the watch-decision at a glance.
 * Renders only the known fields — no empty cells, no fabrication.
 */
export default function EssentialsBlock({
  essentials,
}: {
  essentials?: Essentials | null;
}) {
  if (!essentials) return null;
  const chips: { k: string; v?: string | null; Icon: IconType }[] = [
    { k: "Premieres", v: essentials.premieres, Icon: FaRegCalendarAlt },
    { k: "Where to watch", v: essentials.whereToWatch, Icon: FaPlay },
    { k: "Based on", v: essentials.basedOn, Icon: FaGamepad },
    { k: "Cast", v: essentials.cast, Icon: FaUsers },
  ].filter((c) => c.v && String(c.v).trim());
  if (chips.length === 0) return null;

  return (
    <Box my={8}>
      <Text
        fontFamily="heading"
        fontSize="xs"
        letterSpacing="wider"
        textTransform="uppercase"
        color="pink.300"
        fontWeight="700"
        mb={3}
      >
        The essentials
      </Text>
      <Flex flexWrap="wrap" gap={2.5}>
        {chips.map(({ k, v, Icon }) => (
          <Flex
            key={k}
            title={k}
            align="center"
            gap={2}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="full"
            px={4}
            py={2}
            transition="border-color 0.15s"
            _hover={{ borderColor: "pink.400/60" }}
          >
            <Box
              as="span"
              color="pink.300"
              fontSize="13px"
              display="inline-flex"
            >
              <Icon />
            </Box>
            <Text fontSize="sm" color="white" fontWeight="600" lineHeight="1.1">
              {v}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
