// ============================================
// FILE: app/guidelines/page.tsx
// Community Guidelines Page
// ============================================
"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  Button,
  HStack,
  Alert,
} from "@chakra-ui/react";
import { HiArrowLeft, HiHeart } from "react-icons/hi";
import NextLink from "next/link";

export default function GuidelinesPage() {
  return (
    <Box bg="white" minH="100vh">
      {/* Simple Header */}
      <Box bg="nexzy.navy" py={4}>
        <Container maxW="container.xl">
          <HStack justify="space-between">
            <NextLink href="/">
              <Button
                variant="ghost"
                size="sm"
                color="nexzy.white"
                _hover={{ bg: "nexzy.blue/20" }}
              >
                <HiArrowLeft />
                Back to Home
              </Button>
            </NextLink>
            <Text color="nexzy.white" fontSize="sm">
              Last updated: January 2025
            </Text>
          </HStack>
        </Container>
      </Box>

      {/* Content */}
      <Container maxW="container.md" py={16}>
        <Stack gap={8}>
          <Heading as="h1" size="2xl" color="nexzy.navy">
            Community Guidelines
          </Heading>

          <Alert.Root
            status="info"
            borderRadius="lg"
            bg="nexzy.blue/10"
            borderLeft="4px solid"
            borderColor="nexzy.blue"
          >
            <Stack gap={2}>
              <HStack>
                <HiHeart color="#4A9FFF" />
                <Text fontWeight="bold" color="nexzy.navy">
                  Our Mission
                </Text>
              </HStack>
              <Text color="gray.700">
                Nexzy is built for gamers, by gamers. We're creating a
                supportive, inclusive community where everyone can level up
                their gaming experience together.
              </Text>
            </Stack>
          </Alert.Root>

          <Stack gap={6}>
            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                Be Respectful
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700">
                  • Treat all community members with respect and kindness
                </Text>
                <Text color="gray.700">
                  • Welcome gamers of all skill levels - we all started
                  somewhere
                </Text>
                <Text color="gray.700">
                  • Disagree constructively without personal attacks
                </Text>
                <Text color="gray.700">
                  • Respect different gaming preferences and platforms
                </Text>
                <Text color="gray.700">
                  • Use appropriate language in all interactions
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                Keep It Gaming
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700">
                  • Focus discussions on gaming topics
                </Text>
                <Text color="gray.700">
                  • Share gaming tips, strategies, and experiences
                </Text>
                <Text color="gray.700">
                  • Help others with game-related questions
                </Text>
                <Text color="gray.700">
                  • Avoid off-topic political or controversial discussions
                </Text>
                <Text color="gray.700">
                  • Keep promotional content gaming-related and non-spammy
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                No Tolerance for Harm
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700" fontWeight="semibold">
                  We have zero tolerance for:
                </Text>
                <Text color="gray.700">• Harassment, bullying, or threats</Text>
                <Text color="gray.700">
                  • Hate speech or discrimination based on race, gender,
                  sexuality, religion, or nationality
                </Text>
                <Text color="gray.700">
                  • Sharing personal information of others (doxxing)
                </Text>
                <Text color="gray.700">
                  • Sexual content or inappropriate behavior toward minors
                </Text>
                <Text color="gray.700">
                  • Encouraging self-harm or violence
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                Play Fair
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700">
                  • Don't exploit bugs or glitches in the app
                </Text>
                <Text color="gray.700">
                  • No cheating, hacking, or using bots to gain unfair
                  advantages
                </Text>
                <Text color="gray.700">
                  • Don't manipulate the coin/reward system
                </Text>
                <Text color="gray.700">
                  • Report bugs responsibly to help us improve
                </Text>
                <Text color="gray.700">
                  • Don't share methods to pirate or illegally obtain games
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                Content Standards
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700">
                  • Share only content you have the right to post
                </Text>
                <Text color="gray.700">
                  • No NSFW content - keep it appropriate for all ages
                </Text>
                <Text color="gray.700">
                  • Avoid excessive profanity or graphic content
                </Text>
                <Text color="gray.700">
                  • Don't spam or flood forums with repetitive content
                </Text>
                <Text color="gray.700">
                  • Use spoiler warnings when discussing game plots
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                Help Us Help You
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700">
                  • Report violations using the in-app reporting feature
                </Text>
                <Text color="gray.700">
                  • Block users who make you uncomfortable
                </Text>
                <Text color="gray.700">
                  • Contact support for serious issues
                </Text>
                <Text color="gray.700">
                  • Provide constructive feedback to improve Nexzy
                </Text>
                <Text color="gray.700">
                  • Be patient with our AI assistant - it's always learning
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                Consequences
              </Heading>
              <Text color="gray.700" mb={3}>
                Violations of these guidelines may result in:
              </Text>
              <Stack gap={2}>
                <Text color="gray.700">
                  • <strong>Warning:</strong> First-time minor violations
                </Text>
                <Text color="gray.700">
                  • <strong>Temporary Suspension:</strong> Repeated or moderate
                  violations
                </Text>
                <Text color="gray.700">
                  • <strong>Permanent Ban:</strong> Severe violations or
                  repeated offenses
                </Text>
                <Text color="gray.700">
                  • <strong>Legal Action:</strong> Illegal activities will be
                  reported to authorities
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                Appeals
              </Heading>
              <Text color="gray.700">
                If you believe you've been unfairly penalized, you can appeal by
                contacting our support team with your case details. We review
                all appeals fairly and will respond within 72 hours.
              </Text>
            </Box>

            <Box
              bg="nexzy.yellow/10"
              p={6}
              borderRadius="lg"
              border="1px solid"
              borderColor="nexzy.yellow/30"
            >
              <Stack gap={2}>
                <Heading as="h3" size="md" color="nexzy.navy">
                  Remember: Gaming is Fun!
                </Heading>
                <Text color="gray.700">
                  We're all here because we love gaming. Let's keep Nexzy a
                  positive space where everyone can enjoy their gaming journey,
                  get help when stuck, and celebrate achievements together.
                </Text>
                <Text color="gray.700" fontWeight="semibold">
                  Game on! 🎮
                </Text>
              </Stack>
            </Box>

            <Box>
              <Text color="gray.700">
                Questions about these guidelines? Contact us at:
              </Text>
              <Text color="nexzy.blue" fontWeight="medium">
                community@nexzy.app
              </Text>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
