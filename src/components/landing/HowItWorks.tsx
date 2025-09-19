// ============================================
// FILE: components/landing/HowItWorks.tsx
// Enhanced How It Works with better user journey
// ============================================
"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  Flex,
  Circle,
  Badge,
  VStack,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { FaDownload, FaRobot, FaCoins } from "react-icons/fa";
import { IoGameController, IoSparkles } from "react-icons/io5";
import { HiLightningBolt } from "react-icons/hi";

const steps = [
  {
    number: "1",
    title: "Download & Setup",
    description: "Get the free app and connect your gaming accounts in seconds",
    icon: FaDownload,
    color: "nexzy.blue",
    details: [
      "Free download from App/Play Store",
      "Quick account creation",
      "Link Steam, Xbox, PlayStation",
    ],
  },
  {
    number: "2",
    title: "Get Instant AI Help",
    description:
      "Ask anything about any game and get immediate expert guidance",
    icon: FaRobot,
    color: "nexzy.yellow",
    details: [
      "Type or voice chat with AI",
      "Get walkthroughs & strategies",
      "Find secrets & achievements",
    ],
  },
  {
    number: "3",
    title: "Play & Earn Daily",
    description:
      "Complete challenges, track games, and earn coins automatically",
    icon: FaCoins,
    color: "nexzy.gold",
    details: [
      "Daily login rewards",
      "Gaming milestone bonuses",
      "Redeem coins for rewards",
    ],
  },
];

export default function HowItWorks() {
  return (
    <Box as="section" py={{ base: 16, md: 24 }} bg="white" id="how-it-works">
      <Container maxW="container.xl">
        <Stack gap={16}>
          {/* Header */}
          <Stack gap={4} textAlign="center" maxW="3xl" mx="auto">
            <Badge
              bg="nexzy.yellow/10"
              color="nexzy.gold"
              px={3}
              py={1}
              borderRadius="full"
              w="fit-content"
              mx="auto"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <HiLightningBolt />
              QUICK START
            </Badge>
            <Heading
              as="h2"
              size={{ base: "xl", md: "2xl" }}
              color="nexzy.navy"
            >
              Start Gaming Smarter in 3 Simple Steps
            </Heading>
            <Text fontSize={{ base: "md", md: "lg" }} color="gray.600">
              From download to earning rewards in under 2 minutes
            </Text>
          </Stack>

          {/* Steps - Desktop */}
          <Box display={{ base: "none", md: "block" }}>
            <Flex
              direction="row"
              gap={0}
              w="full"
              position="relative"
              justify="space-between"
              align="flex-start"
            >
              {/* Connecting line */}
              <Box
                position="absolute"
                top="60px"
                left="25%"
                right="25%"
                h="3px"
                bg="linear-gradient(90deg, nexzy.blue 0%, nexzy.yellow 50%, nexzy.gold 100%)"
                zIndex={0}
              />

              {steps.map((step, index) => (
                <VStack
                  key={index}
                  align="center"
                  gap={6}
                  flex={1}
                  zIndex={1}
                  position="relative"
                >
                  {/* Circle with icon */}
                  <Box position="relative">
                    <Circle
                      size="120px"
                      bg="white"
                      border="4px solid"
                      borderColor={step.color}
                      boxShadow="xl"
                      position="relative"
                      overflow="hidden"
                    >
                      <VStack gap={2}>
                        <Icon boxSize={8} color={step.color}>
                          <step.icon />
                        </Icon>
                        <Text
                          fontSize="2xl"
                          fontWeight="bold"
                          color={step.color}
                        >
                          {step.number}
                        </Text>
                      </VStack>
                    </Circle>
                    {index < steps.length - 1 && (
                      <Icon
                        position="absolute"
                        right="-40px"
                        top="50%"
                        transform="translateY(-50%)"
                        boxSize={6}
                        color="gray.400"
                      >
                        <IoSparkles />
                      </Icon>
                    )}
                  </Box>

                  {/* Content */}
                  <Stack gap={3} textAlign="center" maxW="280px">
                    <Heading as="h3" size="md" color="nexzy.navy">
                      {step.title}
                    </Heading>
                    <Text color="gray.600" fontSize="sm">
                      {step.description}
                    </Text>
                    <VStack gap={1} pt={2}>
                      {step.details.map((detail, idx) => (
                        <HStack key={idx} gap={2}>
                          <Box
                            w="4px"
                            h="4px"
                            bg={step.color}
                            borderRadius="full"
                          />
                          <Text fontSize="xs" color="gray.500">
                            {detail}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Stack>
                </VStack>
              ))}
            </Flex>
          </Box>

          {/* Steps - Mobile */}
          <Stack gap={8} display={{ base: "flex", md: "none" }}>
            {steps.map((step, index) => (
              <Stack key={index} gap={4}>
                <HStack gap={4}>
                  <Circle
                    size="80px"
                    bg="white"
                    border="3px solid"
                    borderColor={step.color}
                    boxShadow="lg"
                  >
                    <VStack gap={1}>
                      <Icon boxSize={6} color={step.color}>
                        <step.icon />
                      </Icon>
                      <Text fontSize="lg" fontWeight="bold" color={step.color}>
                        {step.number}
                      </Text>
                    </VStack>
                  </Circle>
                  <Stack flex={1} gap={1}>
                    <Heading as="h3" size="md" color="nexzy.navy">
                      {step.title}
                    </Heading>
                    <Text color="gray.600" fontSize="sm">
                      {step.description}
                    </Text>
                  </Stack>
                </HStack>
                <Stack gap={1} pl="96px">
                  {step.details.map((detail, idx) => (
                    <HStack key={idx} gap={2}>
                      <Box
                        w="4px"
                        h="4px"
                        bg={step.color}
                        borderRadius="full"
                      />
                      <Text fontSize="xs" color="gray.500">
                        {detail}
                      </Text>
                    </HStack>
                  ))}
                </Stack>
              </Stack>
            ))}
          </Stack>

          {/* Bottom incentive */}
          <Box
            bg="nexzy.yellow/10"
            borderRadius="2xl"
            p={8}
            border="2px solid"
            borderColor="nexzy.yellow/30"
          >
            <Stack textAlign="center" gap={4}>
              <HStack justify="center" gap={2}>
                <Icon boxSize={6} color="nexzy.gold">
                  <IoGameController />
                </Icon>
                <Heading size="md" color="nexzy.navy">
                  Ready to Transform Your Gaming Experience?
                </Heading>
              </HStack>
              <Text color="gray.700">
                Join thousands of gamers who never get stuck and earn rewards
                while playing
              </Text>
              <HStack justify="center" gap={6} pt={2}>
                <HStack>
                  <Icon color="nexzy.yellow" boxSize={5}>
                    <FaRobot />
                  </Icon>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    Instant AI Help
                  </Text>
                </HStack>
                <HStack>
                  <Icon color="nexzy.yellow" boxSize={5}>
                    <FaCoins />
                  </Icon>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    Daily Rewards
                  </Text>
                </HStack>
                <HStack>
                  <Icon color="nexzy.yellow" boxSize={5}>
                    <IoSparkles />
                  </Icon>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    Free Forever
                  </Text>
                </HStack>
              </HStack>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
