// ============================================
// FILE: components/landing/HowItWorks.tsx
// Updated for Chakra UI v3
// ============================================
"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  Flex,
  Circle,
} from "@chakra-ui/react";

const steps = [
  {
    number: "1",
    title: "Download the App",
    description: "Get Nexzy from App Store or Google Play",
  },
  {
    number: "2",
    title: "Create Your Profile",
    description: "Sign up with your email or phone number",
  },
  {
    number: "3",
    title: "Start Chatting",
    description: "Connect with friends and join conversations",
  },
];

export default function HowItWorks() {
  return (
    <Box as="section" py={{ base: 16, md: 24 }} bg="gray.50" id="how-it-works">
      <Container maxW="container.xl">
        <Stack gap={12}>
          {/* Header */}
          <Stack gap={4} textAlign="center" maxW="2xl" mx="auto">
            <Heading as="h2" size={{ base: "xl", md: "2xl" }}>
              How does it work?
            </Heading>
            <Text fontSize={{ base: "md", md: "lg" }} color="gray.600">
              Get started in three simple steps
            </Text>
          </Stack>

          {/* Steps */}
          <Flex
            direction={{ base: "column", md: "row" }}
            gap={{ base: 8, md: 0 }}
            w="full"
            position="relative"
            justify="space-between"
          >
            {/* Connecting line for desktop */}
            <Box
              display={{ base: "none", md: "block" }}
              position="absolute"
              top="40px"
              left="20%"
              right="20%"
              h="2px"
              bg="gray.300"
              zIndex={0}
            />

            {steps.map((step, index) => (
              <Stack key={index} align="center" gap={4} flex={1} zIndex={1}>
                <Circle
                  size="80px"
                  bg="blue.500"
                  color="white"
                  fontSize="2xl"
                  fontWeight="bold"
                >
                  {step.number}
                </Circle>
                <Stack gap={2} textAlign="center">
                  <Heading as="h3" size="md">
                    {step.title}
                  </Heading>
                  <Text color="gray.600" fontSize="sm" maxW="200px">
                    {step.description}
                  </Text>
                </Stack>
              </Stack>
            ))}
          </Flex>
        </Stack>
      </Container>
    </Box>
  );
}
