"use client";

import { useState } from "react";
import {
  Box,
  HStack,
  VStack,
  Input,
  Button,
  Text,
  Flex,
} from "@chakra-ui/react";
import { searchYoutube, type YoutubeResult } from "@/lib/admin/client";

/** Search YouTube, preview candidates, and attach one to the post. */
export default function YoutubeSearch({
  defaultQuery,
  onAttach,
}: {
  defaultQuery?: string;
  onAttach: (url: string) => void;
}) {
  const [q, setQ] = useState(defaultQuery || "");
  const [results, setResults] = useState<YoutubeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (q.trim().length < 2) return;
    setSearching(true);
    setMsg(null);
    try {
      setResults(await searchYoutube(q.trim()));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }

  return (
    <Box
      mt={3}
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="md"
      p={3}
    >
      <Text fontSize="xs" color="nexzy.gray.100" mb={2}>
        Search YouTube and attach a better video
      </Text>
      <HStack gap={2}>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
          placeholder="Search YouTube…"
          size="sm"
          color="nexzy.white"
          bg="whiteAlpha.50"
          borderColor="whiteAlpha.300"
          _placeholder={{ color: "nexzy.gray.100" }}
        />
        <Button size="sm" colorPalette="blue" onClick={run} loading={searching}>
          Search
        </Button>
      </HStack>

      {msg && (
        <Text fontSize="xs" color="red.300" mt={2}>
          {msg}
        </Text>
      )}
      {searched && !searching && results.length === 0 && !msg && (
        <Text fontSize="xs" color="nexzy.gray.100" mt={2}>
          No videos found.
        </Text>
      )}

      <VStack align="stretch" gap={2} mt={results.length ? 3 : 0}>
        {results.map((v) => (
          <Flex
            key={v.videoId}
            gap={3}
            align="center"
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="md"
            p={2}
          >
            <a
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flexShrink: 0, lineHeight: 0 }}
            >
              {v.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  width={120}
                  height={68}
                  style={{ borderRadius: 6, objectFit: "cover" }}
                />
              )}
            </a>
            <Box flex="1" minW={0}>
              <Text color="nexzy.white" fontSize="sm" lineClamp={2}>
                {v.title}
              </Text>
              <Text color="nexzy.gray.100" fontSize="xs">
                {v.channel}
              </Text>
            </Box>
            <VStack gap={1} flexShrink={0}>
              <Button
                size="xs"
                variant="outline"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                asChild
              >
                <a href={v.url} target="_blank" rel="noopener noreferrer">
                  Preview
                </a>
              </Button>
              <Button
                size="xs"
                colorPalette="green"
                onClick={() => onAttach(v.url)}
              >
                Attach
              </Button>
            </VStack>
          </Flex>
        ))}
      </VStack>
    </Box>
  );
}
