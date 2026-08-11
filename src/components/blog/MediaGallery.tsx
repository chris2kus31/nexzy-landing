"use client";

import { useState } from "react";
import NextImage from "next/image";
import { Box, Heading, Text, SimpleGrid } from "@chakra-ui/react";
import type { ArticleMedia } from "@/lib/blog/api";
import { isYoutubeShort } from "@/lib/blog/youtube";

// Only hosts we've whitelisted in next.config remotePatterns can go through
// next/image (it throws on an unconfigured host). Thumbnails come from these;
// anything else safely falls back to a plain <img> — no runtime crash.
const OPTIMIZABLE_HOST =
  /(?:^|\.)(?:ytimg\.com|youtube\.com|amazonaws\.com|rawg\.io)$/i;
function canOptimize(src: string): boolean {
  try {
    return OPTIMIZABLE_HOST.test(new URL(src).hostname);
  } catch {
    return false;
  }
}

/**
 * The article video gallery: the starred (lead) video plays large; any others
 * show as a tap-to-play thumbnail strip below. Thumbnail-first (a facade) so N
 * iframes never load at once — the player is only mounted when the reader clicks,
 * keeping the page fast. Backward compatible: a single-video article just renders
 * the one lead with no strip (same as the old "Watch" block).
 */
export default function MediaGallery({
  media,
  title,
}: {
  media: ArticleMedia[];
  title: string;
}) {
  const ordered = [...(media || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const leadIdx = Math.max(
    0,
    ordered.findIndex((m) => m.featured),
  );
  const [active, setActive] = useState(leadIdx);
  const [playing, setPlaying] = useState(false);

  if (!ordered.length) return null;
  const current = ordered[active] ?? ordered[0];
  const short = isYoutubeShort(current.url);
  const embed = `https://www.youtube-nocookie.com/embed/${current.videoId}?autoplay=1`;

  return (
    <Box mt={10}>
      <Heading as="h2" size="sm" color="gray.300" mb={3}>
        Watch
      </Heading>

      <Box
        position="relative"
        w={short ? { base: "full", sm: "340px" } : "full"}
        aspectRatio={short ? 9 / 16 : 16 / 9}
        borderRadius="2xl"
        overflow="hidden"
        bg="black"
      >
        {playing ? (
          <iframe
            src={embed}
            title={current.title || `${title} — video`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
          />
        ) : (
          <Box
            as="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play: ${current.title || title}`}
            position="absolute"
            inset={0}
            w="full"
            h="full"
            p={0}
            border={0}
            cursor="pointer"
            bg="black"
          >
            {(() => {
              const src =
                current.thumbnailUrl ||
                `https://i.ytimg.com/vi/${current.videoId}/hqdefault.jpg`;
              return canOptimize(src) ? (
                <NextImage
                  src={src}
                  alt={current.title || title}
                  fill
                  sizes="(max-width: 768px) 100vw, 720px"
                  style={{ objectFit: "cover", opacity: 0.9 }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={current.title || title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.9,
                  }}
                />
              );
            })()}
            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              w="64px"
              h="64px"
              borderRadius="full"
              bg="rgba(0,0,0,0.6)"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box
                as="span"
                style={{
                  width: 0,
                  height: 0,
                  borderStyle: "solid",
                  borderWidth: "10px 0 10px 16px",
                  borderColor: "transparent transparent transparent white",
                  marginLeft: 4,
                }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {current.caption && (
        <Text color="gray.500" fontSize="xs" mt={2}>
          {current.caption}
        </Text>
      )}

      {ordered.length > 1 && (
        <SimpleGrid columns={{ base: 3, sm: 4 }} gap={3} mt={4}>
          {ordered.map((m, i) => (
            <Box
              as="button"
              key={m.videoId}
              onClick={() => {
                setActive(i);
                setPlaying(true);
              }}
              aria-label={`Play: ${m.title || "video"}`}
              position="relative"
              aspectRatio={16 / 9}
              borderRadius="lg"
              overflow="hidden"
              cursor="pointer"
              p={0}
              bg="black"
              border="2px solid"
              borderColor={i === active ? "nexzy.lightBlue" : "whiteAlpha.200"}
            >
              {(() => {
                const src =
                  m.thumbnailUrl ||
                  `https://i.ytimg.com/vi/${m.videoId}/mqdefault.jpg`;
                return canOptimize(src) ? (
                  <NextImage
                    src={src}
                    alt={m.title || ""}
                    fill
                    sizes="(max-width: 640px) 33vw, 160px"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={m.title || ""}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                );
              })()}
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
