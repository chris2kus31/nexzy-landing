"use client";
// Website game search. Games the site covers link to their page; every other
// game in the catalog points to the app ("Not on the web yet"). Typing waits
// 300 ms, needs 3+ letters, and cancels the previous request; the answer is
// edge-cached per normalized query, so it costs almost nothing to run.
import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { Box, Flex, Input, Spinner, Stack, Text } from "@chakra-ui/react";
import { FiSearch, FiSmartphone } from "react-icons/fi";

type Hit = {
  slug: string;
  name: string;
  image: string | null;
  released: string | null;
  web: boolean;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 60);

export default function GameSearch({
  autoFocus = false,
}: {
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const q = norm(text);

  useEffect(() => {
    if (q.length < 3) {
      abort.current?.abort();
      setHits(null);
      setBusy(false);
      return;
    }
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      setBusy(true);
      setFailed(false);
      try {
        const r = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        if (!r.ok) throw new Error(String(r.status));
        const d = (await r.json()) as { items: Hit[] };
        setHits(d.items ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally {
        if (abort.current === ac) setBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Box position="relative" w="full" maxW="2xl" mb={{ base: 8, md: 10 }}>
      <Flex
        align="center"
        gap={3}
        bg="whiteAlpha.100"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="xl"
        px={4}
        _focusWithin={{ borderColor: "nexzy.yellow" }}
      >
        <FiSearch color="#9aa3bf" aria-hidden />
        <Input
          id="game-search"
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search any game"
          aria-label="Search games"
          autoFocus={autoFocus}
          autoComplete="off"
          border="none"
          px={0}
          h="52px"
          color="white"
          _focusVisible={{ boxShadow: "none" }}
          _placeholder={{ color: "gray.500" }}
        />
        {busy && <Spinner size="sm" color="gray.400" />}
      </Flex>

      {q.length >= 3 && hits !== null && (
        <Stack
          mt={2}
          gap={0}
          bg="#141933"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="xl"
          overflow="hidden"
          role="list"
        >
          {hits.length === 0 && (
            <Text px={4} py={3} color="gray.400" fontSize="sm">
              No games match that name. Try another spelling.
            </Text>
          )}
          {hits.map((g) => (
            <Flex
              key={g.slug}
              role="listitem"
              asChild
              align="center"
              gap={3}
              px={4}
              py={3}
              _hover={{ bg: "whiteAlpha.100" }}
              borderTop="1px solid"
              borderColor="whiteAlpha.100"
            >
              <NextLink href={g.web ? `/games/${g.slug}` : "/get"}>
                <Box
                  w="56px"
                  h="32px"
                  flexShrink={0}
                  borderRadius="md"
                  bg="whiteAlpha.200"
                  bgImage={g.image ? `url(${g.image})` : undefined}
                  bgSize="cover"
                  bgPos="center"
                />
                <Box flex="1" minW={0}>
                  <Text color="white" fontWeight="600" truncate>
                    {g.name}
                  </Text>
                  <Text color="gray.400" fontSize="xs">
                    {g.web
                      ? `Guides and news${g.released ? ` · ${g.released.slice(0, 4)}` : ""}`
                      : "Not on the web yet. See it in the Nexzy app"}
                  </Text>
                </Box>
                {!g.web && <FiSmartphone color="#FFD700" aria-hidden />}
              </NextLink>
            </Flex>
          ))}
        </Stack>
      )}
      {failed && (
        <Text mt={2} color="gray.400" fontSize="sm">
          Search is unavailable right now. Try again in a moment.
        </Text>
      )}
    </Box>
  );
}
