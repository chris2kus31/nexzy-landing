"use client";

import { useEffect, useState } from "react";
import {
  Box,
  HStack,
  SimpleGrid,
  Text,
  Badge,
  Image,
  Link,
} from "@chakra-ui/react";
import NextImage from "next/image";
import { FaPlay } from "react-icons/fa";
import { youtubeEmbedUrl } from "@/lib/blog/youtube";
import type { GameHubVideo } from "@/lib/blog/api";

type Lightbox =
  | { kind: "video"; video: GameHubVideo }
  | { kind: "shot"; src: string };

function ytThumb(v: GameHubVideo): string | null {
  if (v.thumbnailUrl) return v.thumbnailUrl;
  if (v.youtubeId) return `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`;
  return null;
}

function alsoLinks(v: GameHubVideo): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = [];
  if (v.platformLinks?.tiktok)
    out.push({ label: "TikTok", href: v.platformLinks.tiktok });
  if (v.platformLinks?.reels)
    out.push({ label: "Reels", href: v.platformLinks.reels });
  return out;
}

/**
 * Game hub Media gallery: a uniform 16:9 thumbnail grid of videos + screenshots
 * with a click-to-play lightbox. Normalizes mixed aspect ratios — Shorts play in
 * a tall 9:16 modal, regular videos in 16:9 — so nothing towers over anything.
 */
export default function GameMedia({
  videos,
  shots,
  name,
}: {
  videos: GameHubVideo[];
  shots: string[];
  name: string;
}) {
  const [active, setActive] = useState<Lightbox | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  const hasVideos = videos.length > 0;
  const hasShots = shots.length > 0;

  return (
    <Box>
      {hasVideos && (
        <SimpleGrid
          columns={{ base: 1, sm: 2, md: 3 }}
          gap={4}
          mb={hasShots ? 10 : 0}
        >
          {videos.map((v, i) => {
            const thumb = ytThumb(v);
            const playable = !!youtubeEmbedUrl(v.youtubeUrl);
            const links = alsoLinks(v);
            return (
              <Box
                key={v.id ?? v.youtubeId ?? i}
                role="button"
                aria-label={v.title ?? `${name} video`}
                onClick={() => {
                  if (playable) setActive({ kind: "video", video: v });
                  else if (links[0]) window.open(links[0].href, "_blank");
                }}
                cursor="pointer"
                position="relative"
                aspectRatio={16 / 9}
                borderRadius="xl"
                overflow="hidden"
                border="1px solid"
                borderColor="whiteAlpha.100"
                bg="black"
                transition="all 0.15s"
                _hover={{
                  borderColor: "nexzy.blue/60",
                  transform: "translateY(-2px)",
                }}
              >
                {thumb && (
                  <Image
                    src={thumb}
                    alt={v.title ?? name}
                    w="full"
                    h="full"
                    objectFit="cover"
                    opacity={0.9}
                  />
                )}
                <Box
                  position="absolute"
                  inset={0}
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 55%)",
                  }}
                />
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  w="54px"
                  h="54px"
                  borderRadius="full"
                  bg="blackAlpha.700"
                  border="1px solid"
                  borderColor="whiteAlpha.500"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                >
                  <Box pl="3px">
                    <FaPlay />
                  </Box>
                </Box>
                <HStack position="absolute" top={2} left={2} gap={1}>
                  {v.source === "nexzy" && (
                    <Badge colorPalette="blue" variant="solid">
                      Nexzy
                    </Badge>
                  )}
                  {v.isShort && (
                    <Badge colorPalette="pink" variant="solid">
                      Short
                    </Badge>
                  )}
                </HStack>
                {v.title && (
                  <Text
                    position="absolute"
                    bottom={2}
                    left={3}
                    right={3}
                    color="white"
                    fontSize="sm"
                    fontWeight="600"
                    lineClamp={1}
                  >
                    {v.title}
                  </Text>
                )}
              </Box>
            );
          })}
        </SimpleGrid>
      )}

      {hasShots && (
        <Box>
          {hasVideos && (
            <Text
              fontSize="xs"
              fontWeight="600"
              color="gray.400"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={3}
            >
              Screenshots
            </Text>
          )}
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} gap={3}>
            {shots.map((src, i) => (
              <Box
                key={i}
                role="button"
                aria-label={`${name} screenshot ${i + 1}`}
                onClick={() => setActive({ kind: "shot", src })}
                cursor="pointer"
                position="relative"
                aspectRatio={16 / 9}
                borderRadius="lg"
                overflow="hidden"
                border="1px solid"
                borderColor="whiteAlpha.100"
                bg="whiteAlpha.50"
                transition="all 0.15s"
                _hover={{ borderColor: "nexzy.blue/60" }}
              >
                <NextImage
                  src={src}
                  alt={`${name} screenshot ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 240px"
                  style={{ objectFit: "cover" }}
                />
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {active && (
        <Box
          position="fixed"
          inset={0}
          zIndex={2000}
          bg="blackAlpha.800"
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={{ base: 4, md: 8 }}
          style={{ backdropFilter: "blur(4px)" }}
          onClick={() => setActive(null)}
        >
          <Box
            position="relative"
            w="full"
            maxW={
              active.kind === "video" && active.video.isShort
                ? "380px"
                : "56rem"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <Box
              role="button"
              aria-label="Close"
              onClick={() => setActive(null)}
              position="absolute"
              top={{ base: "-36px", md: "-40px" }}
              right="0"
              color="whiteAlpha.800"
              fontSize="2xl"
              lineHeight="1"
              cursor="pointer"
              _hover={{ color: "white" }}
            >
              ×
            </Box>

            {active.kind === "video" ? (
              (() => {
                const embed = youtubeEmbedUrl(active.video.youtubeUrl);
                const links = alsoLinks(active.video);
                return (
                  <Box>
                    {embed && (
                      <Box
                        position="relative"
                        w="full"
                        aspectRatio={active.video.isShort ? 9 / 16 : 16 / 9}
                        bg="black"
                        borderRadius="xl"
                        overflow="hidden"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                      >
                        <iframe
                          src={`${embed}?autoplay=1&rel=0`}
                          title={active.video.title ?? `${name} video`}
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
                      </Box>
                    )}
                    {(active.video.title || links.length > 0) && (
                      <HStack gap={4} mt={3} flexWrap="wrap">
                        {active.video.title && (
                          <Text color="white" fontSize="sm" fontWeight="600">
                            {active.video.title}
                          </Text>
                        )}
                        {links.map((a) => (
                          <Link
                            key={a.label}
                            href={a.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="nexzy.lightBlue"
                            fontSize="sm"
                          >
                            Also on {a.label}
                          </Link>
                        ))}
                      </HStack>
                    )}
                  </Box>
                );
              })()
            ) : (
              <Box
                position="relative"
                w="full"
                aspectRatio={16 / 9}
                bg="black"
                borderRadius="xl"
                overflow="hidden"
              >
                <NextImage
                  src={active.src}
                  alt={name}
                  fill
                  sizes="90vw"
                  style={{ objectFit: "contain" }}
                />
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
