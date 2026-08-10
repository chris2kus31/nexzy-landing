"use client";

import { useState } from "react";
import { Box, HStack } from "@chakra-ui/react";
import ShareRow from "@/components/blog/ShareRow";

/**
 * Compact "Share" trigger that opens the full ShareRow (all networks) in a small
 * dropdown. Used where a full inline row of icons doesn't fit (e.g. the Rewind
 * episode header). `url` + `title` are the thing being shared.
 */
export default function ShareMenu({
  url,
  title,
  label = "Share",
  color = "#f5b53d",
}: {
  url: string;
  title: string;
  label?: string;
  color?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Box position="relative">
      <HStack
        as="button"
        onClick={() => setOpen((v) => !v)}
        gap={2}
        color="nexzy.gray.100"
        fontFamily="mono"
        fontSize={{ base: "12px", md: "14px" }}
        _hover={{ color }}
        css={{ cursor: "pointer" }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Box as="span">⤴</Box>
        <Box as="span">{label}</Box>
      </HStack>

      {open ? (
        <>
          <Box
            position="fixed"
            inset="0"
            zIndex={40}
            onClick={() => setOpen(false)}
          />
          <Box
            position="absolute"
            right={0}
            top="26px"
            zIndex={41}
            bg="#141a2e"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="xl"
            p={3}
            boxShadow="0 16px 40px rgba(0,0,0,.5)"
            maxW="300px"
          >
            <ShareRow url={url} title={title} />
          </Box>
        </>
      ) : null}
    </Box>
  );
}
