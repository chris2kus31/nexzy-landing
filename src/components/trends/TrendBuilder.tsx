"use client";
// The /drops/<slug> builder: pick games, get the share image (rendered by
// the server), then save it, share it, or post it on Nexzy with a reader
// account. Making the image also saves the build (no account), so the share
// link opens its own page (/drops/<slug>/b/<code>) with its own preview,
// and shows how many players share the picks. Games that aren't on Nexzy can
// be requested. Only pick-games drops (optionally ranked) are built here;
// the page shows an app prompt for the rest.
import { useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Button,
  Flex,
  HStack,
  Image,
  Input,
  Spinner,
  Stack,
  Text,
  chakra,
} from "@chakra-ui/react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiPlus,
  FiShare2,
  FiX,
} from "react-icons/fi";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInModal from "@/components/auth/SignInModal";
import { track, trackDownload } from "@/lib/analytics";
import {
  TrendApiError,
  fetchChoices,
  fetchMatches,
  fetchPreview,
  logTrendEvent,
  postEntry,
  requestGame,
  saveBuild,
} from "@/lib/trends/client";
import {
  SITE_URL,
  VISIT_TAG,
  buildPath,
  dropPath,
  entryPath,
  isRanked,
  pickRange,
  type DropMatches,
  type TrendChoice,
  type TrendView,
} from "@/lib/trends/types";
import { D } from "@/components/drops/tokens";
import SharePanel, { type SharePlatform } from "@/components/drops/SharePanel";
import { APP_STORE_URL, googlePlayUrl } from "@/lib/storeUrls";

const YELLOW = D.yellow;
const NAVY = D.base;
const CARD = D.panel;
const LINE = D.line;
const MUTED = D.muted;

type Shape = "portrait" | "tall";
type Pending = "post" | "request" | "choices" | null;

/** WebP from the API -> JPEG, which every app accepts for upload. */
async function toJpeg(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")?.drawImage(bmp, 0, 0);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode"))),
      "image/jpeg",
      0.92,
    ),
  );
}

function errorText(e: unknown): string {
  if (e instanceof TrendApiError) {
    if (e.status === 429)
      return "Lots of people are building right now. Try again in a moment.";
    if (e.status === 409) return "You've already posted a build in this drop.";
    if (e.status === 403) return "Verify your email first, then try again.";
    if (e.status === 401) return "Sign in first.";
    if (e.status === 422 || e.status === 400)
      return "Something in your picks isn't allowed. Change a pick and try again.";
  }
  return "That didn't work. Try again in a moment.";
}

export default function TrendBuilder({ trend }: { trend: TrendView }) {
  const { user } = useAuth();
  const { min, max } = pickRange(trend);
  const ranked = isRanked(trend);
  const needsAccount =
    trend.source.kind === "library" || trend.source.kind === "wishlist";

  const [picks, setPicks] = useState<TrendChoice[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TrendChoice[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [shape, setShape] = useState<Shape>("portrait");
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const [making, setMaking] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  /** The saved build behind the share link, and who matches it. */
  const [code, setCode] = useState<string | null>(null);
  const [matches, setMatches] = useState<DropMatches | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [asking, setAsking] = useState(false);
  const counted = useRef({ try: false, build: false });
  const abort = useRef<AbortController | null>(null);

  const full = picks.length >= max;
  const ready = picks.length >= min;
  const chosen = useMemo(() => new Set(picks.map((p) => p.id)), [picks]);
  const canSearch = !needsAccount || !!user;

  // Search the games this trend allows (first load: the most popular ones).
  useEffect(() => {
    if (!canSearch) return;
    const term = q.trim();
    const t = setTimeout(
      async () => {
        abort.current?.abort();
        const ac = new AbortController();
        abort.current = ac;
        setSearching(true);
        try {
          setResults(await fetchChoices(trend.slug, term, ac.signal));
        } catch (e) {
          if ((e as Error).name !== "AbortError") setResults([]);
        } finally {
          if (abort.current === ac) setSearching(false);
        }
      },
      term ? 300 : 0,
    );
    return () => clearTimeout(t);
  }, [q, trend.slug, canSearch]);

  // A new pick list makes the old image stale.
  useEffect(() => {
    setImage((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
    setPosted(null);
  }, [picks, shape]);
  // New picks are a new build (same picks keep their code).
  useEffect(() => {
    setCode(null);
    setMatches(null);
  }, [picks]);
  useEffect(() => () => abort.current?.abort(), []);

  function add(g: TrendChoice) {
    if (chosen.has(g.id) || full) return;
    if (!counted.current.try) {
      counted.current.try = true;
      logTrendEvent(trend.slug, "try");
      track("trend_try_tap", { trend: trend.slug, source: "web" });
    }
    setPicks((p) => [...p, g]);
    setError(null);
  }
  const remove = (id: string) => setPicks((p) => p.filter((x) => x.id !== id));
  const move = (i: number, d: -1 | 1) =>
    setPicks((p) => {
      const j = i + d;
      if (j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function make() {
    if (!ready) return;
    setMaking(true);
    setError(null);
    const ids = picks.map((p) => p.id);
    // Save the build alongside (best effort): the share link then opens its
    // own page, and the match count can load. The image never waits on it.
    if (!code)
      void saveBuild(trend.slug, ids)
        .then(async (b) => {
          setCode(b.code);
          setMatches(await fetchMatches(trend.slug, { code: b.code }));
        })
        .catch(() => undefined);
    try {
      const blob = await fetchPreview(trend.slug, {
        picks: ids,
        shape,
        handle: user?.username ?? undefined,
      });
      // The server sends JPEG; convert only if an older API answered WebP.
      const jpeg =
        blob.type === "image/jpeg"
          ? blob
          : await toJpeg(blob).catch(() => blob);
      setImage({ url: URL.createObjectURL(jpeg), blob: jpeg });
      if (!counted.current.build) {
        counted.current.build = true;
        logTrendEvent(trend.slug, "build");
      }
      track("trend_image_made", { trend: trend.slug, shape, source: "web" });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setMaking(false);
    }
  }

  const shareUrl = (platform: string) => {
    const tag = VISIT_TAG[platform] ?? "other";
    const path = posted
      ? entryPath(trend.slug, posted)
      : code
        ? buildPath(trend.slug, code)
        : dropPath(trend.slug);
    return `${SITE_URL}${path}?s=${tag}`;
  };
  const shareText = `My #${trend.hashtag} build: ${trend.title}. Do you match?`;
  const fileName = `nexzy-${trend.slug}.jpg`;

  function countShare(platform: string) {
    logTrendEvent(trend.slug, "share", { platform });
    track("trend_share", { trend: trend.slug, platform, source: "web" });
  }

  function download() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image.url;
    a.download = fileName;
    a.click();
    countShare("save");
    track("trend_download", { trend: trend.slug, source: "web" });
  }

  /** The phone's share sheet with the image when it can, else a download. */
  async function shareImage(platform: "instagram" | "tiktok" | "other") {
    if (!image) return;
    const file = new File([image.blob], fileName, { type: "image/jpeg" });
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
    };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          text: `${shareText} ${shareUrl(platform)}`,
        });
        countShare(platform);
      } catch {
        // closed the sheet: nothing to do
      }
      return;
    }
    download();
  }

  function openIntent(platform: "x" | "threads" | "facebook") {
    const url = shareUrl(platform);
    const href =
      platform === "x"
        ? `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`
        : platform === "threads"
          ? `https://www.threads.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`
          : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(href, "_blank", "noopener,noreferrer");
    countShare(platform);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl("copy"));
      countShare("copy");
      setCopied(true);
      setError(null);
    } catch {
      setError("Couldn't copy. Copy the address bar instead.");
    }
  }

  function shareTo(p: SharePlatform) {
    if (p === "instagram" || p === "tiktok") void shareImage(p);
    else if (p === "save") download();
    else if (p === "copy") void copyLink();
    else openIntent(p);
  }

  /** `afterSignIn`: the modal just signed the reader in, so `user` in this
   *  closure is still the old value; the proxy checks the cookie anyway. */
  async function post(afterSignIn = false) {
    if (!user && !afterSignIn) {
      setPending("post");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const r = await postEntry(
        trend.slug,
        picks.map((p) => p.id),
      );
      setPosted(r.id);
      track("trend_entry_post", { trend: trend.slug, source: "web" });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPosting(false);
    }
  }

  if (!trend.joinable) {
    const soon = !!trend.startsAt && Date.parse(trend.startsAt) > Date.now();
    return (
      <Box
        p={5}
        borderRadius="18px"
        bg={CARD}
        border="1px solid"
        borderColor={LINE}
      >
        <Text fontWeight="800" fontSize="lg" color="white">
          {soon ? "This drop isn't live yet" : "This drop has ended"}
        </Text>
        <Text color={MUTED} mt={1}>
          {soon
            ? "Come back when it drops to make your build."
            : "The builds stay up. Make one in a live drop."}
        </Text>
        <Button
          asChild
          mt={4}
          bg={YELLOW}
          color={NAVY}
          borderRadius="12px"
          fontWeight="800"
        >
          <NextLink href="/drops">See live drops</NextLink>
        </Button>
      </Box>
    );
  }

  return (
    <Box
      id="make"
      p={{ base: 4, md: 5 }}
      borderRadius="18px"
      bg={CARD}
      border="1px solid"
      borderColor={LINE}
    >
      <Stack gap={4}>
        <Box>
          <Text fontWeight="800" fontSize="lg" color="white">
            Make your build, no account needed
          </Text>
          <Text color={MUTED} fontSize="sm">
            {min === max ? `Pick ${max} games` : `Pick ${min} to ${max} games`}
            {ranked ? ", then put them in order." : "."}
          </Text>
        </Box>

        <PickGrid
          picks={picks}
          max={max}
          ranked={ranked}
          onRemove={remove}
          onMove={move}
        />

        {!canSearch ? (
          <Box>
            <Text color={MUTED} fontSize="sm" mb={2}>
              This trend uses the games in your Nexzy{" "}
              {trend.source.kind === "library" ? "library" : "wishlist"}.
            </Text>
            <Button
              bg="#2A3166"
              color="white"
              borderRadius="12px"
              onClick={() => setPending("choices")}
            >
              Sign in to see your games
            </Button>
          </Box>
        ) : (
          <Box>
            <chakra.label htmlFor="trend-q" fontSize="sm" color={MUTED}>
              Search a game
            </chakra.label>
            <HStack mt={1}>
              <Input
                id="trend-q"
                value={q}
                onChange={(e) => setQ(e.target.value.slice(0, 60))}
                placeholder="Try: zelda, gta 6, halo"
                autoComplete="off"
                h="46px"
                borderRadius="12px"
                borderColor={LINE}
                bg={NAVY}
                color="white"
                _placeholder={{ color: "#5A6399" }}
                disabled={full}
              />
              {searching && <Spinner size="sm" color={MUTED} />}
            </HStack>
            {full ? (
              <Text color={MUTED} fontSize="sm" mt={2}>
                That&apos;s {max}. Remove one to swap it.
              </Text>
            ) : (
              <Results
                results={results}
                chosen={chosen}
                onAdd={add}
                onAsk={() => setAsking(true)}
                searched={q.trim().length > 0}
              />
            )}
            {asking && (
              <AskToAdd
                initialName={q.trim()}
                trendSlug={trend.slug}
                signedIn={!!user}
                onNeedSignIn={() => setPending("request")}
                onFound={(name) => {
                  setQ(name);
                  setAsking(false);
                }}
                onClose={() => setAsking(false)}
              />
            )}
          </Box>
        )}

        {ready && !image && (
          <HStack gap={3} wrap="wrap">
            <ShapePicker shape={shape} onChange={setShape} />
            <Button
              h="46px"
              px={5}
              borderRadius="12px"
              bg={YELLOW}
              color={NAVY}
              fontWeight="800"
              loading={making}
              loadingText="Making it"
              onClick={make}
            >
              Make my build
            </Button>
          </HStack>
        )}

        {image && (
          <Stack gap={3}>
            <Box
              mx="auto"
              w="100%"
              maxW={shape === "tall" ? "280px" : "420px"}
              borderRadius="14px"
              overflow="hidden"
              border="1px solid"
              borderColor={LINE}
            >
              <Image
                src={image.url}
                alt={`My #${trend.hashtag} build`}
                w="100%"
                h="auto"
              />
            </Box>
            {matches && <MatchNote matches={matches} />}
            <HStack gap={2} wrap="wrap">
              <ShapePicker shape={shape} onChange={setShape} />
              <Button
                h="44px"
                px={6}
                flex={{ base: 1, sm: "initial" }}
                borderRadius="12px"
                bg={YELLOW}
                color={NAVY}
                fontWeight="800"
                onClick={() => {
                  setCopied(false);
                  setShareOpen(true);
                }}
              >
                <FiShare2 /> Share
              </Button>
            </HStack>
            {posted ? (
              <Box p={3} borderRadius="12px" bg="#1F3A2C">
                <Text color="#7EE2A0" fontWeight="700">
                  Posted on Nexzy.
                </Text>
                <Text color="#CDEFD9" fontSize="sm">
                  Your build is in the drop now.{" "}
                  <NextLink
                    href={entryPath(trend.slug, posted)}
                    style={{ color: YELLOW, fontWeight: 700 }}
                  >
                    Open it
                  </NextLink>
                </Text>
              </Box>
            ) : (
              <Button
                h="44px"
                borderRadius="12px"
                bg="#2A3166"
                color="white"
                fontWeight="700"
                loading={posting}
                onClick={() => void post()}
              >
                {user ? "Post it on Nexzy" : "Sign in to post on Nexzy"}
              </Button>
            )}
          </Stack>
        )}

        {error && (
          <Text color="#FF8A8A" fontSize="sm" role="alert">
            {error}
          </Text>
        )}
      </Stack>

      <SharePanel
        open={shareOpen && !!image}
        onClose={() => setShareOpen(false)}
        hashtag={trend.hashtag}
        imageUrl={image?.url ?? null}
        onShare={shareTo}
        copied={copied}
      />

      <SignInModal
        open={pending !== null}
        onClose={() => setPending(null)}
        onSignedIn={() => {
          const p = pending;
          setPending(null);
          if (p === "post") void post(true);
          if (p === "request") setAsking(true);
        }}
        title="Sign in to Nexzy"
        subtitle={
          pending === "request"
            ? "We'll tell you when the game is added."
            : pending === "choices"
              ? "See the games in your library and wishlist."
              : "Post your picks and see who matches you."
        }
      />
    </Box>
  );
}

/** After the build is saved: how many players share its picks (the app
 *  shows who). */
function MatchNote({ matches }: { matches: DropMatches }) {
  const any = matches.count > 0;
  return (
    <Flex
      p={3.5}
      gap={3}
      align="center"
      borderRadius="14px"
      bg={NAVY}
      border="1px solid"
      borderColor={LINE}
      wrap="wrap"
    >
      <Text
        fontFamily="title"
        fontWeight="700"
        fontSize="3xl"
        color={YELLOW}
        minW="56px"
        textAlign="center"
      >
        {matches.count.toLocaleString("en-US")}
      </Text>
      <Box flex="1" minW="180px">
        <Text color="white" fontWeight="700" fontSize="sm">
          {any
            ? `${matches.count === 1 ? "player shares" : "players share"} ${matches.threshold} or more of your picks`
            : "Nobody matches you yet. Be the first they find."}
        </Text>
        <Text color={MUTED} fontSize="xs" mt={0.5}>
          {any
            ? "See who they are and follow them in the Nexzy app."
            : "Post it in the Nexzy app and get matched as people join."}
        </Text>
      </Box>
      <HStack gap={2}>
        <Button
          asChild
          size="sm"
          borderRadius="10px"
          bg="white"
          color={NAVY}
          fontWeight="800"
        >
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackDownload("ios", "drop_match")}
          >
            App Store
          </a>
        </Button>
        <Button
          asChild
          size="sm"
          borderRadius="10px"
          bg={YELLOW}
          color={NAVY}
          fontWeight="800"
        >
          <a
            href={googlePlayUrl("drop_match")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackDownload("android", "drop_match")}
          >
            Google Play
          </a>
        </Button>
      </HStack>
    </Flex>
  );
}

function ShapePicker({
  shape,
  onChange,
}: {
  shape: Shape;
  onChange: (s: Shape) => void;
}) {
  return (
    <HStack
      gap={0}
      borderRadius="10px"
      border="1px solid"
      borderColor={LINE}
      overflow="hidden"
    >
      {(
        [
          ["portrait", "Post 4:5"],
          ["tall", "Story 9:16"],
        ] as const
      ).map(([k, label]) => (
        <Button
          key={k}
          size="sm"
          borderRadius="0"
          bg={shape === k ? YELLOW : "transparent"}
          color={shape === k ? NAVY : "white"}
          fontWeight="700"
          onClick={() => onChange(k)}
          aria-pressed={shape === k}
        >
          {label}
        </Button>
      ))}
    </HStack>
  );
}

function PickGrid({
  picks,
  max,
  ranked,
  onRemove,
  onMove,
}: {
  picks: TrendChoice[];
  max: number;
  ranked: boolean;
  onRemove: (id: string) => void;
  onMove: (i: number, d: -1 | 1) => void;
}) {
  const cols = max <= 3 ? max : max === 4 ? 2 : 3;
  return (
    <Box
      display="grid"
      gridTemplateColumns={`repeat(${cols}, minmax(0, 1fr))`}
      gap={2}
    >
      {Array.from({ length: max }, (_, i) => {
        const g = picks[i];
        if (!g)
          return (
            <Flex
              key={`empty-${i}`}
              aspectRatio="1"
              borderRadius="10px"
              border="2px dashed"
              borderColor="#3A4378"
              align="center"
              justify="center"
              color="#5A6399"
              aria-hidden
            >
              <FiPlus size={22} />
            </Flex>
          );
        return (
          <Box
            key={g.id}
            position="relative"
            aspectRatio="1"
            borderRadius="10px"
            overflow="hidden"
            bg="#232A52"
            bgImage={g.cover ? `url(${g.cover})` : undefined}
            bgSize="cover"
            bgPos="center"
          >
            <Box
              position="absolute"
              inset={0}
              bgGradient="to-t"
              gradientFrom="rgba(0,0,0,0.85)"
              gradientTo="transparent"
            />
            {ranked && (
              <Flex
                position="absolute"
                top={1.5}
                left={1.5}
                w="22px"
                h="22px"
                borderRadius="full"
                bg={YELLOW}
                color={NAVY}
                fontSize="xs"
                fontWeight="800"
                align="center"
                justify="center"
              >
                {i + 1}
              </Flex>
            )}
            <Button
              position="absolute"
              top={1}
              right={1}
              size="2xs"
              minW="22px"
              h="22px"
              p={0}
              borderRadius="full"
              bg="rgba(0,0,0,0.6)"
              color="white"
              aria-label={`Remove ${g.name}`}
              onClick={() => onRemove(g.id)}
            >
              <FiX />
            </Button>
            <Text
              position="absolute"
              left={2}
              right={2}
              bottom={ranked ? 7 : 1.5}
              fontSize="xs"
              fontWeight="700"
              color="white"
              lineClamp={2}
            >
              {g.name}
            </Text>
            {ranked && picks.length > 1 && (
              <HStack
                position="absolute"
                left={1}
                right={1}
                bottom={1}
                justify="space-between"
              >
                <Button
                  size="2xs"
                  h="20px"
                  minW="24px"
                  p={0}
                  bg="rgba(0,0,0,0.6)"
                  color="white"
                  disabled={i === 0}
                  aria-label={`Move ${g.name} up`}
                  onClick={() => onMove(i, -1)}
                >
                  <FiArrowLeft />
                </Button>
                <Button
                  size="2xs"
                  h="20px"
                  minW="24px"
                  p={0}
                  bg="rgba(0,0,0,0.6)"
                  color="white"
                  disabled={i === picks.length - 1}
                  aria-label={`Move ${g.name} down`}
                  onClick={() => onMove(i, 1)}
                >
                  <FiArrowRight />
                </Button>
              </HStack>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function Results({
  results,
  chosen,
  onAdd,
  onAsk,
  searched,
}: {
  results: TrendChoice[] | null;
  chosen: Set<string>;
  onAdd: (g: TrendChoice) => void;
  onAsk: () => void;
  searched: boolean;
}) {
  if (!results) return null;
  return (
    <Box mt={2}>
      <Box
        maxH="280px"
        overflowY="auto"
        borderRadius="12px"
        border="1px solid"
        borderColor={LINE}
      >
        {results.length === 0 && (
          <Text px={3} py={3} fontSize="sm" color={MUTED}>
            No games match that.
          </Text>
        )}
        {results.slice(0, 20).map((g) => {
          const on = chosen.has(g.id);
          return (
            <chakra.button
              key={g.id}
              type="button"
              display="flex"
              w="100%"
              textAlign="left"
              alignItems="center"
              gap={3}
              px={3}
              py={2}
              borderTop="1px solid"
              borderColor="rgba(255,255,255,0.05)"
              _hover={{ bg: on ? undefined : "rgba(255,255,255,0.05)" }}
              opacity={on ? 0.5 : 1}
              onClick={() => onAdd(g)}
              disabled={on}
            >
              <Box
                w="48px"
                h="28px"
                flexShrink={0}
                borderRadius="6px"
                bg="#232A52"
                bgImage={g.cover ? `url(${g.cover})` : undefined}
                bgSize="cover"
                bgPos="center"
              />
              <Text
                flex="1"
                minW={0}
                color="white"
                fontSize="sm"
                fontWeight="600"
                truncate
              >
                {g.name}
              </Text>
              <Text fontSize="xs" color={MUTED}>
                {on ? "Picked" : (g.released?.slice(0, 4) ?? "")}
              </Text>
            </chakra.button>
          );
        })}
      </Box>
      <Button
        mt={2}
        variant="plain"
        color={YELLOW}
        fontSize="sm"
        px={0}
        h="auto"
        onClick={onAsk}
      >
        {searched
          ? "Can't find your game? Ask Nexzy to add it"
          : "Missing a game? Ask Nexzy to add it"}
      </Button>
    </Box>
  );
}

function AskToAdd({
  initialName,
  trendSlug,
  signedIn,
  onNeedSignIn,
  onFound,
  onClose,
}: {
  initialName: string;
  trendSlug: string;
  signedIn: boolean;
  onNeedSignIn: () => void;
  onFound: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [platform, setPlatform] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    const n = name.trim();
    if (n.length < 2) return setErr("Type the game's name.");
    if (!signedIn) return onNeedSignIn();
    const y = parseInt(year, 10);
    setBusy(true);
    setErr(null);
    try {
      const r = await requestGame({
        name: n,
        ...(platform.trim() ? { platform: platform.trim().slice(0, 40) } : {}),
        ...(y >= 1950 && y <= 2100 ? { year: y } : {}),
        trend: trendSlug,
      });
      track("trend_game_request", { trend: trendSlug, source: "web" });
      if (r.status === "exists") {
        onFound(r.game.name);
        return;
      }
      setDone(
        r.requests > 1
          ? `Thanks. ${r.requests} people asked for it, so it's on our list.`
          : "Thanks. It's on our list.",
      );
    } catch (e) {
      setErr(
        e instanceof TrendApiError && e.status === 429
          ? "That's a lot of requests today. Try again tomorrow."
          : errorText(e),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      mt={3}
      p={3}
      borderRadius="12px"
      bg={NAVY}
      border="1px solid"
      borderColor={LINE}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontWeight="700" color="white" fontSize="sm">
          Ask Nexzy to add a game
        </Text>
        <Button
          size="2xs"
          variant="ghost"
          color={MUTED}
          aria-label="Close"
          onClick={onClose}
        >
          <FiX />
        </Button>
      </Flex>
      {done ? (
        <Text color="#7EE2A0" fontSize="sm">
          {done}
        </Text>
      ) : (
        <Stack gap={2}>
          <Input
            aria-label="Game name"
            placeholder="Game name"
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            size="sm"
            borderColor={LINE}
            color="white"
          />
          <HStack gap={2}>
            <Input
              aria-label="Platform (optional)"
              placeholder="Platform (optional)"
              value={platform}
              maxLength={40}
              onChange={(e) => setPlatform(e.target.value)}
              size="sm"
              borderColor={LINE}
              color="white"
            />
            <Input
              aria-label="Year (optional)"
              placeholder="Year"
              value={year}
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
              size="sm"
              w="90px"
              borderColor={LINE}
              color="white"
            />
          </HStack>
          <Button
            size="sm"
            bg={YELLOW}
            color={NAVY}
            fontWeight="800"
            loading={busy}
            onClick={() => void send()}
          >
            {signedIn ? "Send" : "Sign in and send"}
          </Button>
          {err && (
            <Text color="#FF8A8A" fontSize="xs" role="alert">
              {err}
            </Text>
          )}
        </Stack>
      )}
    </Box>
  );
}
