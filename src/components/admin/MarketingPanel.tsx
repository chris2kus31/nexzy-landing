"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import {
  getMarketingChannels,
  getMarketingRecommendations,
  marketingDraft,
  marketingPost,
  type SocialChannel,
  type MarketingRecommendation,
  type SocialPostResult,
} from "@/lib/admin/client";

const CHANNELS: SocialChannel[] = ["x", "facebook", "discord", "reddit"];
const LABEL: Record<SocialChannel, string> = {
  x: "X",
  facebook: "Facebook",
  discord: "Discord",
  reddit: "Reddit",
};

/** Tone/voice options — same personas as the article writers. */
const AUTHORS = ["Chuy", "Eli"];

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
};

/** Compact channel toggle chip. */
function ChannelToggle({
  channel,
  active,
  disabled,
  onClick,
}: {
  channel: SocialChannel;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="xs"
      onClick={onClick}
      disabled={disabled}
      bg={active ? "nexzy.blue" : "transparent"}
      color={active ? "white" : "nexzy.gray.100"}
      borderWidth="1px"
      borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
      _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
    >
      {LABEL[channel]}
    </Button>
  );
}

function ResultLine({ posted }: { posted: SocialPostResult[] }) {
  return (
    <VStack align="stretch" gap={0.5} mt={2}>
      {posted.map((r, i) => (
        <Text
          key={i}
          fontSize="xs"
          color={r.ok ? "green.300" : r.skipped ? "nexzy.gray.100" : "red.300"}
        >
          {LABEL[r.channel as SocialChannel] || r.channel}:{" "}
          {r.ok
            ? "posted ✓"
            : r.skipped
              ? "skipped (not configured)"
              : `failed — ${r.error ?? "error"}`}
        </Text>
      ))}
    </VStack>
  );
}

/** One post editor block: channel toggles + a caption per selected channel. */
function PostEditor({
  enabled,
  channels,
  captions,
  setChannels,
  setCaption,
  onPost,
  posting,
  posted,
}: {
  enabled: SocialChannel[];
  channels: SocialChannel[];
  captions: Partial<Record<SocialChannel, string>>;
  setChannels: (c: SocialChannel[]) => void;
  setCaption: (c: SocialChannel, v: string) => void;
  onPost: () => void;
  posting: boolean;
  posted: SocialPostResult[] | null;
}) {
  const toggle = (c: SocialChannel) =>
    setChannels(
      channels.includes(c) ? channels.filter((x) => x !== c) : [...channels, c],
    );
  const canPost =
    channels.length > 0 &&
    channels.every((c) => (captions[c] || "").trim().length > 0);

  return (
    <Box>
      <HStack gap={2} wrap="wrap" mb={3}>
        {CHANNELS.map((c) => (
          <ChannelToggle
            key={c}
            channel={c}
            active={channels.includes(c)}
            disabled={!enabled.includes(c)}
            onClick={() => toggle(c)}
          />
        ))}
        <Text color="nexzy.gray.100" fontSize="10px">
          {enabled.length < CHANNELS.length
            ? "Greyed = no credentials set"
            : ""}
        </Text>
      </HStack>

      <VStack align="stretch" gap={3}>
        {channels.map((c) => (
          <Box key={c}>
            <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
              {LABEL[c]} caption
            </Text>
            <Textarea
              value={captions[c] || ""}
              onChange={(e) => setCaption(c, e.target.value)}
              rows={2}
              {...inputProps}
            />
          </Box>
        ))}
      </VStack>

      <Flex justify="flex-end" mt={3}>
        <Button
          size="sm"
          colorPalette="blue"
          onClick={onPost}
          loading={posting}
          loadingText="Posting…"
          disabled={!canPost}
        >
          Post to {channels.map((c) => LABEL[c]).join(" + ") || "…"}
        </Button>
      </Flex>
      {posted && <ResultLine posted={posted} />}
    </Box>
  );
}

/** A single recommendation card (article or trending lead). */
function RecCard({
  rec,
  enabled,
}: {
  rec: MarketingRecommendation;
  enabled: SocialChannel[];
}) {
  const [channels, setChannels] = useState<SocialChannel[]>(
    rec.recommendedChannels.filter((c) => enabled.includes(c)),
  );
  const [captions, setCaptions] = useState<
    Partial<Record<SocialChannel, string>>
  >({ ...rec.captions });
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState<SocialPostResult[] | null>(null);

  const post = async () => {
    setPosting(true);
    setPosted(null);
    try {
      const r = await marketingPost({
        channels,
        captions,
        url: rec.url ?? undefined,
        imageUrl: rec.imageUrl,
        title: rec.title,
      });
      setPosted(r.posted);
    } catch {
      setPosted([{ channel: "error", ok: false, error: "post failed" }]);
    } finally {
      setPosting(false);
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
      <HStack gap={2} mb={1} wrap="wrap">
        <Badge
          colorPalette={rec.source === "article" ? "green" : "orange"}
          variant="subtle"
        >
          {rec.source === "article" ? "Article" : "Trending"}
        </Badge>
        <Badge colorPalette="blue" variant="subtle">
          {rec.author}’s voice
        </Badge>
        <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
          {rec.title}
        </Text>
      </HStack>
      {rec.reason && (
        <Text color="nexzy.gray.100" fontSize="sm" mb={3}>
          {rec.reason}
        </Text>
      )}
      <PostEditor
        enabled={enabled}
        channels={channels}
        captions={captions}
        setChannels={setChannels}
        setCaption={(c, v) => setCaptions((p) => ({ ...p, [c]: v }))}
        onPost={post}
        posting={posting}
        posted={posted}
      />
    </Box>
  );
}

/** Free composer: type a topic, pick channels, draft + post at will. */
function Composer({ enabled }: { enabled: SocialChannel[] }) {
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");
  const [author, setAuthor] = useState(AUTHORS[0]);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [channels, setChannels] = useState<SocialChannel[]>(
    enabled.length ? enabled : CHANNELS,
  );
  const [captions, setCaptions] = useState<
    Partial<Record<SocialChannel, string>>
  >({});
  const [drafting, setDrafting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState<SocialPostResult[] | null>(null);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErr("Image too large (max 8 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(String(reader.result || ""));
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const draft = async () => {
    if (!topic.trim() || channels.length === 0) {
      setErr("Enter a topic and pick at least one channel.");
      return;
    }
    setDrafting(true);
    setErr("");
    setPosted(null);
    try {
      const r = await marketingDraft(topic.trim(), channels, {
        url: url || undefined,
        author,
        imageDataUrl: imageDataUrl || undefined,
      });
      setCaptions(r.captions);
    } catch {
      setErr("Draft failed.");
    } finally {
      setDrafting(false);
    }
  };

  const post = async () => {
    setPosting(true);
    setErr("");
    setPosted(null);
    try {
      const r = await marketingPost({
        channels,
        captions,
        url: url || undefined,
      });
      setPosted(r.posted);
    } catch {
      setErr("Post failed.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={5}
    >
      <Heading size="md" color="nexzy.white" mb={1}>
        Post at will
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={3}>
        Type a topic or angle, pick channels, and the publicist drafts a caption
        tuned to each — edit, then post. Optional link (defaults to your news
        hub).
      </Text>

      <VStack align="stretch" gap={3}>
        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
            Topic / angle
          </Text>
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={2}
            placeholder="e.g. GTA 6 delay reactions, our take on the new PS5 price…"
            {...inputProps}
          />
        </Box>
        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
            Link (optional)
          </Text>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.nexzyapp.com/blog/…"
            {...inputProps}
          />
        </Box>

        {/* Tone (same voices as the writers) + optional reference image */}
        <Flex gap={4} wrap="wrap" align="center">
          <Box>
            <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
              Tone
            </Text>
            <HStack gap={1}>
              {AUTHORS.map((a) => {
                const active = author === a;
                return (
                  <Button
                    key={a}
                    size="xs"
                    onClick={() => setAuthor(a)}
                    bg={active ? "nexzy.blue" : "transparent"}
                    color={active ? "white" : "nexzy.gray.100"}
                    borderWidth="1px"
                    borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
                    _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
                  >
                    {a}
                  </Button>
                );
              })}
            </HStack>
          </Box>
          <Box>
            <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
              Reference image (optional)
            </Text>
            <HStack gap={2}>
              <Button
                size="xs"
                variant="outline"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                _hover={{ bg: "whiteAlpha.100" }}
                onClick={() => fileRef.current?.click()}
              >
                ↑ {imageDataUrl ? "Change" : "Upload"}
              </Button>
              {imageDataUrl && (
                <>
                  <Text
                    color="nexzy.gray.100"
                    fontSize="xs"
                    lineClamp={1}
                    maxW="140px"
                  >
                    {imageName}
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="red.300"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() => {
                      setImageDataUrl(null);
                      setImageName("");
                    }}
                  >
                    ✕
                  </Button>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={onPickImage}
              />
            </HStack>
          </Box>
        </Flex>
        {imageDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageDataUrl}
            alt="reference"
            style={{
              maxHeight: 120,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          />
        )}

        <HStack gap={2} wrap="wrap">
          {CHANNELS.map((c) => (
            <ChannelToggle
              key={c}
              channel={c}
              active={channels.includes(c)}
              disabled={!enabled.includes(c)}
              onClick={() =>
                setChannels(
                  channels.includes(c)
                    ? channels.filter((x) => x !== c)
                    : [...channels, c],
                )
              }
            />
          ))}
          <Button
            size="sm"
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={draft}
            loading={drafting}
            loadingText="Drafting…"
            ml="auto"
          >
            ✎ Draft captions
          </Button>
        </HStack>

        {Object.keys(captions).length > 0 && (
          <VStack align="stretch" gap={3}>
            {channels.map((c) => (
              <Box key={c}>
                <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
                  {LABEL[c]} caption
                </Text>
                <Textarea
                  value={captions[c] || ""}
                  onChange={(e) =>
                    setCaptions((p) => ({ ...p, [c]: e.target.value }))
                  }
                  rows={2}
                  {...inputProps}
                />
              </Box>
            ))}
            <Flex justify="flex-end">
              <Button
                size="sm"
                colorPalette="blue"
                onClick={post}
                loading={posting}
                loadingText="Posting…"
                disabled={
                  channels.length === 0 ||
                  channels.some((c) => !(captions[c] || "").trim())
                }
              >
                Post now
              </Button>
            </Flex>
          </VStack>
        )}

        {err && (
          <Text color="red.300" fontSize="sm">
            {err}
          </Text>
        )}
        {posted && <ResultLine posted={posted} />}
      </VStack>
    </Box>
  );
}

export default function MarketingPanel() {
  const [enabled, setEnabled] = useState<SocialChannel[]>([]);
  const [recs, setRecs] = useState<MarketingRecommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getMarketingChannels()
      .then((r) => setEnabled(r.enabled))
      .catch(() => setEnabled([]));
  }, []);

  const generate = async () => {
    setLoading(true);
    setErr("");
    try {
      setRecs(await getMarketingRecommendations());
    } catch (e) {
      setErr((e as Error)?.message || "Could not generate recommendations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Marketing Desk
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          The publicist recommends what to post and where; you adjust the
          channels + captions and post. Configured channels:{" "}
          {enabled.length
            ? enabled.map((c) => LABEL[c]).join(", ")
            : "none yet"}
          .
        </Text>
      </Box>

      {/* Recommendations */}
      <Box>
        <Flex align="center" justify="space-between" mb={3} gap={2} wrap="wrap">
          <Heading size="sm" color="nexzy.white">
            Recommended posts
          </Heading>
          <Button
            size="sm"
            colorPalette="blue"
            onClick={generate}
            loading={loading}
            loadingText="Thinking…"
          >
            {recs ? "↻ Regenerate ideas" : "Generate ideas"}
          </Button>
        </Flex>

        {err && (
          <Text color="red.300" fontSize="sm" mb={2}>
            {err}
          </Text>
        )}

        {loading && !recs ? (
          <Flex justify="center" py={8}>
            <Spinner color="nexzy.blue" size="lg" />
          </Flex>
        ) : recs === null ? (
          <Text color="nexzy.gray.100" fontSize="sm">
            Hit “Generate ideas” — the publicist scans your recent articles and
            hot leads and drafts posts you can send.
          </Text>
        ) : recs.length === 0 ? (
          <Text color="nexzy.gray.100" fontSize="sm">
            No recommendations right now. Publish an article or run a desk scan,
            then try again.
          </Text>
        ) : (
          <VStack align="stretch" gap={4}>
            {recs.map((rec) => (
              <RecCard key={rec.id} rec={rec} enabled={enabled} />
            ))}
          </VStack>
        )}
      </Box>

      {/* Free composer */}
      <Composer enabled={enabled} />
    </VStack>
  );
}
