"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Box, HStack, VStack, Heading, Text, Button } from "@chakra-ui/react";
import LeadsPanel from "@/components/admin/LeadsPanel";
import ContentPanel from "@/components/admin/ContentPanel";
import CardStudioPanel, {
  type CardSeed,
} from "@/components/admin/CardStudioPanel";
import VideosPanel from "@/components/admin/VideosPanel";
import TrailersPanel from "@/components/admin/TrailersPanel";
import RepliesPanel from "@/components/admin/RepliesPanel";
import InsightsPanel from "@/components/admin/InsightsPanel";
import AudienceInsightsPanel from "@/components/admin/AudienceInsightsPanel";
import GuideTargetsPanel from "@/components/admin/GuideTargetsPanel";
import GuidePanel from "@/components/admin/GuidePanel";
import ListPanel from "@/components/admin/ListPanel";
import SeriesPanel from "@/components/admin/SeriesPanel";
import EverythingWeKnowPanel from "@/components/admin/EverythingWeKnowPanel";
import NexzyCountdownPanel from "@/components/admin/NexzyCountdownPanel";

/**
 * Content Studio — the consolidated home for the whole content pipeline:
 * lead → generate → produce → publish. Sub-views under one admin tab:
 *   - Leads: published articles awaiting a Generate decision (writer + format)
 *   - Suggestions:  the generated cards (short + long + poll/image/text)
 *   - Video Library: the external videos you've posted (YT/TikTok/IG/FB)
 *   - Guides & Walkthroughs: the targets board + commission a guide/walkthrough/list
 *
 * The sub-view is deep-linkable via ?tab=content-studio&sub=<key>, so the old
 * ?tab=content|videos|guides bookmarks (mapped in the parent) land in the right
 * place.
 */
type Sub =
  | "leads"
  | "suggestions"
  | "library"
  | "trailers"
  | "replies"
  | "performance"
  | "audience"
  | "guides"
  | "cards";

const SUBS: { key: Sub; label: string }[] = [
  { key: "leads", label: "Leads" },
  { key: "cards", label: "Cards" },
  { key: "suggestions", label: "Suggestions" },
  { key: "library", label: "Video Library" },
  { key: "trailers", label: "Trailer Inbox" },
  { key: "replies", label: "Replies" },
  { key: "performance", label: "Performance" },
  { key: "audience", label: "Audience" },
  { key: "guides", label: "Guides & Walkthroughs" },
];

function isSub(v: string | null): v is Sub {
  return (
    v === "leads" ||
    v === "suggestions" ||
    v === "library" ||
    v === "trailers" ||
    v === "replies" ||
    v === "performance" ||
    v === "audience" ||
    v === "guides" ||
    v === "cards"
  );
}

/** Mounts its panel on first visit, then only hides it when inactive. */
function Pane({
  sub,
  active,
  visited,
  children,
}: {
  sub: Sub;
  active: Sub;
  visited: ReadonlySet<Sub>;
  children: ReactNode;
}) {
  if (sub !== active && !visited.has(sub)) return null;
  return <Box display={sub === active ? "block" : "none"}>{children}</Box>;
}

export default function ContentStudioPanel({
  isOwner,
  onRefresh,
}: {
  isOwner: boolean;
  onRefresh?: () => void;
}) {
  const [sub, _setSub] = useState<Sub>("suggestions");
  const [cardSeed, setCardSeed] = useState<CardSeed | null>(null);
  const [visited, setVisited] = useState<ReadonlySet<Sub>>(
    () => new Set<Sub>(["suggestions"]),
  );

  // Remember every tab that has been opened so it stays mounted afterwards.
  useEffect(() => {
    setVisited((v) => (v.has(sub) ? v : new Set(v).add(sub)));
  }, [sub]);

  const setSub = useCallback((s: Sub) => {
    _setSub(s);
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      p.set("tab", "content-studio");
      p.set("sub", s);
      window.history.replaceState(null, "", `/admin?${p.toString()}`);
    }
  }, []);

  // Hand a Content Studio card's copy to the Cards editor and jump there.
  const sendToCards = useCallback(
    (s: Omit<CardSeed, "token">) => {
      setCardSeed({ ...s, token: Date.now() });
      setSub("cards");
    },
    [setSub],
  );

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

      {/* Visited sub-tabs stay mounted (hidden with display:none) so pasted
          notes, uploads and in-progress edits survive a tab switch (P1-6).
          A tab mounts lazily on first visit, so unvisited panels cost nothing. */}
      <Pane sub="cards" active={sub} visited={visited}>
        <CardStudioPanel isOwner={isOwner} seed={cardSeed} />
      </Pane>
      <Pane sub="leads" active={sub} visited={visited}>
        <LeadsPanel isOwner={isOwner} />
      </Pane>
      <Pane sub="suggestions" active={sub} visited={visited}>
        <ContentPanel isOwner={isOwner} onSendToCards={sendToCards} />
      </Pane>
      <Pane sub="library" active={sub} visited={visited}>
        <VideosPanel isOwner={isOwner} />
      </Pane>
      <Pane sub="trailers" active={sub} visited={visited}>
        <TrailersPanel isOwner={isOwner} />
      </Pane>
      <Pane sub="replies" active={sub} visited={visited}>
        <RepliesPanel isOwner={isOwner} />
      </Pane>
      <Pane sub="performance" active={sub} visited={visited}>
        <InsightsPanel />
      </Pane>
      <Pane sub="audience" active={sub} visited={visited}>
        <AudienceInsightsPanel isOwner={isOwner} />
      </Pane>
      <Pane sub="guides" active={sub} visited={visited}>
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
                <EverythingWeKnowPanel onRan={onRefresh} />
                <NexzyCountdownPanel onRan={onRefresh} />
                <SeriesPanel onRan={onRefresh} />
              </VStack>
            </Box>
          )}
        </VStack>
      </Pane>
    </VStack>
  );
}
