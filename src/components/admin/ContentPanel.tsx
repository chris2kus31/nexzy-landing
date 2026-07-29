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
  Input,
  Textarea,
  Spinner,
} from "@chakra-ui/react";
import {
  getContentSuggestions,
  suggestContentNow,
  skipContentSuggestion,
  useContentSuggestion,
  produceContentVideo,
  approveContentGuide,
  regenerateContentCard,
  updateContentScript,
  getWriterNames,
  getTtsBudget,
  type ContentSuggestion,
  type PlatformKit,
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

/** One platform's posting kit (title/caption + hashtags + copy). */
function KitBlock({ name, kit }: { name: string; kit?: PlatformKit }) {
  if (!kit) return null;
  const hashtags = (kit.hashtags || []).join(" ");
  const primary = kit.title || kit.caption || "";
  const full = [kit.title, kit.description, kit.caption, hashtags, kit.cta]
    .filter(Boolean)
    .join("\n");
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={3}
    >
      <Flex justify="space-between" align="center" mb={1} gap={2}>
        <Text color="nexzy.lightBlue" fontSize="xs" fontWeight="700">
          {name}
        </Text>
        <CopyBtn text={full} label="Copy all" />
      </Flex>
      {kit.title && (
        <Text color="nexzy.white" fontSize="sm" fontWeight="600">
          {kit.title}
        </Text>
      )}
      {kit.description && (
        <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
          {kit.description}
        </Text>
      )}
      {kit.caption && (
        <Text color="nexzy.gray.100" fontSize="sm" mt={1}>
          {kit.caption}
        </Text>
      )}
      {hashtags && (
        <Text color="nexzy.lightBlue" fontSize="xs" mt={1}>
          {hashtags}
        </Text>
      )}
      {kit.tags && kit.tags.length > 0 && (
        <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
          Tags: {kit.tags.join(", ")}
        </Text>
      )}
      {kit.cta && (
        <Text color="nexzy.gray.100" fontSize="xs" mt={1} fontStyle="italic">
          CTA: {kit.cta}
        </Text>
      )}
      {!kit.title && !primary && (
        <Text color="nexzy.gray.100" fontSize="xs">
          —
        </Text>
      )}
    </Box>
  );
}

/**
 * A guide LEAD (kind === "guide"): a recently-released game worth a how-to.
 * "Generate guide" kicks off the grounded GuideWriter → review queue. An
 * optional focus lets you steer the angle (e.g. a specific boss) first.
 */
function GuideLeadCard({
  s,
  onDone,
  isOwner,
}: {
  s: ContentSuggestion;
  onDone: (id: string) => void;
  isOwner: boolean;
}) {
  const [busy, setBusy] = useState<"skip" | "gen" | null>(null);
  const [focus, setFocus] = useState("");
  const angles = s.payload?.angles ?? [];
  const game = s.payload?.game ?? s.title.replace(/^Guide:\s*/i, "");

  const generate = async () => {
    setBusy("gen");
    try {
      await approveContentGuide(s.id, { focus: focus.trim() || undefined });
      onDone(s.id);
    } catch {
      setBusy(null);
    }
  };
  const skip = async () => {
    setBusy("skip");
    try {
      await skipContentSuggestion(s.id);
      onDone(s.id);
    } catch {
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
          <Badge colorPalette="cyan" variant="solid">
            GUIDE LEAD
          </Badge>
          <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
            {game}
          </Text>
        </HStack>
      </Flex>

      {s.rationale && (
        <Text color="nexzy.gray.100" fontSize="sm" mb={2}>
          {s.rationale}
        </Text>
      )}

      {angles.length > 0 && (
        <HStack gap={2} wrap="wrap" mb={3}>
          {angles.map((a) => (
            <Badge key={a} colorPalette="gray" variant="subtle">
              {a}
            </Badge>
          ))}
        </HStack>
      )}

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Optional focus (boss / level / system) — leave blank for a general guide
      </Text>
      <Input
        value={focus}
        onChange={(e) => setFocus(e.target.value)}
        placeholder={`e.g. a specific boss in ${game}`}
        color="nexzy.white"
        bg="whiteAlpha.50"
        borderColor="whiteAlpha.300"
        _placeholder={{ color: "nexzy.gray.100" }}
        mb={3}
      />

      <HStack gap={2} justify="flex-end">
        {isOwner && (
          <Button
            size="xs"
            colorPalette="cyan"
            onClick={generate}
            loading={busy === "gen"}
            loadingText="Generating…"
          >
            Generate guide
          </Button>
        )}
        <Button
          size="xs"
          variant="ghost"
          color="nexzy.gray.100"
          _hover={{ bg: "whiteAlpha.100", color: "red.300" }}
          onClick={skip}
          loading={busy === "skip"}
          loadingText="…"
        >
          Skip
        </Button>
      </HStack>
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
    "skip" | "use" | "script" | "produce" | null
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
  const [persona, setPersona] = useState(s.author);
  const [draft, setDraft] = useState(view.ttsScript ?? "");
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
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
          <Badge colorPalette="blue" variant="subtle">
            {view.author}’s voice
          </Badge>
          <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
            {s.title}
          </Text>
        </HStack>
        <HStack gap={1}>
          {s.kind === "video" && !produced && (
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

      {s.kind === "video" && showProduce && !produced && (
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

      {/* The script */}
      <VStack align="stretch" gap={1} mb={3}>
        {view.hook && (
          <Text color="nexzy.white" fontSize="sm">
            <b>Hook:</b> {view.hook}
          </Text>
        )}
        {view.script && (
          <Text color="nexzy.gray.100" fontSize="sm" whiteSpace="pre-wrap">
            {view.script}
          </Text>
        )}
        {view.payload?.broll && (
          <Text color="nexzy.gray.100" fontSize="xs">
            🎬 B-roll: {view.payload.broll}
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

      {/* Collapsible: kits + ElevenLabs production block (fast board scanning) */}
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

      {showDetails && (
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
                {view.payload?.voicePersona && (
                  <Text color="nexzy.gray.100" fontSize="xs">
                    🗣 Voice: {view.payload.voicePersona}
                  </Text>
                )}
                {view.payload?.music && (
                  <Text color="nexzy.gray.100" fontSize="xs">
                    🎵 Music: {view.payload.music}
                  </Text>
                )}
                {(view.payload?.backgroundVideo?.length ?? 0) > 0 && (
                  <Text color="nexzy.gray.100" fontSize="xs">
                    🎞 Background (search):{" "}
                    {(view.payload?.backgroundVideo ?? []).join(" · ")}
                  </Text>
                )}
                {(view.payload?.brollSfx?.length ?? 0) > 0 && (
                  <Text color="nexzy.gray.100" fontSize="xs">
                    🎬 B-roll/SFX: {(view.payload?.brollSfx ?? []).join(" · ")}
                  </Text>
                )}
                {(view.payload?.onScreenText?.length ?? 0) > 0 && (
                  <Text color="nexzy.gray.100" fontSize="xs">
                    💬 On-screen:{" "}
                    {(view.payload?.onScreenText ?? []).join(" · ")}
                  </Text>
                )}
              </VStack>
            )}
          </Box>
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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [budget, setBudget] = useState<TtsBudget | null>(null);
  const [writers, setWriters] = useState<string[]>(["Chuy", "Eli", "Leslie"]);
  const [batchVoice, setBatchVoice] = useState("All");
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

  const suggest = async () => {
    setLoading(true);
    setErr("");
    try {
      setItems(
        await suggestContentNow(batchVoice === "All" ? undefined : batchVoice),
      );
    } catch (e) {
      setErr((e as Error)?.message || "Could not generate suggestions.");
    } finally {
      setLoading(false);
    }
  };

  const remove = (id: string) =>
    setItems((xs) => (xs ? xs.filter((x) => x.id !== id) : xs));

  return (
    <VStack align="stretch" gap={5}>
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Content Desk
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          Ready-to-shoot short-form clips from your published content (3-beat
          script + per-platform posting kit), plus guide leads for
          recently-released games. Shoot the clips; hit &ldquo;Generate
          guide&rdquo; to turn a lead into a full guide in your review queue.
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

      <Flex align="center" justify="space-between" gap={2} wrap="wrap">
        <Text color="nexzy.gray.100" fontSize="sm">
          {items === null
            ? ""
            : `${items.length} open suggestion${items.length === 1 ? "" : "s"}`}
        </Text>
        {isOwner && (
          <HStack gap={2} wrap="wrap">
            <HStack gap={1}>
              <Text color="nexzy.gray.100" fontSize="xs">
                Voice:
              </Text>
              {["All", ...writers].map((w) => {
                const active = batchVoice === w;
                return (
                  <Button
                    key={w}
                    size="xs"
                    onClick={() => setBatchVoice(w)}
                    bg={active ? "nexzy.blue" : "transparent"}
                    color={active ? "white" : "nexzy.gray.100"}
                    borderWidth="1px"
                    borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
                    _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
                  >
                    {w}
                  </Button>
                );
              })}
            </HStack>
            <Button
              size="sm"
              colorPalette="blue"
              onClick={suggest}
              loading={loading}
              loadingText="Thinking…"
            >
              {items && items.length ? "↻ Suggest more" : "Suggest now"}
            </Button>
          </HStack>
        )}
      </Flex>

      {err && (
        <Text color="red.300" fontSize="sm">
          {err}
        </Text>
      )}

      {loading && !items ? (
        <Flex justify="center" py={8}>
          <Spinner color="nexzy.blue" size="lg" />
        </Flex>
      ) : items === null ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          Hit “Suggest now” — the Content Desk scans your published deals + news
          and drafts clips you can shoot.
        </Text>
      ) : items.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          Nothing new to suggest. Publish a deals or news article, then hit
          “Suggest now”. (Repeats are skipped automatically.)
        </Text>
      ) : (
        <VStack align="stretch" gap={4}>
          {items.map((s) =>
            s.kind === "guide" ? (
              <GuideLeadCard
                key={s.id}
                s={s}
                onDone={remove}
                isOwner={isOwner}
              />
            ) : (
              <SuggestionCard
                key={s.id}
                s={s}
                onDone={remove}
                isOwner={isOwner}
                onBudget={loadBudget}
                writers={writers}
              />
            ),
          )}
        </VStack>
      )}
    </VStack>
  );
}
