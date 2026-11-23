// One posted build (entry) on the Drops pages: its rendered share image (or a placeholder
// while it renders), the author and hearts. Links to the entry's own page.
import NextLink from "next/link";
import { Box, Flex, Image, Text } from "@chakra-ui/react";
import { entryPath, type TrendEntryRow } from "@/lib/trends/types";

export default function EntryCard({
  slug,
  hashtag,
  entry,
}: {
  slug: string;
  hashtag: string;
  entry: TrendEntryRow;
}) {
  // 720 px fits a card at under half the bytes of the 1080 px share file;
  // entries rendered before it existed fall back to the share file.
  const img =
    entry.trend?.images?.feed ?? entry.trend?.images?.portrait ?? null;
  return (
    <NextLink href={entryPath(slug, entry.id)} style={{ display: "block" }}>
      <Box
        borderRadius="14px"
        bg="#1A1F47"
        p={2}
        _hover={{ bg: "#232A5C" }}
        transition="background 0.15s"
      >
        <Box
          borderRadius="10px"
          overflow="hidden"
          aspectRatio="4 / 5"
          bg="#10132E"
        >
          {img ? (
            <Image
              src={img}
              alt={`@${entry.author.username}'s #${hashtag}`}
              w="100%"
              h="100%"
              objectFit="contain"
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
          {entry.likeCount > 0 && (
            <Text color="#9AA1C7" fontSize="xs" flexShrink={0}>
              {entry.likeCount.toLocaleString("en-US")}{" "}
              {entry.likeCount === 1 ? "heart" : "hearts"}
            </Text>
          )}
        </Flex>
      </Box>
    </NextLink>
  );
}
