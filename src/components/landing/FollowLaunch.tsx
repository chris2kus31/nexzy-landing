// ============================================
// FILE: components/landing/FollowLaunch.tsx
// Body of the /follow pre-launch page (Nexzy 1.1.10 rebrand). Hero with the
// promo video in a phone frame, the three pillars (follow games / library +
// wishlist / meet gamers), an optional screenshot rail, and a closing CTA.
// Store taps are tracked as app_download_click with location follow_*.
// ============================================
"use client";

import type { ReactNode } from "react";
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
  SimpleGrid,
  Icon,
} from "@chakra-ui/react";
import { FaApple, FaGooglePlay, FaGamepad, FaBookmark } from "react-icons/fa";
import { FaUserGroup } from "react-icons/fa6";
import { BsFillLightningChargeFill } from "react-icons/bs";
import { APP_STORE_URL, googlePlayUrl } from "@/lib/storeUrls";
import { trackDownload } from "@/lib/analytics";

// Final AppScreens exports go in /public/follow/shots/ — list them here and the
// rail renders. Empty = rail hidden.
const SHOTS: { src: string; alt: string }[] = [];

const PILLARS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <FaGamepad />,
    title: "Follow your games",
    body: "Follow any game and its news, trailers, updates and guides come to you. Every game has its own hub where players post and talk about it.",
  },
  {
    icon: <FaBookmark />,
    title: "Your library and wishlist",
    body: "Add what you're playing and what you've finished in one tap. Wishlist the games you want and get a price alert when they drop.",
  },
  {
    icon: <FaUserGroup />,
    title: "Meet gamers like you",
    body: "Post screenshots, GIFs and polls, tag the game so the right players see it, and follow people who share your taste.",
  },
];

function StoreButtons({ location }: { location: string }) {
  const btn = {
    size: "lg" as const,
    flex: 1,
    bg: "nexzy.gold",
    color: "nexzy.navy",
    borderRadius: "full",
    px: 7,
    fontWeight: "700",
    _hover: { bg: "nexzy.yellow", transform: "translateY(-2px)" },
    transition: "all 0.2s",
    boxShadow: "0 8px 22px rgba(255,201,71,0.28)",
  };
  return (
    <Stack
      direction={{ base: "column", sm: "row" }}
      gap={3}
      w={{ base: "full", sm: "auto" }}
    >
      <Button asChild {...btn}>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackDownload("ios", location)}
        >
          <HStack gap={2}>
            <FaApple />
            <Text>App Store</Text>
          </HStack>
        </a>
      </Button>
      <Button asChild {...btn}>
        <a
          href={googlePlayUrl(location)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackDownload("android", location)}
        >
          <HStack gap={2}>
            <FaGooglePlay />
            <Text>Google Play</Text>
          </HStack>
        </a>
      </Button>
    </Stack>
  );
}

function PhoneVideo() {
  return (
    <Box
      w={{ base: "250px", md: "300px" }}
      aspectRatio={9 / 16}
      borderRadius="44px"
      overflow="hidden"
      border="6px solid"
      borderColor="whiteAlpha.200"
      bg="nexzy.navy"
      boxShadow="0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)"
      mx="auto"
    >
      <video
        src="/follow/nexzy-promo.mp4"
        poster="/follow/nexzy-promo-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Nexzy app preview: following a game, posting, and meeting gamers"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </Box>
  );
}

export default function FollowLaunch() {
  return (
    <>
      {/* Hero */}
      <Box
        as="section"
        pt={{ base: 24, md: 32 }}
        pb={{ base: 16, md: 24 }}
        bg="nexzy.navy"
        position="relative"
        overflow="hidden"
      >
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
            gap={{ base: 12, lg: 16 }}
          >
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
                <Text>Coming soon</Text>
              </Badge>

              <Heading
                as="h1"
                fontFamily="title"
                size={{ base: "3xl", md: "4xl", lg: "5xl" }}
                fontWeight="bold"
                lineHeight="1.05"
                color="nexzy.white"
              >
                Follow the games you love.
                <br />
                <Box
                  as="span"
                  style={{
                    background: "linear-gradient(90deg, #4DA3FF, #FFC400)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  And the gamers who get them.
                </Box>
              </Heading>

              <Text
                fontSize={{ base: "lg", md: "xl" }}
                color="nexzy.gray.100"
                maxW="xl"
              >
                The new Nexzy puts the news, trailers and updates for every game
                you follow in one feed, with the players who love them too.
              </Text>

              <Stack gap={3} align={{ base: "center", lg: "start" }} pt={1}>
                <StoreButtons location="follow_hero" />
                <Text fontSize="sm" color="nexzy.gray.100">
                  Already have Nexzy? The new version arrives as a free update.
                </Text>
              </Stack>
            </Stack>

            <Box flex={{ lg: 1 }}>
              <PhoneVideo />
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* Pillars */}
      <Box as="section" py={{ base: 16, md: 24 }} bg="nexzy.navy">
        <Container maxW="container.xl" px={{ base: 5, md: 6 }}>
          <Stack gap={4} textAlign="center" mb={{ base: 10, md: 14 }}>
            <Heading as="h2" size={{ base: "xl", md: "2xl" }} color="white">
              Everything about your games. In one place.
            </Heading>
          </Stack>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 5, md: 6 }}>
            {PILLARS.map((p) => (
              <Box
                key={p.title}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="nexzy.blue/20"
                borderRadius="2xl"
                p={{ base: 6, md: 8 }}
              >
                <Flex
                  w={12}
                  h={12}
                  align="center"
                  justify="center"
                  borderRadius="xl"
                  bg="nexzy.yellow/15"
                  color="nexzy.gold"
                  mb={5}
                >
                  <Icon boxSize={5}>{p.icon}</Icon>
                </Flex>
                <Heading as="h3" size="lg" color="white" mb={3}>
                  {p.title}
                </Heading>
                <Text color="gray.300" lineHeight="1.7">
                  {p.body}
                </Text>
              </Box>
            ))}
          </SimpleGrid>

          {SHOTS.length > 0 && (
            <Flex
              mt={{ base: 12, md: 16 }}
              gap={5}
              overflowX="auto"
              pb={2}
              justify={{ base: "start", xl: "center" }}
            >
              {SHOTS.map((s) => (
                <Box
                  key={s.src}
                  flex="0 0 auto"
                  w={{ base: "200px", md: "230px" }}
                  borderRadius="2xl"
                  overflow="hidden"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.src}
                    alt={s.alt}
                    loading="lazy"
                    style={{ width: "100%", display: "block" }}
                  />
                </Box>
              ))}
            </Flex>
          )}
        </Container>
      </Box>

      {/* Closing CTA */}
      <Box
        as="section"
        py={{ base: 16, md: 24 }}
        bg="nexzy.navy"
        borderTop="1px solid"
        borderColor="nexzy.blue/20"
      >
        <Container maxW="container.md" px={{ base: 5, md: 6 }}>
          <Stack gap={5} align="center" textAlign="center">
            <Heading as="h2" size={{ base: "xl", md: "2xl" }} color="white">
              Be there on day one.
            </Heading>
            <Text color="nexzy.gray.100" fontSize={{ base: "md", md: "lg" }}>
              Get Nexzy now and the update lands on your phone automatically.
            </Text>
            <StoreButtons location="follow_cta" />
          </Stack>
        </Container>
      </Box>
    </>
  );
}
