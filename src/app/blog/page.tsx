import type { Metadata } from "next";
import { Box, Container, Heading, Text, SimpleGrid } from "@chakra-ui/react";
import { fetchPosts } from "@/lib/blog/api";
import BlogCard from "@/components/blog/BlogCard";

export const metadata: Metadata = {
  title: "Nexzy News — Gaming News, Deals & More",
  description:
    "The latest gaming news, console and hardware updates, game adaptations, and deals — curated and written by the Nexzy newsroom.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Nexzy News",
    description:
      "The latest gaming news, deals, and more from the Nexzy newsroom.",
    type: "website",
  },
};

// Refresh the index periodically as new articles publish.
export const revalidate = 300;

export default async function BlogIndexPage() {
  const { items } = await fetchPosts({ pageSize: 24 });

  return (
    <Container maxW="container.xl" py={{ base: 8, md: 14 }}>
      <Box mb={{ base: 8, md: 12 }}>
        <Heading as="h1" size="3xl" color="white" mb={3}>
          Nexzy News
        </Heading>
        <Text color="gray.300" fontSize="lg" maxW="2xl">
          Gaming news, console &amp; hardware, adaptations, and deals — written
          by the Nexzy newsroom.
        </Text>
      </Box>

      {items.length === 0 ? (
        <Text color="gray.400">
          No articles published yet. Check back soon.
        </Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
          {items.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}
