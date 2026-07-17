// ============================================
// FILE: components/landing/TopicBar.tsx
// Section bar under the masthead — browse the newsroom by beat. A real-newsroom
// nav affordance + extra internal links (SEO). Server component (static beats).
// ============================================
import NextLink from "next/link";
import { Box, Container, HStack, Text, Link } from "@chakra-ui/react";
import { BEATS } from "@/lib/blog/beats";

export default function TopicBar() {
  return (
    <Box
      as="section"
      bg="nexzy.navy"
      borderTop="1px solid"
      borderBottom="1px solid"
      borderColor="nexzy.blue/15"
    >
      <Container maxW="container.xl" px={{ base: 5, md: 6 }}>
        <HStack gap={{ base: 4, md: 6 }} py={4} overflowX="auto">
          <Text
            fontSize="xs"
            fontWeight="800"
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="gray.500"
            flexShrink={0}
          >
            Browse
          </Text>
          {BEATS.map((b) => (
            <Link
              key={b.key}
              asChild
              flexShrink={0}
              fontSize="sm"
              fontWeight="600"
              color="gray.300"
              whiteSpace="nowrap"
              _hover={{ color: "nexzy.lightBlue", textDecoration: "none" }}
            >
              <NextLink href={`/blog?beat=${b.key}`}>{b.label}</NextLink>
            </Link>
          ))}
          <Link
            asChild
            flexShrink={0}
            fontSize="sm"
            fontWeight="600"
            color="nexzy.gold"
            whiteSpace="nowrap"
            _hover={{ color: "nexzy.yellow", textDecoration: "none" }}
          >
            <NextLink href="/games">By Game</NextLink>
          </Link>
        </HStack>
      </Container>
    </Box>
  );
}
