// ============================================
// FILE: components/landing/CTA.tsx
// Enhanced CTA with urgency and excitement
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
import { HiSparkles, HiLightningBolt } from "react-icons/hi";
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
        maxW="container.lg"
        position="relative"
        px={{ base: 5, md: 6 }}
      >
        <Stack gap={8} align="center">
          {/* Special Offer Banner */}
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
            animation="pulse 2s infinite"
          >
            <IoGift />
            MAKE IT YOURS
          </Badge>

          {/* Main CTA Content */}
          <Stack gap={6} textAlign="center">
            <Heading
              as="h2"
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
              maxW="2xl"
            >
              Add the games you actually play, get news and help tuned to you,
              and Ask Nexzy whenever you&apos;re stuck &mdash; free on iOS &amp;
              Android.
            </Text>

            {/* Value Props Grid */}
            <Flex gap={6} justify="center" wrap="wrap" py={4}>
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
          </Stack>

          {/* Download — device-aware. On a phone, the store buttons install
              directly. On desktop/tablet they're hidden in favor of the QR
              block below (you can't install a phone app on a laptop). */}
          <Stack
            direction={{ base: "column", sm: "row" }}
            gap={4}
            w={{ base: "full", sm: "auto" }}
            display={{ base: "flex", md: "none" }}
          >
            <Button
              asChild
              size="lg"
              bg="white"
              color="nexzy.navy"
              borderRadius="full"
              px={10}
              py={7}
              _hover={{
                bg: "nexzy.gray.100",
                transform: "translateY(-3px)",
                boxShadow: "0 10px 30px rgba(255,255,255,0.3)",
              }}
              transition="all 0.3s"
              boxShadow="0 4px 20px rgba(255,255,255,0.2)"
            >
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackDownload("ios", "cta")}
              >
                <HStack gap={3}>
                  <FaApple size={24} />
                  <VStack gap={0} align="start">
                    <Text fontSize="xs" opacity={0.9}>
                      Download on the
                    </Text>
                    <Text fontSize="lg" fontWeight="bold">
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
              px={10}
              py={7}
              fontWeight="600"
              _hover={{
                bg: "nexzy.gold",
                transform: "translateY(-3px)",
                boxShadow: "0 10px 30px rgba(255,183,77,0.5)",
              }}
              transition="all 0.3s"
              boxShadow="0 4px 20px rgba(255,183,77,0.3)"
              position="relative"
            >
              <a
                href={googlePlayUrl("cta")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackDownload("android", "cta")}
              >
                <HStack gap={3}>
                  <FaGooglePlay size={24} />
                  <VStack gap={0} align="start">
                    <Text fontSize="xs" opacity={0.9}>
                      Get it on
                    </Text>
                    <Text fontSize="lg" fontWeight="bold">
                      Google Play
                    </Text>
                  </VStack>
                </HStack>
              </a>
            </Button>
          </Stack>

          {/* Desktop / tablet: scan to get the app on your phone */}
          <HStack
            gap={5}
            display={{ base: "none", md: "flex" }}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="2xl"
            px={6}
            py={5}
            align="center"
          >
            <Box bg="white" p={2} borderRadius="xl" flexShrink={0}>
              <Image
                src="/qr-get-app.png"
                alt="Scan to get the Nexzy app on your phone"
                boxSize="128px"
              />
            </Box>
            <Stack gap={1} textAlign="left">
              <Text color="nexzy.white" fontWeight="800" fontSize="lg">
                Scan to get it on your phone
              </Text>
              <Text color="nexzy.gray.100" fontSize="sm" maxW="xs">
                Point your camera at the code — it opens the right store for your
                phone. Free on iOS &amp; Android.
              </Text>
            </Stack>
          </HStack>

          {/* Newsletter — the device-agnostic capture (works on any device) */}
          <EmailCapture variant="cta" source="cta" />

          {/* Feature highlight box */}
          <Box
            bg="nexzy.blue/20"
            border="1px solid"
            borderColor="nexzy.lightBlue/30"
            borderRadius="lg"
            px={6}
            py={3}
          >
            <HStack gap={2}>
              <HiLightningBolt color="#4A9FFF" />
              <Text fontSize="sm" color="nexzy.lightBlue" fontWeight="medium">
                Read it on the web, make it yours in the app.
              </Text>
            </HStack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
