"use client";

import { useState } from "react";
import { Box, Image } from "@chakra-ui/react";

/**
 * A flat, printed-illustration TV/VHS unit for the '80s magazine skin.
 * No gloss, no glow, no depth — a 3px ink border, a hard offset shadow, and a
 * flat red play button, the way a set would be *drawn* in a 1989 magazine.
 * Click the button to load the real YouTube player in place.
 */
export default function RewindTvFlat({
  vid,
  title,
  poster,
}: {
  vid: string;
  title: string;
  poster?: string | null;
}) {
  const [play, setPlay] = useState(false);
  const thumb = poster || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;

  return (
    <Box
      border="3px solid #171717"
      bg="#242424"
      p="9px"
      css={{
        borderRadius: "2px",
        boxShadow: "3px 3px 0 rgba(20,63,140,.18)",
      }}
    >
      <Box
        position="relative"
        bg="#000"
        overflow="hidden"
        css={{ aspectRatio: "4 / 3", borderRadius: "2px" }}
      >
        {play ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media"
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
          <>
            <Image
              src={thumb}
              alt={title}
              w="100%"
              h="100%"
              objectFit="cover"
              css={{ filter: "saturate(.86) contrast(1.05)" }}
            />
            {/* PHOTO — 4px halftone dot overlay (CMYK-repro feel) */}
            <Box
              position="absolute"
              inset="0"
              pointerEvents="none"
              css={{
                mixBlendMode: "multiply",
                opacity: 0.18,
                backgroundImage:
                  "radial-gradient(circle, rgba(0,0,0,.55) 0px, rgba(0,0,0,.55) .8px, transparent 1.2px)",
                backgroundSize: "4px 4px",
              }}
            />
            <button
              type="button"
              aria-label="Play video"
              onClick={() => setPlay(true)}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: 66,
                height: 46,
                background: "#B73025",
                border: "2px solid #171717",
                borderRadius: "2px",
                boxShadow: "2px 2px 0 rgba(0,0,0,.25)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "9px solid transparent",
                  borderBottom: "9px solid transparent",
                  borderLeft: "15px solid #fff",
                  marginLeft: "3px",
                }}
              />
            </button>
          </>
        )}
      </Box>
    </Box>
  );
}
