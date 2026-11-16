// One entry on the trend page: its rendered share image (or a placeholder
// while it renders), the author and hearts. Links to the entry's own page.
import NextLink from "next/link";
import { Box, Flex, Image, Text } from "@chakra-ui/react";
import type { TrendEntryRow } from "@/lib/trends/types";

export default function EntryCard({
  slug,
  hashtag,
  entry,
}: {
  slug: string;
  hashtag: string;
  entry: TrendEntryRow;
}) {
  const img = entry.trend?.images?.portrait ?? null;
  return (
    <NextLink href={`/t/${slug}/${entry.id}`} style={{ display: "block" }}>
      <Box
        borderRadius="14px"
        bg="#1E2346"
        p={2}
        _hover={{ bg: "#262C57" }}
        transition="background 0.15s"
      >
        <Box
          borderRadius="10px"
          overflow="hidden"
          aspectRatio="4 / 5"
          bg="#151935"
        >
          {img ? (
            <Image
              src={img}
              alt={`@${entry.author.username}'s #${hashtag}`}
              w="100%"
              h="100%"
              objectFit="cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <Flex h="100%" align="center" justify="center" px={3}>
              <Text color="#5A6399" fontSize="sm" textAlign="center">
                #{hashtag}
              </Text>
            </Flex>
          )}
        </Box>
        <Flex justify="space-between" align="center" mt={2} px={1} gap={2}>
          <Text color="white" fontSize="sm" fontWeight="700" truncate>
            @{entry.author.username}
          </Text>
          <Text color="#9AA1C7" fontSize="xs" flexShrink={0}>
            {entry.likeCount.toLocaleString("en-US")}{" "}
            {entry.likeCount === 1 ? "heart" : "hearts"}
          </Text>
        </Flex>
      </Box>
    </NextLink>
  );
}
