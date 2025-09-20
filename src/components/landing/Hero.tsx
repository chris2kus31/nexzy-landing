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
  Image,
  Badge,
  Icon,
  VStack,
} from "@chakra-ui/react";
import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues
const AppShowcase = dynamic(() => import("./AppShowcase"), { ssr: false });
import { FaApple, FaGooglePlay, FaRobot } from "react-icons/fa";
import { HiSparkles, HiCurrencyDollar, HiLibrary } from "react-icons/hi";
import { IoGameController } from "react-icons/io5";
import { BsFillLightningChargeFill } from "react-icons/bs";

export default function Hero() {
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

      <Container maxW="container.xl" position="relative">
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
                size="lg"
                bg="white"
                color="nexzy.navy"
                borderRadius="full"
                px={8}
                _hover={{ bg: "nexzy.gray.100", transform: "translateY(-2px)" }}
                transition="all 0.2s"
                boxShadow="0 4px 14px rgba(255,255,255,0.2)"
              >
                <HStack gap={2}>
                  <FaApple />
                  <Text>App Store</Text>
                </HStack>
              </Button>
              <Button
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
                <HStack gap={2}>
                  <FaGooglePlay />
                  <Text>Google Play</Text>
                </HStack>
              </Button>
            </Stack>

            {/* Social proof */}
            <HStack gap={8} pt={4}>
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

          {/* Hero Image/Mockup */}
          <Box flex={1} display={{ base: "none", lg: "block" }}>
            <AppShowcase />
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
