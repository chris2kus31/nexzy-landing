// ============================================
// FILE: components/landing/Features.tsx
// Updated for Chakra v3
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
} from "@chakra-ui/react";
import { Card } from "@/components/ui/card";
import {
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineNewspaper,
  HiOutlineGift,
  HiOutlineDeviceMobile,
} from "react-icons/hi";

const features = [
  {
    icon: HiOutlineSparkles,
    title: 'Gaming Hub',
    description: 'Access curated games, get personalized recommendations, and track your gaming progress',
    color: "blue.500"
  },
  {
    icon: HiOutlineNewspaper,
    title: 'Gaming News Feed',
    description: 'Stay updated with the latest gaming news and industry updates from trusted sources',
    color: 'yellow.500',
  },
  {
    icon: HiOutlineUserGroup,
    title: 'Community Forum',
    description: 'Connect with gamers, share strategies, and join topic-specific discussion threads',
    color: 'purple.500',
  },
  {
    icon: HiOutlineGift,
    title: 'Rewards System',
    description: 'Earn Nexzy Tokens through daily logins, activities, and gaming achievements',
    color: 'green.500',
  },
  {
    icon: HiOutlineShieldCheck,
    title: 'Secure Platform',
    description: 'JWT authentication, secure storage, and device-specific session management',
    color: 'red.500',
  },
  {
    icon: HiOutlineDeviceMobile,
    title: 'Cross-Platform',
    description: 'Available on iOS and Android with console integration for PlayStation and Xbox',
    color: 'cyan.500',
  },
]

export default function Features() {
  return (
    <Box as="section" py={{ base: 16, md: 24 }} id="features">
      <Container maxW="container.xl">
        <Stack gap={12}>
          {/* Header */}
          <Stack gap={4} textAlign="center" maxW="2xl" mx="auto">
            <Heading as="h2" size={{ base: 'xl', md: '2xl' }}>
              Why Nexzy is Different
            </Heading>
            <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.600">
              Everything gamers need in one powerful mobile app
            </Text>
          </Stack>

          {/* Features Grid */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={8}>
            {features.map((feature) => (
              <Card.Root key={feature.title}>
                <Card.Body>
                  <Stack gap={4}>
                    <Box
                      p={3}
                      borderRadius="lg"
                      bg={feature.color.replace("500", "50")}
                      w="fit-content"
                    >
                      <Icon boxSize={6} color={feature.color}>
                        <feature.icon />
                      </Icon>
                    </Box>
                    <Stack gap={2}>
                      <Heading as="h3" size="md">
                        {feature.title}
                      </Heading>
                      <Text color="gray.600" fontSize="sm">
                        {feature.description}
                      </Text>
                    </Stack>
                  </Stack>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}
