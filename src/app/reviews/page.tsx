import type { Metadata } from "next";
import NextLink from "next/link";
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  HStack,
  Button,
  Icon,
} from "@chakra-ui/react";
import { HiArrowLeft, HiArrowRight } from "react-icons/hi";
import { fetchReviews } from "@/lib/blog/api";
import BlogCard from "@/components/blog/BlogCard";
import AppCta from "@/components/blog/AppCta";

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const PAGE_SIZE = 18;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);
  return {
    title: "Game Adaptation Reviews — Movies & TV",
    description:
      "Honest reviews of movies and TV shows based on games — verdict, score, and who it's for. Is the adaptation worth your time? Nexzy's reviewers call it.",
    alternates: {
      canonical: page > 1 ? `/reviews?page=${page}` : "/reviews",
    },
  };
}

export default async function ReviewsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);
  const { items, total } = await fetchReviews({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Nexzy Reviews",
    description:
      "Reviews of game adaptations — movies and TV based on games — with a verdict and a score.",
    url: `${SITE_URL}/reviews`,
  };

  return (
    <Box>
      <Container maxW="container.xl" py={{ base: 10, md: 14 }}>
        <Box maxW="2xl" mb={{ base: 8, md: 10 }}>
          <Text
            color="teal.300"
            fontSize="sm"
            fontWeight="700"
            letterSpacing="wide"
            textTransform="uppercase"
            mb={2}
          >
            Nexzy Reviews
          </Text>
          <Heading
            as="h1"
            fontFamily="title"
            size={{ base: "2xl", md: "4xl" }}
            color="white"
            mb={3}
            lineHeight="1.1"
          >
            Is the adaptation worth it?
          </Heading>
          <Text color="gray.300" fontSize={{ base: "md", md: "lg" }}>
            Straight-talking reviews of the movies and shows based on the games
            you love — the verdict, the score, and whether it&apos;s worth your
            weekend. No spoilers up top.
          </Text>
        </Box>

        {items.length === 0 ? (
          <Box
            border="1px dashed"
            borderColor="whiteAlpha.300"
            borderRadius="xl"
            p={10}
            textAlign="center"
          >
            <Text color="gray.300" mb={4}>
              Reviews are on the way. In the meantime, Nexzy tracks every game
              behind the adaptations — and tells you when the next one drops.
            </Text>
            <AppCta variant="inline" location="reviews" />
          </Box>
        ) : (
          <>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6}>
              {items.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </SimpleGrid>

            {totalPages > 1 && (
              <HStack justify="center" gap={3} mt={10}>
                <Button
                  asChild={page > 1}
                  disabled={page <= 1}
                  size="sm"
                  variant="outline"
                  color="white"
                  borderColor="whiteAlpha.300"
                  _hover={{ bg: "whiteAlpha.100" }}
                >
                  {page > 1 ? (
                    <NextLink href={`/reviews?page=${page - 1}`}>
                      <Icon mr={1}>
                        <HiArrowLeft />
                      </Icon>
                      Previous
                    </NextLink>
                  ) : (
                    <span>
                      <Icon mr={1}>
                        <HiArrowLeft />
                      </Icon>
                      Previous
                    </span>
                  )}
                </Button>
                <Text color="gray.400" fontSize="sm">
                  Page {page} of {totalPages}
                </Text>
                <Button
                  asChild={page < totalPages}
                  disabled={page >= totalPages}
                  size="sm"
                  variant="outline"
                  color="white"
                  borderColor="whiteAlpha.300"
                  _hover={{ bg: "whiteAlpha.100" }}
                >
                  {page < totalPages ? (
                    <NextLink href={`/reviews?page=${page + 1}`}>
                      Next
                      <Icon ml={1}>
                        <HiArrowRight />
                      </Icon>
                    </NextLink>
                  ) : (
                    <span>
                      Next
                      <Icon ml={1}>
                        <HiArrowRight />
                      </Icon>
                    </span>
                  )}
                </Button>
              </HStack>
            )}

            <Box mt={14}>
              <AppCta variant="inline" location="reviews" />
            </Box>
          </>
        )}
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
    </Box>
  );
}
