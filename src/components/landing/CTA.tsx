// ============================================
// FILE: components/landing/CTA.tsx
// "Make it yours" band — a modern two-column app CTA. LEFT: the pitch + the
// newsletter (device-agnostic). RIGHT: a "get the app" card — a scannable QR on
// desktop/tablet, store buttons on mobile (you can't install a phone app on a
// laptop). Newsroom-first: the app is framed as making the newsroom yours.
// ============================================
"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Stack,
  HStack,
  VStack,
  Icon,
  Badge,
  Flex,
  Image,
} from "@chakra-ui/react";
import { FaApple, FaGooglePlay, FaRobot } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";
import { IoGameController, IoGift } from "react-icons/io5";
import EmailCapture from "./EmailCapture";
import { APP_STORE_URL, googlePlayUrl } from "@/lib/storeUrls";
import { trackDownload } from "@/lib/analytics";

export default function CTA() {
  return (
    <Box
      as="section"
      pt={{ base: 10, md: 14 }}
      pb={{ base: 16, md: 24 }}
      bg="nexzy.navy"
      position="relative"
      id="download"
      overflow="hidden"
    >
      {/* Animated background gradient */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bgGradient="linear(135deg, nexzy.navy 0%, nexzy.blue 50%, nexzy.navy 100%)"
        opacity={0.3}
      />
      {/* Pattern overlay */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        opacity={0.05}
        bgImage="radial-gradient(circle at 1px 1px, white 1px, transparent 1px)"
        backgroundSize="40px 40px"
      />

      <Container
        maxW="container.xl"
        position="relative"
        px={{ base: 5, md: 6 }}
      >
        <Flex
          direction={{ base: "column", lg: "row" }}
          align="center"
          gap={{ base: 10, lg: 16 }}
        >
          {/* LEFT — the pitch + newsletter */}
          <Stack
            flex="1.3"
            w="full"
            gap={6}
            align={{ base: "center", lg: "flex-start" }}
            textAlign={{ base: "center", lg: "left" }}
          >
            <Badge
              bg="nexzy.yellow"
              color="nexzy.navy"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="sm"
              fontWeight="bold"
              display="flex"
              alignItems="center"
              gap={2}
            >
              <IoGift />
              MAKE IT YOURS
            </Badge>

            <Heading
              as="h2"
              fontFamily="title"
              size={{ base: "2xl", md: "3xl" }}
              color="nexzy.white"
              lineHeight="shorter"
            >
              Make Nexzy yours.
              <br />
              <Text as="span" color="nexzy.yellow">
                Your games. Your news. Your AI.
              </Text>
            </Heading>

            <Text
              fontSize={{ base: "lg", md: "xl" }}
              color="nexzy.gray.100"
              maxW="xl"
            >
              Add the games you actually play, get news and help tuned to you,
              and Ask Nexzy whenever you&apos;re stuck &mdash; free on iOS &amp;
              Android.
            </Text>

            {/* Value props */}
            <Flex
              gap={{ base: 5, md: 6 }}
              wrap="wrap"
              justify={{ base: "center", lg: "flex-start" }}
            >
              <HStack gap={2}>
                <Icon color="nexzy.yellow" boxSize={5}>
                  <FaRobot />
                </Icon>
                <Text color="nexzy.white" fontSize="sm" fontWeight="medium">
                  Ask Nexzy AI
                </Text>
              </HStack>
              <HStack gap={2}>
                <Icon color="nexzy.lightBlue" boxSize={5}>
                  <IoGameController />
                </Icon>
                <Text color="nexzy.white" fontSize="sm" fontWeight="medium">
                  Your game library
                </Text>
              </HStack>
              <HStack gap={2}>
                <Icon color="nexzy.gold" boxSize={5}>
                  <HiSparkles />
                </Icon>
                <Text color="nexzy.white" fontSize="sm" fontWeight="medium">
                  Free Forever
                </Text>
              </HStack>
            </Flex>

            {/* Mobile: store buttons (can't scan a QR on the phone you're on) */}
            <Stack
              direction={{ base: "column", sm: "row" }}
              gap={3}
              w={{ base: "full", sm: "auto" }}
              display={{ base: "flex", md: "none" }}
            >
              <Button
                asChild
                size="lg"
                bg="white"
                color="nexzy.navy"
                borderRadius="full"
                px={8}
                py={7}
                _hover={{ bg: "nexzy.gray.100" }}
              >
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackDownload("ios", "cta")}
                >
                  <HStack gap={3}>
                    <FaApple size={22} />
                    <VStack gap={0} align="start">
                      <Text fontSize="xs" opacity={0.9}>
                        Download on the
                      </Text>
                      <Text fontSize="md" fontWeight="bold">
                        App Store
                      </Text>
                    </VStack>
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
                py={7}
                fontWeight="600"
                _hover={{ bg: "nexzy.gold" }}
              >
                <a
                  href={googlePlayUrl("cta")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackDownload("android", "cta")}
                >
                  <HStack gap={3}>
                    <FaGooglePlay size={22} />
                    <VStack gap={0} align="start">
                      <Text fontSize="xs" opacity={0.9}>
                        Get it on
                      </Text>
                      <Text fontSize="md" fontWeight="bold">
                        Google Play
                      </Text>
                    </VStack>
                  </HStack>
                </a>
              </Button>
            </Stack>

            {/* Newsletter — device-agnostic capture */}
            <Box w="full" maxW={{ base: "full", sm: "md" }}>
              <EmailCapture variant="cta" source="cta" />
            </Box>
          </Stack>

          {/* RIGHT — the "get the app" card (tablet + desktop) */}
          <Stack
            display={{ base: "none", md: "flex" }}
            flexShrink={0}
            align="center"
            gap={4}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="3xl"
            px={{ base: 8, md: 10 }}
            py={{ base: 8, md: 10 }}
          >
            <Box bg="white" p={3} borderRadius="2xl">
              <Image
                src="/qr-get-app.png"
                alt="Scan to get the Nexzy app on your phone"
                boxSize="180px"
              />
            </Box>
            <Text
              color="nexzy.white"
              fontWeight="800"
              fontSize="lg"
              textAlign="center"
            >
              Scan to get it on your phone
            </Text>
            <Text
              color="nexzy.gray.100"
              fontSize="sm"
              textAlign="center"
              maxW="2xs"
            >
              Point your camera at the code — it opens the right store. Free on
              iOS &amp; Android.
            </Text>
          </Stack>
        </Flex>
      </Container>
    </Box>
  );
}
