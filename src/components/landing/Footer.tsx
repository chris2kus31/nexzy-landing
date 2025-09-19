// ============================================
// FILE: components/landing/Footer.tsx
// Simple footer with Chakra v3
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
} from "@chakra-ui/react";

export default function Footer() {
  const footerLinks = {
    Gaming: ['Game Library', 'News Feed', 'Forums', 'Rewards'],
    Community: ['About', 'Blog', 'Discord', 'Support'],
    Resources: ['Help Center', 'FAQ', 'API', 'Status'],
    Legal: ['Privacy', 'Terms', 'Guidelines', 'Safety'],
  }

  return (
    <Box as="footer" bg="gray.50" pt={16} pb={8}>
      <Container maxW="container.xl">
        <SimpleGrid columns={{ base: 2, md: 5 }} gap={8} mb={8}>
          {/* Logo Column */}
          <Stack gap={4}>
            <Text fontWeight="bold" fontSize="xl" color="blue.500">
              Nexzy
            </Text>
            <Text fontSize="sm" color="gray.600">
              Your Ultimate Gaming Community
            </Text>
          </Stack>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <Stack key={category} gap={3}>
              <Text fontWeight="bold" fontSize="sm">
                {category}
              </Text>
              {links.map((link) => (
                <Link
                  key={link}
                  href="#"
                  fontSize="sm"
                  color="gray.600"
                  _hover={{ color: "blue.500" }}
                >
                  {link}
                </Link>
              ))}
            </Stack>
          ))}
        </SimpleGrid>

        <Separator />

        <Stack
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          pt={8}
          gap={4}
        >
          <Text fontSize="sm" color="gray.600">
            © 2024 Nexzy. All rights reserved.
          </Text>
          <HStack gap={6}>
            <Link href="#" fontSize="sm" color="gray.600">
              Privacy Policy
            </Link>
            <Link href="#" fontSize="sm" color="gray.600">
              Terms of Service
            </Link>
          </HStack>
        </Stack>
      </Container>
    </Box>
  );
}
