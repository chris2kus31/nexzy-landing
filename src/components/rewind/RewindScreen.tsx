"use client";

import { Box, Text } from "@chakra-ui/react";
import { useState } from "react";
import { track } from "@/lib/analytics";

/**
 * The TV screen. At rest it's a BLACK masked tube (a set that's off) with a
 * custom play button, a phosphor channel readout, and the title — never YouTube's
 * default thumbnail/chrome. Click powers it on: the youtube-nocookie player loads
 * with autoplay. Glass sheen + era scanlines sit on top. Client component.
 */
export default function RewindScreen({
  vid,
  title,
  year,
  radius,
  isCrt,
}: {
  vid: string;
  title: string;
  year: number | null;
  radius: string;
  isCrt: boolean;
}) {
  const [on, setOn] = useState(false);

  return (
    <Box
      position="relative"
      w="100%"
      css={{ aspectRatio: "16 / 9" }}
      overflow="hidden"
      borderRadius={radius}
      bg="#050506"
    >
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: 0,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setOn(true);
            track("rewind_video_play", { vid, year: year ?? undefined });
          }}
          aria-label={`Play ${title}`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: "none",
            padding: 0,
            cursor: "pointer",
            background:
              "radial-gradient(130% 120% at 30% 16%, #17171d, #040406)",
          }}
        >
          {isCrt && (
            <Box
              position="absolute"
              inset="0"
              css={{
                background:
                  "repeating-linear-gradient(to bottom, rgba(255,255,255,.05) 0 1px, transparent 1px 3px)",
              }}
            />
          )}
          <Text
            position="absolute"
            top="10px"
            left="12px"
            fontFamily="mono"
            fontSize="13px"
            color="#7dffb0"
            css={{ textShadow: "0 0 6px rgba(125,255,176,.7)" }}
          >
            CH 3 · {year ?? "—"}
          </Text>
          <Box position="absolute" inset="0" display="grid" placeItems="center">
            <Box
              w="66px"
              h="66px"
              borderRadius="full"
              display="grid"
              placeItems="center"
              css={{
                background: "rgba(232,64,42,.94)",
                boxShadow: "0 0 26px rgba(232,64,42,.5)",
              }}
            >
              <Box
                css={{
                  width: 0,
                  height: 0,
                  borderLeft: "21px solid #fff",
                  borderTop: "13px solid transparent",
                  borderBottom: "13px solid transparent",
                  marginLeft: "6px",
                }}
              />
            </Box>
          </Box>
          <Text
            position="absolute"
            bottom="10px"
            left="12px"
            right="12px"
            color="whiteAlpha.900"
            fontSize="sm"
            fontWeight="600"
            textAlign="left"
            lineClamp={1}
            css={{ textShadow: "0 1px 3px rgba(0,0,0,.85)" }}
          >
            {title}
          </Text>
        </button>
      )}

      {/* glass sheen — always on top */}
      <Box
        position="absolute"
        inset="0"
        pointerEvents="none"
        zIndex={3}
        css={{
          background:
            "linear-gradient(122deg, rgba(255,255,255,.10), rgba(255,255,255,.02) 40%, transparent 58%)",
        }}
      />
    </Box>
  );
}
