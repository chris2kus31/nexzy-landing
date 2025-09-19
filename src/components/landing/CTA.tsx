// ============================================
// FILE: components/landing/CTA.tsx
// Simple CTA section with Chakra v3
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
} from "@chakra-ui/react";
import { FaApple, FaGooglePlay } from "react-icons/fa";

export default function CTA() {
  return (
    <Box
      as="section"
      py={{ base: 16, md: 24 }}
      bgGradient="to-r"
      gradientFrom="blue.400"
      gradientTo="green.400"
      color="white"
      id="download"
    >
      <Container maxW="container.md" textAlign="center">
        <Stack gap={8}>
          <Stack gap={4}>
            <Heading as="h2" size={{ base: "xl", md: "2xl" }}>
              Ready to Connect?
            </Heading>
            <Text fontSize={{ base: "md", md: "lg" }} opacity={0.9}>
              Join millions of users already enjoying seamless communication
            </Text>
          </Stack>

          <HStack gap={4} justify="center">
            <Button
              size="lg"
              bg="white"
              color="black"
              borderRadius="full"
              px={8}
              _hover={{ bg: "gray.100" }}
            >
              <FaApple /> App Store
            </Button>
            <Button
              size="lg"
              bg="white"
              color="green.500"
              borderRadius="full"
              px={8}
              _hover={{ bg: "gray.100" }}
            >
              <FaGooglePlay /> Google Play
            </Button>
          </HStack>
        </Stack>
      </Container>
    </Box>
  );
}
