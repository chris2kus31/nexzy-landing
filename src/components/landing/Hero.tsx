// ============================================
// FILE: components/landing/Hero.tsx
// Enhanced Hero with AI & rewards focus
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
  Icon,
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
import EmailCapture from "./EmailCapture";
import { FaApple, FaGooglePlay, FaRobot } from "react-icons/fa";
import { HiSparkles, HiCurrencyDollar, HiLibrary } from "react-icons/hi";
import { IoGameController } from "react-icons/io5";
import { BsFillLightningChargeFill } from "react-icons/bs";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/storeUrls";
import { trackDownload, track } from "@/lib/analytics";

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
        width="50%"
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
        opacity={0.1}
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
          gap={{ base: 8, lg: 12 }}
        >
          {/* Content */}
          <Stack
            flex={1}
            align={{ base: "center", lg: "start" }}
            textAlign={{ base: "center", lg: "left" }}
            gap={6}
          >
            {/* New animated badge */}
            <Badge
              bg="nexzy.yellow/20"
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
              <Text>AI-Powered Gaming Assistant</Text>
            </Badge>

            <Heading
              as="h1"
              size={{ base: "3xl", md: "4xl", lg: "5xl" }}
              fontWeight="bold"
              lineHeight="shorter"
              color="nexzy.white"
            >
              Never Get{" "}
              <Text as="span" color="nexzy.lightBlue">
                Stuck
              </Text>{" "}
              in a Game Again
            </Heading>

            <Text
              fontSize={{ base: "lg", md: "xl" }}
              color="nexzy.gray.100"
              maxW="xl"
            >
              Your personal AI gaming assistant helps you beat any level, find
              hidden secrets, and optimize your gameplay. Plus earn coins daily,
              track your game library, and never miss a deal on your wishlist!
            </Text>

            {/* Value props */}
            <Stack gap={3}>
              <HStack gap={3}>
                <Icon color="nexzy.yellow" boxSize={5}>
                  <FaRobot />
                </Icon>
                <Text color="nexzy.white" fontSize="sm" fontWeight="medium">
                  Instant AI help for any game, any level
                </Text>
              </HStack>
              <HStack gap={3}>
                <Icon color="nexzy.yellow" boxSize={5}>
                  <HiCurrencyDollar />
                </Icon>
                <Text color="nexzy.white" fontSize="sm" fontWeight="medium">
                  Earn coins daily just for gaming
                </Text>
              </HStack>
              <HStack gap={3}>
                <Icon color="nexzy.yellow" boxSize={5}>
                  <HiLibrary />
                </Icon>
                <Text color="nexzy.white" fontSize="sm" fontWeight="medium">
                  Track your library & wishlist prices
                </Text>
              </HStack>
            </Stack>

            {/* CTA Buttons */}
            <Stack
              direction={{ base: "column", sm: "row" }}
              gap={4}
              w={{ base: "full", sm: "auto" }}
            >
              <Button
                asChild
                size="lg"
                bg="white"
                color="nexzy.navy"
                borderRadius="full"
                px={8}
                _hover={{ bg: "nexzy.gray.100", transform: "translateY(-2px)" }}
                transition="all 0.2s"
                boxShadow="0 4px 14px rgba(255,255,255,0.2)"
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
                bg="nexzy.yellow"
                color="nexzy.navy"
                borderRadius="full"
                px={8}
                fontWeight="600"
                _hover={{ bg: "nexzy.gold", transform: "translateY(-2px)" }}
                transition="all 0.2s"
                boxShadow="0 4px 14px rgba(255,183,77,0.4)"
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
            </Stack>

            {/* Secondary door to the newsroom — download stays the primary CTA */}
            <Link
              asChild
              color="nexzy.lightBlue"
              fontWeight="600"
              fontSize="sm"
              _hover={{ textDecoration: "underline" }}
            >
              <NextLink
                href="/blog"
                onClick={() => track("news_click", { location: "hero_link" })}
              >
                or catch up on today&apos;s game news →
              </NextLink>
            </Link>

            {/* Newsletter email capture (tips, deals + bonus coins) */}
            <Box pt={2} w={{ base: "full", lg: "auto" }}>
              <EmailCapture variant="hero" source="hero" />
            </Box>

            {/* Social proof */}
            <HStack
              gap={{ base: 6, md: 8 }}
              pt={4}
              wrap="wrap"
              justify={{ base: "center", lg: "start" }}
            >
              <Stack gap={0}>
                <HStack>
                  <Icon color="nexzy.yellow" boxSize={5}>
                    <HiSparkles />
                  </Icon>
                  <Text fontSize="2xl" fontWeight="bold" color="nexzy.white">
                    Free
                  </Text>
                </HStack>
                <Text fontSize="sm" color="nexzy.gray.100">
                  Download
                </Text>
              </Stack>
              <Stack gap={0}>
                <HStack>
                  <Icon color="nexzy.lightBlue" boxSize={5}>
                    <IoGameController />
                  </Icon>
                  <Text fontSize="2xl" fontWeight="bold" color="nexzy.white">
                    1000+
                  </Text>
                </HStack>
                <Text fontSize="sm" color="nexzy.gray.100">
                  Games Supported
                </Text>
              </Stack>
              <Stack gap={0}>
                <Text fontSize="2xl" fontWeight="bold" color="nexzy.white">
                  24/7
                </Text>
                <Text fontSize="sm" color="nexzy.gray.100">
                  AI Assistant
                </Text>
              </Stack>
            </HStack>
          </Stack>

          {/* Hero Image/Mockup - Desktop */}
          <Box flex={1} display={{ base: "none", lg: "block" }}>
            <AppShowcase />
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
                      {/* Thumbnail: beside the title on phones, on top on wider */}
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
