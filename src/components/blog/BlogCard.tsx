import NextLink from "next/link";
import NextImage from "next/image";
import { Box, Heading, Text, HStack, Badge } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";
import { beatLabel, beatPalette } from "@/lib/blog/beats";
import { formatCount } from "@/lib/blog/format";

function fmt(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogCard({ post }: { post: PublicPost }) {
  return (
    <NextLink
      href={`/blog/${post.slug}`}
      style={{ display: "block", height: "100%" }}
    >
      <Box
        className="group"
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="nexzy.blue/20"
        borderRadius="xl"
        overflow="hidden"
        transition="all 0.2s"
        _hover={{
          borderColor: "nexzy.blue/60",
          transform: "translateY(-4px)",
          shadow: "lg",
        }}
        h="full"
        display="flex"
        flexDirection="column"
      >
        <Box
          position="relative"
          overflow="hidden"
          w="full"
          aspectRatio={16 / 9}
        >
          {post.heroImageUrl ? (
            <Box
              position="absolute"
              inset={0}
              transition="transform 0.3s"
              _groupHover={{ transform: "scale(1.04)" }}
            >
              <NextImage
                src={post.heroImageUrl}
                alt={post.imageAlt || post.title}
                fill
                sizes="(max-width: 640px) 100vw, 400px"
                style={{ objectFit: "cover" }}
              />
            </Box>
          ) : (
            <Box position="absolute" inset={0} bg="nexzy.blue/10" />
          )}
          <Badge
            position="absolute"
            top={3}
            left={3}
            colorPalette={beatPalette(post.beat)}
            variant="solid"
            size="sm"
          >
            {beatLabel(post.beat)}
          </Badge>
        </Box>
        <Box p={5} flex={1} display="flex" flexDirection="column">
          <Heading as="h3" size="md" color="white" lineClamp={2} mb={2}>
            {post.title}
          </Heading>
          {post.excerpt && (
            <Text color="gray.300" fontSize="sm" lineClamp={3} mb={3}>
              {post.excerpt}
            </Text>
          )}
          <HStack gap={2} mt="auto" color="gray.500" fontSize="xs">
            <Text>{fmt(post.publishedAt)}</Text>
            {post.viewCount > 0 && (
              <>
                <Text>·</Text>
                <Text>{formatCount(post.viewCount)} reads</Text>
              </>
            )}
          </HStack>
        </Box>
      </Box>
    </NextLink>
  );
}
