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
} from "@chakra-ui/react";
import { FaApple, FaGooglePlay, FaRobot, FaUsers } from "react-icons/fa";
import { HiSparkles, HiLightningBolt } from "react-icons/hi";
import { IoGameController, IoGift } from "react-icons/io5";
import { BsStars } from "react-icons/bs";

export default function CTA() {
  return (
    <Box
      as="section"
      py={{ base: 16, md: 24 }}
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

      <Container maxW="container.lg" position="relative">
        <Stack gap={12} align="center">
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
            NEW: AI Gaming Assistant Now Available!
          </Badge>

          {/* Main CTA Content */}
          <Stack gap={6} textAlign="center">
            <Heading
              as="h2"
              size={{ base: "2xl", md: "3xl" }}
              color="nexzy.white"
              lineHeight="shorter"
            >
              Stop Googling Game Guides.
              <br />
              <Text as="span" color="nexzy.yellow">
                Start Playing Smarter.
              </Text>
            </Heading>

            <Text
              fontSize={{ base: "lg", md: "xl" }}
              color="nexzy.gray.100"
              maxW="2xl"
            >
              Your AI gaming assistant is waiting to help you conquer any game,
              earn daily rewards, and never miss a deal on your wishlist
            </Text>

            {/* Value Props Grid */}
            <Flex gap={6} justify="center" wrap="wrap" py={4}>
              <HStack gap={2}>
                <Icon color="nexzy.yellow" boxSize={5}>
                  <FaRobot />
                </Icon>
                <Text color="nexzy.white" fontSize="sm" fontWeight="medium">
                  24/7 AI Assistant
                </Text>
              </HStack>
              <HStack gap={2}>
                <Icon color="nexzy.lightBlue" boxSize={5}>
                  <IoGameController />
                </Icon>
                <Text color="nexzy.white" fontSize="sm" fontWeight="medium">
                  1000+ Games
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

          {/* Download Buttons */}
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
            </Button>

            <Button
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
            </Button>
          </Stack>

          {/* Social Proof */}
          <Stack gap={4} align="center">
            <HStack gap={1}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon key={star} color="nexzy.yellow" boxSize={5}>
                  <BsStars />
                </Icon>
              ))}
            </HStack>
            <Text color="nexzy.gray.100" fontSize="sm">
              Be among the first to experience gaming with AI assistance
            </Text>

            {/* Features highlight */}
            <HStack gap={6} opacity={0.9}>
              <HStack gap={2}>
                <Icon color="nexzy.yellow" boxSize={4}>
                  <FaRobot />
                </Icon>
                <Text fontSize="xs" color="nexzy.gray.200">
                  Instant AI help
                </Text>
              </HStack>
              <HStack gap={2}>
                <Icon color="nexzy.gold" boxSize={4}>
                  <IoGift />
                </Icon>
                <Text fontSize="xs" color="nexzy.gray.200">
                  Daily rewards
                </Text>
              </HStack>
            </HStack>
          </Stack>

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
                The only gaming app with real-time AI assistance for any game
              </Text>
            </HStack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
