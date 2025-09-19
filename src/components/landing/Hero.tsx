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
} from "@chakra-ui/react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { HiDownload, HiUsers } from "react-icons/hi";

export default function Hero() {
  return (
    <Box
      as="section"
      pt={{ base: 20, md: 32 }}
      pb={{ base: 16, md: 24 }}
      bgGradient="to-br"
      gradientFrom="blue.50"
      gradientTo="green.50"
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
        bg="blue.500"
        opacity={0.1}
        filter="blur(100px)"
      />

      <Container maxW="container.xl" position="relative">
        <Flex
          direction={{ base: "column", lg: "row" }}
          align="center"
          gap={{ base: 8, lg: 12 }}
        >
          {/* Left Content */}
          <Stack
            flex={1}
            align={{ base: "center", lg: "start" }}
            textAlign={{ base: "center", lg: "left" }}
            gap={6}
          >
            <Badge colorPalette="green" px={3} py={1} borderRadius="full">
              🎉 Over 5 Million Users Worldwide
            </Badge>

            <Heading
              as="h1"
              size={{ base: "3xl", md: "4xl", lg: "5xl" }}
              fontWeight="bold"
              lineHeight="shorter"
            >
              Talk Easily,{" "}
              <Text as="span" color="blue.500">
                Organized
              </Text>{" "}
              and Fast
            </Heading>

            <Text
              fontSize={{ base: "lg", md: "xl" }}
              color="gray.600"
              maxW="xl"
            >
              Stay connected with people from all over the world and interact
              with them easily with Nexzy app 🤝
            </Text>

            <Stack
              direction={{ base: "column", sm: "row" }}
              gap={4}
              w={{ base: "full", sm: "auto" }}
            >
              <Button
                size="lg"
                bg="black"
                color="white"
                borderRadius="full"
                px={8}
                _hover={{ bg: "gray.800" }}
              >
                <FaApple /> App Store
              </Button>
              <Button size="lg" colorScheme="green" borderRadius="full" px={8}>
                <FaGooglePlay /> Google Play
              </Button>
            </Stack>

            {/* Stats */}
            <HStack gap={8} pt={4}>
              <Stack gap={0}>
                <HStack>
                  <HiUsers color="var(--chakra-colors-blue-500)" />
                  <Text fontSize="2xl" fontWeight="bold">
                    5M+
                  </Text>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  Active Users
                </Text>
              </Stack>
              <Stack gap={0}>
                <HStack>
                  <HiDownload color="var(--chakra-colors-green-500)" />
                  <Text fontSize="2xl" fontWeight="bold">
                    10M+
                  </Text>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  Downloads
                </Text>
              </Stack>
              <Stack gap={0}>
                <Text fontSize="2xl" fontWeight="bold">
                  4.8⭐
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Rating
                </Text>
              </Stack>
            </HStack>
          </Stack>

          {/* Right Content - App Mockup */}
          <Box
            flex={1}
            position="relative"
            w="full"
            h={{ base: "400px", md: "500px" }}
          >
            <Box
              bg="gray.200"
              borderRadius="3xl"
              w="full"
              h="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text color="gray.500">App Preview</Text>
            </Box>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
