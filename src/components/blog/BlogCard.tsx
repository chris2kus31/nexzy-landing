import NextLink from "next/link";
import { Box, Image, Heading, Text, HStack, Badge } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";

const BEAT_LABEL: Record<string, string> = {
  game_news: "Game News",
  console_hardware: "Hardware",
  game_movies_tv: "Movies & TV",
  deals: "Deals",
};

export default function BlogCard({ post }: { post: PublicPost }) {
  return (
    <NextLink href={`/blog/${post.slug}`} style={{ display: "block" }}>
      <Box
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="nexzy.blue/20"
        borderRadius="xl"
        overflow="hidden"
        transition="all 0.2s"
        _hover={{ borderColor: "nexzy.blue/50", transform: "translateY(-4px)" }}
        h="full"
      >
        {post.heroImageUrl ? (
          <Image
            src={post.heroImageUrl}
            alt={post.imageAlt || post.title}
            w="full"
            aspectRatio={16 / 9}
            objectFit="cover"
          />
        ) : (
          <Box w="full" aspectRatio={16 / 9} bg="nexzy.blue/10" />
        )}
        <Box p={5}>
          <HStack gap={2} mb={2}>
            <Badge colorPalette="blue" variant="subtle" size="sm">
              {BEAT_LABEL[post.beat] || post.beat}
            </Badge>
            {post.publishedAt && (
              <Text color="gray.400" fontSize="xs">
                {new Date(post.publishedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            )}
          </HStack>
          <Heading as="h3" size="md" color="white" lineClamp={2} mb={2}>
            {post.title}
          </Heading>
          {post.excerpt && (
            <Text color="gray.300" fontSize="sm" lineClamp={3}>
              {post.excerpt}
            </Text>
          )}
        </Box>
      </Box>
    </NextLink>
  );
}
