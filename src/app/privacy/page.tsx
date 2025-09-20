// ============================================
// FILE: app/privacy/page.tsx
// Privacy Policy Page
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
} from "@chakra-ui/react";
import { HiArrowLeft } from "react-icons/hi";
import NextLink from "next/link";

export default function PrivacyPage() {
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
            Privacy Policy
          </Heading>

          <Text fontSize="lg" color="gray.600">
            Nexzy ("we," "our," or "us") is committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, and
            safeguard your information when you use our mobile application.
          </Text>

          <Stack gap={6}>
            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                1. Information We Collect
              </Heading>
              <Stack gap={3}>
                <Text color="gray.700">
                  <strong>Account Information:</strong> Username, email address,
                  and profile information you provide when creating an account.
                </Text>
                <Text color="gray.700">
                  <strong>Gaming Data:</strong> Your game library information,
                  wishlist, gaming preferences, and achievement data that you
                  choose to sync.
                </Text>
                <Text color="gray.700">
                  <strong>Usage Data:</strong> Information about how you
                  interact with our app, including features used and time spent.
                </Text>
                <Text color="gray.700">
                  <strong>Device Information:</strong> Device type, operating
                  system, and app version for technical support and
                  optimization.
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                2. How We Use Your Information
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700">
                  • Provide personalized AI gaming assistance
                </Text>
                <Text color="gray.700">
                  • Track and manage your game library and wishlist
                </Text>
                <Text color="gray.700">
                  • Award daily login rewards and achievement-based coins
                </Text>
                <Text color="gray.700">
                  • Send price alerts for games on your wishlist
                </Text>
                <Text color="gray.700">
                  • Improve our services and develop new features
                </Text>
                <Text color="gray.700">
                  • Communicate important updates and changes
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                3. Data Security
              </Heading>
              <Text color="gray.700">
                We implement industry-standard security measures to protect your
                personal information. Your data is encrypted during transmission
                and storage. We use secure authentication methods and regularly
                update our security protocols.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                4. Data Sharing
              </Heading>
              <Text color="gray.700">
                We do not sell, trade, or rent your personal information to
                third parties. We may share aggregated, anonymous data for
                analytical purposes. Your gaming statistics and achievements are
                only shared if you choose to make your profile public.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                5. Your Rights
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700">You have the right to:</Text>
                <Text color="gray.700">• Access your personal data</Text>
                <Text color="gray.700">• Correct inaccurate information</Text>
                <Text color="gray.700">
                  • Delete your account and associated data
                </Text>
                <Text color="gray.700">
                  • Opt-out of marketing communications
                </Text>
                <Text color="gray.700">
                  • Export your data in a portable format
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                6. Children's Privacy
              </Heading>
              <Text color="gray.700">
                Our service is not directed to children under 13. We do not
                knowingly collect personal information from children under 13.
                If you believe we have collected information from a child under
                13, please contact us immediately.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                7. Changes to This Policy
              </Heading>
              <Text color="gray.700">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the "Last updated" date.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                8. Contact Us
              </Heading>
              <Text color="gray.700">
                If you have questions about this Privacy Policy, please contact
                us at:
              </Text>
              <Text color="nexzy.blue" fontWeight="medium">
                privacy@nexzy.app
              </Text>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
