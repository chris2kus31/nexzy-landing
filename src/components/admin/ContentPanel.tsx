"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Badge,
  Link,
  Image,
  Input,
  Textarea,
  Spinner,
} from "@chakra-ui/react";
import {
  getContentSuggestions,
  skipContentSuggestion,
  useContentSuggestion,
  produceContentVideo,
  regenerateContentCard,
  regenerateScript,
  updateContentScript,
  uploadContentVideo,
  publishContentCard,
  getPublishConfig,
  refreshContentInsights,
  attachContentYoutube,
  getWriterNames,
  getTtsBudget,
  type ContentSuggestion,
  type PlatformKit,
  type PublishResult,
  type PlatformInsights,
  type TtsBudget,
} from "@/lib/admin/client";

const LANE_COLOR: Record<string, string> = {
  deal: "orange",
  news: "blue",
  tip: "cyan",
  upcoming: "purple",
  guide: "cyan",
};

/** Copy-to-clipboard button with a brief "Copied" confirmation. */
function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    } catch {
      /* clipboard blocked — ignore */
    }
  };
  return (
    <Button
      size="xs"
      variant="outline"
      color="nexzy.white"
      borderColor="whiteAlpha.300"
      _hover={{ bg: "whiteAlpha.100" }}
      onClick={copy}
    >
      {done ? "Copied ✓" : label}
    </Button>
  );
}

/** A small "FIELD LABEL" + copy button row used inside a kit. */
function FieldLabel({ text, copy }: { text: string; copy: string }) {
  return (
    <Flex justify="space-between" align="center" gap={2} mt={2} mb={0.5}>
      <Text
        color="whiteAlpha.600"
        fontSize="10px"
        fontWeight="700"
        letterSpacing="0.06em"
      >
        {text}
      </Text>
      <CopyBtn text={copy} label="Copy" />
    </Flex>
  );
}

/**
 * One platform's posting kit, broken into copy-per-field so you can paste each
 * piece straight into that platform's box:
 *   • Title — its own copy button
 *   • Description + hashtags (+ CTA) — one copy button for the whole caption
 *   • Tags — its own copy button (only the platforms that use keyword tags)
 */
function KitBlock({ name, kit }: { name: string; kit?: PlatformKit }) {
  if (!kit) return null;
  const hashtags = (kit.hashtags || []).join(" ");
  const title = kit.title || "";
  const body = kit.description || kit.caption || kit.post || "";
  // The full caption you'd paste into the post box: body, then hashtags, then
  // the platform engagement line — one clean block, no re-typing.
  const caption = [body, hashtags, kit.cta].filter(Boolean).join("\n\n");
  const tags = kit.tags && kit.tags.length > 0 ? kit.tags.join(", ") : "";
  const pinned = kit.pinnedComment || "";
  const firstReply = kit.firstReply || "";
  const empty = !title && !body && !hashtags && !tags && !pinned && !firstReply;

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={3}
    >
      <Text color="nexzy.lightBlue" fontSize="xs" fontWeight="700">
        {name}
      </Text>

      {title && (
        <>
          <FieldLabel text="TITLE" copy={title} />
          <Text color="nexzy.white" fontSize="sm" fontWeight="600">
            {title}
          </Text>
        </>
      )}

      {(body || hashtags || kit.cta) && (
        <>
          <FieldLabel text="DESCRIPTION + HASHTAGS" copy={caption} />
          {body && (
            <Text
              color="nexzy.gray.100"
              fontSize="sm"
              whiteSpace="pre-wrap"
              mt={0.5}
            >
              {body}
            </Text>
          )}
          {hashtags && (
            <Text color="nexzy.lightBlue" fontSize="xs" mt={1}>
              {hashtags}
            </Text>
          )}
          {kit.cta && (
            <Text
              color="nexzy.gray.100"
              fontSize="xs"
              mt={1}
              fontStyle="italic"
            >
              {kit.cta}
            </Text>
          )}
        </>
      )}

      {firstReply && (
        <>
          <FieldLabel
            text="↩ FIRST REPLY (post right after — optional)"
            copy={firstReply}
          />
          <Text color="nexzy.gray.100" fontSize="xs" whiteSpace="pre-wrap">
            {firstReply}
          </Text>
        </>
      )}

      {tags && (
        <>
          <FieldLabel text="TAGS / KEYWORDS" copy={tags} />
          <Text color="nexzy.gray.100" fontSize="xs">
            {tags}
          </Text>
        </>
      )}

      {pinned && (
        <>
          <FieldLabel text="📌 PINNED COMMENT — pin after posting" copy={pinned} />
          <Text color="nexzy.gray.100" fontSize="xs" whiteSpace="pre-wrap">
            {pinned}
          </Text>
        </>
      )}

      {empty && (
        <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
          —
        </Text>
      )}
    </Box>
  );
}

/**
 * Assemble the FULL post text an operator would type manually: body, then the
 * hashtag line, then the platform CTA — one clean block. Matches the KitBlock
 * "DESCRIPTION + HASHTAGS" copy so what you publish == what you'd paste.
 */
function assembleCaption(kit?: PlatformKit): string {
  if (!kit) return "";
  const body = kit.description || kit.caption || "";
  const hashtags = (kit.hashtags || []).join(" ");
  return [body, hashtags, kit.cta].filter(Boolean).join("\n\n");
}

/**
 * Threads renders inline hashtags as plain grey text (no discoverability) and
 * allows only ONE clickable topic tag per post — so we send clean prose here
 * and the single topic tag separately.
 */
function assembleThreadsText(kit?: PlatformKit): string {
  if (!kit) return "";
  const body = kit.description || kit.caption || "";
  return [body, kit.cta].filter(Boolean).join("\n\n");
}

/** Threads' single topic tag: first/strongest hashtag, cleaned per Meta rules. */
function firstTopicTag(kit?: PlatformKit): string {
  const raw = (kit?.hashtags || [])[0] || "";
  return raw.replace(/^#/, "").replace(/[.&]/g, "").trim().slice(0, 50);
}

/**
 * Publish a finished video card straight to Facebook + Instagram Reels (upload
 * the video) and a Threads text post. Calls the publish endpoints; shows each
 * platform's result. Threads doesn't need the video (it's a text take).
 */
function PublishBox({ s }: { s: ContentSuggestion }) {
  const p = s.payload?.platforms;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<PublishResult[] | null>(null);
  const [insights, setInsights] = useState<PlatformInsights[]>(
    s.payload?.insights ?? [],
  );
  const [refreshing, setRefreshing] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [ytBusy, setYtBusy] = useState(false);
  const [ytAttached, setYtAttached] = useState(false);
  const published = (s.payload?.publishResults ?? []).some((r) => r.ok);
  const refreshInsights = async () => {
    setRefreshing(true);
    try {
      const card = await refreshContentInsights(s.id);
      setInsights(card.payload?.insights ?? []);
    } catch {
      /* leave as-is */
    } finally {
      setRefreshing(false);
    }
  };
  const attachYt = async () => {
    if (!ytUrl.trim()) return;
    setYtBusy(true);
    try {
      const card = await attachContentYoutube(s.id, ytUrl.trim());
      setInsights(card.payload?.insights ?? []);
      setYtAttached(true);
      setYtUrl("");
    } catch {
      /* leave as-is */
    } finally {
      setYtBusy(false);
    }
  };
  const [fb, setFb] = useState(!!p?.facebook);
  const [ig, setIg] = useState(!!p?.reels);
  const [th, setTh] = useState(!!p?.threads);
  const [fbCaption, setFbCaption] = useState(assembleCaption(p?.facebook));
  const [igCaption, setIgCaption] = useState(assembleCaption(p?.reels));
  const [threadsText, setThreadsText] = useState(
    assembleThreadsText(p?.threads),
  );
  const [threadsTopicTag, setThreadsTopicTag] = useState(
    firstTopicTag(p?.threads),
  );
  const [fbPinned, setFbPinned] = useState(p?.facebook?.pinnedComment ?? "");
  const [igPinned, setIgPinned] = useState(p?.reels?.pinnedComment ?? "");
  const [threadsPinned, setThreadsPinned] = useState(
    p?.threads?.pinnedComment ?? "",
  );
  const [xOn, setXOn] = useState(false);
  const [xPost, setXPost] = useState(p?.x?.post ?? "");
  const [xReply, setXReply] = useState(p?.x?.firstReply ?? "");
  const [cfg, setCfg] = useState<{ x?: boolean } | null>(null);
  useEffect(() => {
    getPublishConfig()
      .then((c) => setCfg(c))
      .catch(() => setCfg(null));
  }, []);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const r = await uploadContentVideo(s.id, file);
      setVideoUrl(r.url);
    } catch {
      /* leave unset on failure */
    } finally {
      setUploading(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const r = await publishContentCard(s.id, {
        videoUrl: videoUrl ?? undefined,
        facebook: fb,
        instagram: ig,
        threads: th,
        fbCaption,
        igCaption,
        threadsText,
        threadsTopicTag,
        fbPinned,
        igPinned,
        threadsPinned,
        x: xOn,
        xPost,
        xReply,
      });
      setResults(r.results);
    } catch {
      setResults([
        { platform: "facebook", ok: false, error: "request failed" },
      ]);
    } finally {
      setPublishing(false);
    }
  };

  const needsVideo = fb || ig;
  // Human-readable reasons publishing is blocked (shown under the button so a
  // missing piece can't be published by accident).
  const publishBlockers: string[] = [];
  if (!fb && !ig && !th && !xOn) {
    publishBlockers.push("Select at least one platform above.");
  }
  if (needsVideo && !videoUrl) {
    publishBlockers.push(
      "Upload the finished video — Facebook and Instagram need it.",
    );
  }
  if (fb && !fbCaption.trim()) publishBlockers.push("Facebook caption is empty.");
  if (ig && !igCaption.trim())
    publishBlockers.push("Instagram caption is empty.");
  if (th && !threadsText.trim()) publishBlockers.push("Threads text is empty.");
  if (xOn && !xPost.trim()) publishBlockers.push("X post is empty.");
  const canPublish = publishBlockers.length === 0;
  const toggle = (on: boolean, set: (v: boolean) => void, label: string) => (
    <Button
      size="xs"
      variant={on ? "solid" : "outline"}
      bg={on ? "nexzy.blue" : "transparent"}
      color={on ? "white" : "nexzy.gray.100"}
      borderColor="whiteAlpha.300"
      _hover={{ bg: on ? "nexzy.blue" : "whiteAlpha.100" }}
      onClick={() => set(!on)}
    >
      {on ? "✓ " : ""}
      {label}
    </Button>
  );
  const ta = {
    rows: 3,
    bg: "whiteAlpha.50",
    color: "nexzy.white",
    borderColor: "whiteAlpha.300",
    fontSize: "sm" as const,
  };

  return (
    <Box
      mt={3}
      p={3}
      borderRadius="lg"
      bg="blue.500/5"
      border="1px solid"
      borderColor="nexzy.blue/40"
    >
      <Text color="nexzy.white" fontWeight="700" fontSize="sm" mb={2}>
        📣 Publish to social
      </Text>

      {/* Video upload — needed for Facebook + Instagram */}
      {needsVideo && (
        <Box mb={2}>
          <Input
            type="file"
            accept="video/*"
            size="sm"
            p={1}
            color="nexzy.gray.100"
            borderColor="whiteAlpha.300"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <Text fontSize="xs" color="nexzy.gray.100" mt={1}>
            {uploading
              ? "Uploading…"
              : videoUrl
                ? "✓ Video uploaded"
                : "Upload the finished video (Facebook + Instagram need it)."}
          </Text>
        </Box>
      )}

      {/* Which platforms */}
      <HStack gap={2} mb={2} wrap="wrap">
        {p?.facebook && toggle(fb, setFb, "Facebook")}
        {p?.reels && toggle(ig, setIg, "Instagram")}
        {p?.threads && toggle(th, setTh, "Threads")}
        {p?.x && (
          <Button
            size="xs"
            variant={xOn ? "solid" : "outline"}
            bg={xOn ? "nexzy.blue" : "transparent"}
            color={xOn ? "white" : "nexzy.gray.100"}
            borderColor="whiteAlpha.300"
            _hover={{ bg: xOn ? "nexzy.blue" : "whiteAlpha.100" }}
            onClick={() => setXOn(!xOn)}
            disabled={!cfg?.x}
            title={
              cfg?.x
                ? ""
                : "Add the X API keys + set X_PUBLISH_ENABLED=true to enable"
            }
          >
            {xOn ? "✓ " : ""}X{cfg?.x ? "" : " (needs API keys)"}
          </Button>
        )}
      </HStack>

      {/* Editable captions per selected platform */}
      <VStack align="stretch" gap={2} mb={2}>
        {fb && p?.facebook && (
          <Box>
            <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={0.5}>
              FACEBOOK CAPTION
            </Text>
            <Textarea
              {...ta}
              value={fbCaption}
              onChange={(e) => setFbCaption(e.target.value)}
            />
            <Text
              color="whiteAlpha.600"
              fontSize="10px"
              fontWeight="700"
              mt={2}
              mb={0.5}
            >
              FACEBOOK FIRST COMMENT (auto-posted — pin it manually)
            </Text>
            <Textarea
              {...ta}
              rows={2}
              value={fbPinned}
              onChange={(e) => setFbPinned(e.target.value)}
            />
          </Box>
        )}
        {ig && p?.reels && (
          <Box>
            <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={0.5}>
              INSTAGRAM CAPTION
            </Text>
            <Textarea
              {...ta}
              value={igCaption}
              onChange={(e) => setIgCaption(e.target.value)}
            />
            <Text
              color="whiteAlpha.600"
              fontSize="10px"
              fontWeight="700"
              mt={2}
              mb={0.5}
            >
              INSTAGRAM FIRST COMMENT (auto-posted — pin it manually)
            </Text>
            <Textarea
              {...ta}
              rows={2}
              value={igPinned}
              onChange={(e) => setIgPinned(e.target.value)}
            />
          </Box>
        )}
        {th && p?.threads && (
          <Box>
            <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={0.5}>
              THREADS TEXT (≤500 chars)
            </Text>
            <Textarea
              {...ta}
              value={threadsText}
              maxLength={500}
              onChange={(e) => setThreadsText(e.target.value)}
            />
            <Text
              color="whiteAlpha.600"
              fontSize="10px"
              fontWeight="700"
              mt={2}
              mb={0.5}
            >
              THREADS TOPIC TAG (one clickable tag — # optional)
            </Text>
            <Input
              size="sm"
              bg="whiteAlpha.50"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              fontSize="sm"
              value={threadsTopicTag}
              maxLength={50}
              placeholder="e.g. gaming"
              onChange={(e) => setThreadsTopicTag(e.target.value)}
            />
            <Text color="whiteAlpha.600" fontSize="10px" mt={1}>
              Threads allows one clickable topic tag; extra #tags in the text
              show as plain grey words.
            </Text>
            <Text
              color="whiteAlpha.600"
              fontSize="10px"
              fontWeight="700"
              mt={2}
              mb={0.5}
            >
              THREADS FIRST REPLY (auto-posted — pin it manually)
            </Text>
            <Textarea
              {...ta}
              rows={2}
              maxLength={500}
              value={threadsPinned}
              onChange={(e) => setThreadsPinned(e.target.value)}
            />
          </Box>
        )}
        {xOn && p?.x && (
          <Box>
            <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={0.5}>
              X POST (≤280 — the link is fine in the post)
            </Text>
            <Textarea
              {...ta}
              value={xPost}
              maxLength={280}
              onChange={(e) => setXPost(e.target.value)}
            />
            <Text
              color="whiteAlpha.600"
              fontSize="10px"
              fontWeight="700"
              mt={2}
              mb={0.5}
            >
              X FIRST REPLY (optional)
            </Text>
            <Textarea
              {...ta}
              value={xReply}
              maxLength={280}
              onChange={(e) => setXReply(e.target.value)}
            />
          </Box>
        )}
      </VStack>

      {(fb || ig || th || xOn) && (
        <Box
          mb={2}
          p={3}
          borderRadius="lg"
          bg="blackAlpha.400"
          border="1px solid"
          borderColor="nexzy.blue/40"
        >
          <Text color="nexzy.white" fontSize="xs" fontWeight="700" mb={2}>
            📋 Exactly what will publish when you press Publish now
          </Text>
          <VStack align="stretch" gap={3}>
            {fb && p?.facebook && (
              <Box>
                <Text
                  color="nexzy.lightBlue"
                  fontSize="11px"
                  fontWeight="700"
                  mb={1}
                >
                  ▸ Facebook — video Reel + comment
                </Text>
                <Text
                  color={videoUrl ? "green.300" : "orange.300"}
                  fontSize="xs"
                  mb={1}
                >
                  🎬 Video:{" "}
                  {videoUrl
                    ? "✓ uploaded — posts as a Reel"
                    : "⚠ none uploaded yet (required)"}
                </Text>
                <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700">
                  CAPTION (posts exactly as shown)
                </Text>
                <Text
                  color="nexzy.gray.100"
                  fontSize="xs"
                  whiteSpace="pre-wrap"
                  mb={fbPinned.trim() ? 1 : 0}
                >
                  {fbCaption.trim() || "— empty —"}
                </Text>
                {fbPinned.trim() && (
                  <>
                    <Text
                      color="whiteAlpha.600"
                      fontSize="10px"
                      fontWeight="700"
                    >
                      FIRST COMMENT (auto-posted, not pinned)
                    </Text>
                    <Text
                      color="nexzy.gray.100"
                      fontSize="xs"
                      whiteSpace="pre-wrap"
                    >
                      {fbPinned}
                    </Text>
                  </>
                )}
              </Box>
            )}
            {ig && p?.reels && (
              <Box>
                <Text
                  color="nexzy.lightBlue"
                  fontSize="11px"
                  fontWeight="700"
                  mb={1}
                >
                  ▸ Instagram — video Reel + comment
                </Text>
                <Text
                  color={videoUrl ? "green.300" : "orange.300"}
                  fontSize="xs"
                  mb={1}
                >
                  🎬 Video:{" "}
                  {videoUrl
                    ? "✓ uploaded — posts as a Reel"
                    : "⚠ none uploaded yet (required)"}
                </Text>
                <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700">
                  CAPTION (posts exactly as shown)
                </Text>
                <Text
                  color="nexzy.gray.100"
                  fontSize="xs"
                  whiteSpace="pre-wrap"
                  mb={igPinned.trim() ? 1 : 0}
                >
                  {igCaption.trim() || "— empty —"}
                </Text>
                {igPinned.trim() && (
                  <>
                    <Text
                      color="whiteAlpha.600"
                      fontSize="10px"
                      fontWeight="700"
                    >
                      FIRST COMMENT (auto-posted, not pinned)
                    </Text>
                    <Text
                      color="nexzy.gray.100"
                      fontSize="xs"
                      whiteSpace="pre-wrap"
                    >
                      {igPinned}
                    </Text>
                  </>
                )}
              </Box>
            )}
            {th && p?.threads && (
              <Box>
                <Text
                  color="nexzy.lightBlue"
                  fontSize="11px"
                  fontWeight="700"
                  mb={1}
                >
                  ▸ Threads — text post (no video)
                </Text>
                <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700">
                  TEXT (posts exactly as shown)
                </Text>
                <Text
                  color="nexzy.gray.100"
                  fontSize="xs"
                  whiteSpace="pre-wrap"
                  mb={1}
                >
                  {threadsText.trim() || "— empty —"}
                </Text>
                <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
                  🏷 Topic tag:{" "}
                  {threadsTopicTag.trim()
                    ? "#" + threadsTopicTag.trim().replace(/^#/, "")
                    : "none"}
                </Text>
                {threadsPinned.trim() && (
                  <>
                    <Text
                      color="whiteAlpha.600"
                      fontSize="10px"
                      fontWeight="700"
                    >
                      FIRST REPLY (auto-posted)
                    </Text>
                    <Text
                      color="nexzy.gray.100"
                      fontSize="xs"
                      whiteSpace="pre-wrap"
                    >
                      {threadsPinned}
                    </Text>
                  </>
                )}
              </Box>
            )}
            {xOn && p?.x && (
              <Box>
                <Text
                  color="nexzy.lightBlue"
                  fontSize="11px"
                  fontWeight="700"
                  mb={1}
                >
                  ▸ X{cfg?.x ? "" : " (disabled — needs API keys)"}
                </Text>
                <Text
                  color="whiteAlpha.600"
                  fontSize="10px"
                  fontWeight="700"
                >
                  POST (posts exactly as shown)
                </Text>
                <Text
                  color="nexzy.gray.100"
                  fontSize="xs"
                  whiteSpace="pre-wrap"
                  mb={xReply.trim() ? 1 : 0}
                >
                  {xPost.trim() || "— empty —"}
                </Text>
                {xReply.trim() && (
                  <>
                    <Text
                      color="whiteAlpha.600"
                      fontSize="10px"
                      fontWeight="700"
                    >
                      FIRST REPLY
                    </Text>
                    <Text
                      color="nexzy.gray.100"
                      fontSize="xs"
                      whiteSpace="pre-wrap"
                    >
                      {xReply}
                    </Text>
                  </>
                )}
              </Box>
            )}
          </VStack>
        </Box>
      )}

      <Text fontSize="xs" color="whiteAlpha.600" mb={2}>
        Make sure nexzy_app is a <b>public</b> account, or the API will reject
        the post.
      </Text>

      {publishBlockers.length > 0 && (
        <VStack align="stretch" gap={0.5} mb={2}>
          {publishBlockers.map((b) => (
            <Text key={b} color="orange.300" fontSize="xs">
              ⚠ {b}
            </Text>
          ))}
        </VStack>
      )}

      <Button
        size="sm"
        colorPalette="blue"
        onClick={publish}
        loading={publishing}
        loadingText="Publishing…"
        disabled={!canPublish}
      >
        Publish now
      </Button>

      {results && (
        <VStack align="stretch" gap={0.5} mt={2}>
          {results.map((r, i) => (
            <Text
              key={i}
              fontSize="xs"
              color={r.ok ? "green.200" : r.skipped ? "whiteAlpha.500" : "red.300"}
            >
              {r.platform}:{" "}
              {r.skipped
                ? "skipped (off / not configured)"
                : r.ok
                  ? `✓ posted (${r.id})`
                  : `✗ ${r.error}`}
            </Text>
          ))}
        </VStack>
      )}

      {/* Attach a manually-posted YouTube video → real analytics join the loop */}
      <Box mt={3} pt={3} borderTop="1px solid" borderColor="whiteAlpha.200">
        <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={1}>
          YOUTUBE — PASTE THE VIDEO URL TO PULL ITS ANALYTICS
        </Text>
        <HStack gap={2}>
          <Input
            size="sm"
            placeholder="https://youtu.be/… or /shorts/…"
            value={ytUrl}
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            onChange={(e) => setYtUrl(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            color="nexzy.gray.100"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={attachYt}
            loading={ytBusy}
            loadingText="Fetching…"
            disabled={!ytUrl.trim()}
          >
            Fetch
          </Button>
        </HStack>
      </Box>

      {/* Real performance — pulled from the published posts' ids */}
      {(published || ytAttached) && (
        <Box mt={3} pt={3} borderTop="1px solid" borderColor="whiteAlpha.200">
          <Flex justify="space-between" align="center" mb={1} gap={2}>
            <Text color="nexzy.white" fontWeight="700" fontSize="sm">
              📊 Performance
            </Text>
            <Button
              size="xs"
              variant="outline"
              color="nexzy.gray.100"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={refreshInsights}
              loading={refreshing}
              loadingText="Refreshing…"
            >
              ↻ Refresh
            </Button>
          </Flex>
          {insights.length === 0 ? (
            <Text fontSize="xs" color="whiteAlpha.500">
              No numbers yet — hit Refresh (they mature over a day or two).
            </Text>
          ) : (
            <VStack align="stretch" gap={0.5}>
              {insights.map((it, i) => (
                <Text key={i} fontSize="xs" color="nexzy.gray.100">
                  <b>{it.platform}:</b>{" "}
                  {it.error
                    ? `— (${it.error})`
                    : Object.entries(it.metrics)
                        .map(([k, v]) => `${k} ${v.toLocaleString()}`)
                        .join(" · ") || "—"}
                </Text>
              ))}
            </VStack>
          )}
        </Box>
      )}
    </Box>
  );
}

function SuggestionCard({
  s,
  onDone,
  isOwner,
  onBudget,
  writers,
}: {
  s: ContentSuggestion;
  onDone: (id: string) => void;
  isOwner: boolean;
  onBudget: () => void;
  writers: string[];
}) {
  const [busy, setBusy] = useState<
    "skip" | "use" | "script" | "produce" | "rescript" | null
  >(null);
  const [gen, setGen] = useState<ContentSuggestion | null>(null);
  const view = gen ?? s;
  const fld = {
    size: "sm" as const,
    bg: "whiteAlpha.50",
    color: "nexzy.white",
    borderColor: "whiteAlpha.300",
    _placeholder: { color: "whiteAlpha.500" },
  };
  const [showProduce, setShowProduce] = useState(false);
  const [produced, setProduced] = useState<{
    videoSlug: string;
    gameLinked: boolean;
  } | null>(null);
  const [pTitle, setPTitle] = useState("");
  const [pYoutube, setPYoutube] = useState("");
  const [pTiktok, setPTiktok] = useState("");
  const [pReels, setPReels] = useState("");
  const [pFacebook, setPFacebook] = useState("");
  const [pThumb, setPThumb] = useState("");
  const platforms = view.payload?.platforms;
  const isLong = view.payload?.format === "long";
  const longform = view.payload?.longform;
  const decision = view.payload?.decision;
  const fmt = view.payload?.format;
  const postTiming = view.payload?.postTiming;
  const editorReport = view.payload?.editorReport ?? [];
  const editorFixes = editorReport.filter((n) => n.level === "fixed");
  const editorFlags = editorReport.filter((n) => n.level === "flag");
  const editorRewrites = editorReport.filter((n) => n.level === "rewrite");
  // Non-video formats the format brain can recommend (copy-only cards).
  const isNonVideo =
    fmt === "poll" ||
    fmt === "pinned_comment" ||
    fmt === "text_post" ||
    fmt === "none";
  // Deal IMAGE card: a static graphic + overlay text + captions — no video,
  // no ElevenLabs, no Produce-to-/videos.
  const isImage = fmt === "image";
  const dealImageUrl = view.payload?.dealImageUrl ?? null;
  const onScreen = view.payload?.onScreenText ?? [];
  const [persona, setPersona] = useState(s.author);
  const [draft, setDraft] = useState(view.ttsScript ?? "");
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [scriptSteer, setScriptSteer] = useState("");
  const credits = view.charCount ?? view.ttsScript?.length ?? 0;
  const secs = Math.max(1, Math.round(credits / 15)); // ~15 chars/sec speech
  // Keep the editable draft in sync when the script is (re)generated.
  useEffect(() => {
    setDraft(view.ttsScript ?? "");
  }, [view.ttsScript]);
  const dirty = draft.trim() !== (view.ttsScript ?? "").trim();

  const act = async (kind: "skip" | "use") => {
    setBusy(kind);
    try {
      if (kind === "skip") await skipContentSuggestion(s.id);
      else await useContentSuggestion(s.id);
      onDone(s.id);
      if (kind === "use") onBudget();
    } catch {
      setBusy(null);
    }
  };

  const regen = async () => {
    setBusy("script");
    try {
      // Rebuild the WHOLE card (hook/script/kits/hashtags/TTS) in the voice.
      setGen(await regenerateContentCard(s.id, persona));
    } catch {
      /* leave as-is on failure */
    } finally {
      setBusy(null);
    }
  };

  const regenScript = async () => {
    setBusy("rescript");
    try {
      // Regenerate ONLY the ElevenLabs script, honoring the steer note.
      setGen(
        await regenerateScript(s.id, persona, scriptSteer.trim() || undefined),
      );
      setScriptSteer("");
    } catch {
      /* keep the current script on failure */
    } finally {
      setBusy(null);
    }
  };

  const saveScript = async () => {
    setSaving(true);
    try {
      setGen(await updateContentScript(s.id, draft));
    } catch {
      /* keep the edit in the box on failure */
    } finally {
      setSaving(false);
    }
  };

  const openProduce = () => {
    setPTitle(view.payload?.platforms?.youtube?.title ?? s.title);
    setShowProduce((v) => !v);
  };
  const produce = async () => {
    setBusy("produce");
    try {
      const r = await produceContentVideo(s.id, {
        title: pTitle.trim() || undefined,
        youtubeUrl: pYoutube.trim() || undefined,
        tiktokUrl: pTiktok.trim() || undefined,
        reelsUrl: pReels.trim() || undefined,
        facebookUrl: pFacebook.trim() || undefined,
        thumbnailUrl: pThumb.trim() || undefined,
      });
      setProduced({ videoSlug: r.videoSlug, gameLinked: r.gameLinked });
      setShowProduce(false);
      onBudget();
    } catch {
      /* leave the form open on failure */
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <Flex justify="space-between" align="flex-start" gap={3} mb={2}>
        <HStack gap={2} wrap="wrap" flex={1} minW={0}>
          <Badge
            colorPalette={LANE_COLOR[s.lane ?? ""] || "gray"}
            variant="solid"
          >
            {(s.lane ?? "clip").toUpperCase()}
          </Badge>
          {isLong && (
            <Badge colorPalette="purple" variant="solid">
              LONG-FORM
            </Badge>
          )}
          {isImage && (
            <Badge colorPalette="pink" variant="solid">
              IMAGE
            </Badge>
          )}
          {isNonVideo && (
            <Badge
              colorPalette={fmt === "none" ? "gray" : "yellow"}
              variant="solid"
            >
              {fmt === "none"
                ? "NO VIDEO"
                : String(fmt).replace(/_/g, " ").toUpperCase()}
            </Badge>
          )}
          {decision?.when && decision.when !== "now" && (
            <Badge colorPalette="gray" variant="subtle">
              {decision.when === "pre_event" ? "PRE-EVENT" : "SCHEDULE"}
            </Badge>
          )}
          <Badge colorPalette="blue" variant="solid">
            ✍ {view.author}
          </Badge>
          <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
            {s.title}
          </Text>
        </HStack>
        <HStack gap={1}>
          <Button
            size="xs"
            variant="ghost"
            color="nexzy.gray.100"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand card" : "Collapse card"}
          >
            {collapsed ? "▸" : "▾"}
          </Button>
          {s.kind === "video" && !produced && !isNonVideo && !isImage && (
            <Button
              size="xs"
              colorPalette="green"
              variant="solid"
              onClick={openProduce}
            >
              🎬 Produce
            </Button>
          )}
          <Button
            size="xs"
            colorPalette="green"
            variant="outline"
            onClick={() => act("use")}
            loading={busy === "use"}
            loadingText="…"
          >
            ✓ Used
          </Button>
          <Button
            size="xs"
            variant="ghost"
            color="nexzy.gray.100"
            _hover={{ bg: "whiteAlpha.100", color: "red.300" }}
            onClick={() => act("skip")}
            loading={busy === "skip"}
            loadingText="…"
          >
            Skip
          </Button>
        </HStack>
      </Flex>

      {!collapsed && (
        <>
      {produced && (
        <Box
          mb={3}
          p={3}
          borderRadius="lg"
          bg="green.500/10"
          border="1px solid"
          borderColor="green.400/40"
        >
          <Text fontSize="sm" color="green.200" mb={1}>
            ✓ Published to /videos
            {produced.gameLinked
              ? " and linked to the game."
              : " — no game resolved; attach one in the Videos tab."}
          </Text>
          <Link
            href={`/videos/${produced.videoSlug}`}
            target="_blank"
            color="nexzy.lightBlue"
            fontSize="sm"
          >
            View video →
          </Link>
        </Box>
      )}

      {s.kind === "video" && showProduce && !produced && !isNonVideo && !isImage && (
        <Box
          mb={3}
          p={3}
          borderWidth="1px"
          borderColor="green.400/40"
          borderRadius="lg"
          bg="green.500/5"
        >
          <Text fontSize="sm" fontWeight="700" color="nexzy.white" mb={2}>
            🎬 Publish this short to /videos
          </Text>
          <VStack align="stretch" gap={2}>
            <Input
              {...fld}
              value={pTitle}
              onChange={(e) => setPTitle(e.target.value)}
              placeholder="Title (prefilled from the YouTube kit)"
            />
            <Input
              {...fld}
              value={pYoutube}
              onChange={(e) => setPYoutube(e.target.value)}
              placeholder="YouTube URL (plays inline)"
            />
            <HStack gap={2}>
              <Input
                {...fld}
                value={pTiktok}
                onChange={(e) => setPTiktok(e.target.value)}
                placeholder="TikTok URL (optional)"
              />
              <Input
                {...fld}
                value={pReels}
                onChange={(e) => setPReels(e.target.value)}
                placeholder="Reels URL (optional)"
              />
            </HStack>
            <Input
              {...fld}
              value={pFacebook}
              onChange={(e) => setPFacebook(e.target.value)}
              placeholder="Facebook Reels URL (optional)"
            />
            <Input
              {...fld}
              value={pThumb}
              onChange={(e) => setPThumb(e.target.value)}
              placeholder="Thumbnail URL (optional — YouTube auto-derives)"
            />
            <HStack gap={2}>
              <Button
                size="sm"
                colorPalette="green"
                onClick={produce}
                loading={busy === "produce"}
                loadingText="Publishing…"
                disabled={
                  !pYoutube.trim() &&
                  !pTiktok.trim() &&
                  !pReels.trim() &&
                  !pFacebook.trim()
                }
              >
                Publish to /videos
              </Button>
              <Button
                size="sm"
                variant="ghost"
                color="nexzy.gray.100"
                onClick={() => setShowProduce(false)}
              >
                Cancel
              </Button>
            </HStack>
            <Text fontSize="xs" color="whiteAlpha.500">
              Creates a Nexzy video linked to this article&rsquo;s game (Nexzy
              videos rank first). At least one platform URL is required.
            </Text>
          </VStack>
        </Box>
      )}

      {/* ✎ What the Editor changed (Tier-1 completeness/structure guards) */}
      {editorReport.length > 0 && (
        <Box
          mb={3}
          p={2}
          borderRadius="md"
          bg={editorFlags.length ? "yellow.500/10" : "green.500/10"}
          border="1px solid"
          borderColor={editorFlags.length ? "yellow.400/40" : "green.400/40"}
        >
          <Text
            color={editorFlags.length ? "yellow.200" : "green.200"}
            fontSize="xs"
            fontWeight="700"
            mb={1}
          >
            ✎ Editor · {editorRewrites.length} rewritten · {editorFixes.length}{" "}
            fixed · {editorFlags.length} to check
          </Text>
          <VStack align="stretch" gap={0.5}>
            {editorRewrites.map((n, i) => (
              <Text key={`r${i}`} color="nexzy.lightBlue" fontSize="xs">
                ✎ {n.label}
              </Text>
            ))}
            {editorFixes.map((n, i) => (
              <Text key={`f${i}`} color="green.200" fontSize="xs">
                ✓ {n.label}
              </Text>
            ))}
            {editorFlags.map((n, i) => (
              <Text key={`w${i}`} color="yellow.200" fontSize="xs">
                ⚠ {n.label}
              </Text>
            ))}
          </VStack>
        </Box>
      )}

      {/* Format brain's recommendation (why this format) */}
      {decision?.reason && (
        <Box
          mb={3}
          p={2}
          borderRadius="md"
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <Text color="nexzy.gray.100" fontSize="xs">
            <b>Format brain:</b> {decision.reason}
          </Text>
        </Box>
      )}

      {/* Suggested posting time, carried from the lead */}
      {postTiming?.timing && (
        <Box
          mb={3}
          p={2}
          borderRadius="md"
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <Text color="nexzy.lightBlue" fontSize="xs">
            🕒 <b>When to post:</b> {postTiming.timing}
          </Text>
        </Box>
      )}

      {/* What the free YouTube signal grounded this card against (Phase 1) */}
      {(view.payload?.groundedOn?.length ?? 0) > 0 && (
        <Box
          mb={3}
          p={2}
          borderRadius="md"
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <Text color="nexzy.gray.100" fontSize="xs">
            🔎 <b>Grounded against</b> (top YouTube now):{" "}
            {(view.payload?.groundedOn ?? [])
              .map((g) => `${g.title}${g.views ? ` (${g.views})` : ""}`)
              .join(" · ")}
          </Text>
        </Box>
      )}

      {/* Non-video formats: ready-to-post copy with a Copy button */}
      {isNonVideo && fmt !== "none" && view.payload?.copy && (
        <Box
          mb={3}
          p={3}
          borderRadius="lg"
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <Flex justify="space-between" align="center" mb={1} gap={2}>
            <Text color="nexzy.lightBlue" fontSize="xs" fontWeight="700">
              Ready to post
            </Text>
            <CopyBtn text={view.payload.copy} label="Copy" />
          </Flex>
          <Text color="nexzy.white" fontSize="sm" whiteSpace="pre-wrap">
            {view.payload.copy}
          </Text>
        </Box>
      )}

      {/* Deal IMAGE card: the generated graphic + overlay lines + captions */}
      {isImage && (
        <VStack align="stretch" gap={3} mb={3}>
          {dealImageUrl && (
            <Box
              borderRadius="lg"
              overflow="hidden"
              border="1px solid"
              borderColor="whiteAlpha.200"
              maxW="360px"
            >
              <Image
                src={dealImageUrl}
                alt={s.title}
                w="100%"
                h="auto"
                display="block"
              />
            </Box>
          )}
          {dealImageUrl && (
            <Link
              href={dealImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              color="nexzy.lightBlue"
              fontSize="xs"
            >
              ⬇ Download image
            </Link>
          )}
          {onScreen.length > 0 && (
            <Box
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              p={3}
            >
              <Flex justify="space-between" align="center" mb={1} gap={2}>
                <Text color="nexzy.lightBlue" fontSize="xs" fontWeight="700">
                  ON-SCREEN TEXT (overlay on the image)
                </Text>
                <CopyBtn text={onScreen.join("\n")} label="Copy" />
              </Flex>
              <VStack align="stretch" gap={0.5}>
                {onScreen.map((line, i) => (
                  <Text key={i} color="nexzy.white" fontSize="sm">
                    {line}
                  </Text>
                ))}
              </VStack>
            </Box>
          )}
          {platforms && (
            <VStack align="stretch" gap={2}>
              <KitBlock name="YouTube (community)" kit={platforms.youtube} />
              <KitBlock name="TikTok (Photo)" kit={platforms.tiktok} />
              <KitBlock name="Instagram" kit={platforms.reels} />
              <KitBlock name="Facebook" kit={platforms.facebook} />
              <KitBlock name="X (Twitter)" kit={platforms.x} />
            </VStack>
          )}
        </VStack>
      )}

      {/* The script */}
      <VStack align="stretch" gap={1} mb={3}>
        {view.hook && (
          <Text color="nexzy.white" fontSize="sm">
            <b>Hook:</b> {view.hook}
          </Text>
        )}
        {view.script && !isNonVideo && (
          <Text color="nexzy.gray.100" fontSize="sm" whiteSpace="pre-wrap">
            {view.script}
          </Text>
        )}
        {view.payload?.cta && (
          <Text color="nexzy.gray.100" fontSize="xs">
            📣 CTA: {view.payload.cta}
          </Text>
        )}
        {view.url && (
          <Link
            href={view.url}
            target="_blank"
            rel="noopener noreferrer"
            color="nexzy.lightBlue"
            fontSize="xs"
          >
            Backing page ↗
          </Link>
        )}
      </VStack>

      {/* Publish this card straight to FB/IG Reels + a Threads text post */}
      {s.kind === "video" && !isNonVideo && !isImage && isOwner && (
        <PublishBox s={view} />
      )}

      {/* Collapsible: kits + ElevenLabs production block (fast board scanning) */}
      {!isNonVideo && !isImage && (
        <Button
          size="xs"
          variant="ghost"
          color="nexzy.gray.100"
          _hover={{ bg: "whiteAlpha.100", color: "nexzy.white" }}
          onClick={() => setShowDetails((v) => !v)}
          mb={2}
        >
          {showDetails ? "▾ Hide" : "▸ Show"} kits &amp; ElevenLabs script
          {view.ttsScript
            ? ` · ~${secs}s · ${credits.toLocaleString()} credits`
            : ""}
        </Button>
      )}

      {!isNonVideo && !isImage && showDetails && (
        <>
          {/* Per-platform posting kits */}
          {platforms && (
            <VStack align="stretch" gap={2}>
              <KitBlock
                name={isLong ? "YouTube (Long-form)" : "YouTube Shorts"}
                kit={platforms.youtube}
              />
              <KitBlock
                name={isLong ? "TikTok (teaser)" : "TikTok"}
                kit={platforms.tiktok}
              />
              <KitBlock
                name={isLong ? "Instagram Reels (teaser)" : "Instagram Reels"}
                kit={platforms.reels}
              />
              <KitBlock
                name={isLong ? "Facebook Reels (teaser)" : "Facebook Reels"}
                kit={platforms.facebook}
              />
              <KitBlock name="Threads (text take)" kit={platforms.threads} />
              <KitBlock name="X (Twitter)" kit={platforms.x} />
            </VStack>
          )}

          {/* Long-form plan: chapters + thumbnail + teaser advice */}
          {isLong && longform && (
            <Box
              mt={3}
              pt={3}
              borderTop="1px solid"
              borderColor="whiteAlpha.200"
            >
              <Text color="nexzy.white" fontWeight="700" fontSize="sm" mb={2}>
                Long-form plan (YouTube)
              </Text>
              {longform.thumbnailConcept && (
                <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
                  <Text as="span" color="nexzy.white" fontWeight="600">
                    Thumbnail:{" "}
                  </Text>
                  {longform.thumbnailConcept}
                </Text>
              )}
              {Array.isArray(longform.chapters) &&
                longform.chapters.length > 0 && (
                  <VStack align="stretch" gap={1} mb={2}>
                    {longform.chapters.map((c, i) => (
                      <HStack key={i} gap={2} align="baseline">
                        <Text
                          color="nexzy.blue"
                          fontSize="xs"
                          fontWeight="700"
                          minW="38px"
                        >
                          {c.timestamp ?? ""}
                        </Text>
                        <Text
                          color="nexzy.white"
                          fontSize="xs"
                          fontWeight="600"
                        >
                          {c.title}
                        </Text>
                        {c.summary && (
                          <Text color="nexzy.gray.100" fontSize="xs">
                            — {c.summary}
                          </Text>
                        )}
                      </HStack>
                    ))}
                  </VStack>
                )}
              {longform.teaserAdvice && (
                <Text color="nexzy.gray.100" fontSize="xs">
                  <Text as="span" color="nexzy.white" fontWeight="600">
                    Teasers:{" "}
                  </Text>
                  {longform.teaserAdvice}
                </Text>
              )}
            </Box>
          )}

          {/* ElevenLabs shorts script + production notes */}
          <Box mt={3} pt={3} borderTop="1px solid" borderColor="whiteAlpha.200">
            {isOwner && (
              <Flex gap={2} align="center" wrap="wrap">
                {writers.length > 1 && (
                  <HStack gap={1}>
                    <Text color="nexzy.gray.100" fontSize="xs">
                      Voice:
                    </Text>
                    {writers.map((w) => {
                      const active = persona === w;
                      return (
                        <Button
                          key={w}
                          size="xs"
                          onClick={() => setPersona(w)}
                          bg={active ? "nexzy.blue" : "transparent"}
                          color={active ? "white" : "nexzy.gray.100"}
                          borderWidth="1px"
                          borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
                          _hover={{
                            bg: active ? "nexzy.blue" : "whiteAlpha.100",
                          }}
                        >
                          {w}
                        </Button>
                      );
                    })}
                  </HStack>
                )}
                <Button
                  size="xs"
                  colorPalette="purple"
                  variant={view.ttsScript ? "outline" : "solid"}
                  onClick={regen}
                  loading={busy === "script"}
                  loadingText="Regenerating…"
                >
                  {view.ttsScript
                    ? "↻ Regenerate in " + persona + "\u2019s voice"
                    : "🎙 Generate in " + persona + "\u2019s voice"}
                </Button>
                {view.ttsScript && (
                  <HStack gap={1} flex={1} minW="220px">
                    <Input
                      size="xs"
                      bg="whiteAlpha.50"
                      color="nexzy.white"
                      borderColor="whiteAlpha.300"
                      fontSize="xs"
                      placeholder="steer the script (e.g. more excited, less sarcastic)"
                      value={scriptSteer}
                      onChange={(e) => setScriptSteer(e.target.value)}
                    />
                    <Button
                      size="xs"
                      colorPalette="purple"
                      variant="solid"
                      onClick={regenScript}
                      loading={busy === "rescript"}
                      loadingText="Rewriting…"
                      disabled={!scriptSteer.trim()}
                    >
                      ↻ Script only
                    </Button>
                  </HStack>
                )}
              </Flex>
            )}
            {view.ttsScript && (
              <VStack align="stretch" gap={2} mt={2}>
                <Box
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="lg"
                  p={3}
                >
                  <Flex justify="space-between" align="center" mb={1} gap={2}>
                    <Text
                      color="nexzy.lightBlue"
                      fontSize="xs"
                      fontWeight="700"
                    >
                      ElevenLabs script · {draft.length.toLocaleString()}{" "}
                      credits · ~{Math.max(1, Math.round(draft.length / 15))}s
                    </Text>
                    <HStack gap={1}>
                      {isOwner && dirty && (
                        <Button
                          size="xs"
                          colorPalette="green"
                          variant="outline"
                          onClick={saveScript}
                          loading={saving}
                          loadingText="Saving…"
                        >
                          Save
                        </Button>
                      )}
                      <CopyBtn text={draft} label="Copy script" />
                    </HStack>
                  </Flex>
                  {isOwner ? (
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={8}
                      bg="whiteAlpha.50"
                      color="nexzy.white"
                      borderColor="whiteAlpha.300"
                      fontSize="sm"
                    />
                  ) : (
                    <Text
                      color="nexzy.gray.100"
                      fontSize="sm"
                      whiteSpace="pre-wrap"
                    >
                      {view.ttsScript}
                    </Text>
                  )}
                </Box>
                {/* One production block: everything you hand the editor to
                    actually cut the video — delivery, music, footage, captions. */}
                <Box
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="lg"
                  p={3}
                >
                  <Text
                    color="nexzy.lightBlue"
                    fontSize="xs"
                    fontWeight="700"
                    mb={1.5}
                  >
                    🎬 Production notes
                  </Text>
                  <VStack align="stretch" gap={1.5}>
                    {view.payload?.voicePersona && (
                      <Text color="nexzy.gray.100" fontSize="xs">
                        🗣 <b>Delivery:</b> {view.payload.voicePersona}
                      </Text>
                    )}
                    {view.payload?.music && (
                      <Text color="nexzy.gray.100" fontSize="xs">
                        🎵 <b>Music:</b> {view.payload.music}
                      </Text>
                    )}
                    {(view.payload?.backgroundVideo?.length ?? 0) > 0 && (
                      <Text color="nexzy.gray.100" fontSize="xs">
                        🎞 <b>Background footage:</b>{" "}
                        {(view.payload?.backgroundVideo ?? []).join(" · ")}
                      </Text>
                    )}
                    {(view.payload?.brollSfx?.length ?? 0) > 0 ? (
                      <Text color="nexzy.gray.100" fontSize="xs">
                        🎬 <b>B-roll / SFX:</b>{" "}
                        {(view.payload?.brollSfx ?? []).join(" · ")}
                      </Text>
                    ) : (
                      view.payload?.broll && (
                        <Text color="nexzy.gray.100" fontSize="xs">
                          🎬 <b>B-roll / SFX:</b> {view.payload.broll}
                        </Text>
                      )
                    )}
                    {(view.payload?.onScreenText?.length ?? 0) > 0 && (
                      <Text color="nexzy.gray.100" fontSize="xs">
                        💬 <b>On-screen text</b> (captions to overlay):{" "}
                        {(view.payload?.onScreenText ?? []).join(" · ")}
                      </Text>
                    )}
                  </VStack>
                </Box>
              </VStack>
            )}
          </Box>
        </>
      )}
        </>
      )}
    </Box>
  );
}

export default function ContentPanel({
  isOwner = false,
}: {
  isOwner?: boolean;
}) {
  const [items, setItems] = useState<ContentSuggestion[] | null>(null);
  const [budget, setBudget] = useState<TtsBudget | null>(null);
  const [writers, setWriters] = useState<string[]>(["Chuy", "Eli", "Leslie"]);
  const loadBudget = () => {
    getTtsBudget()
      .then(setBudget)
      .catch(() => {});
  };

  useEffect(() => {
    getContentSuggestions()
      .then(setItems)
      .catch(() => setItems([]));
    loadBudget();
    getWriterNames()
      .then(setWriters)
      .catch(() => {});
  }, []);

  const remove = (id: string) =>
    setItems((xs) => (xs ? xs.filter((x) => x.id !== id) : xs));

  // Suggestions shows ONLY generated video cards. Leads (kind "video_lead")
  // live in the Leads tab; guide leads live in Guides & Walkthroughs.
  const cards = items?.filter((s) => s.kind === "video") ?? null;

  return (
    <VStack align="stretch" gap={5}>
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Generated video cards
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          The finished, ready-to-shoot content generated from your leads —
          3-beat script, per-platform posting kits, and the ElevenLabs script.
          Generate new ones from the <b>Leads</b> tab.
        </Text>
      </Box>

      {budget && (
        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          px={4}
          py={3}
        >
          <Flex justify="space-between" align="center" gap={2} wrap="wrap">
            <Text color="nexzy.white" fontSize="sm" fontWeight="600">
              🎙 ElevenLabs — {budget.remaining.toLocaleString()} of{" "}
              {budget.limit.toLocaleString()} credits left this month{" "}
              <Text as="span" color="nexzy.gray.100" fontWeight="400">
                (~{Math.round(budget.remaining / 900)} min)
              </Text>
            </Text>
            <Text color="nexzy.gray.100" fontSize="xs">
              {budget.source === "elevenlabs"
                ? "live from ElevenLabs"
                : "local estimate"}{" "}
              · resets {new Date(budget.resetsOn).toLocaleDateString()}
            </Text>
          </Flex>
          <Box
            mt={2}
            h="6px"
            bg="whiteAlpha.200"
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              h="full"
              bg="nexzy.blue"
              w={`${Math.max(0, Math.min(100, (budget.used / budget.limit) * 100))}%`}
            />
          </Box>
        </Box>
      )}

      <Text color="nexzy.gray.100" fontSize="sm">
        {cards === null
          ? ""
          : `${cards.length} generated card${cards.length === 1 ? "" : "s"}`}
      </Text>

      {cards === null ? (
        <Flex justify="center" py={8}>
          <Spinner color="nexzy.blue" size="lg" />
        </Flex>
      ) : cards.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          No generated cards yet. Head to the <b>Leads</b> tab, pick a writer +
          format, and hit Generate — the finished card shows up here.
        </Text>
      ) : (
        <VStack align="stretch" gap={4}>
          {cards.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              onDone={remove}
              isOwner={isOwner}
              onBudget={loadBudget}
              writers={writers}
            />
          ))}
        </VStack>
      )}
    </VStack>
  );
}
