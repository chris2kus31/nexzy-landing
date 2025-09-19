// ============================================
// FILE: components/landing/Features.tsx
// Enhanced Features with better marketing focus
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
import {
  HiOutlineSparkles,
  HiOutlineLightningBolt,
  HiOutlineCurrencyDollar,
  HiOutlineBookOpen,
  HiOutlineChartBar,
  HiOutlineBell,
} from "react-icons/hi";
import { FaRobot, FaGamepad, FaCoins } from "react-icons/fa";
import { IoLibrary, IoPricetag, IoTrophy } from "react-icons/io5";
import { BsStars } from "react-icons/bs";

const features = [
  {
    icon: FaRobot,
    title: "AI Gaming Assistant",
    description:
      "Get instant help for any game. Stuck on a boss? Can't find that collectible? Our AI knows every game inside out and gives you personalized strategies.",
    color: "nexzy.yellow",
    badge: "Most Popular",
    highlight: true,
  },
  {
    icon: FaCoins,
    title: "Daily Reward Coins",
    description:
      "Earn coins just for opening the app daily, completing gaming challenges, and participating in the community. Redeem for real rewards!",
    color: "nexzy.gold",
    badge: null,
    highlight: false,
  },
  {
    icon: IoLibrary,
    title: "Smart Game Library",
    description:
      "Automatically sync and organize games from all your platforms (Steam, PlayStation, Xbox) in one place. Never forget what you own.",
    color: "nexzy.blue",
    badge: null,
    highlight: false,
  },
  {
    icon: IoPricetag,
    title: "Wishlist Price Tracker",
    description:
      "Add games to your wishlist and get instant notifications when they go on sale. Never miss a deal on games you want.",
    color: "nexzy.lightBlue",
    badge: "Save Money",
    highlight: false,
  },
  {
    icon: HiOutlineChartBar,
    title: "Gaming Stats & Progress",
    description:
      "Track your gaming achievements, completion rates, and time played across all platforms. See your gaming journey visualized.",
    color: "purple.500",
    badge: null,
    highlight: false,
  },
  {
    icon: BsStars,
    title: "Personalized Recommendations",
    description:
      "Our AI learns your gaming taste and suggests new games you'll love. Discover hidden gems tailored just for you.",
    color: "green.500",
    badge: "AI Powered",
    highlight: false,
  },
];

export default function Features() {
  return (
    <Box as="section" py={{ base: 16, md: 24 }} id="features" bg="gray.50">
      <Container maxW="container.xl">
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
              POWERFUL FEATURES
            </Badge>
            <Heading as="h2" size={{ base: "xl", md: "2xl" }}>
              Everything You Need to Level Up Your Gaming
            </Heading>
            <Text fontSize={{ base: "md", md: "lg" }} color="gray.600">
              From AI assistance to reward coins, we've built the ultimate
              gaming companion app
            </Text>
          </Stack>

          {/* Features Grid */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {features.map((feature) => (
              <Card.Root
                key={feature.title}
                bg="white"
                borderWidth={feature.highlight ? "2px" : "1px"}
                borderColor={feature.highlight ? "nexzy.yellow" : "gray.200"}
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
                      <Heading as="h3" size="md" color="nexzy.navy">
                        {feature.title}
                      </Heading>
                      <Text color="gray.600" fontSize="sm" lineHeight="tall">
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
            <Text fontSize="lg" color="gray.700" fontWeight="medium">
              All features included in the{" "}
              <Text as="span" color="nexzy.yellow" fontWeight="bold">
                FREE
              </Text>{" "}
              download
            </Text>
            <Text fontSize="sm" color="gray.500">
              Optional coin purchases available for power users
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
