import NextLink from "next/link";
import NextImage from "next/image";
import { Box, Heading, Text, HStack, Badge } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";
import { beatLabel, beatPalette } from "@/lib/blog/beats";

export default function FeaturedCard({ post }: { post: PublicPost }) {
  return (
    <NextLink href={`/blog/${post.slug}`} style={{ display: "block" }}>
      <Box
        position="relative"
        borderRadius="2xl"
        overflow="hidden"
        border="1px solid"
        borderColor="nexzy.blue/20"
        minH={{ base: "320px", md: "440px" }}
        transition="all 0.2s"
        _hover={{ borderColor: "nexzy.blue/60", transform: "translateY(-3px)" }}
      >
        {post.heroImageUrl && (
          <Box position="absolute" inset={0} className="nexzy-img-skeleton" />
        )}
        {post.heroImageUrl ? (
          <NextImage
            src={post.heroImageUrl}
            alt={post.imageAlt || post.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 800px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <Box position="absolute" inset={0} bg="nexzy.blue/15" />
        )}
        {/* Gradient scrim for legible text */}
        <Box
          position="absolute"
          inset={0}
          bgGradient="to-t"
          gradientFrom="nexzy.navy"
          gradientVia="nexzy.navy/40"
          gradientTo="transparent"
        />
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          p={{ base: 5, md: 8 }}
        >
          <HStack gap={2} mb={3}>
            <Badge colorPalette={beatPalette(post.beat)} variant="solid">
              {beatLabel(post.beat)}
            </Badge>
            <Badge colorPalette="yellow" variant="surface">
              Featured
            </Badge>
          </HStack>
          <Heading
            as="h2"
            size={{ base: "xl", md: "3xl" }}
            color="white"
            lineClamp={3}
            mb={2}
            maxW="3xl"
          >
            {post.title}
          </Heading>
          {post.excerpt && (
            <Text
              color="gray.200"
              fontSize={{ base: "sm", md: "md" }}
              lineClamp={2}
              maxW="2xl"
            >
              {post.excerpt}
            </Text>
          )}
        </Box>
      </Box>
    </NextLink>
  );
}
