import {
  Box,
  Container,
  Flex,
  HStack,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import TrackedLink from "@/components/TrackedLink";
import type { RewindDayHub } from "@/lib/blog/api";
import { eraForYear, monthName, dateSlug } from "@/lib/rewind/era";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

/**
 * The day-hub — an evergreen "This Day in Gaming" page. Shows ONLY the episodes
 * we've written + published for the date: the top one as the featured hero, the
 * rest below. Raw candidate/stub events are never shown. Emits ItemList +
 * BreadcrumbList JSON-LD; episode links fire content_click.
 */
export default function DayHubView({ hub }: { hub: RewindDayHub }) {
  const hero = hub.episodes[0] ?? null;
  const heroEra = eraForYear(hero?.event?.year);
  const dslug = dateSlug(hub.month, hub.day);
  // Everything published for this date except the hero (avoid showing it twice).
  const rest = hub.timeline.filter((t) => t.slug && t.slug !== hero?.slug);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `This Day in Gaming: ${monthName(hub.month)} ${hub.day}`,
    itemListElement: hub.timeline
      .filter((t) => t.slug)
      .map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.title,
        url: `${SITE_URL}/rewind/${t.slug}`,
      })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Rewind",
        item: `${SITE_URL}/rewind`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `${monthName(hub.month)} ${hub.day}`,
        item: `${SITE_URL}/rewind/day/${dslug}`,
      },
    ],
  };

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
          {hub.timeline.length} episode{hub.timeline.length === 1 ? "" : "s"} ·
          a permanent page we add to over time
        </Text>
      </Box>

      {hero && (
        <TrackedLink
          href={`/rewind/${hero.slug}`}
          event="content_click"
          params={{
            content_type: "rewind",
            slug: hero.slug,
            from: "rewind_dayhub_hero",
          }}
        >
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
        </TrackedLink>
      )}

      {rest.length > 0 && (
        <>
          <Text
            fontFamily="mono"
            fontSize="xs"
            letterSpacing="0.15em"
            color="nexzy.gray.100"
            mb={3}
          >
            MORE EPISODES ON THIS DATE
          </Text>

          <VStack align="stretch" gap={2}>
            {rest.map((t, i) => {
              const accent = eraForYear(t.year).accent;
              return (
                <TrackedLink
                  key={`${t.slug ?? t.title}-${i}`}
                  href={`/rewind/${t.slug}`}
                  event="content_click"
                  params={{
                    content_type: "rewind",
                    slug: t.slug ?? "",
                    from: "rewind_dayhub",
                  }}
                >
                  <Flex
                    align="center"
                    gap={3}
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="lg"
                    p={3}
                    _hover={{ borderColor: accent }}
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
                    <Text fontSize="xs" color={accent} whiteSpace="nowrap">
                      Full episode ▸
                    </Text>
                  </Flex>
                </TrackedLink>
              );
            })}
          </VStack>
        </>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </Container>
  );
}
