// ============================================
// FILE: components/landing/AppHero.tsx
// App-primary hero for the dedicated /app page (NOT the newsroom home). This is
// where we go all-in on the app: the pitch, the phone showcase, and the store
// buttons. A secondary link points back to the newsroom (the two-way loop).
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
} from "@chakra-ui/react";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { BsFillLightningChargeFill } from "react-icons/bs";
import { APP_STORE_URL, googlePlayUrl } from "@/lib/storeUrls";
import { trackDownload, track } from "@/lib/analytics";

const AppShowcase = dynamic(() => import("./AppShowcase"), { ssr: false });

const TRUST: { value: string; label: string }[] = [
  { value: "Free", label: "to download" },
  { value: "1000+", label: "games" },
  { value: "24/7", label: "AI help" },
  { value: "iOS &", label: "Android" },
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

export default function AppHero() {
  return (
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
          gap={{ base: 10, lg: 12 }}
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
              <Text>Your AI gaming companion</Text>
            </Badge>

            <Heading
              as="h1"
              fontFamily="title"
              size={{ base: "3xl", md: "4xl", lg: "5xl" }}
              fontWeight="bold"
              lineHeight="1.05"
              color="nexzy.white"
            >
              Beat any game.
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
                Make it yours.
              </Box>
            </Heading>

            <Text
              fontSize={{ base: "lg", md: "xl" }}
              color="nexzy.gray.100"
              maxW="xl"
            >
              Ask Nexzy to get unstuck in any game, keep your whole library in
              one place, track every wishlist deal, and earn rewards &mdash; all
              tuned to the games you actually play. Free on iOS &amp; Android.
            </Text>

            {/* Store buttons + a door back to the newsroom (the loop) */}
            <Stack gap={3} w={{ base: "full", md: "auto" }} pt={1}>
              <Stack direction={{ base: "column", sm: "row" }} gap={3} w="full">
                <Button
                  asChild
                  size="lg"
                  flex={1}
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
                    onClick={() => trackDownload("ios", "app_hero")}
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
                  flex={1}
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
                    href={googlePlayUrl("app_hero")}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDownload("android", "app_hero")}
                  >
                    <HStack gap={2}>
                      <FaGooglePlay />
                      <Text>Google Play</Text>
                    </HStack>
                  </a>
                </Button>
              </Stack>
              <Button
                asChild
                size="lg"
                w="full"
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
                  onClick={() => track("news_click", { location: "app_hero" })}
                >
                  Read the newsroom →
                </NextLink>
              </Button>
            </Stack>

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

          {/* App showcase + floating cards — desktop */}
          <Box
            flex={1}
            display={{ base: "none", lg: "block" }}
            position="relative"
          >
            <AppShowcase />
            <FloatCard
              emoji="🤖"
              title="Ask Nexzy"
              sub="How do I beat Malenia?"
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
              emoji="🎮"
              title="Your library"
              sub="Steam · Xbox · PlayStation"
              bottom="8%"
              right="0"
            />
          </Box>
        </Flex>

        {/* App showcase — below content on mobile */}
        <Box
          display={{ base: "block", lg: "none" }}
          mt={12}
          pt={8}
          borderTop="2px solid"
          borderColor="nexzy.blue/20"
        >
          <AppShowcase />
        </Box>
      </Container>
    </Box>
  );
}
