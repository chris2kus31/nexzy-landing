// ============================================
// FILE: components/landing/CTA.tsx
// "Make it yours" band — a single CONTAINED card (bounded width, bordered,
// faint fill) so the pitch and the get-app action sit close together as one
// unit (no full-width void, one focal point). LEFT: pitch + newsletter. RIGHT:
// a compact "get the app" tile — QR on desktop/tablet, store buttons on mobile.
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
      pt={{ base: 12, md: 16 }}
      pb={{ base: 16, md: 24 }}
      bg="nexzy.navy"
      position="relative"
      id="download"
      overflow="hidden"
    >
      <Container maxW="container.xl" position="relative" px={{ base: 5, md: 6 }}>
        {/* One contained card — keeps the two halves close, no cross-page void */}
        <Box
          maxW="5xl"
          mx="auto"
          position="relative"
          overflow="hidden"
          borderRadius="3xl"
          border="1px solid"
          borderColor="whiteAlpha.200"
          bg="whiteAlpha.50"
          px={{ base: 6, md: 10, lg: 12 }}
          py={{ base: 8, md: 10 }}
        >
          {/* faint depth glow */}
          <Box
            position="absolute"
            top="-40%"
            right="-8%"
            w="45%"
            h="150%"
            borderRadius="full"
            bg="nexzy.blue"
            opacity={0.08}
            filter="blur(90px)"
            pointerEvents="none"
          />

          <Flex
            direction={{ base: "column", lg: "row" }}
            gap={{ base: 8, lg: 12 }}
            align="center"
            position="relative"
          >
            {/* LEFT — pitch + newsletter */}
            <Stack
              flex="1"
              w="full"
              gap={5}
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
                fontSize={{ base: "md", md: "lg" }}
                color="nexzy.gray.100"
                maxW="lg"
              >
                Add the games you actually play, get news and help tuned to you,
                and Ask Nexzy whenever you&apos;re stuck.
              </Text>

              {/* Value props */}
              <Flex
                gap={{ base: 4, md: 6 }}
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

              {/* Mobile: store buttons (can't scan a QR on the phone in hand) */}
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
                  px={7}
                  py={6}
                  _hover={{ bg: "nexzy.gray.100" }}
                >
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDownload("ios", "cta")}
                  >
                    <HStack gap={2}>
                      <FaApple size={20} />
                      <Text fontWeight="bold">App Store</Text>
                    </HStack>
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  bg="nexzy.yellow"
                  color="nexzy.navy"
                  borderRadius="full"
                  px={7}
                  py={6}
                  fontWeight="600"
                  _hover={{ bg: "nexzy.gold" }}
                >
                  <a
                    href={googlePlayUrl("cta")}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDownload("android", "cta")}
                  >
                    <HStack gap={2}>
                      <FaGooglePlay size={20} />
                      <Text fontWeight="bold">Google Play</Text>
                    </HStack>
                  </a>
                </Button>
              </Stack>

              {/* Newsletter — device-agnostic capture */}
              <Box w="full" maxW={{ base: "full", sm: "sm" }} pt={1}>
                <EmailCapture variant="cta" source="cta" />
              </Box>
            </Stack>

            {/* RIGHT — compact "get the app" tile (tablet + desktop) */}
            <Stack
              display={{ base: "none", md: "flex" }}
              flexShrink={0}
              align="center"
              gap={3}
            >
              <Box bg="white" p={3} borderRadius="2xl" boxShadow="lg">
                <Image
                  src="/qr-get-app.png"
                  alt="Scan to get the Nexzy app on your phone"
                  boxSize="150px"
                />
              </Box>
              <Text
                color="nexzy.white"
                fontWeight="700"
                fontSize="sm"
                textAlign="center"
              >
                Scan to get it on your phone
              </Text>
              <Text
                color="nexzy.gray.100"
                fontSize="xs"
                textAlign="center"
                maxW="40"
              >
                Opens the right store — free on iOS &amp; Android.
              </Text>
            </Stack>
          </Flex>
        </Box>
      </Container>
    </Box>
  );
}
