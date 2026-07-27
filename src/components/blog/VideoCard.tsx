import TrackedLink from "@/components/TrackedLink";
import NextImage from "next/image";
import { Box, Heading, Text, HStack, Badge } from "@chakra-ui/react";
import { FaPlay } from "react-icons/fa";
import type { PublicVideo } from "@/lib/blog/api";

function fmt(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * A single video in a rail/grid. One card per real short (its YouTube video is
 * primary); the "Short" vs "Video" pill flags the format, and a "Nexzy" pill
 * marks Nexzy-produced content (which always ranks first). Fires the shared
 * `content_click` GA event with content_type "video".
 */
export default function VideoCard({ video }: { video: PublicVideo }) {
  const playable = !!video.youtubeId;
  return (
    <TrackedLink
      href={`/videos/${video.slug}`}
      event="content_click"
      params={{ content_type: "video", slug: video.slug, from: "listing" }}
      style={{ display: "block", height: "100%" }}
    >
      <Box
        className="group"
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="nexzy.blue/20"
        borderRadius="xl"
        overflow="hidden"
        transition="all 0.2s"
        _hover={{
          borderColor: "nexzy.blue/60",
          transform: "translateY(-4px)",
          shadow: "lg",
        }}
        h="full"
        display="flex"
        flexDirection="column"
      >
        <Box
          position="relative"
          overflow="hidden"
          w="full"
          aspectRatio={16 / 9}
        >
          {video.thumbnailUrl ? (
            <Box
              position="absolute"
              inset={0}
              transition="transform 0.3s"
              _groupHover={{ transform: "scale(1.04)" }}
            >
              <NextImage
                src={video.thumbnailUrl}
                alt={video.title}
                fill
                sizes="(max-width: 640px) 100vw, 400px"
                style={{ objectFit: "cover" }}
              />
            </Box>
          ) : (
            <Box position="absolute" inset={0} bg="black" />
          )}

          {/* Format pill */}
          <Badge
            position="absolute"
            top={3}
            left={3}
            colorPalette={video.isShort ? "pink" : "gray"}
            variant="solid"
            size="sm"
          >
            {video.isShort ? "Short" : "Video"}
          </Badge>

          {/* Nexzy-produced marker */}
          {video.source === "nexzy" && (
            <Badge
              position="absolute"
              top={3}
              right={3}
              colorPalette="blue"
              variant="solid"
              size="sm"
            >
              Nexzy
            </Badge>
          )}

          {/* Play affordance (only when it actually plays inline) */}
          {playable && (
            <Box
              position="absolute"
              inset={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box
                w="52px"
                h="52px"
                borderRadius="full"
                bg="blackAlpha.700"
                display="flex"
                alignItems="center"
                justifyContent="center"
                transition="all 0.2s"
                _groupHover={{ bg: "nexzy.blue", transform: "scale(1.08)" }}
              >
                <Box color="white" pl="3px">
                  <FaPlay size={18} />
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        <Box p={5} flex={1} display="flex" flexDirection="column">
          {video.game && (
            <Text
              color="nexzy.lightBlue"
              fontSize="xs"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="wide"
              lineClamp={1}
              mb={1.5}
            >
              {video.game.name}
            </Text>
          )}
          <Heading as="h3" size="md" color="white" lineClamp={2} mb={2}>
            {video.title}
          </Heading>
          {video.caption && (
            <Text color="gray.300" fontSize="sm" lineClamp={2} mb={3}>
              {video.caption}
            </Text>
          )}
          <HStack gap={2} mt="auto" color="gray.500" fontSize="xs">
            <Text>{fmt(video.publishedAt)}</Text>
          </HStack>
        </Box>
      </Box>
    </TrackedLink>
  );
}
