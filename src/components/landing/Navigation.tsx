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
import { track } from "@/lib/analytics";
import { BEATS } from "@/lib/blog/beats";

// Absolute hrefs so they work from ANY page (e.g. /blog), not just home.
const LIBRARY = [
  { label: "Guides", href: "/guides" },
  { label: "Walkthroughs", href: "/walkthroughs" },
  { label: "Lists", href: "/lists" },
  { label: "Reviews", href: "/reviews" },
];

// News beats (folded in from the old homepage TopicBar) + an "All news" entry.
const NEWS = [
  { label: "All news", href: "/blog" },
  ...BEATS.map((b) => ({ label: b.label, href: `/blog?beat=${b.key}` })),
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"news" | "guides" | null>(null);
  const close = () => setIsOpen(false);
  const nav = (item: string) => track("nav_click", { item });

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
    >
      <Container maxW="container.xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          {/* Logo — links home */}
          <Link asChild _hover={{ textDecoration: "none" }}>
            <NextLink href="/">
              <HStack gap={2}>
                <Image src="/NexzyLogo.png" alt="Nexzy" h={10} w={10} />
                <Text
                  fontFamily="title"
                  fontWeight="bold"
                  fontSize="xl"
                  color="nexzy.white"
                >
                  Nexzy
                </Text>
              </HStack>
            </NextLink>
          </Link>

          {/* Desktop Navigation */}
          <HStack gap={8} display={{ base: "none", lg: "flex" }}>
            <Link
              asChild
              fontSize="sm"
              fontWeight="medium"
              color="nexzy.white"
              _hover={{ color: "nexzy.lightBlue" }}
              transition="color 0.2s"
            >
              <NextLink href="/games" onClick={() => nav("games")}>
                By Game
              </NextLink>
            </Link>

            {/* News dropdown — tap/click to toggle (works on touch, too) */}
            <Box position="relative">
              <HStack
                as="button"
                onClick={() => setOpenMenu(openMenu === "news" ? null : "news")}
                gap={1}
                fontSize="sm"
                fontWeight="medium"
                color={openMenu === "news" ? "nexzy.lightBlue" : "nexzy.white"}
                cursor="pointer"
                _hover={{ color: "nexzy.lightBlue" }}
                transition="color 0.2s"
                aria-haspopup="true"
                aria-expanded={openMenu === "news"}
              >
                <Box as="span">News</Box>
                <Box
                  as="span"
                  fontSize="xs"
                  mt="1px"
                  transition="transform 0.15s"
                  transform={openMenu === "news" ? "rotate(180deg)" : undefined}
                >
                  <HiChevronDown />
                </Box>
              </HStack>
              {openMenu === "news" && (
                <Box
                  position="absolute"
                  top="100%"
                  left={0}
                  pt={3}
                  minW="200px"
                  zIndex={30}
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
                    {NEWS.map((item) => (
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
                        <NextLink
                          href={item.href}
                          onClick={() => {
                            nav(item.label);
                            setOpenMenu(null);
                          }}
                        >
                          {item.label}
                        </NextLink>
                      </Link>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            <Link
              asChild
              fontSize="sm"
              fontWeight="medium"
              color="nexzy.white"
              _hover={{ color: "nexzy.lightBlue" }}
              transition="color 0.2s"
            >
              <NextLink href="/rewind" onClick={() => nav("rewind")}>
                Rewind
              </NextLink>
            </Link>

            <Link
              asChild
              fontSize="sm"
              fontWeight="medium"
              color="nexzy.white"
              _hover={{ color: "nexzy.lightBlue" }}
              transition="color 0.2s"
            >
              <NextLink href="/videos" onClick={() => nav("videos")}>
                Videos
              </NextLink>
            </Link>

            {/* Guides dropdown — tap/click to toggle (works on touch, too) */}
            <Box position="relative">
              <HStack
                as="button"
                onClick={() =>
                  setOpenMenu(openMenu === "guides" ? null : "guides")
                }
                gap={1}
                fontSize="sm"
                fontWeight="medium"
                color={
                  openMenu === "guides" ? "nexzy.lightBlue" : "nexzy.white"
                }
                cursor="pointer"
                _hover={{ color: "nexzy.lightBlue" }}
                transition="color 0.2s"
                aria-haspopup="true"
                aria-expanded={openMenu === "guides"}
              >
                <Box as="span">Guides</Box>
                <Box
                  as="span"
                  fontSize="xs"
                  mt="1px"
                  transition="transform 0.15s"
                  transform={
                    openMenu === "guides" ? "rotate(180deg)" : undefined
                  }
                >
                  <HiChevronDown />
                </Box>
              </HStack>
              {openMenu === "guides" && (
                <Box
                  position="absolute"
                  top="100%"
                  left={0}
                  pt={3}
                  minW="210px"
                  zIndex={30}
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
                        <NextLink
                          href={item.href}
                          onClick={() => {
                            nav(item.label);
                            setOpenMenu(null);
                          }}
                        >
                          {item.label}
                        </NextLink>
                      </Link>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            <Link
              asChild
              fontSize="sm"
              fontWeight="medium"
              color="nexzy.white"
              _hover={{ color: "nexzy.lightBlue" }}
              transition="color 0.2s"
            >
              <NextLink href="/app" onClick={() => nav("app")}>
                The App
              </NextLink>
            </Link>
          </HStack>

          {/* Backdrop — tap outside closes an open desktop dropdown */}
          {openMenu ? (
            <Box
              position="fixed"
              inset="0"
              zIndex={20}
              display={{ base: "none", lg: "block" }}
              onClick={() => setOpenMenu(null)}
            />
          ) : null}

          {/* Desktop CTA */}
          <HStack gap={4} display={{ base: "none", lg: "flex" }}>
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
              <NextLink href="/app" onClick={() => nav("get_app")}>
                Get the app
              </NextLink>
            </Button>
          </HStack>

          {/* Mobile Menu Button */}
          <IconButton
            display={{ base: "flex", lg: "none" }}
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
          h="100dvh"
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
                <NextLink
                  href="/games"
                  onClick={() => {
                    nav("games");
                    close();
                  }}
                >
                  By Game
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
                News
              </Text>
              {NEWS.map((item) => (
                <Link
                  key={item.href}
                  asChild
                  fontSize="lg"
                  py={2}
                  pl={3}
                  color="nexzy.white"
                >
                  <NextLink
                    href={item.href}
                    onClick={() => {
                      nav(item.label);
                      close();
                    }}
                  >
                    {item.label}
                  </NextLink>
                </Link>
              ))}

              <Link asChild fontSize="lg" py={2} mt={3} color="nexzy.white">
                <NextLink
                  href="/rewind"
                  onClick={() => {
                    nav("rewind");
                    close();
                  }}
                >
                  Rewind
                </NextLink>
              </Link>

              <Link asChild fontSize="lg" py={2} color="nexzy.white">
                <NextLink
                  href="/videos"
                  onClick={() => {
                    nav("videos");
                    close();
                  }}
                >
                  Videos
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
                  <NextLink
                    href={item.href}
                    onClick={() => {
                      nav(item.label);
                      close();
                    }}
                  >
                    {item.label}
                  </NextLink>
                </Link>
              ))}

              <Link asChild fontSize="lg" py={2} mt={3} color="nexzy.white">
                <NextLink
                  href="/app"
                  onClick={() => {
                    nav("app");
                    close();
                  }}
                >
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
                <NextLink
                  href="/app"
                  onClick={() => {
                    nav("get_app");
                    close();
                  }}
                >
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
