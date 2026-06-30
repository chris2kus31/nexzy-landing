import NextLink from "next/link";
import { Box, Heading, VStack, HStack, Text } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";
import { formatCount } from "@/lib/blog/format";

export default function MostRead({ posts }: { posts: PublicPost[] }) {
  if (posts.length === 0) return null;
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="nexzy.blue/20"
      borderRadius="xl"
      p={5}
    >
      <Heading as="h2" size="md" color="white" mb={4}>
        Most read
      </Heading>
      <VStack align="stretch" gap={3}>
        {posts.map((p, i) => (
          <NextLink key={p.slug} href={`/blog/${p.slug}`}>
            <HStack gap={3} align="flex-start">
              <Text
                color="nexzy.blue"
                fontWeight="700"
                fontSize="lg"
                lineHeight="1.2"
                minW="22px"
              >
                {i + 1}
              </Text>
              <Box>
                <Text
                  color="gray.100"
                  fontSize="sm"
                  fontWeight="500"
                  lineClamp={2}
                  _hover={{ color: "white" }}
                >
                  {p.title}
                </Text>
                <Text color="gray.500" fontSize="xs" mt={0.5}>
                  {formatCount(p.viewCount)} reads
                </Text>
              </Box>
            </HStack>
          </NextLink>
        ))}
      </VStack>
    </Box>
  );
}
