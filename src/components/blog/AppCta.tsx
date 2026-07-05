"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  HStack,
} from "@chakra-ui/react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/storeUrls";
import { trackDownload } from "@/lib/analytics";

/**
 * "Get the Nexzy app" band for the news pages — turns readers into installs.
 * Compact variant sits inline at the end of an article; the default is a fuller
 * band for the blog index. Keeps the newsroom a download funnel, not a leak.
 */
export default function AppCta({
  variant = "band",
}: {
  variant?: "band" | "inline";
}) {
  const compact = variant === "inline";
  return (
    <Box
      bg="nexzy.blue/10"
      border="1px solid"
      borderColor="nexzy.blue/25"
      borderRadius="2xl"
      py={compact ? 6 : { base: 8, md: 10 }}
      px={{ base: 5, md: 8 }}
      textAlign="center"
    >
      <Container maxW="2xl" px={0}>
        <Text
          color="nexzy.lightBlue"
          fontWeight="700"
          fontSize="sm"
          mb={2}
          textTransform="uppercase"
          letterSpacing="wide"
        >
          The Nexzy app
        </Text>
        <Heading
          as="h2"
          size={compact ? "md" : { base: "lg", md: "xl" }}
          color="white"
          mb={2}
        >
          Stuck in a game? Nexzy&apos;s AI has the answer.
        </Heading>
        <Text color="gray.300" fontSize="sm" mb={5}>
          Instant help for any game, earn coins daily, and track your library —
          free on iOS &amp; Android.
        </Text>
        <HStack gap={3} justify="center" flexWrap="wrap">
          <Button
            asChild
            bg="white"
            color="nexzy.navy"
            borderRadius="full"
            px={6}
            _hover={{ bg: "nexzy.gray.100" }}
          >
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackDownload("ios", "news")}
            >
              <HStack gap={2}>
                <FaApple />
                <Text>App Store</Text>
              </HStack>
            </a>
          </Button>
          <Button
            asChild
            bg="nexzy.yellow"
            color="nexzy.navy"
            borderRadius="full"
            px={6}
            fontWeight="600"
            _hover={{ bg: "nexzy.gold" }}
          >
            <a
              href={GOOGLE_PLAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackDownload("android", "news")}
            >
              <HStack gap={2}>
                <FaGooglePlay />
                <Text>Google Play</Text>
              </HStack>
            </a>
          </Button>
        </HStack>
      </Container>
    </Box>
  );
}
