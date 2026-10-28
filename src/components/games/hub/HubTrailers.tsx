"use client";

// Mega hub trailers: official videos linked to the game (trailer monitor
// approvals + videos added in Admin -> Game hub). One large player up top and
// the rest as a strip. The player is a click-to-load facade: no YouTube iframe
// or script loads until someone presses play (fast page, no third-party
// cookies before intent; embeds use youtube-nocookie).
import { useState } from "react";
import { Box, HStack, Text, chakra } from "@chakra-ui/react";
import { FaPlay } from "react-icons/fa";
import { track } from "@/lib/analytics";

export interface HubTrailer {
  youtubeId: string;
  title: string;
  thumbnailUrl: string | null;
}

const thumb = (t: HubTrailer) =>
  t.thumbnailUrl || `https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg`;

/** Full-HD poster for the big player; not every upload has one (YouTube
 *  then serves a tiny 120px placeholder), so fall back on load. */
const bigThumb = (t: HubTrailer) =>
  `https://i.ytimg.com/vi/${t.youtubeId}/maxresdefault.jpg`;

export default function HubTrailers({
  slug,
  trailers,
}: {
  slug: string;
  trailers: HubTrailer[];
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const current = trailers[index];
  if (!current) return null;

  function play() {
    setPlaying(true);
    track("hub_trailer_play", { slug, video: current.youtubeId });
  }

  return (
    <Box>
      <Box
        position="relative"
        w="full"
        aspectRatio={16 / 9}
        borderRadius="14px"
        overflow="hidden"
        bg="#0b0e1f"
      >
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${current.youtubeId}?autoplay=1&rel=0`}
            title={current.title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        ) : (
          <chakra.button
            type="button"
            onClick={play}
            aria-label={`Play ${current.title}`}
            position="absolute"
            inset={0}
            w="full"
            h="full"
            cursor="pointer"
            role="group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={current.youtubeId}
              src={bigThumb(current)}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={(e) => {
                // YouTube's "missing maxres" placeholder is 120px wide.
                const img = e.currentTarget;
                if (img.naturalWidth <= 120 && img.src !== thumb(current)) img.src = thumb(current);
              }}
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== thumb(current)) img.src = thumb(current);
              }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            <Box
              position="absolute"
              inset={0}
              style={{ background: "linear-gradient(to top, rgba(11,14,31,0.85), rgba(11,14,31,0) 55%)" }}
            />
            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              w={{ base: "56px", md: "72px" }}
              h={{ base: "56px", md: "72px" }}
              borderRadius="full"
              bg="#FFD700"
              color="#11152b"
              display="flex"
              alignItems="center"
              justifyContent="center"
              transition="transform 0.15s"
              _groupHover={{ transform: "translate(-50%, -50%) scale(1.08)" }}
            >
              <FaPlay style={{ marginLeft: 4 }} />
            </Box>
            <Text
              position="absolute"
              left={4}
              right={4}
              bottom={3}
              textAlign="left"
              color="white"
              fontWeight="700"
              fontSize={{ base: "sm", md: "md" }}
              lineClamp={2}
            >
              {current.title}
            </Text>
          </chakra.button>
        )}
      </Box>

      {trailers.length > 1 && (
        <HStack
          gap={3}
          mt={3}
          overflowX="auto"
          pb={1}
          css={{ scrollbarWidth: "thin" }}
        >
          {trailers.map((t, i) => {
            const on = i === index;
            return (
              <chakra.button
                key={t.youtubeId}
                type="button"
                onClick={() => {
                  setIndex(i);
                  setPlaying(false);
                }}
                aria-pressed={on}
                aria-label={`Show ${t.title}`}
                flexShrink={0}
                w={{ base: "150px", md: "180px" }}
                textAlign="left"
                cursor="pointer"
              >
                <Box
                  position="relative"
                  aspectRatio={16 / 9}
                  borderRadius="10px"
                  overflow="hidden"
                  border="2px solid"
                  borderColor={on ? "#FFD700" : "transparent"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb(t)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
                <Text fontSize="xs" color={on ? "white" : "#9aa3bf"} mt={1} lineClamp={2}>
                  {t.title}
                </Text>
              </chakra.button>
            );
          })}
        </HStack>
      )}
    </Box>
  );
}
