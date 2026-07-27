import NextLink from "next/link";
import TrackedLink from "@/components/TrackedLink";
import NextImage from "next/image";
import {
  Box,
  Flex,
  Heading,
  Text,
  HStack,
  Badge,
  Icon,
  Link,
} from "@chakra-ui/react";
import { FaPlay, FaTiktok, FaInstagram, FaYoutube } from "react-icons/fa6";
import { HiArrowRight } from "react-icons/hi";
import VideoPlayer from "@/components/blog/VideoPlayer";
import type { PublicVideo } from "@/lib/blog/api";

/**
 * The spotlight hero for a featured video. `play` inlines the YouTube player
 * (used on the /videos hub, the video destination); otherwise it renders a
 * large clickable poster that links to the detail page (used on the home page,
 * to stay light). Portrait framing for a Short, wide for a regular video.
 */
export default function FeaturedVideo({
  video,
  play = false,
  from = "featured",
}: {
  video: PublicVideo;
  play?: boolean;
  from?: string;
}) {
  const short = video.isShort;
  const links = video.platformLinks ?? {};
  const href = `/videos/${video.slug}`;

  const media =
    play && video.youtubeId ? (
      <VideoPlayer
        videoId={video.youtubeId}
        slug={video.slug}
        source={video.source}
        isShort={short}
        gameSlug={video.game?.slug ?? null}
        from="featured"
      />
    ) : (
      <TrackedLink
        href={href}
        event="content_click"
        params={{ content_type: "video", slug: video.slug, from }}
        style={{ display: "block" }}
      >
        <Box
          className="group"
          position="relative"
          w="full"
          aspectRatio={short ? 9 / 16 : 16 / 9}
          borderRadius="2xl"
          overflow="hidden"
          bg="black"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          {video.thumbnailUrl && (
            <Box
              position="absolute"
              inset={0}
              transition="transform 0.3s"
              _groupHover={{ transform: "scale(1.03)" }}
            >
              <NextImage
                src={video.thumbnailUrl}
                alt={video.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 380px"
                style={{ objectFit: "cover" }}
              />
            </Box>
          )}
          <Box position="absolute" inset={0} bg="blackAlpha.300" />
          <Box
            position="absolute"
            inset={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Box
              w="64px"
              h="64px"
              borderRadius="full"
              bg="blackAlpha.700"
              display="flex"
              alignItems="center"
              justifyContent="center"
              transition="all 0.2s"
              _groupHover={{ bg: "nexzy.blue", transform: "scale(1.08)" }}
            >
              <Box color="white" pl="4px">
                <FaPlay size={22} />
              </Box>
            </Box>
          </Box>
        </Box>
      </TrackedLink>
    );

  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      gap={{ base: 5, md: 8 }}
      align={{ base: "stretch", md: "center" }}
    >
      <Box
        w={{ base: "full", md: short ? "300px" : "560px" }}
        maxW="full"
        flexShrink={0}
        mx={{ base: short ? "auto" : undefined, md: 0 }}
      >
        {media}
      </Box>

      <Box flex="1" minW="0">
        <HStack gap={2} mb={3}>
          <Badge colorPalette="yellow" variant="solid" size="sm">
            ★ Featured
          </Badge>
          <Badge
            colorPalette={short ? "pink" : "gray"}
            variant="subtle"
            size="sm"
          >
            {short ? "Short" : "Video"}
          </Badge>
          {video.source === "nexzy" && (
            <Badge colorPalette="blue" variant="subtle" size="sm">
              Nexzy
            </Badge>
          )}
        </HStack>

        {video.game && (
          <Text
            color="nexzy.lightBlue"
            fontSize="xs"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing="wide"
            mb={1.5}
          >
            {video.game.name}
          </Text>
        )}

        <Heading
          as="h3"
          fontFamily="title"
          size={{ base: "xl", md: "2xl" }}
          color="white"
          lineHeight="1.15"
          mb={video.caption ? 3 : 4}
        >
          <Link asChild _hover={{ textDecoration: "none", color: "gray.100" }}>
            <NextLink href={href}>{video.title}</NextLink>
          </Link>
        </Heading>

        {video.caption && (
          <Text
            color="gray.300"
            fontSize={{ base: "sm", md: "md" }}
            mb={4}
            lineClamp={3}
          >
            {video.caption}
          </Text>
        )}

        <HStack gap={4} flexWrap="wrap">
          <Link
            asChild
            color="nexzy.lightBlue"
            fontWeight="700"
            fontSize="sm"
            _hover={{ textDecoration: "none" }}
          >
            <NextLink href={href}>
              <HStack gap={1}>
                <Text>Watch</Text>
                <Icon>
                  <HiArrowRight />
                </Icon>
              </HStack>
            </NextLink>
          </Link>
          <HStack gap={2.5} color="whiteAlpha.700">
            {video.youtubeUrl && (
              <Icon>
                <FaYoutube />
              </Icon>
            )}
            {links.tiktok && (
              <Icon fontSize="14px">
                <FaTiktok />
              </Icon>
            )}
            {links.reels && (
              <Icon>
                <FaInstagram />
              </Icon>
            )}
          </HStack>
        </HStack>
      </Box>
    </Flex>
  );
}
