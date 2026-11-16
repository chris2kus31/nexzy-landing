// All live trends (nexzyapp.com/trends): featured first, then the busiest.
// 404 while the API's TRENDS_ENABLED is off.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import {
  Box,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import AppCta from "@/components/blog/AppCta";
import { fetchTrendHub } from "@/lib/trends/server";
import { SITE_URL } from "@/lib/trends/types";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Gaming trends: pick your games and share them",
  description:
    "Join gaming trends on Nexzy: pick your games, get a shareable image and see who matches you.",
  alternates: { canonical: `${SITE_URL}/trends` },
};

const num = (n: number) => n.toLocaleString("en-US");

export default async function TrendsPage() {
  const trends = await fetchTrendHub();
  if (!trends) notFound();

  return (
    <Box bg="#151935" minH="100vh" color="#F4F5FA">
      <Container maxW="1200px" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
        <Heading
          as="h1"
          fontSize={{ base: "3xl", md: "5xl" }}
          fontWeight="800"
          mb={2}
        >
          Trends
        </Heading>
        <Text color="#B8BEDB" mb={8} maxW="2xl">
          Pick your games, get your image, share it. Then see who matches you.
        </Text>
        {trends.length === 0 ? (
          <Text color="#9AA1C7">
            No trends running right now. Check back soon.
          </Text>
        ) : (
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
            {trends.map((t) => (
              <NextLink
                key={t.slug}
                href={`/t/${t.slug}`}
                style={{ display: "block" }}
              >
                <Stack
                  h="100%"
                  gap={3}
                  p={4}
                  borderRadius="16px"
                  bg="#1E2346"
                  border="1px solid"
                  borderColor={t.featured ? "#5C5420" : "#2C335F"}
                  _hover={{ bg: "#262C57" }}
                  transition="background 0.15s"
                >
                  <Flex justify="space-between" align="center">
                    {t.featured ? (
                      <Text
                        fontSize="11px"
                        fontWeight="800"
                        color="#151935"
                        bg="#FFD24A"
                        px={2}
                        py="2px"
                        borderRadius="full"
                      >
                        FEATURED
                      </Text>
                    ) : (
                      <span />
                    )}
                    <Text fontSize="xs" color="#9AA1C7">
                      {t.entryCountToday > 0
                        ? `${num(t.entryCountToday)} today`
                        : `${num(t.entryCount)} entries`}
                    </Text>
                  </Flex>
                  <SimpleGrid
                    columns={3}
                    gap="3px"
                    borderRadius="8px"
                    overflow="hidden"
                  >
                    {Array.from({ length: 6 }, (_, i) => (
                      <Box
                        key={i}
                        aspectRatio="4 / 3"
                        bg="#232A52"
                        bgImage={
                          t.covers[i] ? `url(${t.covers[i]})` : undefined
                        }
                        bgSize="cover"
                        bgPos="center"
                      />
                    ))}
                  </SimpleGrid>
                  <Text fontSize="xl" fontWeight="800" color="#FFD24A">
                    #{t.hashtag}
                  </Text>
                  <Text fontSize="sm" color="#B8BEDB">
                    {t.title}
                  </Text>
                </Stack>
              </NextLink>
            ))}
          </SimpleGrid>
        )}
        <Box mt={12}>
          <AppCta
            variant="band"
            location="trends_index"
            heading="Trends live in the Nexzy app"
            subtext="Post your picks, react to other players and see who matches you."
          />
        </Box>
      </Container>
    </Box>
  );
}
