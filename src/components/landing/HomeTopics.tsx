// ============================================
// FILE: components/landing/HomeTopics.tsx
// Home "Browse by topic" chips — links into the /blog/topic/<slug> hubs.
// Only renders when there are enough substantial topics to look full.
// ============================================
import NextLink from "next/link";
import { Box, Container, Flex, Heading, Text, HStack } from "@chakra-ui/react";
import type { TagInfo } from "@/lib/blog/tags";

export default function HomeTopics({ tags }: { tags: TagInfo[] }) {
  if (tags.length < 4) return null;
  return (
    <Box as="section" py={{ base: 16, md: 24 }} bg="nexzy.navy">
      <Container maxW="container.xl" px={{ base: 5, md: 6 }}>
        <Flex
          justify="space-between"
          align="flex-end"
          gap={5}
          mb={8}
          wrap="wrap"
        >
          <Box>
            <HStack gap={2.5} mb={3}>
              <Box w="22px" h="2px" bg="nexzy.blue" borderRadius="full" />
              <Text
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="nexzy.blue"
              >
                Find your game
              </Text>
            </HStack>
            <Heading as="h2" size={{ base: "xl", md: "2xl" }} color="white">
              Browse by{" "}
              <Text as="span" color="nexzy.gold">
                topic
              </Text>
            </Heading>
            <Text color="gray.400" fontSize="md" mt={2} maxW="2xl">
              Every story and guide we&apos;ve written, sorted by the games you
              care about.
            </Text>
          </Box>
          <NextLink href="/blog">
            <Text color="nexzy.lightBlue" fontWeight="700" fontSize="sm">
              All topics →
            </Text>
          </NextLink>
        </Flex>

        <Flex wrap="wrap" gap={3}>
          {tags.map((t) => (
            <NextLink key={t.slug} href={`/blog/topic/${t.slug}`}>
              <HStack
                gap={2}
                px={5}
                py={2.5}
                borderRadius="full"
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.100"
                transition="all 0.15s"
                _hover={{ borderColor: "nexzy.blue" }}
              >
                <Text color="gray.100" fontWeight="700" fontSize="sm">
                  {t.tag}
                </Text>
                <Text color="gray.500" fontWeight="600" fontSize="xs">
                  {t.count}
                </Text>
              </HStack>
            </NextLink>
          ))}
        </Flex>
      </Container>
    </Box>
  );
}
