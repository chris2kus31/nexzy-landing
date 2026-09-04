"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
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
  uploadContentImage,
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
/** A collapsible titled section — the Suggestions card is grouped into these
 *  (Review / Content / Kits / Voiceover / Publish) so it scans instead of walls. */
function Section({
  title,
  tag,
  tagColor = "gray",
  defaultOpen = false,
  children,
}: {
  title: string;
  tag?: string;
  tagColor?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      mb={3}
      overflow="hidden"
    >
      <Flex
        align="center"
        gap={2}
        px={3}
        py={2}
        cursor="pointer"
        bg="whiteAlpha.50"
        _hover={{ bg: "whiteAlpha.100" }}
        onClick={() => setOpen((v) => !v)}
      >
        <Text
          color="nexzy.gray.100"
          fontSize="xs"
          transform={open ? "rotate(90deg)" : "none"}
          transition="transform .15s"
        >
          ▶
        </Text>
        <Text color="nexzy.white" fontWeight="700" fontSize="sm" flex={1}>
          {title}
        </Text>
        {tag && (
          <Badge colorPalette={tagColor} variant="subtle" fontSize="10px">
            {tag}
          </Badge>
        )}
      </Flex>
      {open && (
        <Box p={3} pt={2}>
          {children}
        </Box>
      )}
    </Box>
  );
}

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
  // The model occasionally returns thread items / poll options as OBJECTS
  // (e.g. {tweet: "..."}) instead of strings; rendering an object as a React
  // child throws (error #31). Coerce everything to text so the card can't crash.
  const toText = (v: unknown): string =>
    typeof v === "string"
      ? v
      : v && typeof v === "object"
        ? String(
            (v as Record<string, unknown>).tweet ??
              (v as Record<string, unknown>).text ??
              (v as Record<string, unknown>).option ??
              (v as Record<string, unknown>).content ??
              JSON.stringify(v),
          )
        : String(v ?? "");
  const thread = (
    Array.isArray(kit.thread) && kit.thread.length > 0 ? kit.thread : []
  ).map(toText);
  const poll =
    kit.poll && Array.isArray(kit.poll.options) && kit.poll.options.length > 0
      ? {
          question: toText(kit.poll.question),
          options: kit.poll.options.map(toText),
        }
      : null;
  const empty =
    !title &&
    !body &&
    !hashtags &&
    !tags &&
    !pinned &&
    !firstReply &&
    thread.length === 0 &&
    !poll;

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

      {/* YouTube only: the 2-3 ranked title candidates + why each was chosen
          (traced to the ranking signal), so the pick is informed. Option 0 is
          the one mirrored into TITLE above; we show the alternates to pick from. */}
      {(kit.titleOptions?.length ?? 0) > 0 && (
        <Box mt={2}>
          <FieldLabel
            text="RANKED TITLE OPTIONS"
            copy={(kit.titleOptions ?? [])
              .map((o) => o.title)
              .filter(Boolean)
              .join("\n")}
          />
          <VStack align="stretch" gap={1.5} mt={0.5}>
            {(kit.titleOptions ?? []).map((o, i) => (
              <Box key={i}>
                <Text
                  color={i === 0 ? "nexzy.white" : "nexzy.gray.100"}
                  fontSize="sm"
                  fontWeight={i === 0 ? "700" : "500"}
                >
                  {i === 0 ? "★ " : `${i + 1}. `}
                  {o.title}{" "}
                  <Text as="span" color="nexzy.gray.300" fontSize="2xs">
                    ({o.title.length}/60)
                  </Text>
                </Text>
                {o.why && (
                  <Text
                    color="nexzy.gray.300"
                    fontSize="2xs"
                    fontStyle="italic"
                  >
                    {o.why}
                  </Text>
                )}
              </Box>
            ))}
          </VStack>
        </Box>
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

      {thread.length > 0 && (
        <>
          <FieldLabel
            text="🧵 THREAD (post as replies, in order)"
            copy={thread.join("\n\n")}
          />
          <VStack align="stretch" gap={1} mt={0.5}>
            {thread.map((t, i) => (
              <Text
                key={i}
                color="nexzy.gray.100"
                fontSize="xs"
                whiteSpace="pre-wrap"
              >
                {i + 1}. {t}
              </Text>
            ))}
          </VStack>
        </>
      )}

      {poll && (
        <>
          <FieldLabel
            text="📊 POLL"
            copy={[poll.question, ...(poll.options || [])]
              .filter(Boolean)
              .join("\n")}
          />
          {poll.question && (
            <Text color="nexzy.gray.100" fontSize="xs" whiteSpace="pre-wrap">
              {poll.question}
            </Text>
          )}
          <VStack align="stretch" gap={0.5} mt={0.5}>
            {(poll.options || []).map((o, i) => (
              <Text key={i} color="nexzy.lightBlue" fontSize="xs">
                • {o}
              </Text>
            ))}
          </VStack>
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
          <FieldLabel
            text="📌 PINNED COMMENT — pin after posting"
            copy={pinned}
          />
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
  // Optional publish image — attaches to the X + Threads posts (JPEG/PNG ≤5MB).
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imageErr, setImageErr] = useState<string | null>(null);
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

  // Re-sync the editable publish fields when the card's GENERATED copy changes
  // (Regenerate swaps `view` for a fresh card). These are `useState` initializers,
  // which only run on mount — without this the box kept the pre-regenerate
  // captions and "Publish now" silently shipped stale copy. Compared against a
  // ref so ordinary re-renders never clobber the operator's manual edits.
  const srcKey = JSON.stringify([
    p?.facebook?.caption,
    p?.reels?.caption,
    p?.threads?.caption,
    p?.x?.post,
    p?.x?.firstReply,
  ]);
  const lastSrc = useRef(srcKey);
  useEffect(() => {
    if (lastSrc.current === srcKey) return;
    lastSrc.current = srcKey;
    setFbCaption(assembleCaption(p?.facebook));
    setIgCaption(assembleCaption(p?.reels));
    setThreadsText(assembleThreadsText(p?.threads));
    setThreadsTopicTag(firstTopicTag(p?.threads));
    setFbPinned(p?.facebook?.pinnedComment ?? "");
    setIgPinned(p?.reels?.pinnedComment ?? "");
    setThreadsPinned(p?.threads?.pinnedComment ?? "");
    setXPost(p?.x?.post ?? "");
    setXReply(p?.x?.firstReply ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcKey]);

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

  const uploadImg = async (file: File) => {
    setUploadingImg(true);
    setImageErr(null);
    try {
      const r = await uploadContentImage(s.id, file);
      setImageUrl(r.url);
    } catch (e) {
      setImageErr((e as Error)?.message || "Image upload failed.");
    } finally {
      setUploadingImg(false);
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
        imageUrl: imageUrl ?? undefined,
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
  if (fb && !fbCaption.trim())
    publishBlockers.push("Facebook caption is empty.");
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

      {/* Optional image — attaches to the X + Threads posts (an image post
          reliably out-reaches bare text on both). JPEG/PNG, ≤5MB; kept in its
          original format (NO AVIF — X/Threads would reject it). */}
      {(th || xOn) && (
        <Box mb={2}>
          <Text
            color="whiteAlpha.600"
            fontSize="10px"
            fontWeight="700"
            mb={0.5}
          >
            IMAGE (OPTIONAL) — ATTACHES TO THE X + THREADS POSTS
          </Text>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            size="sm"
            p={1}
            color="nexzy.gray.100"
            borderColor="whiteAlpha.300"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadImg(f);
            }}
          />
          <Text fontSize="xs" color="nexzy.gray.100" mt={1}>
            {uploadingImg
              ? "Uploading…"
              : imageErr
                ? `✗ ${imageErr}`
                : imageUrl
                  ? "✓ Image attached — it will post with X and Threads."
                  : "JPEG/PNG up to 5MB. Leave empty for a text-only post."}
          </Text>
          {imageUrl && !uploadingImg && (
            <HStack gap={2} mt={1} align="center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="publish preview"
                style={{
                  height: 56,
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              />
              <Button
                size="xs"
                variant="outline"
                color="nexzy.gray.100"
                borderColor="whiteAlpha.300"
                onClick={() => setImageUrl(null)}
              >
                ✕ Remove image
              </Button>
            </HStack>
          )}
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
            <Text
              color="whiteAlpha.600"
              fontSize="10px"
              fontWeight="700"
              mb={0.5}
            >
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
            <Text
              color="whiteAlpha.600"
              fontSize="10px"
              fontWeight="700"
              mb={0.5}
            >
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
            <Text
              color="whiteAlpha.600"
              fontSize="10px"
              fontWeight="700"
              mb={0.5}
            >
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
            <Text
              color="whiteAlpha.600"
              fontSize="10px"
              fontWeight="700"
              mb={0.5}
            >
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
                  ▸ Threads — {imageUrl ? "image post" : "text post (no video)"}
                </Text>
                {imageUrl && (
                  <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
                    🖼 Image attached
                  </Text>
                )}
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
                {imageUrl && (
                  <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
                    🖼 Image attached
                    {(p?.x?.poll?.options?.length ?? 0) > 0
                      ? " — the poll will be DROPPED (X can't combine them)"
                      : ""}
                  </Text>
                )}
                <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700">
                  POST (posts exactly as shown)
                </Text>
                <Text
                  color="nexzy.gray.100"
                  fontSize="xs"
                  whiteSpace="pre-wrap"
                  mb={1}
                >
                  {xPost.trim() || "— empty —"}
                </Text>
                {(p?.x?.thread?.length ?? 0) > 0 && (
                  <>
                    <Text
                      color="whiteAlpha.600"
                      fontSize="10px"
                      fontWeight="700"
                    >
                      THREAD (posted as chained replies)
                    </Text>
                    {(p?.x?.thread ?? []).map((t, i) => (
                      <Text
                        key={i}
                        color="nexzy.gray.100"
                        fontSize="xs"
                        whiteSpace="pre-wrap"
                      >
                        {i + 1}. {t}
                      </Text>
                    ))}
                  </>
                )}
                {(p?.x?.poll?.options?.length ?? 0) > 0 && (
                  <>
                    <Text
                      color="whiteAlpha.600"
                      fontSize="10px"
                      fontWeight="700"
                      mt={1}
                    >
                      POLL (attached to the post)
                    </Text>
                    {(p?.x?.poll?.options ?? []).map((o, i) => (
                      <Text key={i} color="nexzy.lightBlue" fontSize="xs">
                        • {o}
                      </Text>
                    ))}
                  </>
                )}
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
              color={
                r.ok ? "green.200" : r.skipped ? "whiteAlpha.500" : "red.300"
              }
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

function aspectToFmt(aspect?: string): string {
  if (aspect === "1:1") return "square";
  if (aspect === "9:16") return "story";
  if (aspect === "16:9") return "wide";
  return "universal";
}

function SuggestionCard({
  s,
  onDone,
  isOwner,
  onBudget,
  writers,
  onSendToCards,
}: {
  s: ContentSuggestion;
  onDone: (id: string) => void;
  isOwner: boolean;
  onBudget: () => void;
  writers: string[];
  onSendToCards?: (s: {
    format?: string;
    template?: string;
    title?: string;
    slides: string[][];
  }) => void;
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
  // Quick Announcement: X + Threads-only social card (fast text update, no video).
  const isQuick = fmt === "quick";
  const dealImageUrl = view.payload?.dealImageUrl ?? null;
  const onScreen = view.payload?.onScreenText ?? [];
  // IMAGE CARD (DIY, format === "image_card"): copy-only — shared image title +
  // brief + per-platform captions. No image generated, no Produce/Publish/TTS.
  const isImageCard = fmt === "image_card";
  // SLIDE decks (Phase 3): carousel / photo / album — copy-only slide deck +
  // captions. Same "brief card" family as image_card — no video/TTS/Produce/Publish.
  const isSlideCard = fmt === "carousel" || fmt === "photo" || fmt === "album";
  const isBriefCard = isImageCard || isSlideCard;
  const slides = view.payload?.slides ?? [];
  const saveCta = view.payload?.saveCta ?? "";
  const slideLabel =
    fmt === "album"
      ? "ALBUM IMAGES"
      : fmt === "photo"
        ? "PHOTO SLIDES"
        : "CAROUSEL SLIDES";
  const imageBrief = view.payload?.imageBrief ?? "";
  const aspect = view.payload?.aspect ?? "";
  // The plan's platforms for THIS asset (stamped at generation). When present,
  // only those platforms' kits render — a photo deck planned for TikTok must
  // not show an X kit the plan never picked. Legacy cards (no forPlatforms)
  // keep showing every kit.
  const planPlats = view.payload?.forPlatforms ?? [];
  const inPlan = (p: string): boolean =>
    planPlats.length === 0 || planPlats.includes(p);
  const [persona, setPersona] = useState(s.author);
  const [draft, setDraft] = useState(view.ttsScript ?? "");
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [scriptSteer, setScriptSteer] = useState("");
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
          {isQuick && (
            <Badge colorPalette="teal" variant="solid">
              ⚡ QUICK
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
          {s.kind === "video" &&
            !produced &&
            !isNonVideo &&
            !isImage &&
            !isBriefCard &&
            !isQuick && (
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

      {/* HIDDEN, not unmounted — collapsing used to destroy PublishBox, taking
          the uploaded video URL, every caption edit and the publish receipt
          with it (forcing a re-upload of the finished file). */}
      <Box display={collapsed ? "none" : "block"}>
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

          {s.kind === "video" &&
            showProduce &&
            !produced &&
            !isNonVideo &&
            !isImage &&
            !isBriefCard &&
            !isQuick && (
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
                    Creates a Nexzy video linked to this article&rsquo;s game
                    (Nexzy videos rank first). At least one platform URL is
                    required.
                  </Text>
                </VStack>
              </Box>
            )}

          <Section
            title="Review & flags"
            tag={
              editorFlags.length ? `${editorFlags.length} to verify` : undefined
            }
            tagColor={editorFlags.length ? "yellow" : "green"}
            defaultOpen
          >
            {/* ✎ What the Editor changed (Tier-1 completeness/structure guards) */}
            {editorReport.length > 0 && (
              <Box
                mb={3}
                p={2}
                borderRadius="md"
                bg={editorFlags.length ? "yellow.500/10" : "green.500/10"}
                border="1px solid"
                borderColor={
                  editorFlags.length ? "yellow.400/40" : "green.400/40"
                }
              >
                <Text
                  color={editorFlags.length ? "yellow.200" : "green.200"}
                  fontSize="xs"
                  fontWeight="700"
                  mb={1}
                >
                  ✎ Editor · {editorRewrites.length} rewritten ·{" "}
                  {editorFixes.length} fixed · {editorFlags.length} to check
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

            {/* YouTube ranking signal was DOWN when this title was written — the
          title/description were blind-guessed, not grounded against what's
          ranking now. Only set on video cards (undefined elsewhere). */}
            {view.payload?.signalGrounded === false && (
              <Box
                mb={3}
                p={2}
                borderRadius="md"
                bg="orange.900"
                border="1px solid"
                borderColor="orange.400"
              >
                <Text color="orange.100" fontSize="xs">
                  ⚠️ <b>YouTube title not ranking-grounded</b>
                  {view.payload?.signalStatus === "no-key"
                    ? " — no YouTube API key configured"
                    : view.payload?.signalStatus === "quota-exhausted"
                      ? " — YouTube API quota exhausted"
                      : view.payload?.signalStatus === "disabled"
                        ? " — signal disabled"
                        : view.payload?.signalStatus === "error"
                          ? " — YouTube API error"
                          : ""}
                  . The title + description were written from the article alone
                  — give the YouTube title an extra pass before you post.
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
                  🔎 <b>Grounded against</b> (top YouTube now, by views/day):{" "}
                  {(view.payload?.groundedOn ?? [])
                    .map(
                      (g) =>
                        `${g.title}${g.perDay ? ` (${g.perDay})` : g.views ? ` (${g.views})` : ""}`,
                    )
                    .join(" · ")}
                </Text>
              </Box>
            )}

            {/* Deterministic title guardrail results — auto-trim happened, and/or
                the focus keyword isn't in the first ~3 words (can't auto-fix). */}
            {(view.payload?.titleFlags?.overLength ||
              view.payload?.titleFlags?.notKeywordFirst) && (
              <Box
                mb={3}
                p={2}
                borderRadius="md"
                bg="yellow.900"
                border="1px solid"
                borderColor="yellow.500"
              >
                <Text color="yellow.100" fontSize="xs">
                  ✂️ <b>Title guardrail:</b>{" "}
                  {view.payload?.titleFlags?.overLength && (
                    <>
                      auto-trimmed to ≤70 chars
                      {view.payload?.titleFlags?.original
                        ? ` (was: "${view.payload.titleFlags.original}")`
                        : ""}
                      {view.payload?.titleFlags?.notKeywordFirst ? "; " : ""}
                    </>
                  )}
                  {view.payload?.titleFlags?.notKeywordFirst && (
                    <>
                      focus keyword isn&apos;t in the first ~3 words — reorder
                      it
                    </>
                  )}
                  .
                </Text>
              </Box>
            )}

            {/* Description guardrail — keyword not in the first ~150 chars (the
                search snippet), and/or a Shorts description that ran long. */}
            {(view.payload?.descFlags?.notKeywordFirst ||
              view.payload?.descFlags?.tooLong) && (
              <Box
                mb={3}
                p={2}
                borderRadius="md"
                bg="yellow.900"
                border="1px solid"
                borderColor="yellow.500"
              >
                <Text color="yellow.100" fontSize="xs">
                  ✂️ <b>Description guardrail:</b>{" "}
                  {view.payload?.descFlags?.notKeywordFirst && (
                    <>
                      focus keyword isn&apos;t in the first ~7 words (the search
                      snippet) — move it up
                      {view.payload?.descFlags?.tooLong ? "; " : ""}
                    </>
                  )}
                  {view.payload?.descFlags?.tooLong && (
                    <>
                      Shorts description is long — tighten to 1&ndash;2
                      sentences
                    </>
                  )}
                  .
                </Text>
              </Box>
            )}

            {/* Quality guardrails — audio SEO (keyword not spoken early) + a weak
                pinned comment. Only render when something actually fired. */}
            {(view.payload?.qualityFlags?.keywordNotSpokenEarly ||
              view.payload?.qualityFlags?.weakPinned ||
              view.payload?.qualityFlags?.fbKeywordLate) && (
              <Box
                mb={3}
                p={2}
                borderRadius="md"
                bg="orange.900"
                border="1px solid"
                borderColor="orange.400"
              >
                <Text color="orange.100" fontSize="xs">
                  🎙️ <b>Script/comment check:</b>{" "}
                  {view.payload?.qualityFlags?.keywordNotSpokenEarly && (
                    <>
                      the game/topic name isn&apos;t spoken in the first ~15s of
                      the script — YouTube ranks on the transcript, so say it up
                      front
                      {view.payload?.qualityFlags?.weakPinned ||
                      view.payload?.qualityFlags?.fbKeywordLate
                        ? "; "
                        : ""}
                    </>
                  )}
                  {view.payload?.qualityFlags?.weakPinned && (
                    <>
                      the pinned comment is a generic open-ender — make it a
                      this-or-that debate
                      {view.payload?.qualityFlags?.fbKeywordLate ? "; " : ""}
                    </>
                  )}
                  {view.payload?.qualityFlags?.fbKeywordLate && (
                    <>
                      the Facebook caption doesn&apos;t lead with the keyword in
                      the first ~125 chars (before &ldquo;See more&rdquo;) —
                      move it up
                    </>
                  )}
                  .
                </Text>
              </Box>
            )}

            {/* Hashtag A/B experiment variant used for this card's YouTube tail. */}
            {view.payload?.hashtagVariant && (
              <Text color="nexzy.gray.300" fontSize="2xs" mb={2}>
                🧪 Hashtag variant <b>{view.payload.hashtagVariant}</b>{" "}
                {view.payload.hashtagVariant === "A"
                  ? "(broad tail)"
                  : view.payload.hashtagVariant === "B"
                    ? "(branded tail · #Nexzy)"
                    : "(niche tail)"}{" "}
                — tracked in Audience → Hashtag A/B
              </Text>
            )}
          </Section>

          <Section title="Content" defaultOpen>
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
                      <Text
                        color="nexzy.lightBlue"
                        fontSize="xs"
                        fontWeight="700"
                      >
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
                    <KitBlock
                      name="YouTube (community)"
                      kit={platforms.youtube}
                    />
                    <KitBlock name="TikTok (Photo)" kit={platforms.tiktok} />
                    <KitBlock name="Instagram" kit={platforms.reels} />
                    <KitBlock name="Facebook" kit={platforms.facebook} />
                    <KitBlock name="X (Twitter)" kit={platforms.x} />
                  </VStack>
                )}
              </VStack>
            )}

            {/* IMAGE CARD (DIY): image brief + on-image text + per-platform captions.
          No image is generated — the brief is what you use to make it yourself. */}
            {isImageCard && (
              <VStack align="stretch" gap={3} mb={3}>
                {onSendToCards && (
                  <Button
                    size="xs"
                    variant="outline"
                    colorPalette="blue"
                    alignSelf="flex-start"
                    onClick={() =>
                      onSendToCards({
                        format: aspectToFmt(aspect),
                        template: "news",
                        title: view.title,
                        slides: [onScreen.filter(Boolean)],
                      })
                    }
                  >
                    Open in Card Studio
                  </Button>
                )}
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
                      📸 IMAGE BRIEF (make this image yourself)
                      {aspect ? ` · ${aspect}` : ""}
                    </Text>
                    {imageBrief && <CopyBtn text={imageBrief} label="Copy" />}
                  </Flex>
                  {imageBrief ? (
                    <Text
                      color="nexzy.white"
                      fontSize="sm"
                      whiteSpace="pre-wrap"
                    >
                      {imageBrief}
                    </Text>
                  ) : (
                    <Text color="nexzy.gray.100" fontSize="xs">
                      —
                    </Text>
                  )}
                </Box>
                {onScreen.length > 0 && (
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
                        ON-IMAGE TEXT (overlay on the image)
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
                    {inPlan("x") && (
                      <KitBlock name="X (Twitter)" kit={platforms.x} />
                    )}
                    {inPlan("threads") && (
                      <KitBlock name="Threads" kit={platforms.threads} />
                    )}
                    {inPlan("instagram") && (
                      <KitBlock name="Instagram" kit={platforms.reels} />
                    )}
                    {inPlan("tiktok") && (
                      <KitBlock name="TikTok (Photo)" kit={platforms.tiktok} />
                    )}
                    {inPlan("facebook") && (
                      <KitBlock name="Facebook" kit={platforms.facebook} />
                    )}
                  </VStack>
                )}
              </VStack>
            )}

            {isSlideCard && (
              <VStack align="stretch" gap={3} mb={3}>
                {onSendToCards && (
                  <Button
                    size="xs"
                    variant="outline"
                    colorPalette="blue"
                    alignSelf="flex-start"
                    onClick={() =>
                      onSendToCards({
                        format: aspectToFmt(aspect),
                        template: "news",
                        title: view.title,
                        slides: slides.map((sl) =>
                          [sl.headline ?? "", sl.body ?? ""].filter(Boolean),
                        ),
                      })
                    }
                  >
                    Open all slides in Card Studio
                  </Button>
                )}
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
                      {slideLabel} ({slides.length} · {aspect || "4:5"}) —
                      design these in the Cards tab
                    </Text>
                    <CopyBtn
                      text={slides
                        .map(
                          (sl, i) =>
                            `${i + 1}. ${sl.headline ?? ""}${
                              sl.body ? " — " + sl.body : ""
                            }`,
                        )
                        .join("\n")}
                      label="Copy all"
                    />
                  </Flex>
                  <VStack align="stretch" gap={2}>
                    {slides.map((sl, i) => (
                      <Box
                        key={i}
                        borderLeft="2px solid"
                        borderColor="nexzy.lightBlue"
                        pl={2}
                      >
                        <Text
                          color="nexzy.white"
                          fontSize="sm"
                          fontWeight="600"
                        >
                          {i + 1}. {sl.headline}
                        </Text>
                        {sl.body && (
                          <Text color="nexzy.gray.100" fontSize="xs">
                            {sl.body}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                </Box>
                {saveCta && (
                  <Text color="nexzy.lightBlue" fontSize="xs">
                    Final slide (Save-CTA): {saveCta}
                  </Text>
                )}
                {platforms && (
                  <VStack align="stretch" gap={2}>
                    {inPlan("instagram") && platforms.reels && (
                      <KitBlock name="Instagram" kit={platforms.reels} />
                    )}
                    {inPlan("threads") && platforms.threads && (
                      <KitBlock name="Threads" kit={platforms.threads} />
                    )}
                    {inPlan("tiktok") && platforms.tiktok && (
                      <KitBlock name="TikTok (Photo)" kit={platforms.tiktok} />
                    )}
                    {inPlan("facebook") && platforms.facebook && (
                      <KitBlock name="Facebook" kit={platforms.facebook} />
                    )}
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
                <Text
                  color="nexzy.gray.100"
                  fontSize="sm"
                  whiteSpace="pre-wrap"
                >
                  {view.script}
                </Text>
              )}
              {view.payload?.forPlatforms &&
                view.payload.forPlatforms.length > 0 && (
                  <Text color="nexzy.gray.100" fontSize="xs">
                    <b>For:</b>{" "}
                    {view.payload.forPlatforms
                      .map(
                        (p) =>
                          ({
                            youtube: "YouTube",
                            instagram: "Instagram",
                            tiktok: "TikTok",
                            facebook: "Facebook",
                            threads: "Threads",
                            x: "X",
                          })[p] ?? p,
                      )
                      .join(" · ")}
                  </Text>
                )}
              {view.payload?.lengths && !isBriefCard && !isLong && (
                <Text color="nexzy.gray.100" fontSize="xs">
                  <b>Cut lengths:</b> TikTok {view.payload.lengths.tiktok} ·
                  Reels {view.payload.lengths.reels} · Facebook{" "}
                  {view.payload.lengths.facebook} · Shorts{" "}
                  {view.payload.lengths.youtube}
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
          </Section>

          {!isNonVideo && !isImage && !isBriefCard && (
            <>
              <Section title="Per-platform kits">
                {/* Per-platform posting kits */}
                {platforms && (
                  <VStack align="stretch" gap={2}>
                    {inPlan("youtube") && (
                      <KitBlock
                        name={isLong ? "YouTube (Long-form)" : "YouTube Shorts"}
                        kit={platforms.youtube}
                      />
                    )}
                    {inPlan("tiktok") && (
                      <KitBlock
                        name={isLong ? "TikTok (teaser)" : "TikTok"}
                        kit={platforms.tiktok}
                      />
                    )}
                    {inPlan("instagram") && (
                      <KitBlock
                        name={
                          isLong
                            ? "Instagram Reels (teaser)"
                            : "Instagram Reels"
                        }
                        kit={platforms.reels}
                      />
                    )}
                    {inPlan("facebook") && (
                      <KitBlock
                        name={
                          isLong ? "Facebook Reels (teaser)" : "Facebook Reels"
                        }
                        kit={platforms.facebook}
                      />
                    )}
                    {inPlan("threads") && (
                      <KitBlock
                        name="Threads (text take)"
                        kit={platforms.threads}
                      />
                    )}
                    {inPlan("x") && (
                      <KitBlock name="X (Twitter)" kit={platforms.x} />
                    )}
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
                    <Text
                      color="nexzy.white"
                      fontWeight="700"
                      fontSize="sm"
                      mb={2}
                    >
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
              </Section>
              {!isQuick && (
                <Section title="Voiceover &amp; production">
                  {/* ElevenLabs shorts script + production notes */}
                  <Box>
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
                                  borderColor={
                                    active ? "nexzy.blue" : "whiteAlpha.300"
                                  }
                                  _hover={{
                                    bg: active
                                      ? "nexzy.blue"
                                      : "whiteAlpha.100",
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
                          <Flex
                            justify="space-between"
                            align="center"
                            mb={1}
                            gap={2}
                          >
                            <Text
                              color="nexzy.lightBlue"
                              fontSize="xs"
                              fontWeight="700"
                            >
                              ElevenLabs · Core cut ·{" "}
                              {view.payload?.ttsScripts?.extended
                                ? "TikTok · Shorts · X"
                                : "all video platforms"}{" "}
                              · {draft.length.toLocaleString()} credits · ~
                              {Math.max(1, Math.round(draft.length / 15))}s
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
                        {/* Optional longer cut — only when the article supported it.
                    (tight/long are legacy fields kept for older cards.) */}
                        {(
                          [
                            [
                              "extended",
                              "Extended cut",
                              "Instagram · Facebook",
                            ],
                            ["tight", "Tight cut", "TikTok / Shorts"],
                            ["long", "Long cut", "Facebook"],
                          ] as const
                        ).map(([key, label, plat]) => {
                          const txt = view.payload?.ttsScripts?.[key];
                          if (!txt) return null;
                          return (
                            <Box
                              key={key}
                              bg="whiteAlpha.50"
                              border="1px solid"
                              borderColor="whiteAlpha.200"
                              borderRadius="lg"
                              p={3}
                            >
                              <Flex
                                justify="space-between"
                                align="center"
                                mb={1}
                                gap={2}
                              >
                                <Text
                                  color="nexzy.lightBlue"
                                  fontSize="xs"
                                  fontWeight="700"
                                >
                                  {label} · {plat} · ~
                                  {Math.max(1, Math.round(txt.length / 15))}s
                                </Text>
                                <CopyBtn text={txt} label="Copy" />
                              </Flex>
                              <Text
                                color="nexzy.gray.100"
                                fontSize="sm"
                                whiteSpace="pre-wrap"
                              >
                                {txt}
                              </Text>
                            </Box>
                          );
                        })}
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
                            {(view.payload?.backgroundVideo?.length ?? 0) >
                              0 && (
                              <Text color="nexzy.gray.100" fontSize="xs">
                                🎞 <b>Background footage:</b>{" "}
                                {(view.payload?.backgroundVideo ?? []).join(
                                  " · ",
                                )}
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
                            {(view.payload?.postingTips?.length ?? 0) > 0 && (
                              <Box
                                mt={1}
                                pt={1.5}
                                borderTop="1px solid"
                                borderColor="whiteAlpha.100"
                              >
                                <Text
                                  color="nexzy.lightBlue"
                                  fontSize="10px"
                                  fontWeight="700"
                                  mb={0.5}
                                >
                                  WHEN YOU POST
                                </Text>
                                <VStack align="stretch" gap={0.5}>
                                  {(view.payload?.postingTips ?? []).map(
                                    (t, i) => (
                                      <Text
                                        key={i}
                                        color="nexzy.gray.100"
                                        fontSize="xs"
                                      >
                                        • {t}
                                      </Text>
                                    ),
                                  )}
                                </VStack>
                              </Box>
                            )}
                          </VStack>
                        </Box>
                      </VStack>
                    )}
                  </Box>
                </Section>
              )}
            </>
          )}

          {/* Publish this card straight to FB/IG Reels + a Threads text post */}
          {s.kind === "video" &&
            !isNonVideo &&
            !isImage &&
            !isBriefCard &&
            isOwner && (
              <Section title="Publish to social">
                <PublishBox s={view} />
              </Section>
            )}
        </>
      </Box>
    </Box>
  );
}

/** Tab label for an asset card inside a story group, from its format. */
function assetLabel(s: ContentSuggestion): string {
  const f = s.payload?.format;
  if (f === "long") return "Long video";
  if (f === "carousel") return "Carousel";
  if (f === "photo") return "Photo (TikTok)";
  if (f === "album") return "Album (FB)";
  if (f === "image_card" || f === "image") return "Image";
  return "Short video";
}

/**
 * ONE card per story: every asset generated from the same article renders as
 * a tab inside a single group (short video / carousel / photo / album / image)
 * instead of N sibling cards. Underneath, each asset keeps its own suggestion
 * row — its own publish, skip, regenerate, and cadence status — the grouping
 * is presentation only.
 */
function StoryGroup({
  group,
  onDone,
  isOwner,
  onBudget,
  writers,
  onSendToCards,
}: {
  group: ContentSuggestion[];
  onDone: (id: string) => void;
  isOwner: boolean;
  onBudget: () => void;
  writers: string[];
  onSendToCards?: (s: {
    format?: string;
    template?: string;
    title?: string;
    slides: string[][];
  }) => void;
}) {
  const [activeId, setActiveId] = useState(group[0]?.id ?? "");
  // If the active asset was published/skipped away, fall back to the first.
  const active = group.find((g) => g.id === activeId) ?? group[0];
  if (!active) return null;
  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.300"
      borderRadius="xl"
      overflow="hidden"
    >
      <Box px={4} py={3} bg="whiteAlpha.100">
        <Text color="nexzy.white" fontWeight="700" fontSize="sm" mb={0.5}>
          {group[0].title}
        </Text>
        <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
          {group.length} asset{group.length === 1 ? "" : "s"} from this story —
          each publishes on its own
        </Text>
        <HStack gap={1} wrap="wrap">
          {group.map((g) => (
            <Button
              key={g.id}
              size="xs"
              onClick={() => setActiveId(g.id)}
              bg={active.id === g.id ? "nexzy.blue" : "whiteAlpha.200"}
              color="white"
              _hover={{
                bg: active.id === g.id ? "nexzy.blue" : "whiteAlpha.300",
              }}
            >
              {assetLabel(g)}
            </Button>
          ))}
        </HStack>
      </Box>
      <Box p={2}>
        <SuggestionCard
          key={active.id}
          s={active}
          onDone={onDone}
          isOwner={isOwner}
          onBudget={onBudget}
          writers={writers}
          onSendToCards={onSendToCards}
        />
      </Box>
    </Box>
  );
}

export default function ContentPanel({
  isOwner = false,
  onSendToCards,
}: {
  isOwner?: boolean;
  onSendToCards?: (s: {
    format?: string;
    template?: string;
    title?: string;
    slides: string[][];
  }) => void;
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
          {(() => {
            // Group the assets by the article they came from (refId) so one
            // story = one card with a tab per asset. Cards without a refId
            // (or alone in their group) render exactly as before.
            const byStory = new Map<string, ContentSuggestion[]>();
            for (const s of cards) {
              const key = s.refId ? `story:${s.refId}` : `solo:${s.id}`;
              const arr = byStory.get(key) ?? [];
              arr.push(s);
              byStory.set(key, arr);
            }
            return [...byStory.entries()].map(([key, group]) =>
              group.length === 1 ? (
                <SuggestionCard
                  key={group[0].id}
                  s={group[0]}
                  onDone={remove}
                  isOwner={isOwner}
                  onBudget={loadBudget}
                  writers={writers}
                  onSendToCards={onSendToCards}
                />
              ) : (
                <StoryGroup
                  key={key}
                  group={group}
                  onDone={remove}
                  isOwner={isOwner}
                  onBudget={loadBudget}
                  writers={writers}
                  onSendToCards={onSendToCards}
                />
              ),
            );
          })()}
        </VStack>
      )}
    </VStack>
  );
}
