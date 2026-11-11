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
  MIN_FORM_MS,
  REVIEW_BODY_MAX,
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
import type { HubT } from "@/lib/hubs/copy";
import { useHubT } from "./HubCopyProvider";

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

function reasonText(
  t: HubT,
  r: ReviewBlockReason,
  game: string,
  opensAt: string | null,
): string {
  switch (r) {
    case "not_open":
      return opensAt
        ? t("scores.reason.notOpenAt", { date: fmtDay(opensAt) })
        : t("scores.reason.notOpen");
    case "not_verified":
      return t("scores.reason.notVerified");
    case "removed":
      return t("scores.reason.removed");
    case "account_too_new":
      return t("scores.reason.tooNew");
    case "not_in_library":
      return t("scores.reason.notInLibrary.web", { game });
    default:
      return t("scores.reason.off");
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

async function readError(t: HubT, r: Response): Promise<string> {
  const d = await r.json().catch(() => null);
  if (r.status === 401) return t("errors.signInAgain");
  const msg = d?.message ?? d?.error;
  if (typeof msg === "string" && msg) return msg;
  if (Array.isArray(msg) && msg[0]) return t("errors.checkAnswers");
  return r.status === 429 ? t("errors.slowDown") : t("errors.generic");
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
  const t = useHubT();
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
        if (state?.reason) setError(reasonText(t, state.reason, gameName, scores.opensAt));
        return;
      }
      const r = await fetch(`/api/hubs/${slug}/reviews/start`, { method: "POST" }).catch(() => null);
      if (!r || !r.ok) {
        setError(r ? await readError(t, r) : t("errors.network"));
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
    [slug, gameName, scores.opensAt, t],
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
        setError(await readError(t, r));
        return;
      }
      setMe((await r.json()) as MyReviewState);
      setFormOpen(false);
      token.current = null;
      track("hub_review_submit", { slug, edit: hadReview ? "true" : "false" });
      void refreshPublic();
    } catch {
      setError(t("errors.network"));
    } finally {
      setBusy(false);
    }
  }, [complete, slug, c, draft, me, refreshPublic, t]);

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
        setError(await readError(t, r));
        return;
      }
      setMe((await r.json()) as MyReviewState);
      setConfirmDelete(false);
      track("hub_review_delete", { slug });
      void refreshPublic();
    } finally {
      setBusy(false);
    }
  }, [confirmDelete, slug, refreshPublic, t]);

  /** Native share sheet where there is one, else copy the link. */
  const share = useCallback(
    async (reviewId: string, score: number) => {
      const url = `${window.location.origin}/games/${slug}/rated/${reviewId}`;
      const text = t("scores.shareText", { game: gameName, score: score.toFixed(1) });
      setShareNote(null);
      try {
        if (typeof navigator.share === "function") {
          await navigator.share({ title: text, text, url });
          track("hub_review_share", { slug, method: "native" });
          return;
        }
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShareNote(t("scores.copied.web"));
        track("hub_review_share", { slug, method: "copy" });
      } catch (e) {
        // Closing the share sheet is not an error worth showing.
        if ((e as Error)?.name !== "AbortError") setShareNote(url);
      }
    },
    [slug, gameName, t],
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
          label={t("scores.critics")}
          outOf={t("scores.outOf")}
          score={scores.critics.score}
          sub={
            scores.critics.score != null
              ? scores.critics.count != null
                ? t("scores.criticsSub", { count: scores.critics.count })
                : t("scores.criticsSubNoCount")
              : t("scores.criticsNone")
          }
        />
        <ScoreCard
          label={t("scores.players")}
          outOf={t("scores.outOf")}
          gold
          score={p.score}
          sub={
            !scores.open
              ? scores.opensAt
                ? t("scores.opensAt", { date: fmtDay(scores.opensAt) })
                : t("scores.opens")
              : p.score != null
                ? t("scores.count", { count: p.count.toLocaleString("en-US") })
                : t(p.needed === 1 ? "scores.needed.one" : "scores.needed.other", {
                    n: p.needed,
                  })
          }
        />
      </SimpleGrid>

      {(p.recommended || p.split || p.frozen || scores.settled) && (
        <HStack gap={2} mt={3} flexWrap="wrap">
          {p.recommended && <Tag color={C.good}>{t("scores.tag.recommended")}</Tag>}
          {p.split && <Tag color={C.warn}>{t("scores.tag.split")}</Tag>}
          {p.frozen && <Tag color={C.warn}>{t("scores.tag.frozen")}</Tag>}
          {scores.settled && (
            <Tag color={C.gold}>
              {t("scores.tag.settled", {
                score: fmt1(scores.settled.score),
                date: fmtDay(scores.settled.at),
              })}
            </Tag>
          )}
        </HStack>
      )}

      {p.score != null && (
        <Box mt={4} aria-label={t("scores.distAria") || undefined}>
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
                {t("scores.yourRating")}{" "}
                <Text as="span" fontFamily="title" fontSize="xl" color={C.gold}>
                  {fmt1(mine.score)}
                </Text>
              </Text>
              <HStack gap={2} flexWrap="wrap">
                {mine.status !== "removed" && (
                  <PrimaryButton onClick={() => void share(mine.id, mine.score)} disabled={busy}>
                    {t("scores.share")}
                  </PrimaryButton>
                )}
                {me?.canReview && (
                  <GhostButton onClick={() => void startForm(me)} disabled={busy}>
                    {t("scores.edit")}
                  </GhostButton>
                )}
                <GhostButton onClick={() => void remove()} disabled={busy}>
                  {t(confirmDelete ? "scores.removeConfirm.web" : "scores.remove")}
                </GhostButton>
              </HStack>
            </HStack>
            {mine.dayOne && mine.status !== "removed" && (
              <Box mt={2}>
                <Tag color={C.gold}>{t("scores.dayOneReviewer")}</Tag>
              </Box>
            )}
            {shareNote && (
              <Text fontSize="sm" color={C.muted} mt={2} wordBreak="break-all">
                {shareNote}
              </Text>
            )}
            {mine.status === "held" && (
              <Text fontSize="sm" color={C.muted} mt={2}>
                {t("scores.held")}
              </Text>
            )}
            {mine.status === "removed" && (
              <Text fontSize="sm" color={C.muted} mt={2}>
                {t("scores.removed")}
              </Text>
            )}
            {mine.status === "excluded" && (
              <Text fontSize="sm" color={C.muted} mt={2}>
                {t("scores.excluded")}
              </Text>
            )}
          </Box>
        ) : !formOpen && scores.open ? (
          <PrimaryButton onClick={() => void onRate()} disabled={busy}>
            {t("scores.rate", { game: gameName })}
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
            {t("scores.listTitle", { game: gameName })}
          </Text>
          <Stack gap={3}>
            {reviews.map((r) => (
              <ReviewItem key={r.id} r={r} />
            ))}
          </Stack>
          {cursor && (
            <Box mt={3}>
              <GhostButton onClick={() => void loadMore()}>{t("scores.more")}</GhostButton>
            </Box>
          )}
        </Box>
      )}

      <Text fontSize="xs" color={C.muted} mt={5}>
        <a href="/how-player-scores-work" style={{ color: C.muted, textDecoration: "underline" }}>
          {t("scores.how")}
        </a>
      </Text>

      <SignInModal
        open={signIn}
        onClose={() => setSignIn(false)}
        onSignedIn={async () => {
          setSignIn(false);
          await startForm(await loadMe());
        }}
        title={t("scores.signIn.title.web", { game: gameName })}
        subtitle={t("scores.signIn.sub.web")}
      />
    </Box>
  );
}

function ScoreCard({
  label,
  outOf,
  score,
  sub,
  gold,
}: {
  label: string;
  outOf: string;
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
        {score != null && outOf && (
          <Text as="span" fontSize="lg" color={C.muted}>
            {" "}
            {outOf}
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
  const t = useHubT();
  return (
    <Box bg={C.card} border="1px solid" borderColor={C.line} borderRadius="14px" p={{ base: 4, md: 5 }}>
      <Text fontWeight="700" color="white" mb={1}>
        {t("rate.title", { game: gameName })}
      </Text>
      <Text fontSize="sm" color={C.muted} mb={4}>
        {t("rate.hint")}
      </Text>
      <Stack gap={4}>
        {(t.list("reviewCriteria") as CriterionKey[]).map((key) => {
          const cr = {
            key,
            label: t(`rate.criterion.${key}.label`),
            hint: t(`rate.criterion.${key}.hint`),
          };
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
                    ariaLabel={t("rate.optionAria", { label: cr.label, n: v })}
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
                    label={t("rate.noStory")}
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
            {t("rate.playedOn")}
          </Text>
          <HStack
            gap={2}
            flexWrap="wrap"
            role="radiogroup"
            aria-label={t("rate.playedOnAria") || undefined}
          >
            {(t.list("reviewPlatforms") as ReviewPlatform[]).map((key) => (
              <Chip
                key={key}
                on={draft.platform === key}
                label={t(`platform.${key}`)}
                onClick={() => setDraft((d) => ({ ...d, platform: key }))}
              />
            ))}
          </HStack>
        </Box>

        <Box>
          <Text color={C.text} fontWeight="600" mb={2}>
            {t("rate.hours")}
          </Text>
          <HStack
            gap={2}
            flexWrap="wrap"
            role="radiogroup"
            aria-label={t("rate.hours") || undefined}
          >
            {(t.list("hoursPlayed") as HoursBucket[]).map((key) => (
              <Chip
                key={key}
                on={draft.hours === key}
                label={t(`rate.hours.${key}`)}
                onClick={() => setDraft((d) => ({ ...d, hours: key }))}
              />
            ))}
          </HStack>
        </Box>

        <Box>
          <Text color={C.text} fontWeight="600" mb={2}>
            {t("rate.why")}{" "}
            <Text as="span" fontSize="xs" color={C.muted} fontWeight="400">
              {t("rate.optional")}
            </Text>
          </Text>
          <Textarea
            value={draft.body}
            maxLength={REVIEW_BODY_MAX}
            onChange={(e) => {
              const body = e.target.value;
              setDraft((d) => ({ ...d, body }));
            }}
            placeholder={t("rate.placeholder", { game: gameName })}
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
            {t("rate.yourScore")}{" "}
            <Text as="span" fontFamily="title" fontSize="2xl" color={C.gold}>
              {preview != null ? preview.toFixed(1) : "--"}
            </Text>
          </Text>
          <HStack gap={2}>
            <GhostButton onClick={onCancel} disabled={busy}>
              {t("rate.cancel")}
            </GhostButton>
            <PrimaryButton onClick={onSubmit} disabled={!complete || busy}>
              {t(busy ? "rate.saving" : "rate.submit")}
            </PrimaryButton>
          </HStack>
        </HStack>
      </Stack>
    </Box>
  );
}

function ReviewItem({ r }: { r: HubReview }) {
  const t = useHubT();
  return (
    <Box as="article" bg={C.card} border="1px solid" borderColor={C.line} borderRadius="12px" p={4}>
      <HStack justify="space-between" align="start" gap={3}>
        <Box minW={0}>
          <Text color={C.text} fontWeight="600" lineClamp={1}>
            {r.author ? `@${r.author.username}` : t("scores.anon")}
          </Text>
          <Text fontSize="xs" color={C.muted}>
            {t(`platform.${r.platform}`) || r.platform} ·{" "}
            {t(`rate.hours.${r.hours}`) || r.hours} · {fmtDay(r.createdAt)}
            {r.edited ? ` · ${t("scores.edited")}` : ""}
          </Text>
        </Box>
        <Text fontFamily="title" fontSize="2xl" color={C.gold} flexShrink={0}>
          {fmt1(r.score)}
        </Text>
      </HStack>
      {(r.dayOne || r.state !== "counted") && (
        <HStack gap={2} mt={2} flexWrap="wrap">
          {r.dayOne && <Tag color={C.gold}>{t("scores.dayOneReviewer")}</Tag>}
          {r.state === "held" && <Tag color={C.muted}>{t("scores.notCounted")}</Tag>}
          {r.state === "team" && <Tag color={C.muted}>{t("scores.team")}</Tag>}
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
