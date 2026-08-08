import TrackedLink from "@/components/TrackedLink";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import type { RewindEpisode } from "@/lib/blog/api";
import { eraForYear } from "@/lib/rewind/era";

/**
 * Homepage "Rewind" band — a standout strip below the hero that breaks the news
 * grid (warm era accent vs. the cool cards around it). Adaptive: hides entirely
 * when there's no published episode for today.
 */
export default function HomeRewind({
  episode,
}: {
  episode: RewindEpisode | null;
}) {
  if (!episode) return null;
  const year = episode.event?.year ?? null;
  const era = eraForYear(year);
  const digits = year ? String(year).split("") : [];

  return (
    <Box bg="nexzy.navy" py={4}>
      <Box maxW="7xl" mx="auto" px={{ base: 4, md: 8 }}>
        <TrackedLink
          href={`/rewind/${episode.slug}`}
          event="content_click"
          params={{
            content_type: "rewind",
            slug: episode.slug,
            from: "home_band",
          }}
        >
          <Flex
            align="center"
            gap={{ base: 4, md: 6 }}
            direction={{ base: "column", md: "row" }}
            textAlign={{ base: "center", md: "left" }}
            border="1px solid"
            borderColor={era.accent}
            borderRadius="2xl"
            bg="whiteAlpha.50"
            p={{ base: 4, md: 5 }}
            boxShadow={`0 0 0 3px ${era.accent}22`}
            _hover={{ bg: "whiteAlpha.100" }}
          >
            {digits.length > 0 && (
              <HStack gap={1}>
                {digits.map((d, i) => (
                  <Box
                    key={i}
                    w="26px"
                    h="36px"
                    display="grid"
                    placeItems="center"
                    bg="#060b16"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="sm"
                    fontFamily="mono"
                    fontWeight="800"
                    fontSize="lg"
                    color="nexzy.gold"
                  >
                    {d}
                  </Box>
                ))}
              </HStack>
            )}

            <Box flex="1">
              <Text
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.2em"
                color={era.accent}
                mb={1}
              >
                TODAY&apos;S REWIND · ON THIS DAY
              </Text>
              <Text
                color="nexzy.white"
                fontWeight="700"
                fontSize={{ base: "lg", md: "xl" }}
              >
                {episode.title}
              </Text>
              {episode.excerpt && (
                <Text color="nexzy.gray.100" fontSize="sm" lineClamp={1}>
                  {episode.excerpt}
                </Text>
              )}
            </Box>

            <Text color={era.accent} fontWeight="700" whiteSpace="nowrap">
              Step in ▸
            </Text>
          </Flex>
        </TrackedLink>
      </Box>
    </Box>
  );
}
