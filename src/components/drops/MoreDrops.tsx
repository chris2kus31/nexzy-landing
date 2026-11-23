// "More drops to build": the other live drops (then the ones dropping soon)
// as the same cards /drops uses. Phones get a swipeable row (cards peek so
// it reads as scrollable); wider screens get a grid. Every drop is another
// card someone makes and shares, so each page ends by offering the next one.
import NextLink from "next/link";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import DropCard from "@/components/drops/DropCard";
import { D } from "@/components/drops/tokens";
import type { DropCard as Drop, DropsPage } from "@/lib/trends/types";

/** Live drops other than `slug` first (newest numbers first, as the API
 *  orders them), topped up with drops coming soon. Player drops only when
 *  Nexzy put them on the website (the API's `players` list). */
export function moreDrops(
  page: DropsPage | null,
  slug: string,
  max = 6,
): Drop[] {
  if (!page) return [];
  const live = [...page.live, ...(page.players ?? [])].filter(
    (d) => d.slug !== slug && d.phase === "live",
  );
  const soon = page.soon.filter((d) => d.slug !== slug);
  return [...live, ...soon].slice(0, max);
}

export default function MoreDrops({
  drops,
  title = "More drops to build",
  sub = "New picks, same idea. Make one, share it.",
}: {
  drops: Drop[];
  title?: string;
  sub?: string;
}) {
  if (drops.length === 0) return null;
  return (
    <Box as="section" aria-labelledby="more-drops">
      <Flex align="flex-end" justify="space-between" gap={4} mb={4}>
        <Box>
          <Heading
            id="more-drops"
            as="h2"
            fontFamily="title"
            fontWeight="700"
            fontSize="2xl"
          >
            {title}
          </Heading>
          <Text color={D.muted} fontSize="sm" mt={1}>
            {sub}
          </Text>
        </Box>
        <NextLink
          href="/drops"
          style={{
            color: D.yellow,
            fontWeight: 700,
            fontSize: 14,
            whiteSpace: "nowrap",
          }}
        >
          See all drops
        </NextLink>
      </Flex>
      <Box
        display={{ base: "flex", md: "grid" }}
        gridTemplateColumns={{ md: "repeat(3, minmax(0, 1fr))" }}
        gap={{ base: 3, md: 6 }}
        overflowX={{ base: "auto", md: "visible" }}
        scrollSnapType={{ base: "x mandatory", md: "none" }}
        mx={{ base: -4, md: 0 }}
        px={{ base: 4, md: 0 }}
        pb={{ base: 2, md: 0 }}
        css={{
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {drops.map((d) => (
          <Box
            key={d.slug}
            flex={{ base: "0 0 78%", sm: "0 0 300px" }}
            minW={0}
            scrollSnapAlign="start"
          >
            <DropCard drop={d} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
