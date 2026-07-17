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
import { APP_STORE_URL, googlePlayUrl } from "@/lib/storeUrls";
import { trackDownload } from "@/lib/analytics";

/**
 * "Make it yours" band for the news pages — turns newsroom readers into app
 * users by framing the app as the personalized version of what they're reading
 * (their games, their updates, their AI help), not a generic "download our app".
 * Compact variant sits inline at the end of an article; the default is a fuller
 * band for the blog index.
 */
export default function AppCta({
  variant = "band",
  heading,
  subtext,
  location = "news",
}: {
  variant?: "band" | "inline";
  /** Optional override headline (e.g. game-specific guide CTA). */
  heading?: string;
  /** Optional override subtext. */
  subtext?: string;
  /**
   * Attribution tag for this CTA's placement/content type. Feeds the GA4
   * `app_download_click` event's `location` param AND the Android install
   * referrer's `utm_medium`, so installs can be attributed to the content
   * type that drove them (blog / guides / lists / walkthroughs). Defaults to
   * "news" for backward compatibility with existing call sites.
   */
  location?: string;
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
          Make it yours
        </Text>
        <Heading
          as="h2"
          size={compact ? "md" : { base: "lg", md: "xl" }}
          color="white"
          mb={2}
        >
          {heading ?? "Make Nexzy yours."}
        </Heading>
        <Text color="gray.300" fontSize="sm" mb={5}>
          {subtext ??
            "The app turns this newsroom into your own — track the games you play, get news and guides tuned to you, and Ask Nexzy when you're stuck. Free on iOS & Android."}
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
              onClick={() => trackDownload("ios", location)}
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
              href={googlePlayUrl(location)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackDownload("android", location)}
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
