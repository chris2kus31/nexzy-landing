// ============================================
// FILE: components/landing/Footer.tsx
// Clean landing page footer with essentials
// ============================================
"use client";

import {
  Box,
  Container,
  SimpleGrid,
  Stack,
  HStack,
  Text,
  Link,
  Separator,
  Image,
  Icon,
} from "@chakra-ui/react";
import { FaApple, FaGooglePlay, FaRobot } from "react-icons/fa";
import { IoGameController } from "react-icons/io5";
import { HiMail } from "react-icons/hi";
import { APP_STORE_URL, googlePlayUrl } from "@/lib/storeUrls";
import { trackDownload } from "@/lib/analytics";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Download", href: "#download" },
      { label: "Pricing", href: "#" },
    ],
    // Site-wide internal links to the three content hubs — every page now
    // passes crawl + link authority to /blog, /guides, /lists (SEO).
    Explore: [
      { label: "Gaming News", href: "/blog" },
      { label: "Game Guides", href: "/guides" },
      { label: "Game Lists", href: "/lists" },
    ],
    Company: [{ label: "About Us", href: "/about" }],
    Legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Community Guidelines", href: "/guidelines" },
      { label: "Editorial Standards", href: "/editorial-standards" },
    ],
  };

  return (
    <Box as="footer" bg="nexzy.navy" pt={{ base: 12, md: 16 }} pb={8}>
      <Container maxW="container.xl" px={{ base: 5, md: 6 }}>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} gap={8} mb={12}>
          {/* Logo & Brand Column */}
          <Stack gap={4} pr={{ base: 0, lg: 8 }}>
            <HStack gap={3}>
              <Image src="/NexzyLogo.png" alt="Nexzy" h={12} w={12} />
              <Stack gap={0}>
                <Text fontWeight="bold" fontSize="2xl" color="white">
                  Nexzy
                </Text>
                <Text fontSize="xs" color="nexzy.yellow">
                  AI Gaming Assistant
                </Text>
              </Stack>
            </HStack>
            <Text fontSize="sm" color="gray.400">
              Your ultimate gaming companion with AI assistance, rewards, and
              game management all in one app.
            </Text>
            <Stack gap={2} pt={2}>
              <Text fontSize="xs" color="gray.400" fontWeight="medium">
                DOWNLOAD THE APP
              </Text>
              <HStack gap={3}>
                <Link
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackDownload("ios", "footer")}
                  display="flex"
                  alignItems="center"
                  gap={2}
                  color="gray.400"
                  _hover={{ color: "nexzy.blue" }}
                  fontSize="sm"
                >
                  <FaApple />
                  iOS
                </Link>
                <Link
                  href={googlePlayUrl("footer")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackDownload("android", "footer")}
                  display="flex"
                  alignItems="center"
                  gap={2}
                  color="gray.400"
                  _hover={{ color: "nexzy.blue" }}
                  fontSize="sm"
                >
                  <FaGooglePlay />
                  Android
                </Link>
              </HStack>
            </Stack>
          </Stack>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <Stack key={category} gap={3}>
              <Text
                fontWeight="bold"
                fontSize="sm"
                color="gray.300"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {category}
              </Text>
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  fontSize="sm"
                  color="gray.400"
                  _hover={{ color: "nexzy.blue" }}
                  transition="color 0.2s"
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          ))}
        </SimpleGrid>

        <Separator borderColor="whiteAlpha.200" />

        {/* Bottom Section */}
        <Stack
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "center", md: "flex-start" }}
          pt={8}
          gap={4}
        >
          <Stack
            direction={{ base: "column", sm: "row" }}
            gap={{ base: 2, sm: 4 }}
            align="center"
          >
            <Text fontSize="sm" color="gray.400">
              © {currentYear} Nexzy. All rights reserved.
            </Text>
            <HStack gap={4} display={{ base: "none", sm: "flex" }}>
              <Link
                href="/privacy"
                fontSize="sm"
                color="gray.400"
                _hover={{ color: "nexzy.blue" }}
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                fontSize="sm"
                color="gray.400"
                _hover={{ color: "nexzy.blue" }}
              >
                Terms
              </Link>
              <Link
                href="/guidelines"
                fontSize="sm"
                color="gray.400"
                _hover={{ color: "nexzy.blue" }}
              >
                Guidelines
              </Link>
            </HStack>
          </Stack>

          {/* Contact/Social */}
          <HStack gap={4}>
            <Link
              href="mailto:support@nexzyapp.com"
              display="flex"
              alignItems="center"
              gap={2}
              fontSize="sm"
              color="gray.400"
              _hover={{ color: "nexzy.blue" }}
            >
              <HiMail />
              support@nexzyapp.com
            </Link>
          </HStack>
        </Stack>

        {/* Cookie / analytics disclosure (Microsoft Clarity + Google Analytics) */}
        <Text fontSize="xs" color="gray.400" textAlign="center" mt={8} px={4}>
          We use cookies, Google Analytics, and Microsoft Clarity to see how you
          use our site so we can improve it. By using our site, you agree that
          we and these providers can collect and use this data.{" "}
          <Link
            href="/privacy"
            color="nexzy.blue"
            _hover={{ textDecoration: "underline" }}
          >
            See our Privacy Policy
          </Link>
          .
        </Text>

        {/* App Features Reminder - Optional bottom banner */}
        <Box mt={8} pt={8} borderTop="1px solid" borderColor="whiteAlpha.200">
          <HStack justify="center" gap={8} wrap="wrap" opacity={0.6}>
            <HStack gap={2}>
              <Icon color="nexzy.blue" boxSize={4}>
                <FaRobot />
              </Icon>
              <Text fontSize="xs" color="gray.400">
                AI Gaming Assistant
              </Text>
            </HStack>
            <HStack gap={2}>
              <Icon color="nexzy.blue" boxSize={4}>
                <IoGameController />
              </Icon>
              <Text fontSize="xs" color="gray.400">
                1000+ Games Supported
              </Text>
            </HStack>
            <HStack gap={2}>
              <Text fontSize="xs" color="gray.400">
                Free to Download
              </Text>
            </HStack>
          </HStack>
        </Box>
      </Container>
    </Box>
  );
}
