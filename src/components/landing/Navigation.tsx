// ============================================
// FILE: components/landing/Navigation.tsx
// Top nav — content-forward and grouped. Desktop: Games, News, a Guides
// dropdown (Guides / Walkthroughs / Lists), The App, and the Download CTA.
// Mobile: the same, with the library shown as an expanded group in the drawer.
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
import { HiMenu, HiX, HiChevronDown } from "react-icons/hi";
import NextLink from "next/link";

// Absolute hrefs so they work from ANY page (e.g. /blog), not just home.
const LIBRARY = [
  { label: "Guides", href: "/guides" },
  { label: "Walkthroughs", href: "/walkthroughs" },
  { label: "Lists", href: "/lists" },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

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
            <Link
              asChild
              fontSize="sm"
              fontWeight="medium"
              color="nexzy.white"
              _hover={{ color: "nexzy.lightBlue" }}
              transition="color 0.2s"
            >
              <NextLink href="/games">Game Hubs</NextLink>
            </Link>

            <Link
              asChild
              fontSize="sm"
              fontWeight="medium"
              color="nexzy.white"
              _hover={{ color: "nexzy.lightBlue" }}
              transition="color 0.2s"
            >
              <NextLink href="/blog">News</NextLink>
            </Link>

            {/* Guides dropdown (reveals on hover) */}
            <Box position="relative" className="group">
              <HStack
                gap={1}
                fontSize="sm"
                fontWeight="medium"
                color="nexzy.white"
                cursor="pointer"
                _groupHover={{ color: "nexzy.lightBlue" }}
                transition="color 0.2s"
              >
                <Link asChild color="inherit" _hover={{ color: "inherit" }}>
                  <NextLink href="/guides">Guides</NextLink>
                </Link>
                <Box as="span" fontSize="xs" mt="1px">
                  <HiChevronDown />
                </Box>
              </HStack>
              <Box
                position="absolute"
                top="100%"
                left={0}
                pt={3}
                minW="210px"
                opacity={0}
                visibility="hidden"
                transform="translateY(6px)"
                transition="all 0.15s"
                _groupHover={{
                  opacity: 1,
                  visibility: "visible",
                  transform: "translateY(0)",
                }}
              >
                <Stack
                  gap={0}
                  bg="nexzy.navy"
                  border="1px solid"
                  borderColor="nexzy.blue/20"
                  borderRadius="lg"
                  p={2}
                  boxShadow="xl"
                >
                  {LIBRARY.map((item) => (
                    <Link
                      key={item.href}
                      asChild
                      px={3}
                      py={2}
                      borderRadius="md"
                      fontSize="sm"
                      fontWeight="medium"
                      color="nexzy.white"
                      _hover={{
                        bg: "whiteAlpha.100",
                        color: "nexzy.lightBlue",
                      }}
                    >
                      <NextLink href={item.href}>{item.label}</NextLink>
                    </Link>
                  ))}
                </Stack>
              </Box>
            </Box>

            <Link
              asChild
              fontSize="sm"
              fontWeight="medium"
              color="nexzy.white"
              _hover={{ color: "nexzy.lightBlue" }}
              transition="color 0.2s"
            >
              <NextLink href="/app">The App</NextLink>
            </Link>
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
              <NextLink href="/app">Get the app</NextLink>
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

      {/* Mobile Drawer */}
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
            <Stack gap={1}>
              <Link asChild fontSize="lg" py={2} color="nexzy.white">
                <NextLink href="/games" onClick={close}>
                  Game Hubs
                </NextLink>
              </Link>

              <Link asChild fontSize="lg" py={2} color="nexzy.white">
                <NextLink href="/blog" onClick={close}>
                  News
                </NextLink>
              </Link>

              <Text
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="nexzy.gray.100"
                mt={3}
                mb={1}
              >
                Guides &amp; Lists
              </Text>
              {LIBRARY.map((item) => (
                <Link
                  key={item.href}
                  asChild
                  fontSize="lg"
                  py={2}
                  pl={3}
                  color="nexzy.white"
                >
                  <NextLink href={item.href} onClick={close}>
                    {item.label}
                  </NextLink>
                </Link>
              ))}

              <Link asChild fontSize="lg" py={2} mt={3} color="nexzy.white">
                <NextLink href="/app" onClick={close}>
                  The App
                </NextLink>
              </Link>

              <Button
                asChild
                size="lg"
                mt={5}
                bg="nexzy.yellow"
                color="nexzy.navy"
                borderRadius="full"
              >
                <NextLink href="/app" onClick={close}>
                  Get the app
                </NextLink>
              </Button>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>
    </Box>
  );
}
