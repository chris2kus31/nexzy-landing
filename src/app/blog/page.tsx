import type { Metadata } from "next";
import { Box, Container, Heading, Text, SimpleGrid } from "@chakra-ui/react";
import { fetchPosts } from "@/lib/blog/api";
import { beatLabel } from "@/lib/blog/beats";
import NewsControls from "@/components/blog/NewsControls";
import FeaturedCard from "@/components/blog/FeaturedCard";
import BlogCard from "@/components/blog/BlogCard";
import Pagination from "@/components/blog/Pagination";

const PAGE_SIZE = 12;

export const revalidate = 300;

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

  // Self-referencing canonical (beat + page; never collapse pages 2+ to /blog).
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
    // Keep category + numbered pages indexable; don't index internal search results.
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

  const { items, total } = await fetchPosts({
    beat: beat || undefined,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  // Featured hero only on the unfiltered first page.
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
        <>
          {featured && (
            <Box mb={8}>
              <FeaturedCard post={featured} />
            </Box>
          )}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
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
        </>
      )}
    </Container>
  );
}
