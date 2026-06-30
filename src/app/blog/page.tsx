import type { Metadata } from "next";
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { fetchPosts, fetchTrending } from "@/lib/blog/api";
import { beatLabel } from "@/lib/blog/beats";
import NewsControls from "@/components/blog/NewsControls";
import FeaturedCard from "@/components/blog/FeaturedCard";
import BlogCard from "@/components/blog/BlogCard";
import Pagination from "@/components/blog/Pagination";
import MostRead from "@/components/blog/MostRead";

const PAGE_SIZE = 12;

export const dynamic = "force-dynamic";

type SP = Promise<{ page?: string; beat?: string; q?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SP;
}): Promise<Metadata> {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const beat = sp.beat || "";
  const q = sp.q || "";

  const cp = new URLSearchParams();
  if (beat) cp.set("beat", beat);
  if (page > 1) cp.set("page", String(page));
  const canonical = cp.toString() ? `/blog?${cp}` : "/blog";

  const scope = q
    ? `“${q}”`
    : beat
      ? beatLabel(beat)
      : "Gaming, Console, PC & Deals";
  const pageSuffix = page > 1 ? ` — Page ${page}` : "";

  return {
    title: `Nexzy News — ${scope}${pageSuffix}`,
    description:
      "The latest gaming news across PC and every console, plus hardware, game adaptations, and deals — by the Nexzy newsroom.",
    alternates: { canonical },
    robots: q ? { index: false, follow: true } : undefined,
    openGraph: { title: "Nexzy News", type: "website" },
  };
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const beat = sp.beat || "";
  const q = sp.q || "";

  const [{ items, total }, trending] = await Promise.all([
    fetchPosts({
      beat: beat || undefined,
      q: q || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    fetchTrending(5),
  ]);

  const showFeatured = page === 1 && !beat && !q && items.length > 0;
  const featured = showFeatured ? items[0] : null;
  const grid = featured ? items.slice(1) : items;

  return (
    <Container maxW="container.xl" py={{ base: 8, md: 14 }}>
      <Box mb={{ base: 8, md: 10 }}>
        <Heading as="h1" size={{ base: "2xl", md: "4xl" }} color="white" mb={3}>
          Nexzy News
        </Heading>
        <Text color="gray.300" fontSize={{ base: "md", md: "lg" }} maxW="2xl">
          Gaming news across PC and every console — plus hardware, game
          adaptations, and the best deals. Written by the Nexzy newsroom.
        </Text>
      </Box>

      <NewsControls beat={beat} q={q} />

      {items.length === 0 ? (
        <Text color="gray.400" py={10}>
          {beat || q
            ? "No articles match your search."
            : "No articles published yet. Check back soon."}
        </Text>
      ) : (
        <Grid
          templateColumns={{ base: "1fr", lg: "1fr 300px" }}
          gap={{ base: 10, lg: 8 }}
          alignItems="start"
        >
          <GridItem minW={0}>
            {featured && (
              <Box mb={8}>
                <FeaturedCard post={featured} />
              </Box>
            )}
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={6}>
              {grid.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </SimpleGrid>

            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              beat={beat}
              q={q}
            />
          </GridItem>

          <GridItem>
            <Box position={{ lg: "sticky" }} top="84px">
              <MostRead posts={trending} />
            </Box>
          </GridItem>
        </Grid>
      )}
    </Container>
  );
}
