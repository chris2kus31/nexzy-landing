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
      bg="nexzy.blue"
      position="relative"
      color="white"
      id="download"
      overflow="hidden"
    >
      {/* Add pattern overlay */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        opacity={0.1}
        bgImage="radial-gradient(circle at 1px 1px, white 1px, transparent 1px)"
        backgroundSize="40px 40px"
      />

      <Container maxW="container.md" textAlign="center" position="relative">
        <Stack gap={8}>
          <Stack gap={4}>
            <Heading as="h2" size={{ base: 'xl', md: '2xl' }}>
              Ready to Level Up Your Gaming?
            </Heading>
            <Text fontSize={{ base: 'md', md: 'lg' }} opacity={0.9}>
              Join Nexzy today and start earning rewards for doing what you love
            </Text>
          </Stack>

          <HStack gap={4} justify="center">
            <Button
              size="lg"
              bg="white"
              color="nexzy.navy"
              borderRadius="full"
              px={8}
              _hover={{ bg: "nexzy.gray.50", transform: "translateY(-2px)" }}
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
          </HStack>
        </Stack>
      </Container>
    </Box>
  );
}
