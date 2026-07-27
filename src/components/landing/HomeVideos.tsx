// ============================================
// FILE: components/landing/HomeVideos.tsx
// Home "latest & featured videos" section — a featured spotlight (poster that
// links to the video, kept light for the homepage) + a horizontal shelf of
// vertical Shorts tiles. The API ranks featured, then Nexzy, then newest, so
// the spotlight is the featured video (or the newest). Renders nothing when
// there are no videos yet.
// ============================================
import NextLink from "next/link";
import { Box, Container, Flex, Heading, Text, HStack } from "@chakra-ui/react";
import type { PublicVideo } from "@/lib/blog/api";
import VideoTile from "@/components/blog/VideoTile";
import FeaturedVideo from "@/components/blog/FeaturedVideo";

export default function HomeVideos({ items }: { items: PublicVideo[] }) {
  if (!items.length) return null;
  const hero = items.find((v) => v.featured) ?? items[0];
  const shelf = items.filter((v) => v.slug !== hero.slug).slice(0, 8);

  return (
    <Box
      as="section"
      pt={{ base: 6, md: 8 }}
      pb={{ base: 16, md: 24 }}
      bg="nexzy.navy"
    >
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
              <Box w="22px" h="2px" bg="pink.400" borderRadius="full" />
              <Text
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="pink.300"
              >
                Latest &amp; featured
              </Text>
            </HStack>
            <Heading as="h2" size={{ base: "xl", md: "2xl" }} color="white">
              Videos &amp;{" "}
              <Text as="span" color="nexzy.gold">
                Shorts
              </Text>
            </Heading>
          </Box>
          <NextLink href="/videos">
            <Text color="nexzy.lightBlue" fontWeight="700" fontSize="sm">
              Browse all videos →
            </Text>
          </NextLink>
        </Flex>

        {/* Featured spotlight */}
        <Box mb={{ base: 8, md: 10 }}>
          <FeaturedVideo video={hero} from="home_featured" />
        </Box>

        {/* Horizontal Shorts shelf */}
        {shelf.length > 0 && (
          <HStack
            gap={{ base: 4, md: 5 }}
            overflowX="auto"
            align="stretch"
            pb={3}
            css={{
              scrollSnapType: "x mandatory",
              scrollbarWidth: "thin",
              "&::-webkit-scrollbar": { height: "6px" },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(255,255,255,0.15)",
                borderRadius: "999px",
              },
            }}
          >
            {shelf.map((v) => (
              <Box
                key={v.slug}
                minW={{ base: "150px", md: "180px" }}
                w={{ base: "150px", md: "180px" }}
                css={{ scrollSnapAlign: "start" }}
              >
                <VideoTile video={v} from="home_shelf" />
              </Box>
            ))}
          </HStack>
        )}
      </Container>
    </Box>
  );
}
