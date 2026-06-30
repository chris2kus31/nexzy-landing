"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, HStack, Button, Input, Icon } from "@chakra-ui/react";
import { HiSearch, HiX } from "react-icons/hi";
import { BEATS } from "@/lib/blog/beats";

/**
 * Category pills + search box. State lives in the URL (?beat=&q=) so every
 * filter/search is a shareable, crawlable page; the server component reads it
 * and renders the matching results + pagination.
 */
export default function NewsControls({ beat, q }: { beat: string; q: string }) {
  const router = useRouter();
  const [term, setTerm] = useState(q);
  const firstRun = useRef(true);

  const go = (nextBeat: string, nextQ: string) => {
    const params = new URLSearchParams();
    if (nextBeat && nextBeat !== "all") params.set("beat", nextBeat);
    if (nextQ.trim()) params.set("q", nextQ.trim());
    const qs = params.toString();
    router.push(qs ? `/blog?${qs}` : "/blog");
  };

  // Debounce search input -> URL.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => go(beat, term), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const active = beat || "all";

  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      align={{ base: "stretch", md: "center" }}
      justify="space-between"
      gap={4}
      mb={8}
    >
      <HStack gap={2} flexWrap="wrap">
        {[{ key: "all", label: "All" }, ...BEATS].map((b) => (
          <Button
            key={b.key}
            size="sm"
            borderRadius="full"
            variant={active === b.key ? "solid" : "outline"}
            bg={active === b.key ? "nexzy.blue" : "transparent"}
            color="white"
            borderColor="nexzy.blue/40"
            onClick={() => go(b.key, term)}
            _hover={{ bg: active === b.key ? "nexzy.blue" : "whiteAlpha.100" }}
          >
            {b.label}
          </Button>
        ))}
      </HStack>

      <Box position="relative" w={{ base: "full", md: "320px" }}>
        <Icon
          position="absolute"
          left={3}
          top="50%"
          transform="translateY(-50%)"
          color="gray.400"
          zIndex={1}
        >
          <HiSearch />
        </Icon>
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search news…"
          aria-label="Search news"
          bg="whiteAlpha.50"
          color="white"
          borderColor="nexzy.blue/30"
          borderRadius="full"
          pl={10}
          pr={term ? 10 : 4}
          _placeholder={{ color: "gray.500" }}
        />
        {term && (
          <Icon
            position="absolute"
            right={3}
            top="50%"
            transform="translateY(-50%)"
            color="gray.400"
            cursor="pointer"
            onClick={() => {
              setTerm("");
              go(beat, "");
            }}
            _hover={{ color: "white" }}
          >
            <HiX />
          </Icon>
        )}
      </Box>
    </Flex>
  );
}
