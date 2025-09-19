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

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Download", href: "#download" },
      { label: "Pricing", href: "#" },
    ],
    Company: [
      { label: "About Us", href: "#" },
    ],
    Legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Community Guidelines", href: "/guidelines" },
    ],
  };

  return (
    <Box as="footer" bg="gray.50" pt={16} pb={8}>
      <Container maxW="container.xl">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={8} mb={12}>
          {/* Logo & Brand Column */}
          <Stack gap={4} pr={8}>
            <HStack gap={3}>
              <Image src="/NexzyLogo.png" alt="Nexzy" h={12} w={12} />
              <Stack gap={0}>
                <Text fontWeight="bold" fontSize="2xl" color="nexzy.navy">
                  Nexzy
                </Text>
                <Text fontSize="xs" color="nexzy.yellow">
                  AI Gaming Assistant
                </Text>
              </Stack>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Your ultimate gaming companion with AI assistance, rewards, and
              game management all in one app.
            </Text>
            <Stack gap={2} pt={2}>
              <Text fontSize="xs" color="gray.500" fontWeight="medium">
                DOWNLOAD THE APP
              </Text>
              <HStack gap={3}>
                <Link
                  href="#"
                  display="flex"
                  alignItems="center"
                  gap={2}
                  color="gray.600"
                  _hover={{ color: "nexzy.blue" }}
                  fontSize="sm"
                >
                  <FaApple />
                  iOS
                </Link>
                <Link
                  href="#"
                  display="flex"
                  alignItems="center"
                  gap={2}
                  color="gray.600"
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
                color="gray.700"
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
                  color="gray.600"
                  _hover={{ color: "nexzy.blue" }}
                  transition="color 0.2s"
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          ))}
        </SimpleGrid>

        <Separator borderColor="gray.200" />

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
            <Text fontSize="sm" color="gray.600">
              © {currentYear} Nexzy. All rights reserved.
            </Text>
            <HStack gap={4} display={{ base: "none", sm: "flex" }}>
              <Link
                href="/privacy"
                fontSize="sm"
                color="gray.600"
                _hover={{ color: "nexzy.blue" }}
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                fontSize="sm"
                color="gray.600"
                _hover={{ color: "nexzy.blue" }}
              >
                Terms
              </Link>
              <Link
                href="/guidelines"
                fontSize="sm"
                color="gray.600"
                _hover={{ color: "nexzy.blue" }}
              >
                Guidelines
              </Link>
            </HStack>
          </Stack>

          {/* Contact/Social */}
          <HStack gap={4}>
            <Link
              href="mailto:hello@nexzy.app"
              display="flex"
              alignItems="center"
              gap={2}
              fontSize="sm"
              color="gray.600"
              _hover={{ color: "nexzy.blue" }}
            >
              <HiMail />
              support@nexzy.app
            </Link>
          </HStack>
        </Stack>

        {/* App Features Reminder - Optional bottom banner */}
        <Box mt={8} pt={8} borderTop="1px solid" borderColor="gray.200">
          <HStack justify="center" gap={8} wrap="wrap" opacity={0.6}>
            <HStack gap={2}>
              <Icon color="nexzy.blue" boxSize={4}>
                <FaRobot />
              </Icon>
              <Text fontSize="xs" color="gray.600">
                AI Gaming Assistant
              </Text>
            </HStack>
            <HStack gap={2}>
              <Icon color="nexzy.blue" boxSize={4}>
                <IoGameController />
              </Icon>
              <Text fontSize="xs" color="gray.600">
                1000+ Games Supported
              </Text>
            </HStack>
            <HStack gap={2}>
              <Text fontSize="xs" color="gray.600">
                Free to Download
              </Text>
            </HStack>
          </HStack>
        </Box>
      </Container>
    </Box>
  );
}
