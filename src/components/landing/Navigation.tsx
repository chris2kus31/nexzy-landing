// ============================================
// FILE: components/landing/Navigation.tsx
// Fixed mobile menu layout
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

  // Absolute hrefs so they work from ANY page (e.g. /blog), not just home.
  const navItems = [
    { label: "Features", href: "/#features" },
    { label: "How it Works", href: "/#how-it-works" },
    { label: "Game News", href: "/blog" },
    { label: "Download", href: "/#download" },
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
          {/* Logo — links home */}
          <Link asChild _hover={{ textDecoration: "none" }}>
            <NextLink href="/">
              <HStack gap={2}>
                <Image src="/NexzyLogo.png" alt="Nexzy" h={10} w={10} />
                <Text fontWeight="bold" fontSize="xl" color="nexzy.white">
                  Nexzy
                </Text>
              </HStack>
            </NextLink>
          </Link>

          {/* Desktop Navigation */}
          <HStack gap={8} display={{ base: "none", md: "flex" }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                asChild
                fontSize="sm"
                fontWeight="medium"
                color="nexzy.white"
                _hover={{ color: "nexzy.lightBlue" }}
                transition="color 0.2s"
              >
                <NextLink href={item.href}>{item.label}</NextLink>
              </Link>
            ))}
          </HStack>

          {/* Desktop CTA */}
          <HStack gap={4} display={{ base: "none", md: "flex" }}>
            <Button
              asChild
              size="sm"
              bg="nexzy.yellow"
              color="nexzy.navy"
              borderRadius="full"
              px={6}
              fontWeight="600"
              _hover={{ bg: "nexzy.gold", transform: "translateY(-2px)" }}
              transition="all 0.2s"
            >
              <NextLink href="/#download">Get Started</NextLink>
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

      {/* Mobile Drawer - Overlay style */}
      <DrawerRoot
        open={isOpen}
        onOpenChange={(e) => setIsOpen(e.open)}
        placement="end"
        size="sm"
      >
        <DrawerBackdrop />
        <DrawerContent
          bg="nexzy.navy"
          position="fixed"
          right={0}
          top={0}
          h="100vh"
          w="80%"
          maxW="320px"
          zIndex={1500}
        >
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
                <Link key={item.href} asChild fontSize="lg" color="nexzy.white">
                  <NextLink href={item.href} onClick={() => setIsOpen(false)}>
                    {item.label}
                  </NextLink>
                </Link>
              ))}
              <Button
                asChild
                size="lg"
                mt={4}
                bg="nexzy.yellow"
                color="nexzy.navy"
              >
                <NextLink href="/#download" onClick={() => setIsOpen(false)}>
                  Get Started
                </NextLink>
              </Button>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>
    </Box>
  );
}
