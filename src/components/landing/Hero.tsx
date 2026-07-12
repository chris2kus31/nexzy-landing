// ============================================
// FILE: components/landing/Hero.tsx
// Hero — app-primary anchor for the home page, themed to match the dark site.
// Left: badge, gradient headline, subhead, app-store CTAs + a prominent door to
// the newsroom, and a compact trust bar. Right: the app showcase with floating
// content cards (app + newsroom dual value). The latest-news strip lives at the
// bottom so news + app share the top of the page.
// ============================================
"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  HStack,
  Stack,
  Flex,
  Badge,
  Link,
  SimpleGrid,
} from "@chakra-ui/react";
import NextLink from "next/link";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import { beatLabel, beatPalette } from "@/lib/blog/beats";

/** Minimal shape for the hero's latest-news strip (passed from the server page). */
export interface HeroNewsItem {
  slug: string;
  title: string;
  beat: string;
  imageUrl: string | null;
}

// Dynamically import to avoid SSR issues
const AppShowcase = dynamic(() => import("./AppShowcase"), { ssr: false });
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { BsFillLightningChargeFill } from "react-icons/bs";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/storeUrls";
import { trackDownload, track } from "@/lib/analytics";

const TRUST: { value: string; label: string }[] = [
  { value: "Free", label: "to download" },
  { value: "1000+", label: "games" },
  { value: "24/7", label: "AI help" },
  { value: "Daily", label: "fresh news" },
];

function FloatCard({
  emoji,
  title,
  sub,
  ...pos
}: {
  emoji: string;
  title: string;
  sub: string;
  [key: string]: unknown;
}) {
  return (
    <HStack
      position="absolute"
      gap={3}
      maxW="230px"
      bg="rgba(28,34,64,0.94)"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      px={4}
      py={3}
      boxShadow="0 14px 34px rgba(0,0,0,0.45)"
      backdropFilter="blur(6px)"
      {...pos}
    >
      <Text fontSize="xl">{emoji}</Text>
      <Box minW={0}>
        <Text color="white" fontWeight="800" fontSize="sm" lineHeight="1.25">
          {title}
        </Text>
        <Text color="gray.300" fontSize="xs">
          {sub}
        </Text>
      </Box>
    </HStack>
  );
}

export default function Hero({ latest = [] }: { latest?: HeroNewsItem[] }) {
  return (
    <Box
      as="section"
      pt={{ base: 20, md: 32 }}
      pb={{ base: 16, md: 24 }}
      bg="nexzy.navy"
      position="relative"
      overflow="hidden"
    >
      {/* Background decoration */}
      <Box
        position="absolute"
        top="-20%"
        right="-10%"
        width="45%"
        height="120%"
        borderRadius="full"
        bg="nexzy.blue"
        opacity={0.1}
        filter="blur(100px)"
      />
      <Box
        position="absolute"
        bottom="-30%"
        left="-10%"
        width="40%"
        height="100%"
        borderRadius="full"
        bg="nexzy.yellow"
        opacity={0.08}
        filter="blur(100px)"
      />

      <Container
        maxW="container.xl"
        position="relative"
        px={{ base: 5, md: 6 }}
      >
        <Flex
          direction={{ base: "column", lg: "row" }}
          align="center"
          gap={{ base: 10, lg: 12 }}
        >
          {/* Content */}
          <Stack
            flex={1}
            align={{ base: "center", lg: "start" }}
            textAlign={{ base: "center", lg: "left" }}
            gap={6}
          >
            <Badge
              bg="nexzy.yellow/15"
              color="nexzy.gold"
              px={4}
              py={2}
              borderRadius="full"
              border="1px solid"
              borderColor="nexzy.yellow/30"
              display="flex"
              alignItems="center"
              gap={2}
            >
              <BsFillLightningChargeFill />
              <Text>AI companion + free gaming newsroom</Text>
            </Badge>

            <Heading
              as="h1"
              size={{ base: "3xl", md: "4xl", lg: "5xl" }}
              fontWeight="bold"
              lineHeight="1.05"
              color="nexzy.white"
            >
              Beat what&apos;s got you stuck.
              <br />
              <Box
                as="span"
                style={{
                  background: "linear-gradient(90deg, #6AB7FF, #FFC947)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Stay on top of gaming.
              </Box>
            </Heading>

            <Text
              fontSize={{ base: "lg", md: "xl" }}
              color="nexzy.gray.100"
              maxW="xl"
            >
              Your personal AI gaming assistant helps you beat any level, track
              your library, and never miss a deal &mdash; backed by a free
              newsroom of gaming news, guides &amp; walkthroughs for the games
              you play.
            </Text>

            {/* CTAs: two stores + a prominent door to the newsroom */}
            <Stack
              direction={{ base: "column", sm: "row" }}
              gap={4}
              w={{ base: "full", sm: "auto" }}
              pt={1}
            >
              <Button
                asChild
                size="lg"
                bg="nexzy.gold"
                color="nexzy.navy"
                borderRadius="full"
                px={7}
                fontWeight="700"
                _hover={{ bg: "nexzy.yellow", transform: "translateY(-2px)" }}
                transition="all 0.2s"
                boxShadow="0 8px 22px rgba(255,201,71,0.28)"
              >
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackDownload("ios", "hero")}
                >
                  <HStack gap={2}>
                    <FaApple />
                    <Text>App Store</Text>
                  </HStack>
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                bg="nexzy.gold"
                color="nexzy.navy"
                borderRadius="full"
                px={7}
                fontWeight="700"
                _hover={{ bg: "nexzy.yellow", transform: "translateY(-2px)" }}
                transition="all 0.2s"
                boxShadow="0 8px 22px rgba(255,201,71,0.28)"
              >
                <a
                  href={GOOGLE_PLAY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackDownload("android", "hero")}
                >
                  <HStack gap={2}>
                    <FaGooglePlay />
                    <Text>Google Play</Text>
                  </HStack>
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                borderColor="whiteAlpha.400"
                color="nexzy.white"
                borderRadius="full"
                px={7}
                _hover={{ borderColor: "nexzy.blue", color: "nexzy.lightBlue" }}
                transition="all 0.2s"
              >
                <NextLink
                  href="/blog"
                  onClick={() =>
                    track("news_click", { location: "hero_explore" })
                  }
                >
                  Explore the newsroom →
                </NextLink>
              </Button>
            </Stack>

            {/* Compact trust bar */}
            <HStack
              gap={{ base: 4, md: 6 }}
              pt={3}
              wrap="wrap"
              justify={{ base: "center", lg: "start" }}
            >
              {TRUST.map((t, i) => (
                <HStack key={t.value} gap={{ base: 4, md: 6 }}>
                  {i > 0 && (
                    <Box
                      w="1px"
                      h="30px"
                      bg="whiteAlpha.200"
                      display={{ base: "none", sm: "block" }}
                    />
                  )}
                  <Stack gap={0}>
                    <Text
                      fontSize="xl"
                      fontWeight="900"
                      color="nexzy.white"
                      lineHeight="1.1"
                    >
                      {t.value}
                    </Text>
                    <Text fontSize="xs" color="nexzy.gray.100">
                      {t.label}
                    </Text>
                  </Stack>
                </HStack>
              ))}
            </HStack>
          </Stack>

          {/* App showcase + floating content cards - Desktop */}
          <Box
            flex={1}
            display={{ base: "none", lg: "block" }}
            position="relative"
          >
            <AppShowcase />
            <FloatCard
              emoji="🔥"
              title="Trending now"
              sub="GTA 6 trailer breaks records"
              top="4%"
              left="0"
            />
            <FloatCard
              emoji="🔔"
              title="Deal alert"
              sub="PS5 Pro · −30% today"
              top="44%"
              left="-2%"
            />
            <FloatCard
              emoji="📖"
              title="New guide"
              sub="How to beat Malenia"
              bottom="8%"
              right="0"
            />
          </Box>
        </Flex>

        {/* Mobile App Showcase - Below content on mobile */}
        <Box
          display={{ base: "block", lg: "none" }}
          mt={12}
          pt={8}
          borderTop="2px solid"
          borderColor="nexzy.blue/20"
        >
          <AppShowcase />
        </Box>

        {/* Latest Game News — built into the hero so news + app share the top */}
        {latest.length > 0 && (
          <Box
            mt={{ base: 10, md: 14 }}
            pt={8}
            borderTop="1px solid"
            borderColor="nexzy.blue/20"
          >
            <Flex
              align="center"
              justify="space-between"
              mb={4}
              gap={2}
              wrap="wrap"
            >
              <HStack gap={2}>
                <Text fontSize="lg">🔥</Text>
                <Heading as="h2" size="md" color="nexzy.white">
                  Latest Game News
                </Heading>
              </HStack>
              <Link
                asChild
                color="nexzy.lightBlue"
                fontWeight="600"
                fontSize="sm"
                _hover={{ textDecoration: "underline" }}
              >
                <NextLink href="/blog">All news →</NextLink>
              </Link>
            </Flex>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4}>
              {latest.map((n, i) => (
                <Link key={n.slug} asChild _hover={{ textDecoration: "none" }}>
                  <NextLink
                    href={`/blog/${n.slug}`}
                    onClick={() =>
                      track("news_click", {
                        location: "hero_card",
                        slug: n.slug,
                      })
                    }
                  >
                    <Flex
                      direction={{ base: "row", sm: "column" }}
                      bg="whiteAlpha.50"
                      border="1px solid"
                      borderColor="nexzy.blue/20"
                      borderRadius="xl"
                      overflow="hidden"
                      h="full"
                      transition="all 0.2s"
                      _hover={{
                        borderColor: "nexzy.blue/60",
                        transform: "translateY(-2px)",
                      }}
                    >
                      <Box
                        position="relative"
                        flexShrink={0}
                        w={{ base: "104px", sm: "full" }}
                        aspectRatio={{ base: 1, sm: 16 / 9 }}
                        bg="nexzy.blue/10"
                      >
                        {n.imageUrl && (
                          <NextImage
                            src={n.imageUrl}
                            alt={n.title}
                            fill
                            sizes="(max-width: 640px) 104px, 360px"
                            style={{ objectFit: "cover" }}
                            priority={i === 0}
                          />
                        )}
                        <Badge
                          position="absolute"
                          top={2}
                          left={2}
                          colorPalette={beatPalette(n.beat)}
                          variant="solid"
                          size="sm"
                        >
                          {beatLabel(n.beat)}
                        </Badge>
                      </Box>
                      <Box p={{ base: 3, sm: 4 }} flex={1} minW={0}>
                        <Text
                          color="nexzy.white"
                          fontWeight="600"
                          fontSize={{ base: "sm", sm: "md" }}
                          lineClamp={3}
                          textAlign="left"
                        >
                          {n.title}
                        </Text>
                      </Box>
                    </Flex>
                  </NextLink>
                </Link>
              ))}
            </SimpleGrid>
          </Box>
        )}
      </Container>
    </Box>
  );
}
