import { Box, Flex, Text, HStack, Link } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";

type Deal = NonNullable<NonNullable<PublicPost["formatData"]>["deal"]>;

/**
 * Deals core module: the price box + the store link (the transactional payload).
 * Reporting-only — it states the price and whether it's a genuine low; it never
 * tells the reader to buy. Renders nothing without a deal + store link.
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

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="2xl"
      p={{ base: 5, md: 6 }}
      my={8}
    >
      <HStack gap={3} align="baseline" flexWrap="wrap" mb={2}>
        {priceNow && (
          <Text
            fontFamily="title"
            fontWeight="700"
            fontSize="3xl"
            color="green.300"
          >
            {priceNow}
          </Text>
        )}
        {priceWas && (
          <Text fontSize="lg" color="gray.500" textDecoration="line-through">
            {priceWas}
          </Text>
        )}
        {pct && (
          <Box
            bg="green.400/15"
            color="green.300"
            fontWeight="700"
            fontSize="sm"
            px={2.5}
            py={1}
            borderRadius="md"
          >
            -{pct.replace(/^-/, "")}
          </Box>
        )}
      </HStack>

      {isHistoricalLow && (
        <Text color="green.300" fontSize="sm" mb={1}>
          ✓ Historical low — cheapest it&apos;s been
        </Text>
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
        display="inline-flex"
        alignItems="center"
        gap={2}
        bg="nexzy.blue"
        color="white"
        fontWeight="700"
        fontSize="md"
        px={5}
        py={2.5}
        borderRadius="lg"
        _hover={{ bg: "nexzy.lightBlue", textDecoration: "none" }}
      >
        Get it{store ? ` on ${store}` : ""} →
      </Link>

      {endsAt && (
        <Flex align="center" gap={1.5} mt={3} color="yellow.300" fontSize="xs">
          <Text>⏳ Ends {endsAt}</Text>
        </Flex>
      )}
    </Box>
  );
}
