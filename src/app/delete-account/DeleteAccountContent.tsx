"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  Button,
  HStack,
  Link,
} from "@chakra-ui/react";
import { HiArrowLeft } from "react-icons/hi";
import NextLink from "next/link";

const SUPPORT_EMAIL = "support@nexzyapp.com";
const MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Delete my account",
)}`;

function Bullets({ items }: { items: string[] }) {
  return (
    <Stack gap={2}>
      {items.map((item) => (
        <Text key={item} color="gray.700">
          • {item}
        </Text>
      ))}
    </Stack>
  );
}

export default function DeleteAccountContent() {
  return (
    <Box bg="white" minH="100vh">
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
              Last updated: September 2026
            </Text>
          </HStack>
        </Container>
      </Box>

      <Container maxW="container.md" py={16}>
        <Stack gap={8}>
          <Heading as="h1" fontFamily="title" size="2xl" color="nexzy.navy">
            Delete your Nexzy account
          </Heading>

          <Text fontSize="lg" color="gray.600">
            You can delete your Nexzy account and the data tied to it at any
            time, from the Nexzy app or by email. Deleting your account is
            permanent and can&apos;t be undone.
          </Text>

          <Stack gap={6}>
            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                1. Delete your account in the app
              </Heading>
              <Stack gap={2}>
                <Text color="gray.700">1. Open Nexzy and sign in.</Text>
                <Text color="gray.700">
                  2. Tap your profile picture in the top bar, then tap{" "}
                  <strong>Settings</strong>.
                </Text>
                <Text color="gray.700">
                  3. Tap <strong>Delete Account</strong>, then{" "}
                  <strong>Continue</strong>. We email a 6-digit code to the
                  address on your account.
                </Text>
                <Text color="gray.700">
                  4. Enter the code within 15 minutes and tap{" "}
                  <strong>Delete My Account</strong>.
                </Text>
                <Text color="gray.700">
                  Your account is deleted right away, and we send a confirmation
                  email.
                </Text>
              </Stack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                2. Can&apos;t use the app? Ask us by email
              </Heading>
              <Text color="gray.700">
                Email{" "}
                <Link href={MAILTO} color="nexzy.blue" fontWeight="medium">
                  {SUPPORT_EMAIL}
                </Link>{" "}
                from the email address on your Nexzy account, with the subject
                &quot;Delete my account&quot;. We confirm the request came from
                the account owner, delete the account within 30 days, and reply
                once it&apos;s done.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                3. What we delete
              </Heading>
              <Bullets
                items={[
                  "Your account and profile: name, username, email, date of birth, gender and profile details",
                  "Your game library, wishlist, console and genre preferences, and price alerts",
                  "Your coins balance, rewards and login streaks",
                  "Your votes, game recommendations and tips",
                  "Your Ask Nexzy questions and conversations",
                  "Your notifications, push notification tokens and sign-in sessions",
                ]}
              />
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                4. What we keep, without linking it to you
              </Heading>
              <Bullets
                items={[
                  "Posts and comments you published stay up, but they are no longer linked to your account and no longer show your name. To remove them completely, delete them in the app before you delete your account.",
                  "Purchase and coin transaction records are kept for accounting, with the link to your account removed.",
                  "Reports you submitted are kept for moderation history, with the link to your account removed.",
                ]}
              />
              <Text color="gray.700" mt={3}>
                We keep these records only as long as we need them for
                accounting and moderation. Usage analytics and crash reports
                held by our service providers are removed on those
                providers&apos; standard retention schedules.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" mb={3} color="nexzy.navy">
                5. Delete some data and keep your account
              </Heading>
              <Bullets
                items={[
                  "Delete any post or comment from its menu in the app.",
                  "Remove games from your library or wishlist from the game's page.",
                  "Change or remove your gender and profile details in Settings > Edit Profile and Settings > About you.",
                  `For anything else, email ${SUPPORT_EMAIL} and tell us what you want deleted.`,
                ]}
              />
            </Box>

            <Box>
              <Text color="gray.700">
                For more on how we handle your data, read our{" "}
                <Link asChild color="nexzy.blue" fontWeight="medium">
                  <NextLink href="/privacy">Privacy Policy</NextLink>
                </Link>
                .
              </Text>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
