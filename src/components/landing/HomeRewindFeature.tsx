import NextImage from "next/image";
import { Box, Container, Flex, HStack, Heading, Text } from "@chakra-ui/react";
import TrackedLink from "@/components/TrackedLink";
import type { RewindEpisode } from "@/lib/blog/api";
import { monthName, dateSlug } from "@/lib/rewind/era";

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
 * Home "Today in gaming history" — the flagship Rewind feature. Full-width and
 * Rewind-branded (time-machine readout, gold masthead, big cover) so Rewind
 * leads the newsroom. Trending lives in the hero rail; this section is Rewind's.
 */
export default function HomeRewindFeature({
  episode,
}: {
  episode: RewindEpisode | null;
}) {
  if (!episode) return null;
  const ep = episode;
  const year = ep.event?.year ?? null;
  const nowY = new Date().getFullYear();
  const path = hops(nowY, year ?? nowY);
  const yearsAgo = year ? nowY - year : null;
  const dateLabel = ep.event
    ? `${monthName(ep.event.month).toUpperCase()} ${ep.event.day}`
    : "";
  // Clicking Rewind lands on the day hub (all episodes for this date), so the
  // reader can pick which one to watch — not straight into a single episode.
  const dayHref = ep.event
    ? `/rewind/on-this-day/${dateSlug(ep.event.month, ep.event.day)}`
    : `/rewind/${ep.slug}`;

  return (
    <Box as="section" bg="nexzy.navy" py={{ base: 8, md: 12 }}>
      <Container maxW="container.xl" px={{ base: 5, md: 6 }}>
        {/* Masthead */}
        <Flex
          justify="space-between"
          align="flex-end"
          mb={{ base: 5, md: 6 }}
          gap={4}
          wrap="wrap"
        >
          <Box>
            <HStack gap={2.5} mb={2}>
              <Box as="span" color={GOLD} fontSize="lg" letterSpacing="-2px">
                ◀◀
              </Box>
              <Text
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color={GOLD}
              >
                Rewind · Today in gaming history
                {dateLabel ? ` · ${dateLabel}` : ""}
              </Text>
            </HStack>
            <Heading
              as="h2"
              fontFamily="title"
              size={{ base: "xl", md: "2xl" }}
              color="white"
            >
              Step into the time machine
            </Heading>
          </Box>
          <TrackedLink
            href="/rewind"
            event="content_click"
            params={{ content_type: "rewind", from: "home_feature_all" }}
          >
            <Text color="nexzy.lightBlue" fontWeight="700" fontSize="sm">
              All Rewinds →
            </Text>
          </TrackedLink>
        </Flex>

        {/* Feature card */}
        <TrackedLink
          href={dayHref}
          event="content_click"
          params={{
            content_type: "rewind",
            slug: ep.slug,
            from: "home_feature",
          }}
        >
          <Box
            display="grid"
            gridTemplateColumns={{ base: "1fr", lg: "1.15fr 1fr" }}
            gap={0}
            border="1px solid"
            borderColor="rgba(245,181,61,.4)"
            borderRadius="2xl"
            overflow="hidden"
            bg="whiteAlpha.50"
            transition="all 0.2s"
            _hover={{ borderColor: GOLD, transform: "translateY(-3px)" }}
          >
            {/* Cover — the whole art always shows (contain) over a blurred fill
                of itself, so any box-art aspect ratio looks clean, never cropped. */}
            <Box
              position="relative"
              minH={{ base: "240px", md: "360px" }}
              bg="#0b1526"
              overflow="hidden"
            >
              {ep.heroImageUrl ? (
                <>
                  {/* blurred, dimmed backdrop of the same art fills any gaps */}
                  <NextImage
                    src={ep.heroImageUrl}
                    alt=""
                    aria-hidden
                    fill
                    sizes="(max-width: 1024px) 100vw, 700px"
                    style={{
                      objectFit: "cover",
                      filter: "blur(24px)",
                      transform: "scale(1.18)",
                      opacity: 0.5,
                    }}
                  />
                  <Box position="absolute" inset={0} bg="rgba(11,21,38,.4)" />
                  {/* vignette for depth so the framed art pops */}
                  <Box
                    position="absolute"
                    inset={0}
                    css={{
                      background:
                        "radial-gradient(120% 90% at 50% 45%, transparent 52%, rgba(0,0,0,.4))",
                    }}
                  />
                  {/* the whole art, framed with padding + a soft shadow */}
                  <Box position="absolute" inset={0} p={{ base: 4, md: 6 }}>
                    <Box position="relative" w="100%" h="100%">
                      <NextImage
                        src={ep.heroImageUrl}
                        alt={ep.imageAlt || ep.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 700px"
                        style={{
                          objectFit: "contain",
                          filter: "drop-shadow(0 10px 26px rgba(0,0,0,.55))",
                        }}
                      />
                    </Box>
                  </Box>
                </>
              ) : null}
              {/* keep the year visible over the art */}
              {year ? (
                <Box
                  position="absolute"
                  top={4}
                  left={4}
                  bg="rgba(11,21,38,.82)"
                  border="1px solid"
                  borderColor="rgba(245,181,61,.5)"
                  borderRadius="lg"
                  px={3}
                  py={1}
                  fontFamily="mono"
                  fontWeight="800"
                  color={GOLD}
                  fontSize="lg"
                >
                  {year}
                </Box>
              ) : null}
            </Box>

            {/* Readout + title */}
            <Flex
              direction="column"
              justify="center"
              gap={4}
              p={{ base: 6, md: 8 }}
            >
              {year ? (
                <HStack gap={2} fontFamily="mono" wrap="wrap">
                  <Text fontSize="10px" color="nexzy.gray.100" mr={1}>
                    FROM
                  </Text>
                  {path.map((h, i) => {
                    const last = i === path.length - 1;
                    return (
                      <HStack gap={2} key={`${h}-${i}`}>
                        <Text
                          fontWeight="800"
                          fontSize={last ? "2xl" : "sm"}
                          color={last ? GOLD : BLUE}
                          opacity={last ? 1 : 0.7}
                        >
                          {h}
                        </Text>
                        {!last ? (
                          <Text color="nexzy.gray.100" fontSize="sm">
                            »
                          </Text>
                        ) : null}
                      </HStack>
                    );
                  })}
                </HStack>
              ) : null}

              {yearsAgo && yearsAgo > 0 ? (
                <HStack gap={2} align="baseline">
                  <Text
                    fontFamily="title"
                    fontSize={{ base: "40px", md: "52px" }}
                    lineHeight="0.9"
                    color={GOLD}
                  >
                    {yearsAgo}
                  </Text>
                  <Text
                    fontSize="xs"
                    fontWeight="800"
                    letterSpacing="0.14em"
                    color="nexzy.gray.100"
                    textTransform="uppercase"
                    lineHeight="1.1"
                  >
                    years ago
                    <br />
                    today
                  </Text>
                </HStack>
              ) : null}

              <Box>
                <Text
                  fontFamily="mono"
                  fontSize="10px"
                  letterSpacing="0.15em"
                  color={GOLD}
                  mb={1}
                >
                  TODAY&apos;S EPISODE
                </Text>
                <Heading
                  as="h3"
                  fontFamily="title"
                  size={{ base: "lg", md: "xl" }}
                  color="white"
                  lineHeight="1.1"
                >
                  {ep.title}
                </Heading>
              </Box>

              {ep.excerpt ? (
                <Text
                  color="nexzy.gray.100"
                  fontSize={{ base: "sm", md: "md" }}
                  lineClamp={3}
                >
                  {ep.excerpt}
                </Text>
              ) : null}

              <Flex
                align="center"
                alignSelf="flex-start"
                px={5}
                py={2.5}
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
          </Box>
        </TrackedLink>
      </Container>
    </Box>
  );
}
