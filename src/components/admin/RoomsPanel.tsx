"use client";

// Admin -> Rooms (Phase 3 Step 4). Where staff step in on Squad Rooms:
// the report queue with evidence, held messages, a room's detail (end it,
// remove someone), a user's strikes, and owner-only child-safety holds.
// A "How this works" legend sits on top so nobody has to remember the terms.
// No background polling: loads on open, view change and Refresh.
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Text,
} from "@chakra-ui/react";
import {
  FiChevronDown,
  FiChevronRight,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";
import {
  HIDDEN_LABEL,
  REASON_LABEL,
  addRoomStrike,
  decideRoomReport,
  endRoomAdmin,
  getRoomAdmin,
  getRoomHeld,
  getRoomHold,
  getRoomHolds,
  getRoomQueue,
  getRoomReport,
  getRoomStrikes,
  hideRoomMessage,
  liftRoomStrike,
  removeRoomMember,
  restoreRoomMessage,
  setRoomHoldNcmec,
  createRoomHold,
  type RoomAdminDetail,
  type RoomEvidenceLine,
  type RoomHeldItem,
  type RoomHoldDetail,
  type RoomHoldRow,
  type RoomQueueItem,
  type RoomReportDetail,
  type RoomReportTarget,
  type RoomStrike,
} from "@/lib/admin/client-rooms";

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGEND_KEY = "nexzy-admin-rooms-legend";

const fmtWhen = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }) + " CT"
    : "";

const waited = (min: number) =>
  min < 60
    ? `${min} min`
    : min < 1440
      ? `${Math.round(min / 60)} h`
      : `${Math.round(min / 1440)} d`;

type View = "queue" | "held" | "holds";
type Detail =
  | { kind: "report"; type: RoomReportTarget; id: string }
  | { kind: "room"; id: string }
  | { kind: "user"; id: string; username: string | null }
  | { kind: "hold"; id: string }
  | null;

// ───────────────────────── legend ─────────────────────────

const LEGEND: Array<[string, string]> = [
  [
    "Report reasons",
    "Harassment, hate, sexual, child safety, self-harm, spam, scam, personal info, other.",
  ],
  [
    "Auto-hide",
    "3 different members report one message: it hides for everyone. Reports from kicked members don't count.",
  ],
  [
    "Hidden: auto",
    "The moderation check flagged it before anyone saw it. Only the author sees it.",
  ],
  [
    "Hidden: pending",
    "The moderation check was down. It is re-checked every 5 s for 10 min, then it lands in Held.",
  ],
  ["Hidden: reports", "Hidden by the 3-report rule."],
  ["Hidden: staff", "Hidden by an admin."],
  [
    "Hidden: child safety",
    "Hidden on a child-safety report. Only the owner can restore it.",
  ],
  [
    "Dismiss",
    "No problem found. The open reports close; the message stays as it is.",
  ],
  [
    "Take action",
    "The reports close as valid. Hide the message and/or strike the user from the same screen.",
  ],
  ["Warning", "A strike that sends the user a warning push. No lockout."],
  [
    "Rooms ban",
    "Out of every room now; can't create or join until it ends or is lifted. Rooms only, not the whole app.",
  ],
  ["Room status", "waiting (not started yet), live, ended, cancelled."],
  [
    "Auto-end rules",
    "No-show: cancelled 60 min after the start time if nobody is active. Live rooms end after 2 h quiet or 12 h total. Crew rooms never end on their own.",
  ],
  [
    "Retention",
    "Chat is deleted 30 days after a session ends (90 for Crew); reports 1 year after the decision; holds are never deleted by these jobs.",
  ],
  [
    "Room kinds",
    "Set per game in Mega hubs -> Rooms. Staff-only kinds (Launch Night) can only be created by team accounts.",
  ],
  [
    "Child safety",
    "Owner only, everywhere. A report creates a hold (evidence kept 1 year) and emails the owner. File it with NCMEC, then record the CyberTipline number on the hold.",
  ],
];

function Legend() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(LEGEND_KEY) === "closed") setOpen(false);
    } catch {
      /* storage unavailable: stay open */
    }
  }, []);
  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(LEGEND_KEY, o ? "closed" : "open");
      } catch {
        /* ignore */
      }
      return !o;
    });
  };
  return (
    <Box
      bg={C.surface}
      borderRadius="14px"
      border="1px solid"
      borderColor={C.line}
    >
      <Flex
        as="button"
        onClick={toggle}
        aria-expanded={open}
        w="100%"
        align="center"
        gap={2}
        p={4}
        color={C.text}
        textAlign="left"
      >
        {open ? <FiChevronDown /> : <FiChevronRight />}
        <Text fontWeight="700">How this works</Text>
        <Text fontSize="xs" color={C.muted}>
          every term on this tab
        </Text>
      </Flex>
      {open && (
        <Box px={4} pb={4}>
          {LEGEND.map(([term, what]) => (
            <Flex
              key={term}
              gap={3}
              py={1.5}
              borderTop="1px solid"
              borderColor={C.line}
              wrap="wrap"
            >
              <Text
                w={{ base: "100%", md: "170px" }}
                flexShrink={0}
                fontSize="sm"
                fontWeight="600"
                color={C.text}
              >
                {term}
              </Text>
              <Text flex="1" minW="220px" fontSize="sm" color={C.muted}>
                {what}
              </Text>
            </Flex>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ───────────────────────── small pieces ─────────────────────────

function Card({
  title,
  hint,
  right,
  children,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      bg={C.surface}
      borderRadius="14px"
      p={5}
      border="1px solid"
      borderColor={C.line}
    >
      <Flex
        justify="space-between"
        align="start"
        gap={3}
        mb={hint ? 1 : 4}
        wrap="wrap"
      >
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

function Tag({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Badge
      bg="rgba(255,255,255,0.06)"
      color={color}
      borderRadius="999px"
      px={2}
      fontSize="2xs"
      fontWeight="700"
    >
      {children}
    </Badge>
  );
}

function Act({
  label,
  onClick,
  busy,
  tone = "plain",
  disabled,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
  tone?: "plain" | "danger" | "primary";
  disabled?: boolean;
}) {
  const bg =
    tone === "primary"
      ? C.gold
      : tone === "danger"
        ? "rgba(255,138,128,0.15)"
        : C.raised;
  const color = tone === "primary" ? C.ink : tone === "danger" ? C.bad : C.text;
  return (
    <Button
      size="xs"
      bg={bg}
      color={color}
      onClick={onClick}
      loading={busy}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}

function Lines({
  lines,
  focusId,
}: {
  lines: RoomEvidenceLine[];
  focusId?: string;
}) {
  if (!lines.length)
    return (
      <Text fontSize="sm" color={C.muted}>
        No messages captured.
      </Text>
    );
  return (
    <Flex direction="column" gap={1}>
      {lines.map((l) => (
        <Box
          key={l.id}
          px={3}
          py={2}
          borderRadius="8px"
          bg={l.id === focusId ? "rgba(255,215,0,0.08)" : "transparent"}
          border="1px solid"
          borderColor={l.id === focusId ? "rgba(255,215,0,0.35)" : C.line}
        >
          <HStack gap={2} wrap="wrap">
            <Text fontSize="xs" fontWeight="700" color={C.text}>
              @{l.username ?? "deleted"}
            </Text>
            <Text fontSize="2xs" color={C.faint}>
              {fmtWhen(l.createdAt)}
            </Text>
            {l.hidden && (
              <Tag color={C.warn}>
                {HIDDEN_LABEL[l.hiddenReason ?? ""] ?? "Hidden"}
              </Tag>
            )}
            {l.deleted && <Tag color={C.faint}>deleted by author</Tag>}
          </HStack>
          <Text
            fontSize="sm"
            color={l.withheld ? C.faint : C.text}
            whiteSpace="pre-wrap"
            wordBreak="break-word"
          >
            {l.withheld
              ? "Withheld (child-safety report: owner only)"
              : l.content || (l.gif ? "[GIF]" : "")}
          </Text>
        </Box>
      ))}
    </Flex>
  );
}

// ───────────────────────── detail: report ─────────────────────────

function ReportDetail({
  type,
  id,
  isOwner,
  onDone,
  onClose,
  openRoom,
  openUser,
}: {
  type: RoomReportTarget;
  id: string;
  isOwner: boolean;
  onDone: (msg: string) => void;
  onClose: () => void;
  openRoom: (id: string) => void;
  openUser: (id: string, username: string | null) => void;
}) {
  const [d, setD] = useState<RoomReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setD(await getRoomReport(type, id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [type, id]);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (
    key: string,
    fn: () => Promise<unknown>,
    msg: string,
    close = false,
  ) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      if (close) {
        onDone(msg);
        onClose();
      } else {
        await load();
        onDone(msg);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (error && !d) return <Text color={C.bad}>{error}</Text>;
  if (!d) return <Spinner size="sm" color={C.muted} />;

  const snap = d.snapshot;
  const open = d.reports.filter((r) => r.status === "open");
  const childSafety = d.reports.some((r) => r.reason === "child_safety");
  const subject = d.subjectUserId;

  return (
    <Flex direction="column" gap={4}>
      {error && (
        <Text fontSize="sm" color={C.bad} role="alert">
          {error}
        </Text>
      )}
      <Flex gap={2} wrap="wrap" align="center">
        <Tag color={C.text}>{type}</Tag>
        {childSafety && <Tag color={C.bad}>child safety</Tag>}
        {d.message?.hidden && (
          <Tag color={C.warn}>
            {HIDDEN_LABEL[d.message.hiddenReason ?? ""] ?? "Hidden"}
          </Tag>
        )}
        {d.message?.deleted && <Tag color={C.faint}>deleted by author</Tag>}
        {snap?.room && (
          <Text fontSize="sm" color={C.muted}>
            in{" "}
            <Text
              as="button"
              color={C.gold}
              onClick={() => openRoom(snap.room!.id)}
            >
              {snap.room.title}
            </Text>{" "}
            ({snap.room.kind}, {snap.room.status})
          </Text>
        )}
        {subject && (
          <Text fontSize="sm" color={C.muted}>
            subject{" "}
            <Text
              as="button"
              color={C.gold}
              onClick={() => openUser(subject, snap?.subjectUsername ?? null)}
            >
              @{snap?.subjectUsername ?? "user"}
            </Text>
          </Text>
        )}
      </Flex>

      <Box>
        <Text fontSize="xs" color={C.faint} mb={2}>
          Evidence captured {fmtWhen(snap?.capturedAt)} (kept even if messages
          are deleted)
        </Text>
        <Lines
          lines={snap?.messages ?? []}
          focusId={type === "message" ? id : undefined}
        />
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="700" color={C.text} mb={2}>
          Reports ({d.reports.length})
        </Text>
        {d.reports.map((r) => (
          <Flex
            key={r.id}
            gap={2}
            py={1}
            wrap="wrap"
            align="center"
            borderTop="1px solid"
            borderColor={C.line}
          >
            <Tag color={r.reason === "child_safety" ? C.bad : C.text}>
              {REASON_LABEL[r.reason] ?? r.reason}
            </Tag>
            <Text fontSize="xs" color={C.muted}>
              by @{r.reporter.username ?? "deleted"} {fmtWhen(r.createdAt)}
            </Text>
            <Tag color={r.status === "open" ? C.warn : C.faint}>{r.status}</Tag>
            {r.decidedBy && (
              <Text fontSize="2xs" color={C.faint}>
                {r.decidedBy} {fmtWhen(r.decidedAt)}
              </Text>
            )}
            {r.note && (
              <Text w="100%" fontSize="sm" color={C.text}>
                {`"${r.note}"`}
              </Text>
            )}
          </Flex>
        ))}
      </Box>

      <Flex gap={2} wrap="wrap">
        {type === "message" &&
          d.message &&
          !d.message.hidden &&
          !d.message.deleted && (
            <Act
              label="Hide message"
              tone="danger"
              busy={busy === "hide"}
              onClick={() =>
                void run("hide", () => hideRoomMessage(id), "Message hidden.")
              }
            />
          )}
        {type === "message" &&
          d.message?.hidden &&
          (!childSafety || isOwner) && (
            <Act
              label="Restore message"
              busy={busy === "restore"}
              onClick={() =>
                void run(
                  "restore",
                  () => restoreRoomMessage(id),
                  "Message restored; its open reports were dismissed.",
                )
              }
            />
          )}
        {isOwner && !childSafety && d.reports[0] && (
          <Act
            label="Create safety hold"
            busy={busy === "hold"}
            onClick={() =>
              void run(
                "hold",
                () => createRoomHold(d.reports[0].id),
                "Safety hold created (evidence kept 1 year). Find it under Holds.",
              )
            }
          />
        )}
        {open.length > 0 && (
          <>
            <Act
              label="Dismiss"
              busy={busy === "dismissed"}
              onClick={() =>
                void run(
                  "dismissed",
                  () => decideRoomReport(type, id, "dismissed"),
                  `Dismissed ${open.length} report(s).`,
                  true,
                )
              }
            />
            <Act
              label="Take action (close as valid)"
              tone="primary"
              busy={busy === "actioned"}
              onClick={() =>
                void run(
                  "actioned",
                  () => decideRoomReport(type, id, "actioned"),
                  `Closed ${open.length} report(s) as valid.`,
                  true,
                )
              }
            />
          </>
        )}
      </Flex>

      {subject && (
        <StrikesBox
          userId={subject}
          username={snap?.subjectUsername ?? null}
          reportId={d.reports[0]?.id}
          initial={d.strikes}
          onChange={onDone}
        />
      )}
    </Flex>
  );
}

// ───────────────────────── detail: strikes ─────────────────────────

function StrikesBox({
  userId,
  username,
  reportId,
  initial,
  onChange,
}: {
  userId: string;
  username: string | null;
  reportId?: string;
  initial?: RoomStrike[];
  onChange: (msg: string) => void;
}) {
  const [strikes, setStrikes] = useState<RoomStrike[] | null>(initial ?? null);
  const [level, setLevel] = useState<"warning" | "rooms_ban">("warning");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStrikes(await getRoomStrikes(userId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [userId]);
  useEffect(() => {
    if (!initial) void load();
  }, [initial, load]);

  const add = async () => {
    const r = reason.trim();
    if (r.length < 3) {
      setError(
        "Write a short reason (3+ characters). It is kept with the strike.",
      );
      return;
    }
    const n = days ? Number(days) : undefined;
    if (
      level === "rooms_ban" &&
      n !== undefined &&
      (!Number.isInteger(n) || n < 1 || n > 3650)
    ) {
      setError(
        "Days must be a whole number from 1 to 3650, or empty for until lifted.",
      );
      return;
    }
    if (level === "rooms_ban" && !confirm) {
      setConfirm(true);
      return;
    }
    setBusy("add");
    setError(null);
    try {
      await addRoomStrike(userId, {
        level,
        reason: r,
        reportId,
        days: level === "rooms_ban" ? n : undefined,
      });
      setReason("");
      setDays("");
      setConfirm(false);
      await load();
      onChange(
        level === "rooms_ban"
          ? `@${username ?? "user"} is banned from rooms.`
          : `Warning sent to @${username ?? "user"}.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const lift = async (s: RoomStrike) => {
    setBusy(s.id);
    setError(null);
    try {
      await liftRoomStrike(s.id);
      await load();
      onChange(`Rooms ban lifted for @${username ?? "user"}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box borderTop="1px solid" borderColor={C.line} pt={4}>
      <Text fontSize="sm" fontWeight="700" color={C.text} mb={2}>
        Strikes for @{username ?? "user"}
      </Text>
      {!strikes ? (
        <Spinner size="sm" color={C.muted} />
      ) : strikes.length === 0 ? (
        <Text fontSize="sm" color={C.muted}>
          None.
        </Text>
      ) : (
        strikes.map((s) => (
          <Flex key={s.id} gap={2} py={1} align="center" wrap="wrap">
            <Tag color={s.level === "rooms_ban" ? C.bad : C.warn}>
              {s.level === "rooms_ban" ? "rooms ban" : "warning"}
            </Tag>
            {s.active && <Tag color={C.bad}>active</Tag>}
            <Text fontSize="sm" color={C.text}>
              {s.reason}
            </Text>
            <Text fontSize="2xs" color={C.faint}>
              {s.createdBy} {fmtWhen(s.createdAt)}
              {s.level === "rooms_ban" &&
                (s.expiresAt
                  ? `, until ${fmtWhen(s.expiresAt)}`
                  : ", until lifted")}
            </Text>
            {s.active && (
              <Act
                label="Lift"
                busy={busy === s.id}
                onClick={() => void lift(s)}
              />
            )}
          </Flex>
        ))
      )}
      <Flex gap={2} mt={3} wrap="wrap" align="center">
        <NativeSelect.Root size="xs" w="140px">
          <NativeSelect.Field
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as "warning" | "rooms_ban");
              setConfirm(false);
            }}
            bg={C.raised}
            color={C.text}
          >
            <option value="warning">Warning</option>
            <option value="rooms_ban">Rooms ban</option>
          </NativeSelect.Field>
        </NativeSelect.Root>
        {level === "rooms_ban" && (
          <Input
            size="xs"
            w="110px"
            placeholder="days (empty = until lifted)"
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
            color={C.text}
          />
        )}
        <Input
          size="xs"
          flex="1"
          minW="200px"
          maxLength={300}
          placeholder="Reason (kept with the strike)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          color={C.text}
        />
        <Act
          label={
            level === "rooms_ban"
              ? confirm
                ? "Confirm rooms ban"
                : "Ban from rooms"
              : "Send warning"
          }
          tone={level === "rooms_ban" ? "danger" : "plain"}
          busy={busy === "add"}
          onClick={() => void add()}
        />
      </Flex>
      {error && (
        <Text fontSize="xs" color={C.bad} mt={2} role="alert">
          {error}
        </Text>
      )}
    </Box>
  );
}

// ───────────────────────── detail: room ─────────────────────────

function RoomDetail({
  id,
  onDone,
  openUser,
}: {
  id: string;
  onDone: (msg: string) => void;
  openUser: (id: string, username: string | null) => void;
}) {
  const [d, setD] = useState<RoomAdminDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setD(await getRoomAdmin(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    if (confirm !== key) {
      setConfirm(key);
      return;
    }
    setBusy(key);
    setError(null);
    try {
      await fn();
      setConfirm(null);
      await load();
      onDone(msg);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (error && !d) return <Text color={C.bad}>{error}</Text>;
  if (!d) return <Spinner size="sm" color={C.muted} />;
  const r = d.room;
  const open = r.status === "waiting" || r.status === "live";

  return (
    <Flex direction="column" gap={4}>
      {error && (
        <Text fontSize="sm" color={C.bad} role="alert">
          {error}
        </Text>
      )}
      <Box>
        <Text fontWeight="700" color={C.text}>
          {r.title}
        </Text>
        <Text fontSize="sm" color={C.muted}>
          {r.gameName} · {r.kind} · {r.visibility} · join {r.joinMode}
          {r.locked ? " · locked" : ""} · {r.memberCount} in · host @
          {r.hostName ?? "deleted"}
        </Text>
        <Text fontSize="xs" color={C.faint}>
          status {r.status} · starts {fmtWhen(r.startsAt)}
          {r.startedAt ? ` · started ${fmtWhen(r.startedAt)}` : ""}
          {r.endedAt ? ` · ended ${fmtWhen(r.endedAt)}` : ""}
        </Text>
      </Box>
      {open && (
        <Flex gap={2}>
          <Act
            label={
              confirm === "end"
                ? "Confirm: end this room for everyone"
                : "End room"
            }
            tone="danger"
            busy={busy === "end"}
            onClick={() =>
              void run("end", () => endRoomAdmin(id), "Room ended.")
            }
          />
        </Flex>
      )}
      <Box>
        <Text fontSize="sm" fontWeight="700" color={C.text} mb={2}>
          People ({d.members.length})
        </Text>
        {d.members.map((m) => (
          <Flex
            key={m.id}
            gap={2}
            py={1}
            align="center"
            wrap="wrap"
            borderTop="1px solid"
            borderColor={C.line}
          >
            <Text
              as="button"
              fontSize="sm"
              color={C.gold}
              onClick={() => openUser(m.id, m.username)}
            >
              @{m.username ?? "deleted"}
            </Text>
            <Tag color={C.text}>{m.role}</Tag>
            <Tag color={m.state === "joined" ? C.good : C.faint}>{m.state}</Tag>
            {m.mutedUntil && new Date(m.mutedUntil).getTime() > Date.now() && (
              <Tag color={C.warn}>muted</Tag>
            )}
            {open && m.state === "joined" && m.role !== "host" && (
              <Act
                label={confirm === `rm:${m.id}` ? "Confirm remove" : "Remove"}
                tone="danger"
                busy={busy === `rm:${m.id}`}
                onClick={() =>
                  void run(
                    `rm:${m.id}`,
                    () => removeRoomMember(id, m.id),
                    `@${m.username ?? "user"} removed from the room.`,
                  )
                }
              />
            )}
          </Flex>
        ))}
      </Box>
      <Box>
        <Text fontSize="sm" fontWeight="700" color={C.text} mb={2}>
          Last {d.events.length} events
        </Text>
        {d.events.map((e) => (
          <Flex key={e.id} gap={3} py={0.5}>
            <Text fontSize="2xs" color={C.faint} w="130px" flexShrink={0}>
              {fmtWhen(e.createdAt)}
            </Text>
            <Text fontSize="xs" color={C.muted}>
              {e.type.replace(/_/g, " ")}
            </Text>
          </Flex>
        ))}
      </Box>
    </Flex>
  );
}

// ───────────────────────── detail: hold (owner) ─────────────────────────

function HoldDetail({
  id,
  onDone,
}: {
  id: string;
  onDone: (msg: string) => void;
}) {
  const [h, setH] = useState<RoomHoldDetail | null>(null);
  const [num, setNum] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRoomHold(id)
      .then((x) => {
        setH(x);
        setNum(x.ncmecReportId ?? "");
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  const save = async () => {
    if (!/^[A-Za-z0-9-]{3,64}$/.test(num.trim())) {
      setError(
        "Enter the CyberTipline report number (letters, numbers, dashes).",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setRoomHoldNcmec(id, num.trim());
      onDone("NCMEC report number saved on the hold.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !h) return <Text color={C.bad}>{error}</Text>;
  if (!h) return <Spinner size="sm" color={C.muted} />;
  const ev = h.evidence ?? {};
  return (
    <Flex direction="column" gap={4}>
      <Text fontSize="xs" color={C.warn}>
        Viewing this evidence is logged. Keep it inside Nexzy; never forward the
        content.
      </Text>
      <Text fontSize="sm" color={C.muted}>
        Subject @{ev.subjectUsername ?? "unknown"} · room{" "}
        {ev.room?.title ?? "-"} · kept until {fmtWhen(h.keepUntil)}
      </Text>
      <Lines
        lines={ev.messages ?? []}
        focusId={ev.target?.type === "message" ? ev.target.id : undefined}
      />
      <Flex gap={2} align="center" wrap="wrap">
        <Input
          size="xs"
          w="240px"
          placeholder="CyberTipline report number"
          value={num}
          onChange={(e) => setNum(e.target.value)}
          color={C.text}
        />
        <Act
          label="Save NCMEC number"
          tone="primary"
          busy={busy}
          onClick={() => void save()}
        />
      </Flex>
      {error && (
        <Text fontSize="xs" color={C.bad} role="alert">
          {error}
        </Text>
      )}
    </Flex>
  );
}

// ───────────────────────── the panel ─────────────────────────

export default function RoomsPanel({ isOwner }: { isOwner: boolean }) {
  const [view, setView] = useState<View>("queue");
  const [queue, setQueue] = useState<RoomQueueItem[] | null>(null);
  const [held, setHeld] = useState<RoomHeldItem[] | null>(null);
  const [holds, setHolds] = useState<RoomHoldRow[] | null>(null);
  const [detail, setDetail] = useState<Detail>(null);
  const [roomInput, setRoomInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (view === "queue") setQueue((await getRoomQueue()).items);
      else if (view === "held") setHeld((await getRoomHeld()).items);
      else setHolds(await getRoomHolds());
    } catch (e) {
      setError((e as Error).message);
    }
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  // Pulse links here with ?room=<id>; open that room once.
  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get("room");
      if (id && UUID_RE.test(id)) setDetail({ kind: "room", id });
      if (id) {
        // Read once: drop it so a remount doesn't reopen the room.
        const p = new URLSearchParams(window.location.search);
        p.delete("room");
        window.history.replaceState(null, "", `/admin?${p.toString()}`);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const done = (msg: string) => {
    setNote(msg);
    void load();
  };

  const heldAction = async (item: RoomHeldItem, restore: boolean) => {
    setBusy(item.id);
    setError(null);
    try {
      if (restore) await restoreRoomMessage(item.id);
      else await hideRoomMessage(item.id);
      setHeld((prev) => (prev ?? []).filter((x) => x.id !== item.id));
      setNote(
        restore
          ? "Message approved and shown."
          : "Message kept hidden (staff).",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const openRoom = () => {
    const id = roomInput.trim();
    if (!UUID_RE.test(id)) {
      setError("Paste a room id (the long id from Pulse or a report).");
      return;
    }
    setError(null);
    setDetail({ kind: "room", id });
  };

  const views: Array<{ key: View; label: string; owner?: boolean }> = [
    { key: "queue", label: "Queue" },
    { key: "held", label: "Held" },
    { key: "holds", label: "Holds", owner: true },
  ];

  return (
    <Flex direction="column" gap={5}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Box>
          <Text fontSize="xl" fontWeight="700" color={C.text}>
            Rooms
          </Text>
          <Text fontSize="sm" color={C.muted}>
            Step in on Squad Rooms: reports, held messages, rooms and strikes.
            Every action is logged with your name.
          </Text>
        </Box>
        <Button
          size="sm"
          bg={C.raised}
          color={C.text}
          onClick={() => void load()}
        >
          <FiRefreshCw /> Refresh
        </Button>
      </Flex>

      <Legend />

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

      <Flex gap={2} wrap="wrap" align="center" justify="space-between">
        <HStack
          gap={1}
          bg={C.surface}
          p={1}
          borderRadius="10px"
          border="1px solid"
          borderColor={C.line}
        >
          {views
            .filter((v) => !v.owner || isOwner)
            .map((v) => (
              <Button
                key={v.key}
                size="xs"
                bg={view === v.key ? C.gold : "transparent"}
                color={view === v.key ? C.ink : C.muted}
                onClick={() => {
                  setView(v.key);
                  setNote(null);
                }}
              >
                {v.owner && <FiShield />} {v.label}
              </Button>
            ))}
        </HStack>
        <HStack gap={2}>
          <Input
            size="xs"
            w="300px"
            placeholder="Open a room by id"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            color={C.text}
          />
          <Act label="Open" onClick={openRoom} />
        </HStack>
      </Flex>

      {view === "queue" && (
        <Card
          title="Open reports"
          hint="One row per reported thing. Child safety first (owner only), then whatever has waited longest."
        >
          {!queue ? (
            <Spinner size="sm" color={C.muted} />
          ) : queue.length === 0 ? (
            <Text fontSize="sm" color={C.muted}>
              Nothing waiting.
            </Text>
          ) : (
            queue.map((q) => (
              <Flex
                key={`${q.targetType}:${q.targetId}`}
                as="button"
                w="100%"
                textAlign="left"
                gap={2}
                py={2}
                px={2}
                align="center"
                wrap="wrap"
                borderTop="1px solid"
                borderColor={C.line}
                bg={
                  detail?.kind === "report" && detail.id === q.targetId
                    ? C.raised
                    : "transparent"
                }
                onClick={() =>
                  setDetail({
                    kind: "report",
                    type: q.targetType,
                    id: q.targetId,
                  })
                }
              >
                {q.childSafety && <Tag color={C.bad}>child safety</Tag>}
                <Tag color={C.text}>{q.targetType}</Tag>
                <Text fontSize="sm" color={C.text}>
                  {q.reports} report{q.reports === 1 ? "" : "s"}:{" "}
                  {q.reasons.map((r) => REASON_LABEL[r] ?? r).join(", ")}
                </Text>
                <Text fontSize="xs" color={C.muted}>
                  {q.room
                    ? `${q.room.game} · ${q.room.title} (${q.room.status})`
                    : ""}
                </Text>
                <Text
                  fontSize="xs"
                  color={q.waitingMinutes > 1440 ? C.bad : C.faint}
                  ml="auto"
                >
                  waiting {waited(q.waitingMinutes)}
                </Text>
              </Flex>
            ))
          )}
        </Card>
      )}

      {view === "held" && (
        <Card
          title="Held messages"
          hint="The moderation check couldn't run for 10+ minutes. Approve shows it; Keep hidden marks it staff-hidden."
        >
          {!held ? (
            <Spinner size="sm" color={C.muted} />
          ) : held.length === 0 ? (
            <Text fontSize="sm" color={C.muted}>
              Nothing held.
            </Text>
          ) : (
            held.map((h) => (
              <Flex
                key={h.id}
                gap={2}
                py={2}
                align="center"
                wrap="wrap"
                borderTop="1px solid"
                borderColor={C.line}
              >
                <Text fontSize="xs" fontWeight="700" color={C.text}>
                  @{h.user?.username ?? "deleted"}
                </Text>
                <Text
                  as="button"
                  fontSize="xs"
                  color={C.gold}
                  onClick={() => setDetail({ kind: "room", id: h.roomId })}
                >
                  {h.roomTitle}
                </Text>
                <Text fontSize="2xs" color={C.faint}>
                  {fmtWhen(h.createdAt)}
                </Text>
                <Text
                  w="100%"
                  fontSize="sm"
                  color={C.text}
                  whiteSpace="pre-wrap"
                  wordBreak="break-word"
                >
                  {h.content}
                </Text>
                <Act
                  label="Approve"
                  tone="primary"
                  busy={busy === h.id}
                  onClick={() => void heldAction(h, true)}
                />
                <Act
                  label="Keep hidden"
                  busy={busy === h.id}
                  onClick={() => void heldAction(h, false)}
                />
              </Flex>
            ))
          )}
        </Card>
      )}

      {view === "holds" && isOwner && (
        <Card
          title="Child-safety holds"
          hint="Owner only. Evidence kept 1 year outside every delete. Not yet filed with NCMEC sits on top."
        >
          {!holds ? (
            <Spinner size="sm" color={C.muted} />
          ) : holds.length === 0 ? (
            <Text fontSize="sm" color={C.muted}>
              No holds.
            </Text>
          ) : (
            holds.map((h) => (
              <Flex
                key={h.id}
                as="button"
                w="100%"
                textAlign="left"
                gap={2}
                py={2}
                px={2}
                align="center"
                wrap="wrap"
                borderTop="1px solid"
                borderColor={C.line}
                onClick={() => setDetail({ kind: "hold", id: h.id })}
              >
                <Tag color={h.ncmecReportId ? C.good : C.bad}>
                  {h.ncmecReportId ? `NCMEC ${h.ncmecReportId}` : "not filed"}
                </Tag>
                <Text fontSize="sm" color={C.text}>
                  @{h.subject?.username ?? "unknown"}
                </Text>
                <Text fontSize="xs" color={C.faint} ml="auto">
                  {fmtWhen(h.createdAt)}
                </Text>
              </Flex>
            ))
          )}
        </Card>
      )}

      {detail && (
        <Card
          title={
            detail.kind === "report"
              ? "Report"
              : detail.kind === "room"
                ? "Room"
                : detail.kind === "user"
                  ? "Strikes"
                  : "Child-safety hold"
          }
          right={<Act label="Close" onClick={() => setDetail(null)} />}
        >
          {detail.kind === "report" && (
            <ReportDetail
              key={`${detail.type}:${detail.id}`}
              type={detail.type}
              id={detail.id}
              isOwner={isOwner}
              onDone={(m) => done(m)}
              onClose={() => setDetail(null)}
              openRoom={(id) => setDetail({ kind: "room", id })}
              openUser={(id, username) =>
                setDetail({ kind: "user", id, username })
              }
            />
          )}
          {detail.kind === "room" && (
            <RoomDetail
              key={detail.id}
              id={detail.id}
              onDone={done}
              openUser={(id, username) =>
                setDetail({ kind: "user", id, username })
              }
            />
          )}
          {detail.kind === "user" && (
            <StrikesBox
              key={detail.id}
              userId={detail.id}
              username={detail.username}
              onChange={done}
            />
          )}
          {detail.kind === "hold" && isOwner && (
            <HoldDetail key={detail.id} id={detail.id} onDone={done} />
          )}
        </Card>
      )}
    </Flex>
  );
}
