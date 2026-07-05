import type { Metadata } from "next";
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  SimpleGrid,
} from "@chakra-ui/react";
import { fetchPosts, fetchTrending } from "@/lib/blog/api";
import { beatLabel } from "@/lib/blog/beats";
import NewsControls from "@/components/blog/NewsControls";
import NewsroomHero from "@/components/blog/NewsroomHero";
import BlogCard from "@/components/blog/BlogCard";
import Pagination from "@/components/blog/Pagination";
import NewsletterSignup from "@/components/blog/NewsletterSignup";
import AppCta from "@/components/blog/AppCta";

const PAGE_SIZE = 12;

// ISR: cached, rebuilt in the background. (Renders dynamically when search/
// filter params are present; data is cached either way.)
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

  const [{ items, total }, hot, reads] = await Promise.all([
    fetchPosts({
      beat: beat || undefined,
      q: q || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    fetchTrending(5, "hot"),
    fetchTrending(5, "reads"),
  ]);

  const showHero = page === 1 && !beat && !q && items.length > 0;
  const featured = showHero ? items[0] : null;
  const grid = featured ? items.slice(1) : items;

  return (
    <Container maxW="container.xl" py={{ base: 8, md: 14 }}>
      <Box mb={{ base: 8, md: 10 }}>
        <HStack gap={3} align="baseline" wrap="wrap" mb={3}>
          <Heading as="h1" size={{ base: "2xl", md: "4xl" }} color="white">
            Nexzy{" "}
            <Text as="span" color="nexzy.blue">
              News
            </Text>
          </Heading>
          <HStack
            gap={2}
            px={2.5}
            py={1}
            borderRadius="full"
            bg="orange.400/12"
            alignSelf="center"
          >
            <Box w="6px" h="6px" borderRadius="full" bg="orange.300" />
            <Text
              color="orange.300"
              fontSize="xs"
              fontWeight="700"
              letterSpacing="wide"
            >
              Live desk
            </Text>
          </HStack>
        </HStack>
        <Text color="gray.300" fontSize={{ base: "md", md: "lg" }} maxW="2xl">
          Every console, every launch, every leak — the games desk that reports
          it straight and never buries the lede.
        </Text>
      </Box>

      {featured && <NewsroomHero featured={featured} hot={hot} reads={reads} />}

      <NewsControls beat={beat} q={q} />

      {items.length === 0 ? (
        <Text color="gray.400" py={10}>
          {beat || q
            ? "Nothing matches — even our newsroom draws a blank sometimes. Try another filter."
            : "The presses are warm but the ink's still drying. Check back soon."}
        </Text>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6}>
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

      <Box mt={{ base: 12, md: 16 }}>
        <AppCta variant="band" />
      </Box>

      <Box mt={{ base: 12, md: 16 }}>
        <NewsletterSignup />
      </Box>
    </Container>
  );
}
