"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, HStack, VStack, Heading, Text, Button } from "@chakra-ui/react";
import ContentPanel from "@/components/admin/ContentPanel";
import VideosPanel from "@/components/admin/VideosPanel";
import GuideTargetsPanel from "@/components/admin/GuideTargetsPanel";
import GuidePanel from "@/components/admin/GuidePanel";
import ListPanel from "@/components/admin/ListPanel";

/**
 * Content Studio — the consolidated home for the whole content pipeline:
 * suggest → produce → publish. Three sub-views under one admin tab:
 *   - Suggestions:  the format engine's cards (short + long + poll/image/text)
 *   - Video Library: the external videos you've posted (YT/TikTok/IG/FB)
 *   - Guides & Walkthroughs: the targets board + commission a guide/walkthrough/list
 *
 * The sub-view is deep-linkable via ?tab=content-studio&sub=<key>, so the old
 * ?tab=content|videos|guides bookmarks (mapped in the parent) land in the right
 * place.
 */
type Sub = "suggestions" | "library" | "guides";

const SUBS: { key: Sub; label: string }[] = [
  { key: "suggestions", label: "Suggestions" },
  { key: "library", label: "Video Library" },
  { key: "guides", label: "Guides & Walkthroughs" },
];

function isSub(v: string | null): v is Sub {
  return v === "suggestions" || v === "library" || v === "guides";
}

export default function ContentStudioPanel({
  isOwner,
  onRefresh,
}: {
  isOwner: boolean;
  onRefresh?: () => void;
}) {
  const [sub, _setSub] = useState<Sub>("suggestions");

  const setSub = useCallback((s: Sub) => {
    _setSub(s);
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      p.set("tab", "content-studio");
      p.set("sub", s);
      window.history.replaceState(null, "", `/admin?${p.toString()}`);
    }
  }, []);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("sub");
    if (isSub(s)) _setSub(s);
  }, []);

  return (
    <VStack align="stretch" gap={6}>
      <HStack gap={2} wrap="wrap">
        {SUBS.map((s) => {
          const active = sub === s.key;
          return (
            <Button
              key={s.key}
              size="sm"
              variant={active ? "solid" : "outline"}
              bg={active ? "nexzy.blue" : "transparent"}
              color={active ? "white" : "nexzy.gray.100"}
              borderColor="whiteAlpha.300"
              _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
              onClick={() => setSub(s.key)}
            >
              {s.label}
            </Button>
          );
        })}
      </HStack>

      {sub === "suggestions" && <ContentPanel isOwner={isOwner} />}

      {sub === "library" && <VideosPanel />}

      {sub === "guides" && (
        <VStack align="stretch" gap={6}>
          <GuideTargetsPanel isOwner={isOwner} />
          {isOwner && (
            <Box borderTop="1px solid" borderColor="whiteAlpha.200" pt={6}>
              <Heading size="md" color="nexzy.white" mb={1}>
                Generate a guide, walkthrough, or list
              </Heading>
              <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
                Commission an evergreen guide/walkthrough or a ranked list — it
                lands in the Review queue. Nothing publishes automatically.
              </Text>
              <VStack align="stretch" gap={6}>
                <GuidePanel onRan={onRefresh} />
                <ListPanel onRan={onRefresh} />
              </VStack>
            </Box>
          )}
        </VStack>
      )}
    </VStack>
  );
}
