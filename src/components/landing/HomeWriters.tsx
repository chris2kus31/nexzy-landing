// ============================================
// FILE: components/landing/HomeWriters.tsx
// "Meet the newsroom" — the real people behind the coverage. An E-E-A-T / trust
// signal (a ranking + AI-citation lever) that makes the site read like a real
// publication. Server component (static AUTHORS roster).
// ============================================
import NextLink from "next/link";
import NextImage from "next/image";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  HStack,
  SimpleGrid,
} from "@chakra-ui/react";
import { AUTHORS } from "@/lib/blog/authors";

export default function HomeWriters() {
  const writers = Object.values(AUTHORS);
  return (
    <Box as="section" pt={{ base: 6, md: 8 }} pb={{ base: 12, md: 16 }} bg="nexzy.navy">
      <Container maxW="container.xl" px={{ base: 5, md: 6 }}>
        <Flex justify="space-between" align="flex-end" mb={6} gap={4} wrap="wrap">
          <Box>
            <HStack gap={2.5} mb={2}>
              <Box w="22px" h="2px" bg="nexzy.blue" borderRadius="full" />
              <Text
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="nexzy.blue"
              >
                Meet the newsroom
              </Text>
            </HStack>
            <Heading as="h2" size={{ base: "xl", md: "2xl" }} color="white">
              Real writers, real experience
            </Heading>
            <Text color="gray.400" fontSize="md" mt={2} maxW="2xl">
              Every story is researched, written, and human-reviewed by the Nexzy
              team — no faceless content mill.
            </Text>
          </Box>
        </Flex>

        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={{ base: 4, md: 6 }}>
          {writers.map((w) => (
            <NextLink
              key={w.slug}
              href={`/author/${w.slug}`}
              style={{ display: "block", height: "100%" }}
            >
              <Box
                className="group"
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="nexzy.blue/20"
                borderRadius="2xl"
                p={{ base: 4, md: 5 }}
                h="full"
                transition="all 0.2s"
                _hover={{
                  borderColor: "nexzy.blue/60",
                  transform: "translateY(-3px)",
                }}
              >
                <HStack gap={3} mb={3}>
                  <Box
                    position="relative"
                    w="56px"
                    h="56px"
                    borderRadius="full"
                    overflow="hidden"
                    flexShrink={0}
                    bg="nexzy.blue/20"
                  >
                    {w.avatar && (
                      <NextImage
                        src={w.avatar}
                        alt={w.name}
                        fill
                        sizes="56px"
                        style={{ objectFit: "cover" }}
                      />
                    )}
                  </Box>
                  <Box minW={0}>
                    <Text
                      color="white"
                      fontWeight="800"
                      fontSize="md"
                      _groupHover={{ color: "nexzy.lightBlue" }}
                    >
                      {w.name}
                    </Text>
                    <Text color="nexzy.gold" fontSize="xs" fontWeight="600">
                      {w.role}
                    </Text>
                  </Box>
                </HStack>
                <Text color="gray.400" fontSize="xs" lineClamp={3} lineHeight="1.6">
                  {w.bio}
                </Text>
              </Box>
            </NextLink>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
