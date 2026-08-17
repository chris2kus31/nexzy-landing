// ============================================
// FILE: components/landing/Features.tsx
// Enhanced Features with better marketing focus.
// NOTE: must stay a client component — it renders the compound `Card.Root` /
// `Card.Body` from the "use client" ui/card barrel. Dot-notation compound
// components from a client module resolve to `undefined` inside a server
// component (the import becomes an opaque client reference), which crashes
// prerender with "Element type is invalid". Keep "use client" here.
// ============================================
"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Stack,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { Card } from "@/components/ui/card";
import { FaRobot } from "react-icons/fa";
import {
  IoLibrary,
  IoPricetag,
  IoSparkles,
  IoNewspaper,
} from "react-icons/io5";
import { BsStars } from "react-icons/bs";

const features = [
  {
    icon: FaRobot,
    title: "Ask Nexzy",
    description:
      "An AI that actually knows your games. It learns the games in your library and gives help tuned to what you play — not generic wiki answers.",
    color: "nexzy.yellow",
    badge: "Knows your games",
    highlight: true,
  },
  {
    icon: IoSparkles,
    title: "Your For You home",
    description:
      "A home screen that adapts to you: For You picks, your mood, and what's trending — all built around the games you actually love.",
    color: "nexzy.gold",
    badge: null,
    highlight: false,
  },
  {
    icon: IoLibrary,
    title: "Your game library",
    description:
      "Bring your library together — connect Steam and add the games you play across PlayStation and Xbox, all in one place.",
    color: "nexzy.blue",
    badge: null,
    highlight: false,
  },
  {
    icon: IoPricetag,
    title: "Wishlist deal tracker",
    description:
      "Add games to your wishlist and get notified when they drop in price — with real links straight to the deal. Never miss a sale.",
    color: "nexzy.lightBlue",
    badge: "Save money",
    highlight: false,
  },
  {
    icon: IoNewspaper,
    title: "News, deals & Rewind",
    description:
      "Your gaming world in one feed: the latest news, real deal links, and a daily Rewind through gaming history.",
    color: "purple.500",
    badge: null,
    highlight: false,
  },
  {
    icon: BsStars,
    title: "Picks made for you",
    description:
      "Nexzy learns your taste and suggests games you'll love. Discover hidden gems tuned just for you.",
    color: "green.500",
    badge: "Personalized",
    highlight: false,
  },
];

export default function Features() {
  return (
    <Box as="section" py={{ base: 16, md: 24 }} id="features" bg="nexzy.navy">
      <Container maxW="container.xl" px={{ base: 5, md: 6 }}>
        <Stack gap={12}>
          {/* Header */}
          <Stack gap={4} textAlign="center" maxW="3xl" mx="auto">
            <Badge
              bg="nexzy.blue/10"
              color="nexzy.blue"
              px={3}
              py={1}
              borderRadius="full"
              w="fit-content"
              mx="auto"
            >
              MAKE IT YOURS
            </Badge>
            <Heading as="h2" size={{ base: "xl", md: "2xl" }} color="white">
              The app makes the newsroom yours
            </Heading>
            <Text fontSize={{ base: "md", md: "lg" }} color="gray.300">
              Nexzy the app follows the games you actually play — your library,
              your deals, and instant AI help, all tuned to you
            </Text>
          </Stack>

          {/* Features Grid */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {features.map((feature) => (
              <Card.Root
                key={feature.title}
                bg="whiteAlpha.50"
                borderWidth={feature.highlight ? "2px" : "1px"}
                borderColor={
                  feature.highlight ? "nexzy.yellow" : "whiteAlpha.200"
                }
                _hover={{
                  transform: "translateY(-4px)",
                  boxShadow: "xl",
                  borderColor: feature.highlight ? "nexzy.gold" : "nexzy.blue",
                }}
                transition="all 0.3s"
                position="relative"
                overflow="hidden"
              >
                {feature.badge && (
                  <Badge
                    position="absolute"
                    top={3}
                    right={3}
                    bg={feature.highlight ? "nexzy.yellow" : "nexzy.blue/10"}
                    color={feature.highlight ? "nexzy.navy" : "nexzy.blue"}
                    px={2}
                    py={1}
                    borderRadius="full"
                    fontSize="2xs"
                    fontWeight="bold"
                    textTransform="uppercase"
                  >
                    {feature.badge}
                  </Badge>
                )}

                {feature.highlight && (
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    h="3px"
                    bg="linear-gradient(90deg, nexzy.yellow 0%, nexzy.gold 100%)"
                  />
                )}

                <Card.Body>
                  <Stack gap={4}>
                    <Box
                      p={3}
                      borderRadius="xl"
                      bg={`${feature.color}/10`}
                      w="fit-content"
                      position="relative"
                    >
                      <Icon boxSize={7} color={feature.color}>
                        <feature.icon />
                      </Icon>
                      {feature.highlight && (
                        <Box
                          position="absolute"
                          top="-2px"
                          right="-2px"
                          w="12px"
                          h="12px"
                          bg="nexzy.yellow"
                          borderRadius="full"
                          animation="pulse 2s infinite"
                        />
                      )}
                    </Box>
                    <Stack gap={2}>
                      <Heading as="h3" size="md" color="white">
                        {feature.title}
                      </Heading>
                      <Text color="gray.300" fontSize="sm" lineHeight="tall">
                        {feature.description}
                      </Text>
                    </Stack>
                  </Stack>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>

          {/* Bottom CTA */}
          <Stack gap={4} textAlign="center" pt={8}>
            <Text fontSize="lg" color="gray.200" fontWeight="medium">
              All features included in the{" "}
              <Text as="span" color="nexzy.yellow" fontWeight="bold">
                FREE
              </Text>{" "}
              download
            </Text>
            <Text fontSize="sm" color="gray.400">
              Free to download — optional extras unlock more AI help if you want
              it
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
