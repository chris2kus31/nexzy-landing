import TrackedLink from "@/components/TrackedLink";
import NextImage from "next/image";
import { Box, Heading, Text, HStack, Badge, Icon } from "@chakra-ui/react";
import { FaPlay, FaTiktok, FaInstagram, FaYoutube } from "react-icons/fa6";
import type { PublicVideo } from "@/lib/blog/api";

/**
 * A vertical (9:16) video tile — the Shorts-first card used across the /videos
 * hub, the home rail, and "more videos" shelves. Fills its parent's width; the
 * parent controls sizing (grid column vs fixed-width shelf item). One tile =
 * one real short; the platform glyphs flag where else it lives.
 */
export default function VideoTile({
  video,
  from = "listing",
}: {
  video: PublicVideo;
  from?: string;
}) {
  const playable = !!video.youtubeId;
  const links = video.platformLinks ?? {};
  return (
    <TrackedLink
      href={`/videos/${video.slug}`}
      event="content_click"
      params={{ content_type: "video", slug: video.slug, from }}
      style={{ display: "block", height: "100%" }}
    >
      <Box className="group" h="full" display="flex" flexDirection="column">
        <Box
          position="relative"
          w="full"
          aspectRatio={9 / 16}
          borderRadius="xl"
          overflow="hidden"
          bg="black"
          border="1px solid"
          borderColor="whiteAlpha.200"
          transition="all 0.2s"
          _groupHover={{
            borderColor: "nexzy.blue/60",
            transform: "translateY(-4px)",
          }}
        >
          {video.thumbnailUrl ? (
            <Box
              position="absolute"
              inset={0}
              transition="transform 0.3s"
              _groupHover={{ transform: "scale(1.05)" }}
            >
              <NextImage
                src={video.thumbnailUrl}
                alt={video.title}
                fill
                sizes="(max-width: 640px) 45vw, 200px"
                style={{ objectFit: "cover" }}
              />
            </Box>
          ) : (
            <Box position="absolute" inset={0} bg="nexzy.blue/10" />
          )}

          {/* Gradient for legible overlays (v3 plain-CSS form) */}
          <Box
            position="absolute"
            inset={0}
            bg="linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.6) 100%)"
          />

          {/* Top badges */}
          <HStack position="absolute" top={2} left={2} right={2} gap={1}>
            {video.featured && (
              <Badge colorPalette="yellow" variant="solid" size="sm">
                ★
              </Badge>
            )}
            <Badge
              colorPalette={video.isShort ? "pink" : "gray"}
              variant="solid"
              size="sm"
            >
              {video.isShort ? "Short" : "Video"}
            </Badge>
            {video.source === "nexzy" && (
              <Badge colorPalette="blue" variant="solid" size="sm" ml="auto">
                Nexzy
              </Badge>
            )}
          </HStack>

          {/* Play affordance */}
          {playable && (
            <Box
              position="absolute"
              inset={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box
                w="46px"
                h="46px"
                borderRadius="full"
                bg="blackAlpha.700"
                display="flex"
                alignItems="center"
                justifyContent="center"
                transition="all 0.2s"
                _groupHover={{ bg: "nexzy.blue", transform: "scale(1.08)" }}
              >
                <Box color="white" pl="3px">
                  <FaPlay size={15} />
                </Box>
              </Box>
            </Box>
          )}

          {/* Platform presence glyphs */}
          <HStack
            position="absolute"
            bottom={2}
            left={2}
            gap={1.5}
            color="whiteAlpha.900"
          >
            {video.youtubeUrl && (
              <Icon fontSize="12px">
                <FaYoutube />
              </Icon>
            )}
            {links.tiktok && (
              <Icon fontSize="11px">
                <FaTiktok />
              </Icon>
            )}
            {links.reels && (
              <Icon fontSize="11px">
                <FaInstagram />
              </Icon>
            )}
          </HStack>
        </Box>

        <Box pt={2.5} px={0.5}>
          {video.game && (
            <Text
              color="nexzy.lightBlue"
              fontSize="10px"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="wide"
              lineClamp={1}
              mb={0.5}
            >
              {video.game.name}
            </Text>
          )}
          <Heading
            as="h3"
            size="sm"
            color="white"
            lineClamp={2}
            lineHeight="1.25"
          >
            {video.title}
          </Heading>
        </Box>
      </Box>
    </TrackedLink>
  );
}
