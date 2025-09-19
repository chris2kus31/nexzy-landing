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
  HiOutlineChat,
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineLightningBolt,
  HiOutlineGlobe,
  HiOutlineVideoCamera,
} from "react-icons/hi";

const features = [
  {
    icon: HiOutlineChat,
    title: "Instant Messaging",
    description:
      "Send messages instantly with read receipts and typing indicators",
    color: "blue.500",
  },
  {
    icon: HiOutlineUserGroup,
    title: "Group Rooms",
    description: "Create separate rooms for different topics and conversations",
    color: "green.500",
  },
  {
    icon: HiOutlineShieldCheck,
    title: "Secure & Private",
    description: "End-to-end encryption keeps your conversations private",
    color: "purple.500",
  },
  {
    icon: HiOutlineLightningBolt,
    title: "Lightning Fast",
    description: "Optimized for speed with minimal data usage",
    color: "yellow.500",
  },
  {
    icon: HiOutlineGlobe,
    title: "Global Reach",
    description: "Connect with anyone, anywhere in the world",
    color: "cyan.500",
  },
  {
    icon: HiOutlineVideoCamera,
    title: "Video Calls",
    description:
      "Crystal clear video and voice calls with multiple participants",
    color: "red.500",
  },
];

export default function Features() {
  return (
    <Box as="section" py={{ base: 16, md: 24 }} id="features">
      <Container maxW="container.xl">
        <Stack gap={12}>
          {/* Header */}
          <Stack gap={4} textAlign="center" maxW="2xl" mx="auto">
            <Heading as="h2" size={{ base: "xl", md: "2xl" }}>
              Why Choose Nexzy?
            </Heading>
            <Text fontSize={{ base: "md", md: "lg" }} color="gray.600">
              Everything you need for seamless communication, all in one place
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
