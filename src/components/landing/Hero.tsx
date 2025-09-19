// ============================================
// FILE: components/landing/Hero.tsx
// Updated with Chakra v3 syntax
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
} from "@chakra-ui/react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { HiDownload, HiStar, HiUsers } from "react-icons/hi";

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
      {/* Updated background decoration */}
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
          {/* Update text colors in content */}
          <Stack
            flex={1}
            align={{ base: "center", lg: "start" }}
            textAlign={{ base: "center", lg: "left" }}
            gap={6}
          >
            <Badge
              bg="nexzy.yellow/20"
              color="nexzy.gold"
              px={3}
              py={1}
              borderRadius="full"
              border="1px solid"
              borderColor="nexzy.yellow/30"
            >
              🎮 The Ultimate Gaming Community Hub
            </Badge>

            <Heading
              as="h1"
              size={{ base: '3xl', md: '4xl', lg: '5xl' }}
              fontWeight="bold"
              lineHeight="shorter"
              color="nexzy.white"
            >
              Game Together,{' '}
              <Text as="span" color="nexzy.lightBlue">
                Win
              </Text>{' '}
              Together,{' '}
              <Text as="span" color="nexzy.yellow">
                Earn
              </Text>{' '}
              Together
            </Heading>

            <Text
              fontSize={{ base: 'lg', md: 'xl' }}
              color="nexzy.gray.100"
              maxW="xl"
            >
              Join the ultimate gaming community where you can discover games,
              connect with players, stay updated with gaming news, and earn
              rewards for your passion 🏆
            </Text>

            {/* Update button colors */}
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
              >
                <HStack gap={2}>
                  <FaGooglePlay />
                  <Text>Google Play</Text>
                </HStack>
              </Button>
            </Stack>

            {/* Update stats colors */}
            <HStack gap={8} pt={4}>
              <Stack gap={0}>
                <HStack>
                  <Icon color="nexzy.lightBlue">
                    <HiUsers />
                  </Icon>
                  <Text fontSize="2xl" fontWeight="bold" color="nexzy.white">New</Text>
                </HStack>
                <Text fontSize="sm" color="nexzy.gray.100">Platform</Text>
              </Stack>
              <Stack gap={0}>
                <HStack>
                  <Icon color="nexzy.yellow">
                    <HiStar />
                  </Icon>
                  <Text fontSize="2xl" fontWeight="bold" color="nexzy.white">100%</Text>
                </HStack>
                <Text fontSize="sm" color="nexzy.gray.100">Rewards</Text>
              </Stack>
              <Stack gap={0}>
                <Text fontSize="2xl" fontWeight="bold" color="nexzy.white">24/7</Text>
                <Text fontSize="sm" color="nexzy.gray.100">Gaming News</Text>
              </Stack>
            </HStack>
          </Stack>
        </Flex>
      </Container>
    </Box>
  );
}
