import type { Metadata } from "next";
import {
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import TrackedLink from "@/components/TrackedLink";
import RewindDayNav from "@/components/rewind/RewindDayNav";
import { fetchRewindToday, fetchRewindRecent } from "@/lib/blog/api";
import { monthName } from "@/lib/rewind/era";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Rewind — This Day in Gaming History | Nexzy",
  description:
    "Nexzy Rewind is a daily trip back through gaming history — the launches, consoles, and moments that mattered, on this day. Browse any date.",
  alternates: { canonical: "/rewind" },
};

export default async function RewindSeriesPage() {
  const now = new Date();
  const [today, recent] = await Promise.all([
    fetchRewindToday(),
    fetchRewindRecent(12),
  ]);

  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />

      <Container maxW="5xl" pt={{ base: 24, md: 28 }} pb={{ base: 12, md: 16 }}>
        {/* SERIES HERO */}
        <Box textAlign="center" mb={{ base: 7, md: 9 }}>
          <Heading
            fontFamily="title"
            color="nexzy.gold"
            fontSize={{ base: "3xl", md: "5xl" }}
            letterSpacing="0.04em"
          >
            ◀◀ REWINDING
          </Heading>
          <Text
            mt={2}
            color="nexzy.gray.100"
            fontSize={{ base: "sm", md: "md" }}
          >
            This day in gaming history — a permanent archive we add to every
            day.
          </Text>
        </Box>

        {/* WHAT IS REWIND — the series explainer */}
        <Box maxW="2xl" mx="auto" textAlign="center" mb={{ base: 8, md: 10 }}>
          <Text
            color="nexzy.gray.100"
            fontSize={{ base: "sm", md: "md" }}
            lineHeight="1.7"
          >
            Every day, Rewind resurfaces a game or moment that launched on this
            date — then rebuilds it in the look of its era: an 80s print
            magazine, a glossy 90s console spread, a 2000s game-info screen. One
            day at a time, we&rsquo;re re-telling the history of video games.
          </Text>
          <HStack justify="center" gap={2} mt={5} flexWrap="wrap">
            {["1970s–80s", "1990s", "2000s"].map((e) => (
              <Box
                key={e}
                fontFamily="mono"
                fontSize="11px"
                letterSpacing="0.1em"
                textTransform="uppercase"
                color="nexzy.gold"
                border="1px solid"
                borderColor="rgba(245,181,61,.4)"
                borderRadius="full"
                px={3}
                py={1}
              >
                {e}
              </Box>
            ))}
          </HStack>
        </Box>

        {/* JUMP TO A DATE */}
        <RewindDayNav month={now.getMonth() + 1} day={now.getDate()} />

        {/* TODAY'S FEATURED */}
        {today && (
          <TrackedLink
            href={`/rewind/${today.slug}`}
            event="content_click"
            params={{
              content_type: "rewind",
              slug: today.slug,
              from: "rewind_series_today",
            }}
          >
            <Flex
              align="center"
              gap={4}
              border="1px solid"
              borderColor="nexzy.gold"
              borderRadius="xl"
              p={4}
              mb={{ base: 10, md: 12 }}
              _hover={{ bg: "whiteAlpha.50" }}
            >
              {today.heroImageUrl && (
                <Image
                  src={today.heroImageUrl}
                  alt={today.imageAlt || today.title}
                  w={{ base: "92px", md: "128px" }}
                  h={{ base: "92px", md: "128px" }}
                  objectFit="cover"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  flexShrink={0}
                />
              )}
              <Box flex="1">
                <Text
                  fontFamily="mono"
                  fontSize="10px"
                  letterSpacing="0.15em"
                  color="nexzy.gold"
                  mb={1}
                >
                  TODAY&apos;S EPISODE ·{" "}
                  {today.event
                    ? `${monthName(today.event.month).toUpperCase()} ${today.event.day}`
                    : ""}
                </Text>
                <Text color="nexzy.white" fontWeight="700" fontSize="xl">
                  {today.title}
                </Text>
                {today.excerpt && (
                  <Text color="nexzy.gray.100" fontSize="sm" lineClamp={2}>
                    {today.excerpt}
                  </Text>
                )}
              </Box>
              <Text color="nexzy.gold" fontWeight="700" whiteSpace="nowrap">
                Step in ▸
              </Text>
            </Flex>
          </TrackedLink>
        )}

        {/* RECENT EPISODES */}
        {recent.length > 0 && (
          <>
            <Text
              fontFamily="mono"
              fontSize="xs"
              letterSpacing="0.15em"
              color="nexzy.gray.100"
              mb={4}
            >
              RECENT EPISODES
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4}>
              {recent.map((r) => (
                <TrackedLink
                  key={r.slug}
                  href={`/rewind/${r.slug}`}
                  event="content_click"
                  params={{
                    content_type: "rewind",
                    slug: r.slug,
                    from: "rewind_series_recent",
                  }}
                >
                  <Box
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="lg"
                    overflow="hidden"
                    h="100%"
                    _hover={{ borderColor: "nexzy.gold" }}
                  >
                    <Box
                      position="relative"
                      bg="#0b1526"
                      css={{ aspectRatio: "1.6" }}
                    >
                      {r.image && (
                        <Image
                          src={r.image}
                          alt={r.title}
                          w="100%"
                          h="100%"
                          objectFit="cover"
                        />
                      )}
                    </Box>
                    <Box p={3}>
                      <Text
                        fontFamily="mono"
                        fontSize="11px"
                        color="nexzy.gold"
                        fontWeight="700"
                      >
                        {r.year ?? "—"}
                        {r.month
                          ? ` · ${monthName(r.month).toUpperCase()} ${r.day}`
                          : ""}
                      </Text>
                      <Text color="nexzy.white" fontWeight="600" lineClamp={2}>
                        {r.title}
                      </Text>
                    </Box>
                  </Box>
                </TrackedLink>
              ))}
            </SimpleGrid>
          </>
        )}
      </Container>

      <Footer />
    </Box>
  );
}
