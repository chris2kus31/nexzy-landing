// ============================================
// FILE: components/landing/Navigation.tsx
// Using Chakra v3 components correctly
// ============================================
"use client";

import {
  Box,
  Flex,
  HStack,
  Button,
  Container,
  Image,
  Link,
  IconButton,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  DrawerRoot,
  DrawerBackdrop,
  DrawerContent,
  DrawerCloseTrigger,
  DrawerBody,
  DrawerHeader,
} from "@/components/ui/drawer";
import { useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";
import NextLink from "next/link";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Download App", href: "#download" },
    { label: "Why Nexzy?", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "About Us", href: "#about" },
  ];

  return (
    <Box
      as="nav"
      position="fixed"
      top={0}
      w="full"
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      zIndex={1000}
      backdropFilter="blur(10px)"
    >
      <Container maxW="container.xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          {/* Logo */}
          <HStack gap={2}>
            <Box fontWeight="bold" fontSize="xl" color="blue.500">
              Nexzy
            </Box>
          </HStack>

          {/* Desktop Navigation */}
          <HStack gap={8} display={{ base: "none", md: "flex" }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                fontSize="sm"
                fontWeight="medium"
                _hover={{ color: "blue.500" }}
              >
                {item.label}
              </Link>
            ))}
          </HStack>

          {/* Desktop CTA */}
          <HStack gap={4} display={{ base: "none", md: "flex" }}>
            <NextLink href="/login" passHref>
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </NextLink>
            <Button colorScheme="green" size="sm" borderRadius="full" px={6}>
              Get Started
            </Button>
          </HStack>

          {/* Mobile Menu Button */}
          <IconButton
            display={{ base: "flex", md: "none" }}
            onClick={() => setIsOpen(true)}
            variant="ghost"
            aria-label="Open menu"
          >
            <HiMenu />
          </IconButton>
        </Flex>
      </Container>

      {/* Mobile Drawer */}
      <DrawerRoot open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
        <DrawerBackdrop />
        <DrawerContent>
          <DrawerHeader>
            <Flex justify="space-between" align="center">
              <Text fontWeight="bold">Menu</Text>
              <DrawerCloseTrigger asChild>
                <IconButton variant="ghost" size="sm" aria-label="Close">
                  <HiX />
                </IconButton>
              </DrawerCloseTrigger>
            </Flex>
          </DrawerHeader>
          <DrawerBody>
            <Stack gap={4}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  fontSize="lg"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Button variant="outline" size="lg" mt={4}>
                Sign In
              </Button>
              <Button colorScheme="green" size="lg">
                Get Started
              </Button>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>
    </Box>
  );
}
