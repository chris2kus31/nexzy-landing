// ============================================
// FILE: components/landing/Navigation.tsx
// REPLACE the entire Navigation component
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
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Download", href: "#download" },
  ];

  return (
    <Box
      as="nav"
      position="fixed"
      top={0}
      w="full"
      bg="nexzy.navy"
      borderBottom="1px solid"
      borderColor="nexzy.blue/20"
      zIndex={1000}
      backdropFilter="blur(10px)"
    >
      <Container maxW="container.xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          {/* Logo */}
          <HStack gap={2}>
            <Image src="/NexzyLogo.png" alt="Nexzy" h={10} w={10} />
            <Text fontWeight="bold" fontSize="xl" color="nexzy.white">
              Nexzy
            </Text>
          </HStack>

          {/* Desktop Navigation */}
          <HStack gap={8} display={{ base: "none", md: "flex" }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                fontSize="sm"
                fontWeight="medium"
                color="nexzy.white"
                _hover={{ color: "nexzy.lightBlue" }}
                transition="color 0.2s"
              >
                {item.label}
              </Link>
            ))}
          </HStack>

          {/* Desktop CTA */}
          <HStack gap={4} display={{ base: "none", md: "flex" }}>
            <NextLink href="/login" passHref>
              <Button
                variant="ghost"
                size="sm"
                color="nexzy.white"
                _hover={{ bg: "nexzy.blue/20" }}
              >
                Sign In
              </Button>
            </NextLink>
            <Button
              size="sm"
              bg="nexzy.yellow"
              color="nexzy.navy"
              borderRadius="full"
              px={6}
              fontWeight="600"
              _hover={{ bg: "nexzy.gold", transform: "translateY(-2px)" }}
              transition="all 0.2s"
            >
              Get Started
            </Button>
          </HStack>

          {/* Mobile Menu Button */}
          <IconButton
            display={{ base: "flex", md: "none" }}
            onClick={() => setIsOpen(true)}
            variant="ghost"
            aria-label="Open menu"
            color="nexzy.white"
          >
            <HiMenu />
          </IconButton>
        </Flex>
      </Container>

      {/* Mobile Drawer - Keeping same structure, updating colors */}
      <DrawerRoot open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
        <DrawerBackdrop />
        <DrawerContent bg="nexzy.navy">
          <DrawerHeader>
            <Flex justify="space-between" align="center">
              <Text fontWeight="bold" color="nexzy.white">
                Menu
              </Text>
              <DrawerCloseTrigger asChild>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label="Close"
                  color="nexzy.white"
                >
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
                  color="nexzy.white"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Button
                variant="outline"
                size="lg"
                mt={4}
                color="nexzy.white"
                borderColor="nexzy.blue"
              >
                Sign In
              </Button>
              <Button size="lg" bg="nexzy.yellow" color="nexzy.navy">
                Get Started
              </Button>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>
    </Box>
  );
}
