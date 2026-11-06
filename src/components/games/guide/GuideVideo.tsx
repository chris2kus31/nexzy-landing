"use client";

// Click-to-play video for guide content (entry video fields and video
// blocks): YouTube via youtube-nocookie, or Streamable. Nothing from the
// video host loads until the reader clicks play (no cookies, no weight).
// Links we can't embed fall back to a plain "Watch the video" link.
import { useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { FiPlay } from "react-icons/fi";
import { videoEmbed } from "@/lib/hub-engine/types";

const GOLD = "#FFD700";

export default function GuideVideo({
  url,
  start = null,
  caption = null,
  title = "Video",
}: {
  url: string;
  start?: number | null;
  caption?: string | null;
  title?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const embed = videoEmbed(url, start);
  if (!embed)
    return url.startsWith("https://") ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        style={{ color: GOLD, textDecoration: "underline" }}
      >
        Watch the video
      </a>
    ) : null;
  return (
    <Box>
      <Box
        position="relative"
        w="100%"
        aspectRatio="16 / 9"
        borderRadius="12px"
        overflow="hidden"
        bg="#05070f"
        border="1px solid rgba(255,255,255,0.12)"
      >
        {playing ? (
          <iframe
            src={embed.src}
            title={caption || title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        ) : (
          <Flex
            as="button"
            aria-label={`Play: ${caption || title}`}
            onClick={() => setPlaying(true)}
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            w="100%"
            h="100%"
            style={
              embed.thumb
                ? {
                    backgroundImage: `url(${embed.thumb})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <Flex
              w="64px"
              h="64px"
              borderRadius="full"
              bg="rgba(0,0,0,0.65)"
              border={`2px solid ${GOLD}`}
              align="center"
              justify="center"
              color={GOLD}
            >
              <FiPlay size={28} aria-hidden style={{ marginLeft: 4 }} />
            </Flex>
          </Flex>
        )}
      </Box>
      {(caption || start) && (
        <Text fontSize="sm" color="#9aa3bf" mt={1.5}>
          {caption}
          {start
            ? `${caption ? " · " : ""}starts at ${Math.floor(start / 60)}:${String(start % 60).padStart(2, "0")}`
            : ""}
        </Text>
      )}
    </Box>
  );
}
