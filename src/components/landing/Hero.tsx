// ============================================
// FILE: components/landing/Hero.tsx
// Newsroom hero — the home page opens like a publication, not an app store.
// Left: the lead story (big cover). Right: the latest headlines. No phone
// mockup, no store buttons — the newsroom IS the hero. The app nudge lives in
// the "make it yours" band lower down (and in the nav). Server component.
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
  Badge,
  Stack,
} from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";
import { beatLabel, beatPalette } from "@/lib/blog/beats";
import FeaturedCard from "@/components/blog/FeaturedCard";
import { StoreAnchor } from "@/components/StoreLink";
import { APP_STORE_URL, googlePlayUrl } from "@/lib/storeUrls";

function fmtDate(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** A compact headline row for the "latest headlines" column beside the lead. */
function HeadlineRow({ post }: { post: PublicPost }) {
  return (
    <NextLink href={`/blog/${post.slug}`} style={{ display: "block" }}>
      <HStack
        className="group"
        gap={4}
        align="flex-start"
        py={3.5}
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
      >
        <Box
          position="relative"
          flexShrink={0}
          w="104px"
          h="72px"
          borderRadius="lg"
          overflow="hidden"
          bg="nexzy.blue/10"
        >
          {post.heroImageUrl && (
            <NextImage
              src={post.heroImageUrl}
              alt={post.imageAlt || post.title}
              fill
              sizes="104px"
              style={{ objectFit: "cover" }}
            />
          )}
        </Box>
        <Box minW={0} flex={1}>
          <HStack gap={2} mb={1}>
            <Badge
              colorPalette={beatPalette(post.beat)}
              variant="subtle"
              size="sm"
            >
              {beatLabel(post.beat)}
            </Badge>
            <Text color="gray.500" fontSize="xs">
              {fmtDate(post.publishedAt)}
            </Text>
          </HStack>
          <Text
            color="nexzy.white"
            fontWeight="700"
            fontSize="sm"
            lineHeight="1.35"
            lineClamp={2}
            _groupHover={{ color: "nexzy.lightBlue" }}
            transition="color 0.2s"
          >
            {post.title}
          </Text>
        </Box>
      </HStack>
    </NextLink>
  );
}

export default function Hero({
  lead,
  headlines = [],
}: {
  lead: PublicPost | null;
  headlines?: PublicPost[];
}) {
  // Adaptive: with no lead story there's no newsroom to show — render nothing.
  if (!lead) return null;

  return (
    <Box
      as="section"
      pt={{ base: 24, md: 28 }}
      pb={{ base: 8, md: 10 }}
      bg="nexzy.navy"
      position="relative"
      overflow="hidden"
    >
      {/* soft background glow */}
      <Box
        position="absolute"
        top="-20%"
        right="-10%"
        width="45%"
        height="120%"
        borderRadius="full"
        bg="nexzy.blue"
        opacity={0.08}
        filter="blur(80px)"
      />

      <Container
        maxW="container.xl"
        position="relative"
        px={{ base: 5, md: 6 }}
      >
        {/* Masthead */}
        <Flex
          justify="space-between"
          align="flex-end"
          mb={{ base: 6, md: 8 }}
          gap={4}
          wrap="wrap"
        >
          <Box>
            <HStack gap={2.5} mb={2}>
              <Box w="22px" h="2px" bg="nexzy.gold" borderRadius="full" />
              <Text
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="nexzy.gold"
              >
                The independent gaming newsroom
              </Text>
            </HStack>
            <Heading
              as="h1"
              fontFamily="title"
              size={{ base: "2xl", md: "3xl" }}
              color="white"
              lineHeight="1.1"
              maxW="3xl"
            >
              News, guides &amp; walkthroughs for the games you play
            </Heading>

            {/* App CTA — above the fold so app-seeking (social) traffic sees
                the app immediately instead of scrolling past the newsroom. */}
            <Stack gap={3} mt={{ base: 4, md: 5 }} maxW="xl">
              <Box>
                <Text
                  color="white"
                  fontWeight="700"
                  fontSize={{ base: "md", md: "lg" }}
                >
                  Get the app — make it yours.
                </Text>
                <Text
                  color="gray.300"
                  fontSize={{ base: "sm", md: "md" }}
                  lineHeight="1.5"
                  mt={1}
                >
                  Your gaming home: track the games you play, get news &amp;
                  deals tuned to you, and an AI that actually knows your
                  library.
                </Text>
              </Box>
              <HStack gap={3} flexWrap="wrap">
                <StoreAnchor store="ios" location="hero" href={APP_STORE_URL}>
                  <Box
                    as="span"
                    display="inline-flex"
                    alignItems="center"
                    px={5}
                    py={2.5}
                    borderRadius="full"
                    bg="nexzy.gold"
                    color="nexzy.navy"
                    fontWeight="800"
                    fontSize="sm"
                  >
                    Download on iOS
                  </Box>
                </StoreAnchor>
                <StoreAnchor
                  store="android"
                  location="hero"
                  href={googlePlayUrl("hero")}
                >
                  <Box
                    as="span"
                    display="inline-flex"
                    alignItems="center"
                    px={5}
                    py={2.5}
                    borderRadius="full"
                    borderWidth="1px"
                    borderColor="whiteAlpha.400"
                    color="white"
                    fontWeight="800"
                    fontSize="sm"
                  >
                    Get it on Android
                  </Box>
                </StoreAnchor>
              </HStack>
            </Stack>
          </Box>
          <NextLink href="/blog">
            <Text
              color="nexzy.lightBlue"
              fontWeight="700"
              fontSize="sm"
              whiteSpace="nowrap"
              py={2}
              display="inline-block"
            >
              All news →
            </Text>
          </NextLink>
        </Flex>

        {/* Lead story + latest headlines */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", lg: "1.6fr 1fr" }}
          gap={{ base: 6, lg: 8 }}
        >
          <FeaturedCard post={lead} />

          <Stack gap={0}>
            <Text
              fontSize="xs"
              fontWeight="800"
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="nexzy.blue"
              mb={1}
            >
              Latest headlines
            </Text>
            {headlines.map((p) => (
              <HeadlineRow key={p.slug} post={p} />
            ))}
            <NextLink href="/blog" style={{ display: "block" }}>
              <Text
                color="nexzy.lightBlue"
                fontWeight="700"
                fontSize="sm"
                mt={4}
                py={2}
                display="inline-block"
              >
                More stories →
              </Text>
            </NextLink>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
