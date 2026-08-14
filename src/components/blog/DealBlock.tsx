import { Box, Flex, Text, HStack, Link } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";

type Deal = NonNullable<NonNullable<PublicPost["formatData"]>["deal"]>;

/**
 * Deals core module: a "price-drop" card — the money up front, the % off as the
 * hook, urgency + all-time-low badges, and a bold store CTA (the transactional
 * payload). Reporting-only: it states the price and whether it's a genuine low;
 * it never tells the reader to buy. Renders nothing without a deal + store link.
 */
export default function DealBlock({ deal }: { deal?: Deal | null }) {
  if (!deal || !deal.storeUrl) return null;
  const {
    priceNow,
    priceWas,
    pct,
    store,
    storeUrl,
    isHistoricalLow,
    endsAt,
    worthNote,
  } = deal;
  const pctClean = pct ? pct.replace(/^-/, "").replace(/%$/, "") : "";

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="2xl"
      p={{ base: 5, md: 6 }}
      my={8}
    >
      {/* Price + the % off hook */}
      <Flex
        justify="space-between"
        align="center"
        gap={3}
        flexWrap="wrap"
        mb={3}
      >
        <HStack gap={3} align="baseline" flexWrap="wrap">
          {priceNow && (
            <Text
              fontFamily="title"
              fontWeight="700"
              fontSize={{ base: "3xl", md: "4xl" }}
              color="green.300"
              lineHeight="1"
            >
              {priceNow}
            </Text>
          )}
          {priceWas && (
            <Text fontSize="lg" color="gray.500" textDecoration="line-through">
              {priceWas}
            </Text>
          )}
        </HStack>
        {pctClean && (
          <Flex
            direction="column"
            align="center"
            justify="center"
            bg="green.400"
            color="nexzy.navy"
            borderRadius="xl"
            px={4}
            py={2}
            lineHeight="1"
          >
            <Text fontFamily="title" fontWeight="700" fontSize="2xl">
              {pctClean}%
            </Text>
            <Text
              fontWeight="700"
              fontSize="10px"
              letterSpacing="wider"
              textTransform="uppercase"
            >
              off
            </Text>
          </Flex>
        )}
      </Flex>

      {/* Badges: all-time low + urgency */}
      {(isHistoricalLow || endsAt) && (
        <HStack gap={2} flexWrap="wrap" mb={worthNote ? 3 : 4}>
          {isHistoricalLow && (
            <HStack
              gap={1.5}
              bg="green.400/15"
              color="green.300"
              borderRadius="full"
              px={3}
              py={1}
            >
              <Text fontSize="xs" fontWeight="700">
                ✓ All-time low
              </Text>
            </HStack>
          )}
          {endsAt && (
            <HStack
              gap={1.5}
              bg="yellow.400/15"
              color="yellow.300"
              borderRadius="full"
              px={3}
              py={1}
            >
              <Text fontSize="xs" fontWeight="700">
                ⏳ Ends {endsAt}
              </Text>
            </HStack>
          )}
        </HStack>
      )}

      {worthNote && (
        <Text color="gray.400" fontSize="sm" mb={4} lineHeight="1.6">
          {worthNote}
        </Text>
      )}

      <Link
        href={storeUrl}
        target="_blank"
        rel="nofollow noopener noreferrer sponsored"
        display={{ base: "flex", sm: "inline-flex" }}
        w={{ base: "full", sm: "auto" }}
        alignItems="center"
        justifyContent="center"
        gap={2}
        bg="green.400"
        color="nexzy.navy"
        fontWeight="700"
        fontSize="sm"
        px={5}
        py={2.5}
        borderRadius="lg"
        _hover={{ bg: "green.300", textDecoration: "none" }}
      >
        Get it{store ? ` on ${store}` : ""} →
      </Link>
    </Box>
  );
}
