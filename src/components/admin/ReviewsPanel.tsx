"use client";

// Admin -> Reviews (Phase 2). Nexzy Players ratings: the switches (On/Off),
// each game's score with review-bomb pause + unfreeze, and the moderation
// queue (held ratings, auto-hidden text, removed). Every decision recomputes
// the game's score within ~30s.
import { useCallback, useEffect, useState } from "react";
import { Badge, Box, Button, Flex, HStack, NativeSelect, Spinner, Text } from "@chakra-ui/react";
import { FiExternalLink, FiRefreshCw } from "react-icons/fi";
import {
  decideReview,
  getReviewOverview,
  getReviewQueue,
  unfreezeReviews,
  type AdminReviewOverview,
  type AdminReviewRow,
  type ReviewQueueView,
} from "@/lib/admin/client";
import { hoursLabel, platformLabel } from "@/lib/hubs/reviews";

const C = {
  surface: "#222849",
  raised: "#2a3156",
  line: "rgba(255,255,255,0.08)",
  text: "#EDF2F7",
  muted: "#9AA3BF",
  faint: "#6B7394",
  good: "#7EE2A0",
  bad: "#FF8A80",
  warn: "#FFB86B",
  gold: "#FFD700",
  ink: "#0b0e1d",
};

const FLAG_INFO: Record<string, { label: string; what: string }> = {
  newAccountGate: {
    label: "New-account gate",
    what: "Blocks rating until the account is 7 days old and the game has been in their library 24h. Off = new accounts can rate at half weight.",
  },
  repWeighting: {
    label: "Trusted-reviewer weighting",
    what: "Accounts 90+ days old with 10+ counted ratings count 1.5x.",
  },
  repGate: {
    label: "Account-age gate",
    what: "Blocks accounts younger than 7 days from rating (no library check). Keep off at launch.",
  },
};

const VIEWS: Array<{ key: ReviewQueueView; label: string; hint: string }> = [
  { key: "held", label: "Held", hint: "Ratings not counted yet. Approve to count them, remove to drop them." },
  { key: "hidden_text", label: "Text hidden", hint: "Auto-moderation hid the text; the rating still counts. Approve shows the text again." },
  { key: "removed", label: "Removed", hint: "Removed by a moderator. Restore counts the rating and shows its text." },
];

const HOLD: Record<string, string> = {
  straight_line: "All 1s or all 5s with no text",
  velocity: "Burst of ratings from one network",
  bomb_hold: "Review-bomb pause on this game",
};

const fmt1 = (n: number | null | undefined) => (n == null ? "--" : Number(n).toFixed(1));
const fmtWhen = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }) + " CT"
    : "";
const ageDays = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 864e5));

function Card({ title, hint, right, children }: { title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box bg={C.surface} borderRadius="14px" p={5} border="1px solid" borderColor={C.line}>
      <Flex justify="space-between" align="start" gap={3} mb={hint ? 1 : 4} wrap="wrap">
        <Text fontWeight="700" color={C.text}>
          {title}
        </Text>
        {right}
      </Flex>
      {hint && (
        <Text fontSize="xs" color={C.muted} mb={4}>
          {hint}
        </Text>
      )}
      {children}
    </Box>
  );
}

function OnOff({ on }: { on: boolean }) {
  return (
    <Badge
      bg={on ? "rgba(126,226,160,0.15)" : "rgba(255,255,255,0.08)"}
      color={on ? C.good : C.muted}
      borderRadius="999px"
      px={3}
      fontWeight="700"
    >
      {on ? "On" : "Off"}
    </Badge>
  );
}

export default function ReviewsPanel() {
  const [overview, setOverview] = useState<AdminReviewOverview | null>(null);
  const [view, setView] = useState<ReviewQueueView>("held");
  const [gameId, setGameId] = useState("");
  const [items, setItems] = useState<AdminReviewRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmUnfreeze, setConfirmUnfreeze] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await getReviewOverview());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await getReviewQueue({ view, gameId: gameId || undefined });
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [view, gameId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);
  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const more = async () => {
    if (!cursor) return;
    try {
      const page = await getReviewQueue({ view, gameId: gameId || undefined, cursor });
      setItems((prev) => [...prev, ...page.items.filter((x) => !prev.some((p) => p.id === x.id))]);
      setCursor(page.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const decide = async (row: AdminReviewRow, action: "approve" | "remove") => {
    setBusyId(row.id);
    setError(null);
    try {
      await decideReview(row.id, action);
      setItems((prev) => prev.filter((x) => x.id !== row.id));
      setNote(
        action === "remove"
          ? `Removed @${row.username}'s rating of ${row.gameName}.`
          : `Approved @${row.username}'s rating of ${row.gameName}. The score updates within 30s.`,
      );
      void loadOverview();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const unfreeze = async (gid: string, name: string) => {
    if (confirmUnfreeze !== gid) {
      setConfirmUnfreeze(gid);
      return;
    }
    setBusyId(gid);
    setError(null);
    try {
      const r = await unfreezeReviews(gid);
      setNote(`${name}: score unpaused, ${r.released} held rating${r.released === 1 ? "" : "s"} now count.`);
      setConfirmUnfreeze(null);
      void loadOverview();
      void loadQueue();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const viewInfo = VIEWS.find((v) => v.key === view)!;

  return (
    <Flex direction="column" gap={5}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Box>
          <Text fontSize="xl" fontWeight="700" color={C.text}>
            Reviews
          </Text>
          <Text fontSize="sm" color={C.muted}>
            Nexzy Players ratings on mega hubs.{" "}
            <a href="/how-player-scores-work" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>
              Public rules
            </a>
          </Text>
        </Box>
        <Button
          size="sm"
          bg={C.raised}
          color={C.text}
          onClick={() => {
            void loadOverview();
            void loadQueue();
          }}
        >
          <FiRefreshCw /> Refresh
        </Button>
      </Flex>

      {note && (
        <Text fontSize="sm" color={C.good}>
          {note}
        </Text>
      )}
      {error && (
        <Text fontSize="sm" color={C.bad} role="alert">
          {error}
        </Text>
      )}

      <Card
        title="Switches"
        hint="Set in the API .env (restart after changing). Off is the launch default for all three."
      >
        {!overview ? (
          <Spinner size="sm" color={C.muted} />
        ) : (
          <Flex direction="column" gap={3}>
            {overview.flags.map((f) => (
              <Flex key={f.key} gap={3} align="start" justify="space-between" wrap="wrap">
                <Box maxW="70ch">
                  <Text color={C.text} fontWeight="600" fontSize="sm">
                    {FLAG_INFO[f.key]?.label ?? f.key}
                  </Text>
                  <Text color={C.muted} fontSize="xs">
                    {FLAG_INFO[f.key]?.what}{" "}
                    <Text as="span" fontFamily="mono" color={C.faint}>
                      {f.env}
                    </Text>
                  </Text>
                </Box>
                <OnOff on={f.enabled} />
              </Flex>
            ))}
          </Flex>
        )}
      </Card>

      <Card title="Games" hint="Shown score (what readers see), count of counted ratings, and anything waiting on you.">
        {!overview ? (
          <Spinner size="sm" color={C.muted} />
        ) : overview.games.length === 0 ? (
          <Text fontSize="sm" color={C.muted}>
            No ratings yet. Ratings open at each game's launch.
          </Text>
        ) : (
          <Box overflowX="auto">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ color: C.muted, textAlign: "left" }}>
                  <th style={{ padding: "6px 8px" }}>Game</th>
                  <th style={{ padding: "6px 8px" }}>Score</th>
                  <th style={{ padding: "6px 8px" }}>Ratings</th>
                  <th style={{ padding: "6px 8px" }}>Held</th>
                  <th style={{ padding: "6px 8px" }}>State</th>
                  <th style={{ padding: "6px 8px" }} />
                </tr>
              </thead>
              <tbody>
                {overview.games.map((g) => (
                  <tr key={g.gameId} style={{ borderTop: `1px solid ${C.line}`, color: C.text }}>
                    <td style={{ padding: "8px" }}>
                      <a href={`/games/${encodeURIComponent(g.slug)}#scores`} target="_blank" rel="noopener noreferrer" style={{ color: C.text }}>
                        {g.name} <FiExternalLink style={{ display: "inline", verticalAlign: "-2px" }} />
                      </a>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <span style={{ color: C.gold, fontWeight: 700 }}>{fmt1(g.score)}</span>
                      <span style={{ color: C.faint }}> raw {fmt1(g.rawScore)}</span>
                    </td>
                    <td style={{ padding: "8px" }}>{g.count.toLocaleString("en-US")}</td>
                    <td style={{ padding: "8px" }}>
                      {g.held > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setView("held");
                            setGameId(g.gameId);
                          }}
                          style={{ color: C.warn, fontWeight: 700, background: "none", border: 0, cursor: "pointer", padding: 0 }}
                        >
                          {g.held}
                        </button>
                      ) : (
                        <span style={{ color: C.faint }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {g.frozen ? (
                        <span style={{ color: C.warn }}>Paused {fmtWhen(g.frozenAt)}</span>
                      ) : g.settledAt ? (
                        <span style={{ color: C.muted }}>
                          Settled {fmt1(g.settledScore)} on {fmtWhen(g.settledAt)}
                        </span>
                      ) : (
                        <span style={{ color: C.muted }}>Live</span>
                      )}
                    </td>
                    <td style={{ padding: "8px", textAlign: "right" }}>
                      {g.frozen && (
                        <Button
                          size="xs"
                          bg={C.gold}
                          color={C.ink}
                          fontWeight="700"
                          disabled={busyId === g.gameId}
                          onClick={() => void unfreeze(g.gameId, g.name)}
                        >
                          {confirmUnfreeze === g.gameId ? "Click again to unpause" : "Unpause score"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
        {overview?.games.some((g) => g.frozen) && (
          <Text fontSize="xs" color={C.muted} mt={3}>
            Unpause only after checking the held ratings: it counts every rating held by the pause at once.
          </Text>
        )}
      </Card>

      <Card
        title="Queue"
        hint={viewInfo.hint}
        right={
          <HStack gap={2} wrap="wrap">
            {VIEWS.map((v) => (
              <Button
                key={v.key}
                size="xs"
                bg={view === v.key ? C.gold : C.raised}
                color={view === v.key ? C.ink : C.text}
                fontWeight="700"
                onClick={() => setView(v.key)}
              >
                {v.label}
              </Button>
            ))}
            <NativeSelect.Root size="xs" width="200px">
              <NativeSelect.Field
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                bg={C.raised}
                color={C.text}
                borderColor={C.line}
                aria-label="Filter by game"
              >
                <option value="">All games</option>
                {overview?.games.map((g) => (
                  <option key={g.gameId} value={g.gameId}>
                    {g.name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
        }
      >
        {loading ? (
          <Spinner size="sm" color={C.muted} />
        ) : items.length === 0 ? (
          <Text fontSize="sm" color={C.muted}>
            Nothing here.
          </Text>
        ) : (
          <Flex direction="column" gap={3}>
            {items.map((r) => (
              <Box key={r.id} bg={C.raised} borderRadius="12px" p={4}>
                <Flex justify="space-between" gap={3} wrap="wrap" align="start">
                  <Box minW={0}>
                    <Text color={C.text} fontWeight="600" fontSize="sm">
                      @{r.username}{" "}
                      <Text as="span" color={C.muted} fontWeight="400">
                        rated {r.gameName}
                      </Text>
                    </Text>
                    <Text fontSize="xs" color={C.faint}>
                      Account {ageDays(r.userCreatedAt)} days old · {platformLabel(r.platform)} · {hoursLabel(r.hours)} · {fmtWhen(r.createdAt)}
                      {r.editCount > 0 ? ` · edited ${r.editCount}x` : ""}
                      {r.decidedBy ? ` · last decision by ${r.decidedBy}` : ""}
                    </Text>
                  </Box>
                  <Text fontSize="2xl" fontWeight="700" color={C.gold}>
                    {fmt1(r.score)}
                  </Text>
                </Flex>
                <HStack gap={2} mt={2} wrap="wrap" fontSize="xs" color={C.muted}>
                  <span>Fun {r.fun}</span>
                  <span>Perf {r.performance}</span>
                  <span>Value {r.value}</span>
                  <span>Look {r.presentation}</span>
                  <span>Story {r.story ?? "n/a"}</span>
                </HStack>
                {r.holdReason && (
                  <Text fontSize="xs" color={C.warn} mt={2}>
                    Held: {HOLD[r.holdReason] ?? r.holdReason}
                  </Text>
                )}
                {r.body && (
                  <Text fontSize="sm" color={C.text} mt={2} whiteSpace="pre-wrap" wordBreak="break-word" maxW="72ch">
                    {r.body}
                  </Text>
                )}
                {r.bodyHidden && (
                  <Text fontSize="xs" color={C.warn} mt={1}>
                    Text hidden from readers by auto-moderation
                  </Text>
                )}
                <HStack gap={2} mt={3}>
                  <Button
                    size="xs"
                    bg={C.good}
                    color={C.ink}
                    fontWeight="700"
                    disabled={busyId === r.id}
                    onClick={() => void decide(r, "approve")}
                  >
                    {view === "removed" ? "Restore" : "Approve"}
                  </Button>
                  {view !== "removed" && (
                    <Button
                      size="xs"
                      bg="transparent"
                      color={C.bad}
                      border="1px solid"
                      borderColor={C.bad}
                      fontWeight="700"
                      disabled={busyId === r.id}
                      onClick={() => void decide(r, "remove")}
                    >
                      Remove
                    </Button>
                  )}
                </HStack>
              </Box>
            ))}
            {cursor && (
              <Button size="sm" bg={C.raised} color={C.text} alignSelf="start" onClick={() => void more()}>
                Load more
              </Button>
            )}
          </Flex>
        )}
      </Card>
    </Flex>
  );
}
