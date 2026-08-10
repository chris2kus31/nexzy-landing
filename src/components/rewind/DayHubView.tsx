import { Box, Container, Flex, Heading, Image, Text } from "@chakra-ui/react";
import TrackedLink from "@/components/TrackedLink";
import RewindDayNav from "@/components/rewind/RewindDayNav";
import type { RewindDayHub } from "@/lib/blog/api";
import { monthName, dateSlug } from "@/lib/rewind/era";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const GOLD = "#f5b53d";

/**
 * The day-hub — an evergreen "On This Day in Gaming" page, styled like a
 * magazine table of contents: a masthead, a cover-story feature, and a numbered
 * "In This Issue" list of every episode published for the date. Shows ONLY
 * published episodes (raw candidate/stub events are never shown). Emits
 * CollectionPage + ItemList + BreadcrumbList JSON-LD; links fire content_click.
 */
export default function DayHubView({ hub }: { hub: RewindDayHub }) {
  const episodes = hub.episodes ?? [];
  const lead = episodes[0] ?? null;
  const bySlug = new Map(episodes.map((e) => [e.slug, e]));
  const contents = hub.timeline.filter((t) => t.slug);
  const dslug = dateSlug(hub.month, hub.day);
  const dateLabel = `${monthName(hub.month)} ${hub.day}`;

  const hasVideo = (slug: string | null) => {
    if (!slug) return false;
    const e = bySlug.get(slug);
    return !!(e && ((e.videoUrls && e.videoUrls.length) || e.youtubeUrl));
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `On This Day in Gaming: ${dateLabel}`,
    url: `${SITE_URL}/rewind/on-this-day/${dslug}`,
    isPartOf: {
      "@type": "WebSite",
      name: "Nexzy Rewind",
      url: `${SITE_URL}/rewind`,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: contents.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.title,
        url: `${SITE_URL}/rewind/${t.slug}`,
      })),
    },
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
        name: dateLabel,
        item: `${SITE_URL}/rewind/on-this-day/${dslug}`,
      },
    ],
  };

  return (
    <Container maxW="3xl" pt={{ base: 24, md: 28 }} pb={{ base: 12, md: 16 }}>
      <RewindDayNav month={hub.month} day={hub.day} />

      {/* MASTHEAD */}
      <Box textAlign="center" mb={{ base: 6, md: 8 }}>
        <Text
          fontFamily="mono"
          letterSpacing="0.32em"
          fontSize="xs"
          color={GOLD}
        >
          NEXZY REWIND · ON THIS DAY
        </Text>
        <Heading
          fontFamily="title"
          size="3xl"
          color="nexzy.white"
          textTransform="uppercase"
          lineHeight="1"
          my={2}
        >
          {dateLabel}
        </Heading>
        <Flex align="center" justify="center" gap={3} mt={2}>
          <Box
            w={{ base: "40px", md: "70px" }}
            h="2px"
            bg="rgba(245,181,61,.5)"
          />
          <Text fontFamily="mono" fontSize="xs" color="nexzy.gray.100">
            {contents.length} {contents.length === 1 ? "story" : "stories"} from
            this date
          </Text>
          <Box
            w={{ base: "40px", md: "70px" }}
            h="2px"
            bg="rgba(245,181,61,.5)"
          />
        </Flex>
      </Box>

      {/* COVER STORY */}
      {lead && (
        <TrackedLink
          href={`/rewind/${lead.slug}`}
          event="content_click"
          params={{
            content_type: "rewind",
            slug: lead.slug,
            from: "rewind_dayhub_cover",
          }}
        >
          <Flex
            direction={{ base: "column", sm: "row" }}
            align={{ base: "stretch", sm: "center" }}
            gap={{ base: 3, md: 5 }}
            border="1px solid"
            borderColor={GOLD}
            borderRadius="xl"
            overflow="hidden"
            p={{ base: 3, md: 4 }}
            mb={{ base: 8, md: 10 }}
            _hover={{ bg: "whiteAlpha.50" }}
          >
            {lead.heroImageUrl && (
              <Image
                src={lead.heroImageUrl}
                alt={lead.imageAlt || lead.title}
                w={{ base: "100%", sm: "180px", md: "220px" }}
                h={{ base: "160px", sm: "128px", md: "150px" }}
                objectFit="cover"
                borderRadius="lg"
                border="1px solid"
                borderColor="whiteAlpha.200"
                flexShrink={0}
              />
            )}
            <Box flex="1" minW="0">
              <Flex align="center" gap={2} mb={1}>
                <Text
                  fontFamily="mono"
                  fontSize="10px"
                  letterSpacing="0.18em"
                  color={GOLD}
                >
                  COVER STORY
                </Text>
                {lead.event?.year && (
                  <Text
                    fontFamily="mono"
                    fontSize="10px"
                    color="nexzy.gray.100"
                  >
                    · {lead.event.year}
                  </Text>
                )}
                {hasVideo(lead.slug) && (
                  <Text fontSize="10px" color={GOLD}>
                    ▶ VIDEO
                  </Text>
                )}
              </Flex>
              <Text
                color="nexzy.white"
                fontWeight="700"
                fontSize={{ base: "lg", md: "xl" }}
                lineHeight="1.2"
              >
                {lead.title}
              </Text>
              {lead.excerpt && (
                <Text color="nexzy.gray.100" fontSize="sm" lineClamp={2} mt={1}>
                  {lead.excerpt}
                </Text>
              )}
              <Text color={GOLD} fontWeight="700" fontSize="sm" mt={2}>
                Open the issue ▸
              </Text>
            </Box>
          </Flex>
        </TrackedLink>
      )}

      {/* IN THIS ISSUE — the table of contents */}
      <Flex align="center" gap={3} mb={2}>
        <Text
          fontFamily="title"
          textTransform="uppercase"
          letterSpacing="0.06em"
          color="nexzy.white"
          fontSize={{ base: "lg", md: "xl" }}
        >
          In This Issue
        </Text>
        <Box flex="1" h="2px" bg="rgba(245,181,61,.4)" />
      </Flex>

      <Box>
        {contents.map((t, i) => (
          <TrackedLink
            key={t.slug}
            href={`/rewind/${t.slug}`}
            event="content_click"
            params={{
              content_type: "rewind",
              slug: t.slug ?? "",
              from: "rewind_dayhub_toc",
            }}
          >
            <Flex
              align="center"
              gap={{ base: 3, md: 4 }}
              py={3}
              borderTop="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ bg: "whiteAlpha.50" }}
              transition="background .15s"
            >
              <Text
                fontFamily="mono"
                fontSize={{ base: "sm", md: "md" }}
                color={GOLD}
                minW={{ base: "22px", md: "26px" }}
                textAlign="right"
              >
                {String(i + 1).padStart(2, "0")}
              </Text>
              {t.image ? (
                <Image
                  src={t.image}
                  alt=""
                  w={{ base: "56px", md: "68px" }}
                  h={{ base: "40px", md: "48px" }}
                  objectFit="cover"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  flexShrink={0}
                />
              ) : (
                <Box
                  w={{ base: "56px", md: "68px" }}
                  h={{ base: "40px", md: "48px" }}
                  borderRadius="md"
                  bg="whiteAlpha.100"
                  flexShrink={0}
                />
              )}
              <Box flex="1" minW="0">
                <Flex align="center" gap={2} mb="2px">
                  {t.year && (
                    <Text fontFamily="mono" fontSize="10px" color={GOLD}>
                      {t.year}
                    </Text>
                  )}
                  {t.category && (
                    <Text
                      fontFamily="mono"
                      fontSize="10px"
                      letterSpacing="0.12em"
                      color="nexzy.gray.100"
                      textTransform="uppercase"
                    >
                      {t.category}
                    </Text>
                  )}
                  {hasVideo(t.slug) && (
                    <Text fontSize="10px" color={GOLD}>
                      ▶
                    </Text>
                  )}
                </Flex>
                <Text
                  color="nexzy.white"
                  fontWeight="600"
                  fontSize={{ base: "sm", md: "md" }}
                  lineClamp={1}
                >
                  {t.title}
                </Text>
              </Box>
              <Text color={GOLD} fontWeight="700" flexShrink={0}>
                ▸
              </Text>
            </Flex>
          </TrackedLink>
        ))}
        <Box borderTop="1px solid" borderColor="whiteAlpha.200" />
      </Box>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </Container>
  );
}
