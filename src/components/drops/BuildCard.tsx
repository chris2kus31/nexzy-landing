// A build drawn in HTML (the hero's fanned cards): the drop tag, its prompt
// and the picked games' box art. Real covers from the API, never invented
// picks: the hero uses each drop's most-picked (or card) games.
import { Box, Flex, Text } from "@chakra-ui/react";
import CoverTile from "@/components/drops/CoverTile";
import { D } from "@/components/drops/tokens";

export default function BuildCard({
  hashtag,
  line,
  covers,
  width,
  rotate = 0,
}: {
  hashtag: string;
  line: string;
  covers: string[];
  width: number;
  rotate?: number;
}) {
  const n = Math.min(Math.max(covers.length, 3), 9);
  const tiles = Array.from({ length: n }, (_, i) => covers[i] ?? null);
  return (
    <Box
      w={`${width}px`}
      aspectRatio="4 / 5"
      p={`${Math.round(width * 0.06)}px`}
      borderRadius={`${Math.round(width / 20)}px`}
      bg="#151935"
      border="1px solid"
      borderColor={D.line}
      transform={`rotate(${rotate}deg)`}
      boxShadow="0 24px 60px rgba(0,0,0,0.55)"
      display="flex"
      flexDirection="column"
      aria-hidden
    >
      <Flex justify="space-between" align="baseline" gap={2}>
        <Text
          fontFamily="title"
          fontWeight="700"
          color={D.yellow}
          lineHeight="1"
          fontSize={`${Math.min(Math.round(width / 8.5), Math.round((width * 0.68) / (hashtag.length * 0.62)))}px`}
          whiteSpace="nowrap"
        >
          #{hashtag}
        </Text>
        <Text
          fontWeight="900"
          color={D.yellow}
          fontSize={`${Math.round(width / 26)}px`}
        >
          NEXZY
        </Text>
      </Flex>
      <Text
        fontWeight="700"
        color="white"
        fontSize={`${Math.round(width / 24)}px`}
        mt={1}
        lineClamp={1}
      >
        {line}
      </Text>
      <Box
        flex="1"
        display="grid"
        gridTemplateColumns="repeat(3, minmax(0, 1fr))"
        alignContent="center"
        gap="4px"
        px={`${Math.round(width * 0.08)}px`}
        my={2}
      >
        {tiles.map((c, i) => (
          <CoverTile key={i} cover={c} badge={String(i + 1)} radius="4px" />
        ))}
      </Box>
      <Box
        borderRadius={`${Math.round(width / 40)}px`}
        bg="#232A52"
        px={`${Math.round(width / 28)}px`}
        py={`${Math.round(width / 45)}px`}
        fontWeight="700"
        fontSize={`${Math.round(width / 30)}px`}
        color={D.white}
      >
        Make yours:{" "}
        <Text as="span" color={D.yellow}>
          nexzyapp.com/drops
        </Text>
      </Box>
    </Box>
  );
}
