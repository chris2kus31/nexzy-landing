// ============================================
// FILE: components/landing/HomeNewsroom.tsx
// Home newsroom block. Leads with the daily "Gaming Nostalgia" spotlight (a
// distinctive, non-repeating hook), with the tabbed Popular rail beside it. If
// there's no nostalgia fact today it falls back to the featured article. The
// hero already carries the "latest news" strip, so this block deliberately does
// NOT repeat a list of the newest headlines.
// ============================================
import NextLink from "next/link";
import NextImage from "next/image";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  HStack,
  Badge,
} from "@chakra-ui/react";
import type { PublicPost, NostalgiaSpotlight } from "@/lib/blog/api";
import FeaturedCard from "@/components/blog/FeaturedCard";
import TrendingRail from "@/components/blog/TrendingRail";

function NostalgiaCard({ n }: { n: NostalgiaSpotlight }) {
  return (
    <NextLink href="/blog" style={{ display: "block" }}>
      <Box
        className="group"
        position="relative"
        borderRadius="2xl"
        overflow="hidden"
        border="1px solid"
        borderColor="nexzy.gold/25"
        minH={{ base: "320px", md: "440px" }}
        transition="all 0.2s"
        _hover={{ borderColor: "nexzy.gold/60", transform: "translateY(-3px)" }}
      >
        {n.image ? (
          <Box
            position="absolute"
            inset={0}
            transition="transform 0.4s"
            _groupHover={{ transform: "scale(1.04)" }}
          >
            <NextImage
              src={n.image}
              alt={n.gameName}
              fill
              sizes="(max-width: 1024px) 100vw, 800px"
              style={{ objectFit: "cover" }}
            />
          </Box>
        ) : (
          <Box position="absolute" inset={0} bg="nexzy.gold/15" />
        )}
        <Box
          position="absolute"
          inset={0}
          bgGradient="to-t"
          gradientFrom="nexzy.navy"
          gradientVia="nexzy.navy/50"
          gradientTo="transparent"
        />
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          p={{ base: 5, md: 8 }}
        >
          <HStack gap={2} mb={3}>
            <Badge colorPalette="yellow" variant="solid">
              🕹️ Gaming Nostalgia
            </Badge>
            <Badge colorPalette="gray" variant="surface">
              On this day
            </Badge>
          </HStack>
          <Heading
            as="h2"
            size={{ base: "xl", md: "3xl" }}
            color="white"
            mb={3}
            maxW="3xl"
          >
            {n.gameName}
          </Heading>
          <Text
            color="gray.200"
            fontSize={{ base: "sm", md: "md" }}
            lineClamp={3}
            maxW="2xl"
          >
            {n.content}
          </Text>
        </Box>
      </Box>
    </NextLink>
  );
}

export default function HomeNewsroom({
  nostalgia,
  lead,
  hot,
  reads,
}: {
  nostalgia: NostalgiaSpotlight | null;
  lead: PublicPost | null;
  hot: PublicPost[];
  reads: PublicPost[];
}) {
  if (!nostalgia && !lead) return null;
  return (
    <Box as="section" pt={{ base: 6, md: 8 }} pb={{ base: 8, md: 10 }} bg="nexzy.navy">
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
                The newsroom
              </Text>
            </HStack>
            <Heading as="h2" size={{ base: "xl", md: "2xl" }} color="white">
              Today in{" "}
              <Text as="span" color="nexzy.gold">
                gaming
              </Text>
            </Heading>
            <Text color="gray.400" fontSize="md" mt={2} maxW="2xl">
              A daily gaming throwback and what the community is reading right
              now.
            </Text>
          </Box>
          <NextLink href="/blog">
            <Text color="nexzy.lightBlue" fontWeight="700" fontSize="sm">
              Visit Game News →
            </Text>
          </NextLink>
        </Flex>

        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", lg: "1.55fr 1fr" }}
          gap={{ base: 6, lg: 8 }}
        >
          {nostalgia ? (
            <NostalgiaCard n={nostalgia} />
          ) : lead ? (
            <FeaturedCard post={lead} />
          ) : null}
          <TrendingRail hot={hot} reads={reads} />
        </Box>
      </Container>
    </Box>
  );
}
