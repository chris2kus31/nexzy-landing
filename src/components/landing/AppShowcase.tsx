// ============================================
// FILE: components/landing/AppShowcase.tsx
// Auto-rotating app screenshots showcase
// ============================================
"use client";

import {
  Box,
  Image,
  Stack,
  HStack,
  IconButton,
  Text,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";

const appScreenshots = [
  {
    src: "/NexzyHomeLogin.PNG",
    alt: "Nexzy Home",
    title: "Nexzy Home",
    description: "Get started in seconds",
  },
  {
    src: "/NexzyAI.PNG",
    alt: "Nexzy AI",
    title: "Nexzy AI",
    description: "Never get stuck in a game",
  },
  {
    src: "/NexzyGames.PNG",
    alt: "Nexzy Games Library",
    title: "Game Library",
    description: "All your games in one place",
  },
  {
    src: "/NexzyGameDetail.PNG",
    alt: "Nexzy Game Details",
    title: "Game Details & AI Help",
    description: "Get instant assistance",
  },
  {
    src: "/NexzyGameNews.PNG",
    alt: "Nexzy Gaming News",
    title: "Gaming News Feed",
    description: "Stay updated with latest news",
  },
  {
    src: "/NexzyForums.PNG",
    alt: "Nexzy Forums",
    title: "Community Forums",
    description: "Connect with other gamers",
  },
];

export default function AppShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-rotate every 4 seconds
  useEffect(() => {
    if (isAutoPlaying) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % appScreenshots.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isAutoPlaying]);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) =>
      prev === 0 ? appScreenshots.length - 1 : prev - 1,
    );
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % appScreenshots.length);
  };

  const handleDotClick = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  return (
    <Box position="relative" w="full" maxW="280px" mx="auto">
      {/* Phone Frame */}
      <Box
        position="relative"
        bg="nexzy.navy"
        borderRadius="30px"
        p={2}
        boxShadow="0 20px 40px rgba(0,0,0,0.3)"
        border="2px solid"
        borderColor="nexzy.blue/30"
      >
        {/* Screen */}
        <Box
          bg="black"
          borderRadius="24px"
          overflow="hidden"
          position="relative"
          aspectRatio="9/19.5"
        >
          {/* Status Bar */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            h="25px"
            bg="black"
            zIndex={2}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Box w="80px" h="18px" bg="black" borderRadius="full" />
          </Box>

          {/* Screenshot */}
          <Box position="relative" h="full" w="full">
            {appScreenshots.map((screenshot, index) => (
              <Box
                key={index}
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                opacity={index === currentIndex ? 1 : 0}
                transition="opacity 0.5s ease-in-out"
                pointerEvents={index === currentIndex ? "auto" : "none"}
              >
                <Image
                  src={screenshot.src}
                  alt={screenshot.alt}
                  w="full"
                  h="full"
                  objectFit="cover"
                  loading="lazy"
                />
              </Box>
            ))}
          </Box>

          {/* Home Indicator */}
          <Box
            position="absolute"
            bottom={1}
            left="50%"
            transform="translateX(-50%)"
            w="100px"
            h="3px"
            bg="white"
            borderRadius="full"
            opacity={0.5}
            zIndex={2}
          />
        </Box>
      </Box>

      {/* Controls */}
      <Stack gap={3} mt={4}>
        {/* Screen Info - Moved to top for better visibility */}
        <Stack gap={0} textAlign="center">
          <Text color="nexzy.white" fontWeight="bold" fontSize="md">
            {appScreenshots[currentIndex].title}
          </Text>
          <Text color="nexzy.gray.100" fontSize="sm">
            {appScreenshots[currentIndex].description}
          </Text>
        </Stack>

        {/* Navigation Buttons with Dots */}
        <HStack justify="center" align="center" gap={4}>
          <IconButton
            aria-label="Previous"
            size="sm"
            variant="ghost"
            color="nexzy.gray.100"
            bg="nexzy.blue/10"
            _hover={{ bg: "nexzy.blue/20", color: "nexzy.white" }}
            onClick={handlePrevious}
          >
            <HiChevronLeft />
          </IconButton>

          {/* Dot Indicators */}
          <HStack gap={1.5}>
            {appScreenshots.map((_, index) => (
              <Box
                key={index}
                as="button"
                w={index === currentIndex ? "20px" : "6px"}
                h="6px"
                bg={index === currentIndex ? "nexzy.yellow" : "nexzy.gray.400"}
                borderRadius="full"
                transition="all 0.3s"
                onClick={() => handleDotClick(index)}
                _hover={{
                  bg: index === currentIndex ? "nexzy.gold" : "nexzy.gray.300",
                }}
              />
            ))}
          </HStack>

          <IconButton
            aria-label="Next"
            size="sm"
            variant="ghost"
            color="nexzy.gray.100"
            bg="nexzy.blue/10"
            _hover={{ bg: "nexzy.blue/20", color: "nexzy.white" }}
            onClick={handleNext}
          >
            <HiChevronRight />
          </IconButton>
        </HStack>

        {/* Auto-play indicator - smaller and subtler */}
        {isAutoPlaying && (
          <Text
            fontSize="xs"
            color="nexzy.gray.200"
            textAlign="center"
            opacity={0.7}
          >
            Auto-playing • Click arrows to control
          </Text>
        )}
      </Stack>
    </Box>
  );
}
