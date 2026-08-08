import NextLink from "next/link";
import {
  Box,
  Container,
  Flex,
  HStack,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { RewindDayHub } from "@/lib/blog/api";
import { eraForYear, monthName } from "@/lib/rewind/era";

/**
 * The day-hub — an evergreen "This Day in Gaming" page. Today's featured episode
 * on top, then a timeline of every event on the date (published episodes link
 * out; the rest are faded scaffold that fills in over time).
 */
export default function DayHubView({ hub }: { hub: RewindDayHub }) {
  const hero = hub.episodes[0] ?? null;
  const heroEra = eraForYear(hero?.event?.year);

  return (
    <Container maxW="3xl" py={{ base: 8, md: 12 }}>
      <Box textAlign="center" mb={8}>
        <Text
          fontFamily="mono"
          letterSpacing="0.3em"
          fontSize="xs"
          color="nexzy.gray.100"
        >
          THIS DAY IN GAMING
        </Text>
        <Heading fontFamily="title" size="3xl" color="nexzy.white" my={1}>
          {monthName(hub.month)} {hub.day}
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          {hub.timeline.length} moments · one permanent page, refreshed every
          year
        </Text>
      </Box>

      {hero && (
        <NextLink href={`/rewind/${hero.slug}`}>
          <Flex
            align="center"
            gap={4}
            border="1px solid"
            borderColor={heroEra.accent}
            borderRadius="xl"
            p={4}
            mb={8}
            _hover={{ bg: "whiteAlpha.50" }}
          >
            <Box flex="1">
              <Text
                fontFamily="mono"
                fontSize="10px"
                letterSpacing="0.15em"
                color={heroEra.accent}
                mb={1}
              >
                TODAY&apos;S EPISODE
              </Text>
              <Text color="nexzy.white" fontWeight="700" fontSize="lg">
                {hero.title}
              </Text>
              {hero.excerpt && (
                <Text color="nexzy.gray.100" fontSize="sm" lineClamp={2}>
                  {hero.excerpt}
                </Text>
              )}
            </Box>
            <Text color={heroEra.accent} fontWeight="700" whiteSpace="nowrap">
              Step in ▸
            </Text>
          </Flex>
        </NextLink>
      )}

      <Text
        fontFamily="mono"
        fontSize="xs"
        letterSpacing="0.15em"
        color="nexzy.gray.100"
        mb={3}
      >
        EVERYTHING THAT HAPPENED ON THIS DATE
      </Text>

      <VStack align="stretch" gap={2}>
        {hub.timeline.map((t, i) => {
          const accent = eraForYear(t.year).accent;
          const row = (
            <Flex
              align="center"
              gap={3}
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              p={3}
              opacity={t.slug ? 1 : 0.75}
              _hover={t.slug ? { borderColor: accent } : undefined}
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
              <Text
                fontSize="xs"
                color={t.slug ? accent : "nexzy.gray.100"}
                whiteSpace="nowrap"
              >
                {t.slug ? "Full episode ▸" : "stub"}
              </Text>
            </Flex>
          );
          return t.slug ? (
            <NextLink key={`${t.title}-${i}`} href={`/rewind/${t.slug}`}>
              {row}
            </NextLink>
          ) : (
            <Box key={`${t.title}-${i}`}>{row}</Box>
          );
        })}
      </VStack>
    </Container>
  );
}
