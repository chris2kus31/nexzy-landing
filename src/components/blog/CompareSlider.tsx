"use client";

// ============================================
// FILE: components/blog/CompareSlider.tsx
// Before/after image slider for the `> [!COMPARE] A | B` article block (e.g.
// PS5 vs PS5 Pro). Drag (or arrow keys, it is a native range input) to wipe
// between the two shots. Images keep their own aspect ratio (the first image
// sets the frame).
// ============================================
import { useState } from "react";
import { Box, Text } from "@chakra-ui/react";

export default function CompareSlider({
  images,
  labels,
  border,
}: {
  images: { src: string; alt: string }[];
  labels: [string, string];
  border: string;
}) {
  const [pos, setPos] = useState(50);
  const [a, b] = images;
  const tag = (text: string, side: "left" | "right") =>
    text ? (
      <Text
        position="absolute"
        top={3}
        {...{ [side]: 3 }}
        px={2.5}
        py={1}
        borderRadius="full"
        bg="rgba(10,12,28,0.72)"
        color="white"
        fontSize="xs"
        fontWeight="700"
        letterSpacing="0.06em"
        textTransform="uppercase"
        pointerEvents="none"
      >
        {text}
      </Text>
    ) : null;
  return (
    <Box
      as="figure"
      my={8}
      position="relative"
      borderRadius="16px"
      overflow="hidden"
      borderWidth="1px"
      borderColor={border}
      userSelect="none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={b.src}
        alt={b.alt || labels[1]}
        style={{ display: "block", width: "100%" }}
      />
      <Box
        position="absolute"
        inset={0}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a.src}
          alt={a.alt || labels[0]}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </Box>
      <Box
        position="absolute"
        top={0}
        bottom={0}
        w="2px"
        bg="#FFD700"
        pointerEvents="none"
        style={{ left: `calc(${pos}% - 1px)` }}
      >
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%,-50%)"
          w="34px"
          h="34px"
          borderRadius="full"
          bg="#FFD700"
          color="#12152a"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontWeight="800"
          fontSize="sm"
          boxShadow="0 4px 14px rgba(0,0,0,0.45)"
        >
          {"<>"}
        </Box>
      </Box>
      {tag(labels[0], "left")}
      {tag(labels[1], "right")}
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={`Compare ${labels[0] || "first"} and ${labels[1] || "second"} image`}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "ew-resize",
          margin: 0,
        }}
      />
    </Box>
  );
}
