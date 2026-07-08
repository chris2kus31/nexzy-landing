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
  Spinner,
} from "@chakra-ui/react";
import {
  getContentSuggestions,
  suggestContentNow,
  skipContentSuggestion,
  useContentSuggestion,
  approveContentGuide,
  type ContentSuggestion,
  type PlatformKit,
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
function KitBlock({
  name,
  kit,
}: {
  name: "YouTube Shorts" | "TikTok" | "Instagram Reels";
  kit?: PlatformKit;
}) {
  if (!kit) return null;
  const hashtags = (kit.hashtags || []).join(" ");
  const primary = kit.title || kit.caption || "";
  const full = [kit.title, kit.description, kit.caption, hashtags]
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
}: {
  s: ContentSuggestion;
  onDone: (id: string) => void;
}) {
  const [busy, setBusy] = useState<"skip" | "use" | null>(null);
  const platforms = s.payload?.platforms;

  const act = async (kind: "skip" | "use") => {
    setBusy(kind);
    try {
      if (kind === "skip") await skipContentSuggestion(s.id);
      else await useContentSuggestion(s.id);
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
          <Badge
            colorPalette={LANE_COLOR[s.lane ?? ""] || "gray"}
            variant="solid"
          >
            {(s.lane ?? "clip").toUpperCase()}
          </Badge>
          <Badge colorPalette="blue" variant="subtle">
            {s.author}’s voice
          </Badge>
          <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
            {s.title}
          </Text>
        </HStack>
        <HStack gap={1}>
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

      {/* The script */}
      <VStack align="stretch" gap={1} mb={3}>
        {s.hook && (
          <Text color="nexzy.white" fontSize="sm">
            <b>Hook:</b> {s.hook}
          </Text>
        )}
        {s.script && (
          <Text color="nexzy.gray.100" fontSize="sm" whiteSpace="pre-wrap">
            {s.script}
          </Text>
        )}
        {s.payload?.broll && (
          <Text color="nexzy.gray.100" fontSize="xs">
            🎬 B-roll: {s.payload.broll}
          </Text>
        )}
        {s.payload?.cta && (
          <Text color="nexzy.gray.100" fontSize="xs">
            📣 CTA: {s.payload.cta}
          </Text>
        )}
        {s.url && (
          <Link
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            color="nexzy.lightBlue"
            fontSize="xs"
          >
            Backing page ↗
          </Link>
        )}
      </VStack>

      {/* Per-platform posting kits */}
      {platforms && (
        <VStack align="stretch" gap={2}>
          <KitBlock name="YouTube Shorts" kit={platforms.youtube} />
          <KitBlock name="TikTok" kit={platforms.tiktok} />
          <KitBlock name="Instagram Reels" kit={platforms.reels} />
        </VStack>
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

  useEffect(() => {
    getContentSuggestions()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const suggest = async () => {
    setLoading(true);
    setErr("");
    try {
      setItems(await suggestContentNow());
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

      <Flex align="center" justify="space-between" gap={2} wrap="wrap">
        <Text color="nexzy.gray.100" fontSize="sm">
          {items === null
            ? ""
            : `${items.length} open suggestion${items.length === 1 ? "" : "s"}`}
        </Text>
        {isOwner && (
          <Button
            size="sm"
            colorPalette="blue"
            onClick={suggest}
            loading={loading}
            loadingText="Thinking…"
          >
            {items && items.length ? "↻ Suggest more" : "Suggest now"}
          </Button>
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
              <SuggestionCard key={s.id} s={s} onDone={remove} />
            ),
          )}
        </VStack>
      )}
    </VStack>
  );
}
