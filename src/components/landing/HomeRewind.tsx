import TrackedLink from "@/components/TrackedLink";
import { Box, Flex, HStack, Image, Text } from "@chakra-ui/react";
import type { RewindEpisode } from "@/lib/blog/api";
import { monthName } from "@/lib/rewind/era";

const GOLD = "#f5b53d";
const BLUE = "#4EA1FF";

/** A few decade "hops" from now back to the episode's year (time-machine feel). */
function hops(nowY: number, targetY: number): number[] {
  const out: number[] = [nowY];
  let d = Math.floor(nowY / 10) * 10;
  while (d > targetY + 4 && out.length < 4) {
    if (d < nowY) out.push(d);
    d -= 10;
  }
  out.push(targetY);
  return out;
}

/**
 * Homepage "Rewind" band — a time-machine teaser below the hero that drives
 * traffic to the series. On-brand (navy + gold), not neon. Hides when there's
 * no published episode for today.
 */
export default function HomeRewind({
  episode,
}: {
  episode: RewindEpisode | null;
}) {
  if (!episode) return null;
  const year = episode.event?.year ?? null;
  const nowY = new Date().getFullYear();
  const path = hops(nowY, year ?? nowY);

  return (
    <Box bg="nexzy.navy" py={5}>
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
            borderColor="rgba(245,181,61,.45)"
            borderRadius="2xl"
            bg="whiteAlpha.50"
            p={{ base: 4, md: 5 }}
            _hover={{ bg: "whiteAlpha.100", borderColor: GOLD }}
          >
            {/* Brand */}
            <Box flexShrink={0}>
              <HStack gap={2} justify={{ base: "center", md: "flex-start" }}>
                <Box as="span" color={GOLD} fontSize="lg" letterSpacing="-2px">
                  ◀◀
                </Box>
                <Text
                  fontFamily="title"
                  color={GOLD}
                  fontSize={{ base: "xl", md: "2xl" }}
                  letterSpacing="0.04em"
                >
                  REWINDING
                </Text>
              </HStack>
              <Text
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.18em"
                color="nexzy.gray.100"
                textTransform="uppercase"
              >
                Today in gaming history
                {episode.event
                  ? ` · ${monthName(episode.event.month).toUpperCase()} ${episode.event.day}`
                  : ""}
              </Text>
            </Box>

            {/* Time-machine readout */}
            {year && (
              <HStack
                gap={2}
                fontFamily="mono"
                display={{ base: "none", lg: "flex" }}
                flexShrink={0}
              >
                <Text fontSize="10px" color="nexzy.gray.100" mr={1}>
                  FROM
                </Text>
                {path.map((h, i) => {
                  const last = i === path.length - 1;
                  return (
                    <HStack gap={2} key={`${h}-${i}`}>
                      <Text
                        fontWeight="800"
                        fontSize={last ? "xl" : "sm"}
                        color={last ? GOLD : BLUE}
                        opacity={last ? 1 : 0.7}
                      >
                        {h}
                      </Text>
                      {!last && (
                        <Text color="nexzy.gray.100" fontSize="sm">
                          »
                        </Text>
                      )}
                    </HStack>
                  );
                })}
              </HStack>
            )}

            {/* Episode */}
            <Flex align="center" gap={3} flex="1" minW={0}>
              {episode.heroImageUrl && (
                <Image
                  src={episode.heroImageUrl}
                  alt=""
                  w="56px"
                  h="56px"
                  objectFit="cover"
                  flexShrink={0}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                />
              )}
              <Box flex="1" minW={0}>
                <Text
                  fontFamily="mono"
                  fontSize="10px"
                  letterSpacing="0.15em"
                  color={GOLD}
                >
                  TODAY&apos;S EPISODE
                </Text>
                <Text
                  color="nexzy.white"
                  fontWeight="700"
                  fontSize={{ base: "md", md: "lg" }}
                  lineClamp={1}
                >
                  {episode.title}
                </Text>
                {episode.excerpt && (
                  <Text color="nexzy.gray.100" fontSize="sm" lineClamp={1}>
                    {episode.excerpt}
                  </Text>
                )}
              </Box>
            </Flex>

            {/* CTA */}
            <Flex
              align="center"
              flexShrink={0}
              px={4}
              py={2}
              borderRadius="lg"
              border="1px solid"
              borderColor={GOLD}
              color={GOLD}
              fontWeight="700"
              fontSize="sm"
              whiteSpace="nowrap"
            >
              Rewind to {year ?? "then"} →
            </Flex>
          </Flex>
        </TrackedLink>
      </Box>
    </Box>
  );
}
