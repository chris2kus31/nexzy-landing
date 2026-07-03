import NextLink from "next/link";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  Button,
  HStack,
} from "@chakra-ui/react";
import { fetchPosts } from "@/lib/blog/api";
import BlogCard from "@/components/blog/BlogCard";

/**
 * Homepage "Latest Game News" band. Surfaces the newest published articles so
 * visitors who came for the app also discover the newsroom (and vice-versa) —
 * the news is a repeat-visit + SEO driver that funnels back to the app. Renders
 * nothing until there's at least one published article, so it never shows empty.
 * Server component (ISR via fetchPosts) so it's crawlable.
 */
export default async function LatestNews() {
  const { items } = await fetchPosts({ page: 1, pageSize: 3 });
  if (!items || items.length === 0) return null;

  return (
    <Box
      as="section"
      id="news"
      pt={{ base: 16, md: 20 }}
      pb={{ base: 8, md: 10 }}
      bg="nexzy.navy"
    >
      <Container maxW="container.xl">
        <Flex
          direction={{ base: "column", md: "row" }}
          align={{ base: "flex-start", md: "flex-end" }}
          justify="space-between"
          gap={4}
          mb={{ base: 8, md: 10 }}
        >
          <Box>
            <HStack gap={2} mb={2}>
              <Box w="8px" h="8px" borderRadius="full" bg="orange.300" />
              <Text
                color="orange.300"
                fontSize="xs"
                fontWeight="800"
                letterSpacing="widest"
                textTransform="uppercase"
              >
                The Nexzy Newsroom
              </Text>
            </HStack>
            <Heading
              as="h2"
              size={{ base: "2xl", md: "3xl" }}
              color="nexzy.white"
              mb={2}
            >
              Latest Game News
            </Heading>
            <Text
              color="nexzy.gray.100"
              fontSize={{ base: "md", md: "lg" }}
              maxW="2xl"
            >
              Fresh gaming news across every console and PC — reported straight,
              with attitude. You&apos;ll find it all here and inside the
              app&apos;s News tab.
            </Text>
          </Box>

          <Button
            asChild
            size="lg"
            variant="outline"
            color="nexzy.white"
            borderColor="nexzy.blue/40"
            borderRadius="full"
            px={7}
            flexShrink={0}
            _hover={{ bg: "whiteAlpha.100", transform: "translateY(-2px)" }}
            transition="all 0.2s"
          >
            <NextLink href="/blog">All game news →</NextLink>
          </Button>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} alignItems="stretch">
          {items.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
