"use client";
// The /drops/<slug> builder: pick games, get the share image (rendered by
// the server), then save or share it. Posting a build to the drop happens in
// the app. Making the image also saves the build (no account), so the share
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
  fetchGameStories,
  fetchMatches,
  fetchPreview,
  logTrendEvent,
  requestGame,
  saveBuild,
} from "@/lib/trends/client";
import {
  SITE_URL,
  VISIT_TAG,
  buildPath,
  dropPath,
  isRanked,
  pickRange,
  STORY_LABEL,
  type DropMatches,
  type GameStory,
  type TrendChoice,
  type TrendView,
} from "@/lib/trends/types";
import { D } from "@/components/drops/tokens";
import SharePanel, {
  canShareFiles,
  type ShareAction,
  type ShareSite,
} from "@/components/drops/SharePanel";
import { APP_STORE_URL, googlePlayUrl } from "@/lib/storeUrls";

const YELLOW = D.yellow;
const NAVY = D.base;
const CARD = D.panel;
const LINE = D.line;
const MUTED = D.muted;

type Shape = "portrait" | "tall";
type CardImage = { url: string; blob: Blob };
type Pending = "request" | "choices" | null;

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
  /** One rendered card per shape: switching back is instant, no re-render. */
  const [images, setImages] = useState<Partial<Record<Shape, CardImage>>>({});
  const [making, setMaking] = useState(false);
  /** The card was made and the picks grid is open again to change them. */
  const [editing, setEditing] = useState(false);
  /** The image URL last saved (so Save says Saved, and a site button doesn't
   *  download the same file twice). */
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  /** The saved build behind the share link, and who matches it. */
  const [code, setCode] = useState<string | null>(null);
  const [matches, setMatches] = useState<DropMatches | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [asking, setAsking] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stories, setStories] = useState<Record<string, GameStory> | null>(
    null,
  );
  const counted = useRef({ try: false, build: false });
  const root = useRef<HTMLDivElement | null>(null);
  /** Bumped on every pick change: a card or build that comes back for
   *  older picks is dropped instead of shown as this build. */
  const picksVer = useRef(0);
  const abort = useRef<AbortController | null>(null);

  const full = picks.length >= max;
  const ready = picks.length >= min;
  const chosen = useMemo(() => new Set(picks.map((p) => p.id)), [picks]);
  const canSearch = !needsAccount || !!user;
  const image = images[shape] ?? null;
  const hasCard = !!(images.portrait || images.tall);
  /** What the preview shows: this shape, or the other one while it renders. */
  const shown = image ?? images.portrait ?? images.tall ?? null;

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

  // A new pick list makes the old images stale (the shape doesn't: the
  // post and the build are the same in either shape).
  useEffect(() => {
    picksVer.current += 1;
    setImages((old) => {
      for (const img of Object.values(old))
        if (img) URL.revokeObjectURL(img.url);
      return {};
    });
  }, [picks]);
  // New picks are a new build (same picks keep their code).
  useEffect(() => {
    setCode(null);
    setMatches(null);
  }, [picks]);
  useEffect(() => () => abort.current?.abort(), []);
  // Once the card is made: the newest Nexzy piece for the picked games
  // (best effort; a failure just hides the section).
  useEffect(() => {
    if (!hasCard) return;
    const ctl = new AbortController();
    fetchGameStories(
      picks.map((p) => p.id),
      ctl.signal,
    )
      .then(setStories)
      .catch(() => {});
    return () => ctl.abort();
  }, [hasCard, picks]);
  useEffect(() => {
    setStories(null);
  }, [picks]);
  // The picker closes itself once the build is full.
  useEffect(() => {
    if (full) setPickerOpen(false);
  }, [full]);

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

  /** Renders the card in shape `s`. Returns false when it failed. */
  async function make(s: Shape = shape): Promise<boolean> {
    if (!ready) return false;
    setMaking(true);
    setError(null);
    const ids = picks.map((p) => p.id);
    const ver = picksVer.current;
    // Save the build alongside (best effort): the share link then opens its
    // own page, and the match count can load. The image never waits on it.
    if (!code)
      void saveBuild(trend.slug, ids)
        .then(async (b) => {
          if (ver !== picksVer.current) return;
          setCode(b.code);
          const m = await fetchMatches(trend.slug, { code: b.code });
          if (ver === picksVer.current) setMatches(m);
        })
        .catch(() => undefined);
    try {
      const blob = await fetchPreview(trend.slug, {
        picks: ids,
        shape: s,
        handle: user?.username ?? undefined,
      });
      // The server sends JPEG; convert only if an older API answered WebP.
      const jpeg =
        blob.type === "image/jpeg"
          ? blob
          : await toJpeg(blob).catch(() => blob);
      // The picks changed while it rendered: this card is for old picks.
      if (ver !== picksVer.current) return false;
      const url = URL.createObjectURL(jpeg);
      const first = !hasCard;
      setImages((m) => ({ ...m, [s]: { url, blob: jpeg } }));
      setEditing(false);
      // The card replaces the grid: bring the top of the builder into view
      // so the card is the first thing on screen, not below the fold.
      if (first)
        requestAnimationFrame(() =>
          root.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      if (!counted.current.build) {
        counted.current.build = true;
        logTrendEvent(trend.slug, "build");
      }
      track("trend_image_made", { trend: trend.slug, shape: s, source: "web" });
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setMaking(false);
    }
  }

  /** Switching shape after the card exists renders the other shape once. */
  async function pickShape(s: Shape) {
    if (s === shape || making) return;
    const prev = shape;
    setShape(s);
    if (images[s]) return;
    if (!(await make(s))) setShape(prev);
  }

  const shareUrl = (platform: string) => {
    const tag = VISIT_TAG[platform] ?? "other";
    const path = code ? buildPath(trend.slug, code) : dropPath(trend.slug);
    return `${SITE_URL}${path}?s=${tag}`;
  };
  /** The caption that goes with the image: the drop's share copy from the
   *  API without its {link} (the card already prints the drop's address,
   *  and link posts get little reach on X). */
  const caption = (() => {
    const t = (
      trend.share?.text ??
      `My #${trend.hashtag} picks are in. Make yours: {link}`
    )
      .replace(/\s*\{link\}/g, "")
      .replace(/[\s:,-]+$/, "")
      .trim();
    return /[.!?]$/.test(t) ? t : `${t}.`;
  })();
  const fileName = `nexzy-${trend.slug}.jpg`;

  function countShare(platform: string) {
    logTrendEvent(trend.slug, "share", { platform });
    track("trend_share", { trend: trend.slug, platform, source: "web" });
  }

  function save(count = true) {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image.url;
    a.download = fileName;
    a.click();
    setSavedUrl(image.url);
    if (count) {
      countShare("save");
      track("trend_download", { trend: trend.slug, source: "web" });
    }
  }

  /** The OS share menu with the image attached (phones, Safari on Mac). */
  async function shareSheet() {
    if (!image) return;
    const file = new File([image.blob], fileName, { type: "image/jpeg" });
    if (!canShareFiles()) {
      save();
      return;
    }
    try {
      await navigator.share({ files: [file], text: caption });
      countShare("other");
    } catch {
      // closed the menu: nothing to do
    }
  }

  /** Computers: save the image, then open the site to attach it. X and
   *  Threads get the caption prefilled; the others can't take text. */
  function openSite(site: ShareSite) {
    if (!image) return;
    if (savedUrl !== image.url) save(false);
    const text = encodeURIComponent(caption);
    const href = {
      x: `https://x.com/intent/tweet?text=${text}`,
      threads: `https://www.threads.com/intent/post?text=${text}`,
      facebook: "https://www.facebook.com/",
      instagram: "https://www.instagram.com/",
      tiktok: "https://www.tiktok.com/upload",
    }[site];
    window.open(href, "_blank", "noopener,noreferrer");
    countShare(site);
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

  function shareTo(a: ShareAction) {
    if (a === "sheet") void shareSheet();
    else if (a === "save") save();
    else if (a === "copy") void copyLink();
    else openSite(a);
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
      ref={root}
      scrollMarginTop="88px"
      p={{ base: 4, md: 5 }}
      borderRadius="18px"
      bg={CARD}
      border="1px solid"
      borderColor={LINE}
    >
      <Stack gap={4}>
        {(!hasCard || editing) && (
          <>
            <Box>
              <Text fontWeight="800" fontSize="lg" color="white">
                Make your build, no account needed
              </Text>
              <Text color={MUTED} fontSize="sm">
                {min === max
                  ? `Pick ${max} games`
                  : `Pick ${min} to ${max} games`}
                {ranked ? ", then put them in order." : "."}
              </Text>
            </Box>

            <PickGrid
              picks={picks}
              max={max}
              ranked={ranked}
              onRemove={remove}
              onMove={move}
              onEmpty={() =>
                canSearch ? setPickerOpen(true) : setPending("choices")
              }
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
                {full ? (
                  <Text color={MUTED} fontSize="sm">
                    That&apos;s {max}. Remove one to swap it.
                  </Text>
                ) : (
                  <Button
                    h="46px"
                    px={5}
                    borderRadius="12px"
                    bg="#2A3166"
                    color="white"
                    onClick={() => setPickerOpen(true)}
                  >
                    <FiPlus /> Add games
                  </Button>
                )}
              </Box>
            )}

            {ready && (
              <HStack gap={3} wrap="wrap">
                <Button
                  h="46px"
                  px={5}
                  borderRadius="12px"
                  bg={YELLOW}
                  color={NAVY}
                  fontWeight="800"
                  loading={making}
                  loadingText="Making it"
                  onClick={() => (hasCard ? setEditing(false) : void make())}
                >
                  {hasCard ? "Back to my card" : "Make my build"}
                </Button>
              </HStack>
            )}
          </>
        )}

        {shown && !editing && (
          <Stack gap={3}>
            <Flex align="center" justify="space-between" gap={3}>
              <Text
                fontFamily="title"
                fontWeight="700"
                fontSize="2xl"
                color="white"
                lineHeight="1.1"
              >
                Your build is ready
              </Text>
              <Button
                size="sm"
                variant="ghost"
                color={MUTED}
                _hover={{ color: "white", bg: "transparent" }}
                onClick={() => setEditing(true)}
              >
                Change picks
              </Button>
            </Flex>
            <Box
              mx="auto"
              w="100%"
              maxW={shown === images.tall ? "280px" : "420px"}
              borderRadius="14px"
              overflow="hidden"
              border="1px solid"
              borderColor={LINE}
              opacity={image ? 1 : 0.5}
              transition="opacity 0.2s"
              aria-busy={!image}
            >
              <Image
                src={shown.url}
                alt={`My #${trend.hashtag} build`}
                w="100%"
                h="auto"
              />
            </Box>
            <HStack gap={2} wrap="wrap">
              <ShapePicker
                shape={shape}
                onChange={(s) => void pickShape(s)}
                busy={making}
              />
              <Button
                h="44px"
                px={6}
                flex={{ base: 1, sm: "initial" }}
                borderRadius="12px"
                bg={YELLOW}
                color={NAVY}
                fontWeight="800"
                loading={!image}
                loadingText="Making it"
                onClick={() => {
                  setCopied(false);
                  setShareOpen(true);
                }}
              >
                <FiShare2 /> Share
              </Button>
            </HStack>
            <Text color={MUTED} fontSize="sm" mt={-1}>
              Share it and dare your friends to make theirs.
            </Text>
            <NextSteps matches={matches} count={picks.length} />
            {stories && <NewForYourGames picks={picks} stories={stories} />}
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
        saved={!!image && savedUrl === image.url}
        copied={copied}
      />

      {pickerOpen && canSearch && (
        <Flex
          position="fixed"
          inset="0"
          zIndex={1400}
          bg="rgba(5, 8, 24, 0.72)"
          align={{ base: "flex-end", md: "center" }}
          justify="center"
          onClick={() => {
            setPickerOpen(false);
            setAsking(false);
          }}
        >
          <Flex
            direction="column"
            onClick={(e) => e.stopPropagation()}
            w={{ base: "100%", md: "520px" }}
            maxH={{ base: "85dvh", md: "80vh" }}
            bg="#151A3C"
            border="1px solid"
            borderColor={LINE}
            borderTopRadius="16px"
            borderBottomRadius={{ base: "0", md: "16px" }}
            p={4}
            gap={3}
          >
            <Flex align="center" justify="space-between">
              <Text color="white" fontWeight="800">
                Add games{" "}
                <chakra.span color={MUTED} fontWeight="600" fontSize="sm">
                  {picks.length} of {max}
                </chakra.span>
              </Text>
              <Button
                size="sm"
                variant="plain"
                color={MUTED}
                aria-label="Close"
                onClick={() => {
                  setPickerOpen(false);
                  setAsking(false);
                }}
              >
                <FiX size={18} />
              </Button>
            </Flex>
            <HStack>
              <Input
                id="trend-q"
                value={q}
                onChange={(e) => setQ(e.target.value.slice(0, 60))}
                placeholder="Try: zelda, gta 6, halo"
                autoComplete="off"
                autoFocus
                h="46px"
                borderRadius="12px"
                borderColor={LINE}
                bg={NAVY}
                color="white"
                _placeholder={{ color: "#5A6399" }}
              />
              {searching && <Spinner size="sm" color={MUTED} />}
            </HStack>
            <Box flex="1" minH={0} overflowY="auto">
              <Results
                results={results}
                chosen={chosen}
                onAdd={add}
                onAsk={() => setAsking(true)}
                searched={q.trim().length > 0}
              />
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
          </Flex>
        </Flex>
      )}

      <SignInModal
        open={pending !== null}
        onClose={() => setPending(null)}
        onSignedIn={() => {
          const p = pending;
          setPending(null);
          if (p === "request") setAsking(true);
        }}
        title="Sign in to Nexzy"
        subtitle={
          pending === "request"
            ? "We'll tell you when the game is added."
            : "See the games in your library and wishlist."
        }
      />
    </Box>
  );
}

/** Under the card: share first (every shared card brings the next
 *  builder), then the app, where the picks become a feed. The count of
 *  players with the same picks shows only when there are some. */
function NextSteps({
  matches,
  count,
}: {
  matches: DropMatches | null;
  count: number;
}) {
  const same = matches && matches.count > 0 ? matches : null;
  return (
    <Box
      p={4}
      borderRadius="14px"
      bg={NAVY}
      border="1px solid"
      borderColor={LINE}
    >
      <Text
        color={YELLOW}
        fontWeight="800"
        fontSize="xs"
        letterSpacing="0.08em"
      >
        FREE ON IPHONE AND ANDROID
      </Text>
      <Text color="white" fontWeight="800" fontSize="lg" mt={1}>
        Follow your {count} on Nexzy
      </Text>
      <Text color={MUTED} fontSize="sm" mt={1}>
        {same
          ? `${same.count.toLocaleString("en-US")} ${same.count === 1 ? "player" : "players"} picked ${same.threshold} or more of the same games. See who in the app, follow them and squad up in a Room.`
          : "News, guides and price drops for every game you picked, in one feed. Follow the players who pick like you and squad up in a Room."}
      </Text>
      <HStack gap={2} mt={3}>
        <Button
          asChild
          size="sm"
          h="40px"
          px={4}
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
          h="40px"
          px={4}
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
    </Box>
  );
}

/** "New for your games": the three freshest Nexzy pieces among the picks
 *  (mega hub walkthroughs first, then the newest dated pieces). */
function NewForYourGames({
  picks,
  stories,
}: {
  picks: TrendChoice[];
  stories: Record<string, GameStory>;
}) {
  const top = picks
    .map((p) => ({ p, s: stories[p.id] }))
    .filter((x): x is { p: TrendChoice; s: GameStory } => !!x.s)
    .sort(
      (a, b) =>
        (b.s.publishedAt
          ? Date.parse(b.s.publishedAt)
          : Number.MAX_SAFE_INTEGER) -
        (a.s.publishedAt
          ? Date.parse(a.s.publishedAt)
          : Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 3);
  if (!top.length) return null;
  return (
    <Box mt={2}>
      <Text color="white" fontWeight="800" mb={2}>
        New for your games
      </Text>
      <Stack gap={2}>
        {top.map(({ p, s }) => (
          <NextLink key={p.id} href={s.path} style={{ display: "block" }}>
            <Flex
              gap={3}
              align="center"
              p={2.5}
              borderRadius="12px"
              bg="#1A1F47"
              _hover={{ bg: "#232A5C" }}
              transition="background 0.15s"
            >
              <Box
                w="60px"
                h="42px"
                flexShrink={0}
                borderRadius="8px"
                bg="#232A52"
                bgImage={
                  s.image || p.cover ? `url(${s.image ?? p.cover})` : undefined
                }
                bgSize="cover"
                bgPos="center"
              />
              <Box minW={0}>
                <Text
                  color={YELLOW}
                  fontWeight="800"
                  fontSize="2xs"
                  letterSpacing="0.08em"
                  textTransform="uppercase"
                >
                  {STORY_LABEL[s.type] ?? "Story"} · {p.name}
                </Text>
                <Text
                  color="white"
                  fontSize="sm"
                  fontWeight="700"
                  lineClamp={2}
                >
                  {s.title}
                </Text>
              </Box>
            </Flex>
          </NextLink>
        ))}
      </Stack>
    </Box>
  );
}

function ShapePicker({
  shape,
  onChange,
  busy,
}: {
  shape: Shape;
  onChange: (s: Shape) => void;
  busy?: boolean;
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
          disabled={busy && shape !== k}
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
  onEmpty,
}: {
  picks: TrendChoice[];
  max: number;
  ranked: boolean;
  onRemove: (id: string) => void;
  onMove: (i: number, d: -1 | 1) => void;
  onEmpty: () => void;
}) {
  const cols = max <= 3 ? max : max === 4 ? 2 : 3;
  return (
    <Box
      display="grid"
      gridTemplateColumns={`repeat(${cols}, minmax(0, 1fr))`}
      gap={{ base: 2, md: 3 }}
    >
      {Array.from({ length: max }, (_, i) => {
        const g = picks[i];
        if (!g)
          return (
            <chakra.button
              key={`empty-${i}`}
              type="button"
              display="flex"
              aspectRatio="3 / 4"
              borderRadius="10px"
              border="2px dashed"
              borderColor="#3A4378"
              alignItems="center"
              justifyContent="center"
              color="#5A6399"
              _hover={{ borderColor: "#5A6399", color: "#9AA1C7" }}
              aria-label="Add a game"
              onClick={onEmpty}
            >
              <FiPlus size={22} />
            </chakra.button>
          );
        return (
          <Box
            key={g.id}
            className="group"
            position="relative"
            aspectRatio="3 / 4"
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
              css={{
                "@media (hover: hover)": { opacity: 0 },
              }}
              _groupHover={{ opacity: 1 }}
              _groupFocusWithin={{ opacity: 1 }}
              transition="opacity 0.15s"
              aria-label={`Remove ${g.name}`}
              onClick={() => onRemove(g.id)}
            >
              <FiX />
            </Button>
            <Text
              position="absolute"
              left={2}
              right={2}
              bottom={ranked ? 8 : 2}
              fontSize={{ base: "xs", md: "sm" }}
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
                css={{
                  "@media (hover: hover)": { opacity: 0 },
                }}
                _groupHover={{ opacity: 1 }}
                _groupFocusWithin={{ opacity: 1 }}
                transition="opacity 0.15s"
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
        maxH="400px"
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
              py={2.5}
              borderTop="1px solid"
              borderColor="rgba(255,255,255,0.05)"
              _hover={{ bg: on ? undefined : "rgba(255,255,255,0.05)" }}
              opacity={on ? 0.5 : 1}
              onClick={() => onAdd(g)}
              disabled={on}
            >
              <Box
                w="44px"
                h="59px"
                flexShrink={0}
                borderRadius="8px"
                bg="#232A52"
                bgImage={g.cover ? `url(${g.cover})` : undefined}
                bgSize="cover"
                bgPos="center"
              />
              <Box flex="1" minW={0}>
                <Text
                  color="white"
                  fontSize="md"
                  fontWeight="600"
                  lineHeight="short"
                  lineClamp={2}
                >
                  {g.name}
                </Text>
                {g.released && (
                  <Text fontSize="sm" color={MUTED} mt="2px">
                    {g.released.slice(0, 4)}
                  </Text>
                )}
              </Box>
              {on && (
                <Text fontSize="xs" color={MUTED} flexShrink={0}>
                  Picked
                </Text>
              )}
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
