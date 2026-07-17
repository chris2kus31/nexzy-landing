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
import { fetchLists } from "@/lib/blog/api";
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
    title: "Game Lists — Upcoming & New Releases",
    description:
      "What to play now and what's coming next. Handpicked lists of upcoming games and fresh releases worth your time — updated from the Nexzy games database.",
    alternates: { canonical: page > 1 ? `/lists?page=${page}` : "/lists" },
  };
}

export default async function ListsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);
  const { items, total } = await fetchLists({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Nexzy Game Lists",
    description:
      "Handpicked lists of upcoming games and new releases worth playing.",
    url: `${SITE_URL}/lists`,
  };

  return (
    <Box>
      <Container maxW="container.xl" py={{ base: 10, md: 14 }}>
        <Box maxW="2xl" mb={{ base: 8, md: 10 }}>
          <Text
            color="purple.300"
            fontSize="sm"
            fontWeight="700"
            letterSpacing="wide"
            textTransform="uppercase"
            mb={2}
          >
            Nexzy Lists
          </Text>
          <Heading
            as="h1"
            size={{ base: "2xl", md: "4xl" }}
            color="white"
            mb={3}
            lineHeight="1.1"
          >
            What to play next.
          </Heading>
          <Text color="gray.300" fontSize={{ base: "md", md: "lg" }}>
            The games worth watching and the ones just out — pulled straight
            from the Nexzy games database, no filler. Track any of them in the
            app so you never miss a drop.
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
              Lists are on the way. In the meantime, Nexzy tracks every upcoming
              release and tells you the moment it lands.
            </Text>
            <AppCta variant="inline" location="lists" />
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
                    <NextLink href={`/lists?page=${page - 1}`}>
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
                    <NextLink href={`/lists?page=${page + 1}`}>
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
              <AppCta variant="inline" location="lists" />
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
