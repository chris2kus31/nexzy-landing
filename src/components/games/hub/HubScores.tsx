"use client";

// Critics vs Nexzy Players + "Rate it". Server HTML ships the scores and the
// first page of written reviews from build time (crawlable); on mount we
// fetch fresh numbers once (no polling). Writes go through /api/hubs/* (BFF).
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, HStack, SimpleGrid, Stack, Text, Textarea, chakra } from "@chakra-ui/react";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInModal from "@/components/auth/SignInModal";
import { track } from "@/lib/analytics";
import {
  CRITERIA,
  HOURS_BUCKETS,
  MIN_FORM_MS,
  REVIEW_BODY_MAX,
  REVIEW_PLATFORMS,
  hoursLabel,
  platformLabel,
  previewScore,
  type CriterionKey,
  type HoursBucket,
  type HubReview,
  type HubReviewPage,
  type HubScores as Scores,
  type MyReviewState,
  type ReviewBlockReason,
  type ReviewPlatform,
} from "@/lib/hubs/reviews";
import { fmtHubDate } from "@/lib/hubs/types";

const C = {
  card: "#11152b",
  line: "rgba(255,255,255,0.12)",
  muted: "#9aa3bf",
  text: "#EDF2F7",
  gold: "#FFD700",
  ink: "#0b0e1d",
  good: "#7EE2A0",
  warn: "#FFB86B",
};

const fmtDay = (iso: string) => fmtHubDate(iso);
const fmt1 = (n: number) => n.toFixed(1);

function reasonText(r: ReviewBlockReason, game: string, opensAt: string | null): string {
  switch (r) {
    case "not_open":
      return opensAt ? `Ratings open at launch, ${fmtDay(opensAt)}.` : "Ratings open at launch.";
    case "not_verified":
      return "Verify your email to rate games.";
    case "removed":
      return "Your rating for this game was removed by a moderator.";
    case "account_too_new":
      return "New accounts can rate a few days after signing up.";
    case "not_in_library":
      return `Add ${game} to your library in the Nexzy app first, then rate it here.`;
    default:
      return "Ratings are off for this game.";
  }
}

type Draft = {
  criteria: Partial<Record<CriterionKey, number>>;
  storyNa: boolean;
  platform: ReviewPlatform | null;
  hours: HoursBucket | null;
  body: string;
};
const emptyDraft = (): Draft => ({
  criteria: {},
  storyNa: false,
  platform: null,
  hours: null,
  body: "",
});

async function readError(r: Response): Promise<string> {
  const d = await r.json().catch(() => null);
  if (r.status === 401) return "Sign in again to continue.";
  const msg = d?.message ?? d?.error;
  if (typeof msg === "string" && msg) return msg;
  if (Array.isArray(msg) && msg[0]) return "Check your answers and try again.";
  return r.status === 429 ? "Slow down a sec, then try again." : "That didn't go through. Try again.";
}

export default function HubScores({
  slug,
  gameName,
  initialScores,
  initialReviews,
}: {
  slug: string;
  gameName: string;
  initialScores: Scores;
  initialReviews: HubReviewPage;
}) {
  const { user, loading } = useAuth();
  const [scores, setScores] = useState<Scores>(initialScores);
  const [reviews, setReviews] = useState<HubReview[]>(initialReviews.items);
  const [cursor, setCursor] = useState<string | null>(initialReviews.nextCursor);
  const [me, setMe] = useState<MyReviewState | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signIn, setSignIn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const token = useRef<{ value: string; at: number } | null>(null);

  const refreshPublic = useCallback(async () => {
    const [s, r] = await Promise.all([
      fetch(`/api/hubs/${slug}/scores`).then((x) => (x.ok ? x.json() : null)).catch(() => null),
      fetch(`/api/hubs/${slug}/reviews`).then((x) => (x.ok ? x.json() : null)).catch(() => null),
    ]);
    if (s) setScores(s as Scores);
    if (r) {
      setReviews((r as HubReviewPage).items);
      setCursor((r as HubReviewPage).nextCursor);
    }
  }, [slug]);

  // Fresh numbers once per page view.
  useEffect(() => {
    void refreshPublic();
  }, [refreshPublic]);

  const loadMe = useCallback(async (): Promise<MyReviewState | null> => {
    const r = await fetch(`/api/hubs/${slug}/reviews/me`, { cache: "no-store" }).catch(() => null);
    const d = r && r.ok ? ((await r.json()) as MyReviewState) : null;
    setMe(d);
    return d;
  }, [slug]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setMe(null);
      return;
    }
    void loadMe();
  }, [user, loading, loadMe]);

  const startForm = useCallback(
    async (state: MyReviewState | null) => {
      setError(null);
      if (!state?.canReview) {
        if (state?.reason) setError(reasonText(state.reason, gameName, scores.opensAt));
        return;
      }
      const r = await fetch(`/api/hubs/${slug}/reviews/start`, { method: "POST" }).catch(() => null);
      if (!r || !r.ok) {
        setError(r ? await readError(r) : "Couldn't reach Nexzy. Try again.");
        return;
      }
      const d = (await r.json()) as { formToken: string };
      token.current = { value: d.formToken, at: Date.now() };
      const mine = state.review;
      setDraft(
        mine
          ? {
              criteria: {
                fun: mine.criteria.fun,
                performance: mine.criteria.performance,
                value: mine.criteria.value,
                presentation: mine.criteria.presentation,
                ...(mine.criteria.story != null ? { story: mine.criteria.story } : {}),
              },
              storyNa: mine.criteria.story == null,
              platform: mine.platform,
              hours: mine.hours,
              body: mine.body ?? "",
            }
          : emptyDraft(),
      );
      setFormOpen(true);
      track("hub_review_start", { slug, edit: mine ? "true" : "false" });
    },
    [slug, gameName, scores.opensAt],
  );

  const onRate = useCallback(async () => {
    if (!user) {
      setSignIn(true);
      return;
    }
    await startForm(me ?? (await loadMe()));
  }, [user, me, loadMe, startForm]);

  const c = draft.criteria;
  const complete =
    c.fun != null &&
    c.performance != null &&
    c.value != null &&
    c.presentation != null &&
    (draft.storyNa || c.story != null) &&
    !!draft.platform &&
    !!draft.hours;
  const preview = complete
    ? previewScore({
        fun: c.fun!,
        performance: c.performance!,
        value: c.value!,
        presentation: c.presentation!,
        story: draft.storyNa ? null : c.story!,
      })
    : null;

  const submit = useCallback(async () => {
    if (!complete || !token.current) return;
    const hadReview = !!me?.review;
    setBusy(true);
    setError(null);
    try {
      // The API wants the form open 8s+; wait out the rest instead of failing.
      const wait = MIN_FORM_MS + 300 - (Date.now() - token.current.at);
      if (wait > 0) await new Promise((res) => setTimeout(res, wait));
      const r = await fetch(`/api/hubs/${slug}/reviews`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fun: c.fun,
          performance: c.performance,
          value: c.value,
          presentation: c.presentation,
          story: draft.storyNa ? null : c.story,
          platform: draft.platform,
          hours: draft.hours,
          body: draft.body.trim() ? draft.body.trim() : null,
          formToken: token.current.value,
        }),
      });
      if (!r.ok) {
        setError(await readError(r));
        return;
      }
      setMe((await r.json()) as MyReviewState);
      setFormOpen(false);
      token.current = null;
      track("hub_review_submit", { slug, edit: hadReview ? "true" : "false" });
      void refreshPublic();
    } catch {
      setError("Couldn't reach Nexzy. Try again.");
    } finally {
      setBusy(false);
    }
  }, [complete, slug, c, draft, me, refreshPublic]);

  const remove = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/hubs/${slug}/reviews`, { method: "DELETE" });
      if (!r.ok) {
        setError(await readError(r));
        return;
      }
      setMe((await r.json()) as MyReviewState);
      setConfirmDelete(false);
      track("hub_review_delete", { slug });
      void refreshPublic();
    } finally {
      setBusy(false);
    }
  }, [confirmDelete, slug, refreshPublic]);

  /** Native share sheet where there is one, else copy the link. */
  const share = useCallback(
    async (reviewId: string, score: number) => {
      const url = `${window.location.origin}/games/${slug}/rated/${reviewId}`;
      const text = `I gave ${gameName} a ${score.toFixed(1)} on Nexzy`;
      setShareNote(null);
      try {
        if (typeof navigator.share === "function") {
          await navigator.share({ title: text, text, url });
          track("hub_review_share", { slug, method: "native" });
          return;
        }
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShareNote("Link copied. Paste it anywhere.");
        track("hub_review_share", { slug, method: "copy" });
      } catch (e) {
        // Closing the share sheet is not an error worth showing.
        if ((e as Error)?.name !== "AbortError") setShareNote(url);
      }
    },
    [slug, gameName],
  );

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    const r = await fetch(`/api/hubs/${slug}/reviews?cursor=${encodeURIComponent(cursor)}`).catch(() => null);
    if (!r || !r.ok) return;
    const d = (await r.json()) as HubReviewPage;
    setReviews((prev) => [...prev, ...d.items.filter((x) => !prev.some((p) => p.id === x.id))]);
    setCursor(d.nextCursor);
  }, [cursor, slug]);

  const p = scores.players;
  const mine = me?.review ?? null;
  const maxBucket = Math.max(1, ...p.distribution);

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        <ScoreCard
          label="Critics"
          score={scores.critics.score}
          sub={
            scores.critics.score != null
              ? `Average of ${scores.critics.count ?? "critic"} reviews (IGDB)`
              : "No critic score yet"
          }
        />
        <ScoreCard
          label="Nexzy Players"
          gold
          score={p.score}
          sub={
            !scores.open
              ? scores.opensAt
                ? `Player ratings open at launch, ${fmtDay(scores.opensAt)}`
                : "Player ratings open at launch"
              : p.score != null
                ? `${p.count.toLocaleString("en-US")} player ratings`
                : `${p.needed} more rating${p.needed === 1 ? "" : "s"} to show a score`
          }
        />
      </SimpleGrid>

      {(p.recommended || p.split || p.frozen || scores.settled) && (
        <HStack gap={2} mt={3} flexWrap="wrap">
          {p.recommended && <Tag color={C.good}>Players recommend</Tag>}
          {p.split && <Tag color={C.warn}>Critics and players disagree</Tag>}
          {p.frozen && <Tag color={C.warn}>Score paused: unusual rating activity under review</Tag>}
          {scores.settled && (
            <Tag color={C.gold}>
              Settled {fmt1(scores.settled.score)} on {fmtDay(scores.settled.at)}
            </Tag>
          )}
        </HStack>
      )}

      {p.score != null && (
        <Box mt={4} aria-label="How players rated it, 1 to 10">
          <HStack align="end" gap="3px" h="48px">
            {p.distribution.map((n, i) => (
              <Box
                key={i}
                flex="1"
                h={`${Math.max(4, Math.round((n / maxBucket) * 100))}%`}
                bg={i >= 7 ? C.gold : "whiteAlpha.400"}
                borderRadius="3px"
                title={`${i + 1}: ${n}`}
              />
            ))}
          </HStack>
          <HStack justify="space-between" mt={1}>
            <Text fontSize="xs" color={C.muted}>1</Text>
            <Text fontSize="xs" color={C.muted}>10</Text>
          </HStack>
        </Box>
      )}

      {/* The viewer's own rating, or the button to rate. */}
      <Box mt={5}>
        {mine && !formOpen ? (
          <Box bg={C.card} border="1px solid" borderColor={C.line} borderRadius="12px" p={4}>
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
              <Text color={C.text}>
                Your rating:{" "}
                <Text as="span" fontFamily="title" fontSize="xl" color={C.gold}>
                  {fmt1(mine.score)}
                </Text>
              </Text>
              <HStack gap={2} flexWrap="wrap">
                {mine.status !== "removed" && (
                  <PrimaryButton onClick={() => void share(mine.id, mine.score)} disabled={busy}>
                    Share
                  </PrimaryButton>
                )}
                {me?.canReview && (
                  <GhostButton onClick={() => void startForm(me)} disabled={busy}>
                    Edit
                  </GhostButton>
                )}
                <GhostButton onClick={() => void remove()} disabled={busy}>
                  {confirmDelete ? "Tap again to remove" : "Remove"}
                </GhostButton>
              </HStack>
            </HStack>
            {mine.dayOne && mine.status !== "removed" && (
              <Box mt={2}>
                <Tag color={C.gold}>Day One reviewer</Tag>
              </Box>
            )}
            {shareNote && (
              <Text fontSize="sm" color={C.muted} mt={2} wordBreak="break-all">
                {shareNote}
              </Text>
            )}
            {mine.status === "held" && (
              <Text fontSize="sm" color={C.muted} mt={2}>
                Your rating is being checked and will count once it clears.
              </Text>
            )}
            {mine.status === "removed" && (
              <Text fontSize="sm" color={C.muted} mt={2}>
                A moderator removed this rating, so it doesn't count.
              </Text>
            )}
            {mine.status === "excluded" && (
              <Text fontSize="sm" color={C.muted} mt={2}>
                Team accounts are shown but never counted in the score.
              </Text>
            )}
          </Box>
        ) : !formOpen && scores.open ? (
          <PrimaryButton onClick={() => void onRate()} disabled={busy}>
            Rate {gameName}
          </PrimaryButton>
        ) : null}

        {formOpen && (
          <RateForm
            gameName={gameName}
            draft={draft}
            setDraft={setDraft}
            preview={preview}
            complete={complete}
            busy={busy}
            onSubmit={() => void submit()}
            onCancel={() => {
              setFormOpen(false);
              setError(null);
            }}
          />
        )}
        {error && (
          <Text fontSize="sm" color="red.300" mt={2} role="alert">
            {error}
          </Text>
        )}
      </Box>

      {reviews.length > 0 && (
        <Box mt={7}>
          <Text as="h3" fontFamily="heading" fontSize="lg" color="white" mb={3}>
            What players say about {gameName}
          </Text>
          <Stack gap={3}>
            {reviews.map((r) => (
              <ReviewItem key={r.id} r={r} />
            ))}
          </Stack>
          {cursor && (
            <Box mt={3}>
              <GhostButton onClick={() => void loadMore()}>More reviews</GhostButton>
            </Box>
          )}
        </Box>
      )}

      <Text fontSize="xs" color={C.muted} mt={5}>
        <a href="/how-player-scores-work" style={{ color: C.muted, textDecoration: "underline" }}>
          How player scores work
        </a>
      </Text>

      <SignInModal
        open={signIn}
        onClose={() => setSignIn(false)}
        onSignedIn={async () => {
          setSignIn(false);
          await startForm(await loadMe());
        }}
        title={`Rate ${gameName}`}
        subtitle="Sign in so your rating counts toward the Nexzy Players score."
      />
    </Box>
  );
}

function ScoreCard({
  label,
  score,
  sub,
  gold,
}: {
  label: string;
  score: number | null;
  sub: string;
  gold?: boolean;
}) {
  return (
    <Box bg={C.card} border="1px solid" borderColor={gold ? "rgba(255,215,0,0.35)" : C.line} borderRadius="14px" p={5}>
      <Text fontSize="xs" letterSpacing="0.08em" textTransform="uppercase" color={C.muted}>
        {label}
      </Text>
      <Text fontFamily="title" fontSize={{ base: "4xl", md: "5xl" }} lineHeight="1.1" color={gold ? C.gold : "white"}>
        {score != null ? fmt1(score) : "--"}
        {score != null && (
          <Text as="span" fontSize="lg" color={C.muted}>
            {" "}/ 10
          </Text>
        )}
      </Text>
      <Text fontSize="sm" color={C.muted}>
        {sub}
      </Text>
    </Box>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <Text as="span" fontSize="xs" fontWeight="600" color={color} border="1px solid" borderColor={color} borderRadius="999px" px={3} py={1}>
      {children}
    </Text>
  );
}

function PrimaryButton(props: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <chakra.button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      bg={C.gold}
      color={C.ink}
      fontWeight="700"
      borderRadius="10px"
      px={5}
      py={3}
      cursor="pointer"
      _disabled={{ opacity: 0.6, cursor: "default" }}
    >
      {props.children}
    </chakra.button>
  );
}

function GhostButton(props: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <chakra.button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      bg="transparent"
      color={C.text}
      border="1px solid"
      borderColor={C.line}
      borderRadius="10px"
      px={4}
      py={2}
      fontSize="sm"
      cursor="pointer"
      _hover={{ borderColor: C.gold }}
      _disabled={{ opacity: 0.6, cursor: "default" }}
    >
      {props.children}
    </chakra.button>
  );
}

function Chip(props: { on: boolean; onClick: () => void; label: string; ariaLabel?: string }) {
  return (
    <chakra.button
      type="button"
      role="radio"
      aria-checked={props.on}
      aria-label={props.ariaLabel}
      onClick={props.onClick}
      bg={props.on ? C.gold : "transparent"}
      color={props.on ? C.ink : C.text}
      fontWeight={props.on ? "700" : "500"}
      border="1px solid"
      borderColor={props.on ? C.gold : C.line}
      borderRadius="8px"
      minW="40px"
      px={3}
      py={2}
      fontSize="sm"
      cursor="pointer"
      _hover={{ borderColor: C.gold }}
    >
      {props.label}
    </chakra.button>
  );
}

function RateForm({
  gameName,
  draft,
  setDraft,
  preview,
  complete,
  busy,
  onSubmit,
  onCancel,
}: {
  gameName: string;
  draft: Draft;
  setDraft: (fn: (d: Draft) => Draft) => void;
  preview: number | null;
  complete: boolean;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <Box bg={C.card} border="1px solid" borderColor={C.line} borderRadius="14px" p={{ base: 4, md: 5 }}>
      <Text fontWeight="700" color="white" mb={1}>
        Rate {gameName}
      </Text>
      <Text fontSize="sm" color={C.muted} mb={4}>
        1 is bad, 5 is great. Your score is worked out from these.
      </Text>
      <Stack gap={4}>
        {CRITERIA.map((cr) => {
          const na = cr.key === "story" && draft.storyNa;
          return (
            <Box key={cr.key}>
              <HStack justify="space-between" flexWrap="wrap" gap={1} mb={2}>
                <Text color={C.text} fontWeight="600">
                  {cr.label}{" "}
                  <Text as="span" fontSize="xs" color={C.muted} fontWeight="400">
                    {cr.hint}
                  </Text>
                </Text>
              </HStack>
              <HStack gap={2} flexWrap="wrap" role="radiogroup" aria-label={cr.label}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <Chip
                    key={v}
                    on={!na && draft.criteria[cr.key] === v}
                    label={String(v)}
                    ariaLabel={`${cr.label} ${v} of 5`}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        criteria: { ...d.criteria, [cr.key]: v },
                        storyNa: cr.key === "story" ? false : d.storyNa,
                      }))
                    }
                  />
                ))}
                {cr.key === "story" && (
                  <Chip
                    on={draft.storyNa}
                    label="No story"
                    onClick={() =>
                      setDraft((d) => {
                        const { story: _s, ...rest } = d.criteria;
                        return { ...d, storyNa: true, criteria: rest };
                      })
                    }
                  />
                )}
              </HStack>
            </Box>
          );
        })}

        <Box>
          <Text color={C.text} fontWeight="600" mb={2}>
            Played on
          </Text>
          <HStack gap={2} flexWrap="wrap" role="radiogroup" aria-label="Platform">
            {REVIEW_PLATFORMS.map((pl) => (
              <Chip
                key={pl.key}
                on={draft.platform === pl.key}
                label={pl.label}
                onClick={() => setDraft((d) => ({ ...d, platform: pl.key }))}
              />
            ))}
          </HStack>
        </Box>

        <Box>
          <Text color={C.text} fontWeight="600" mb={2}>
            Hours played
          </Text>
          <HStack gap={2} flexWrap="wrap" role="radiogroup" aria-label="Hours played">
            {HOURS_BUCKETS.map((h) => (
              <Chip
                key={h.key}
                on={draft.hours === h.key}
                label={h.label}
                onClick={() => setDraft((d) => ({ ...d, hours: h.key }))}
              />
            ))}
          </HStack>
        </Box>

        <Box>
          <Text color={C.text} fontWeight="600" mb={2}>
            Say why <Text as="span" fontSize="xs" color={C.muted} fontWeight="400">(optional)</Text>
          </Text>
          <Textarea
            value={draft.body}
            maxLength={REVIEW_BODY_MAX}
            onChange={(e) => {
              const body = e.target.value;
              setDraft((d) => ({ ...d, body }));
            }}
            placeholder={`What should other players know about ${gameName}?`}
            rows={4}
            bg="#0d1124"
            color={C.text}
            borderColor={C.line}
            _placeholder={{ color: C.muted }}
          />
          <Text fontSize="xs" color={C.muted} mt={1} textAlign="right">
            {draft.body.length}/{REVIEW_BODY_MAX}
          </Text>
        </Box>

        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <Text color={C.text}>
            Your score:{" "}
            <Text as="span" fontFamily="title" fontSize="2xl" color={C.gold}>
              {preview != null ? preview.toFixed(1) : "--"}
            </Text>
          </Text>
          <HStack gap={2}>
            <GhostButton onClick={onCancel} disabled={busy}>
              Cancel
            </GhostButton>
            <PrimaryButton onClick={onSubmit} disabled={!complete || busy}>
              {busy ? "Saving..." : "Submit rating"}
            </PrimaryButton>
          </HStack>
        </HStack>
      </Stack>
    </Box>
  );
}

function ReviewItem({ r }: { r: HubReview }) {
  return (
    <Box as="article" bg={C.card} border="1px solid" borderColor={C.line} borderRadius="12px" p={4}>
      <HStack justify="space-between" align="start" gap={3}>
        <Box minW={0}>
          <Text color={C.text} fontWeight="600" lineClamp={1}>
            {r.author ? `@${r.author.username}` : "A Nexzy player"}
          </Text>
          <Text fontSize="xs" color={C.muted}>
            {platformLabel(r.platform)} · {hoursLabel(r.hours)} · {fmtDay(r.createdAt)}
            {r.edited ? " · edited" : ""}
          </Text>
        </Box>
        <Text fontFamily="title" fontSize="2xl" color={C.gold} flexShrink={0}>
          {fmt1(r.score)}
        </Text>
      </HStack>
      {(r.dayOne || r.state !== "counted") && (
        <HStack gap={2} mt={2} flexWrap="wrap">
          {r.dayOne && <Tag color={C.gold}>Day One reviewer</Tag>}
          {r.state === "held" && <Tag color={C.muted}>Not counted yet</Tag>}
          {r.state === "team" && <Tag color={C.muted}>Nexzy team, not counted</Tag>}
        </HStack>
      )}
      {r.body && (
        <Text color="#c7cde0" mt={3} whiteSpace="pre-line" lineHeight="1.7">
          {r.body}
        </Text>
      )}
    </Box>
  );
}
