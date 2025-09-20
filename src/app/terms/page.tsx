// ============================================
// FILE: app/terms/page.tsx
// Terms of Service Page
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

export default function TermsPage() {
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
            Terms of Service
          </Heading>

          <Text fontSize="lg" color="gray.600">
            Welcome to Nexzy! These Terms of Service ("Terms") govern your use
            of the Nexzy mobile application. By using our app, you agree to
            these Terms.
          </Text>

          <Stack gap={6}>
            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                1. Acceptance of Terms
              </Heading>
              <Text color="gray.700">
                By downloading, installing, or using Nexzy, you agree to be
                bound by these Terms. If you do not agree to these Terms, do not
                use our service. You must be at least 13 years old to use Nexzy.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                2. Description of Service
              </Heading>
              <Text color="gray.700">
                Nexzy provides AI-powered gaming assistance, game library
                management, price tracking, community forums, and a rewards
                system. The app is free to download with optional in-app
                purchases for additional coins.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                3. User Accounts
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700">
                  • You are responsible for maintaining the confidentiality of
                  your account credentials
                </Text>
                <Text color="gray.700">
                  • You agree to provide accurate and complete information
                  during registration
                </Text>
                <Text color="gray.700">
                  • You are responsible for all activities that occur under your
                  account
                </Text>
                <Text color="gray.700">
                  • You must notify us immediately of any unauthorized use of
                  your account
                </Text>
                <Text color="gray.700">
                  • One person may not maintain multiple accounts
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                4. Coins and Virtual Currency
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700">
                  • Nexzy Coins are virtual currency with no real-world value
                </Text>
                <Text color="gray.700">
                  • Coins cannot be exchanged for cash or transferred between
                  accounts
                </Text>
                <Text color="gray.700">
                  • Purchased coins are non-refundable except as required by law
                </Text>
                <Text color="gray.700">
                  • We reserve the right to modify coin values and rewards at
                  any time
                </Text>
                <Text color="gray.700">
                  • Unused coins do not expire but may be forfeited if your
                  account is terminated
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                5. Acceptable Use
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700">You agree NOT to:</Text>
                <Text color="gray.700">
                  • Use the service for any illegal or unauthorized purpose
                </Text>
                <Text color="gray.700">
                  • Exploit, hack, or attempt to gain unauthorized access to our
                  systems
                </Text>
                <Text color="gray.700">
                  • Use automated systems or bots to access the service
                </Text>
                <Text color="gray.700">
                  • Harass, abuse, or harm other users
                </Text>
                <Text color="gray.700">
                  • Post inappropriate, offensive, or copyrighted content
                </Text>
                <Text color="gray.700">
                  • Impersonate others or create false identities
                </Text>
                <Text color="gray.700">
                  • Manipulate or interfere with the rewards system
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                6. Intellectual Property
              </Heading>
              <Text color="gray.700">
                All content, features, and functionality of Nexzy are owned by
                us and are protected by international copyright, trademark, and
                other intellectual property laws. You may not copy, modify,
                distribute, or reverse engineer any part of our service.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                7. User Content
              </Heading>
              <Text color="gray.700">
                You retain ownership of content you post but grant us a
                worldwide, non-exclusive, royalty-free license to use, display,
                and distribute your content within the service. You are
                responsible for ensuring you have the rights to any content you
                share.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                8. Disclaimers
              </Heading>
              <Text color="gray.700">
                Nexzy is provided "as is" without warranties of any kind. We do
                not guarantee uninterrupted or error-free service. Gaming advice
                provided by our AI assistant is for informational purposes only.
                We are not responsible for any gaming outcomes or decisions made
                based on our suggestions.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                9. Limitation of Liability
              </Heading>
              <Text color="gray.700">
                To the maximum extent permitted by law, Nexzy shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages resulting from your use or inability to use the
                service.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                10. Termination
              </Heading>
              <Text color="gray.700">
                We may terminate or suspend your account at any time for
                violations of these Terms or for any other reason at our sole
                discretion. You may delete your account at any time through the
                app settings.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                11. Changes to Terms
              </Heading>
              <Text color="gray.700">
                We reserve the right to modify these Terms at any time. We will
                notify users of any material changes via the app or email.
                Continued use of the service after changes constitutes
                acceptance of the new Terms.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                12. Contact Information
              </Heading>
              <Text color="gray.700">
                For questions about these Terms, please contact us at:
              </Text>
              <Text color="nexzy.blue" fontWeight="medium">
                legal@nexzy.app
              </Text>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
