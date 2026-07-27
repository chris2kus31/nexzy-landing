"use client";

import { useEffect, useRef, useState } from "react";
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
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { youtubeEmbedUrl } from "@/lib/blog/youtube";
import type { GameHubVideo } from "@/lib/blog/api";

type Lightbox =
  | { kind: "video"; video: GameHubVideo }
  | { kind: "shot"; src: string };

const focusRing = {
  outline: "2px solid",
  outlineColor: "nexzy.blue",
  outlineOffset: "2px",
};

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

/** Fire `fn` on Enter/Space so role=button Boxes are keyboard-operable. */
function keyActivate(fn: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };
}

/**
 * Game hub Media gallery. Videos live in a horizontal snap-scroll rail (swipe on
 * touch, hover arrows on desktop) of uniform 16:9 cards; screenshots stay a
 * grid. Clicking opens a lightbox that sizes to the video — 9:16 for Shorts,
 * 16:9 for regular.
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
  const railRef = useRef<HTMLDivElement>(null);

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

  const scrollRail = (dir: number) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.round(el.clientWidth * 0.85),
      behavior: "smooth",
    });
  };

  const hasVideos = videos.length > 0;
  const hasShots = shots.length > 0;
  const showArrows = videos.length > 3;

  return (
    <Box>
      {hasVideos && (
        <Box position="relative" mb={hasShots ? 10 : 0} role="group">
          <Box
            ref={railRef}
            display="flex"
            gap={4}
            overflowX="auto"
            scrollSnapType="x mandatory"
            pb={2}
            css={{
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {videos.map((v, i) => {
              const thumb = ytThumb(v);
              const playable = !!youtubeEmbedUrl(v.youtubeUrl);
              const links = alsoLinks(v);
              const activate = () => {
                if (playable) setActive({ kind: "video", video: v });
                else if (links[0])
                  window.open(links[0].href, "_blank", "noopener,noreferrer");
              };
              return (
                <Box
                  key={v.id ?? v.youtubeId ?? i}
                  role="button"
                  tabIndex={0}
                  aria-label={v.title ?? `${name} video`}
                  onClick={activate}
                  onKeyDown={keyActivate(activate)}
                  cursor="pointer"
                  flex="0 0 auto"
                  w={{ base: "260px", sm: "280px", md: "300px" }}
                  scrollSnapAlign="start"
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
                  _focusVisible={focusRing}
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
                  {playable && (
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
                  )}
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
          </Box>

          {showArrows && (
            <>
              <Box
                as="button"
                aria-label="Scroll left"
                onClick={() => scrollRail(-1)}
                display={{ base: "none", md: "flex" }}
                position="absolute"
                left="6px"
                top="50%"
                transform="translateY(-50%)"
                w="36px"
                h="36px"
                borderRadius="full"
                bg="blackAlpha.800"
                border="1px solid"
                borderColor="whiteAlpha.300"
                color="white"
                alignItems="center"
                justifyContent="center"
                opacity={0}
                _groupHover={{ opacity: 1 }}
                _hover={{ bg: "nexzy.blue" }}
                _focusVisible={{ opacity: 1, ...focusRing }}
                transition="opacity 0.15s, background 0.15s"
              >
                <FiChevronLeft />
              </Box>
              <Box
                as="button"
                aria-label="Scroll right"
                onClick={() => scrollRail(1)}
                display={{ base: "none", md: "flex" }}
                position="absolute"
                right="6px"
                top="50%"
                transform="translateY(-50%)"
                w="36px"
                h="36px"
                borderRadius="full"
                bg="blackAlpha.800"
                border="1px solid"
                borderColor="whiteAlpha.300"
                color="white"
                alignItems="center"
                justifyContent="center"
                opacity={0}
                _groupHover={{ opacity: 1 }}
                _hover={{ bg: "nexzy.blue" }}
                _focusVisible={{ opacity: 1, ...focusRing }}
                transition="opacity 0.15s, background 0.15s"
              >
                <FiChevronRight />
              </Box>
            </>
          )}
        </Box>
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
            {shots.map((src, i) => {
              const openShot = () => setActive({ kind: "shot", src });
              return (
                <Box
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`${name} screenshot ${i + 1}`}
                  onClick={openShot}
                  onKeyDown={keyActivate(openShot)}
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
                  _focusVisible={focusRing}
                >
                  <NextImage
                    src={src}
                    alt={`${name} screenshot ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 240px"
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              );
            })}
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
              as="button"
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
              _focusVisible={focusRing}
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
