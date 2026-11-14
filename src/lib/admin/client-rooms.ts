// Admin client for Squad Rooms (Phase 3 Step 4): the Rooms tab (safety queue,
// held messages, room detail, strikes, owner-only child-safety holds) and the
// per-game room profile card in Mega hubs. Same-origin proxy via adminRequest.
"use client";

import { adminRequest } from "@/lib/admin/client";

const enc = encodeURIComponent;

// ───────────────────────── safety queue ─────────────────────────

export type RoomReportTarget = "message" | "member" | "room";
export type RoomReportReason =
  | "harassment"
  | "hate"
  | "sexual"
  | "child_safety"
  | "self_harm"
  | "spam"
  | "scam"
  | "personal_info"
  | "other";

export interface RoomQueueItem {
  targetType: RoomReportTarget;
  targetId: string;
  reports: number;
  reasons: RoomReportReason[];
  childSafety: boolean;
  firstAt: string;
  waitingMinutes: number;
  room: { id: string; title: string; status: string; game: string } | null;
}

export interface RoomEvidenceLine {
  id: string;
  userId: string | null;
  username: string | null;
  content: string | null;
  gif: unknown;
  hidden: boolean;
  hiddenReason: string | null;
  deleted: boolean;
  createdAt: string;
  /** Child-safety line withheld from a non-owner admin. */
  withheld?: boolean;
}

export interface RoomSnapshot {
  capturedAt?: string;
  subjectUserId?: string | null;
  subjectUsername?: string | null;
  room?: {
    id: string;
    title: string;
    kind: string;
    status: string;
    hostId: string;
    gameId: string;
  };
  target?: { type: RoomReportTarget; id: string };
  member?: { role: string; state: string };
  messages?: RoomEvidenceLine[];
}

export interface RoomStrike {
  id: string;
  level: "warning" | "rooms_ban";
  reason: string;
  reportId: string | null;
  active: boolean;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface RoomReportDetail {
  targetType: RoomReportTarget;
  targetId: string;
  subjectUserId: string | null;
  message: {
    hidden: boolean;
    hiddenReason: string | null;
    deleted: boolean;
  } | null;
  snapshot: RoomSnapshot | null;
  reports: Array<{
    id: string;
    reason: RoomReportReason;
    note: string | null;
    status: "open" | "dismissed" | "actioned";
    reporter: { id: string; username: string | null };
    createdAt: string;
    decidedBy: string | null;
    decidedAt: string | null;
  }>;
  strikes: RoomStrike[];
}

export interface RoomHeldItem {
  id: string;
  roomId: string;
  roomTitle: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string | null } | null;
}

export interface RoomAdminDetail {
  room: {
    id: string;
    title: string;
    kind: string;
    status: string;
    visibility: string;
    joinMode: string;
    locked: boolean;
    memberCount: number;
    startsAt: string;
    startedAt: string | null;
    endedAt: string | null;
    hostId: string;
    hostName: string | null;
    gameName: string;
  };
  members: Array<{
    id: string;
    username: string | null;
    role: string;
    state: string;
    mutedUntil: string | null;
  }>;
  events: Array<{
    id: string;
    type: string;
    actorId: string | null;
    targetId: string | null;
    data: Record<string, unknown> | null;
    createdAt: string;
  }>;
}

export interface RoomHoldRow {
  id: string;
  reportId: string | null;
  roomId: string | null;
  subject: { id: string; username: string | null } | null;
  ncmecReportId: string | null;
  keepUntil: string;
  createdBy: string;
  createdAt: string;
}

export interface RoomHoldDetail {
  id: string;
  reportId: string | null;
  roomId: string | null;
  subjectUserId: string | null;
  evidence: RoomSnapshot & { targetKey?: string };
  ncmecReportId: string | null;
  keepUntil: string;
  createdBy: string;
  createdAt: string;
}

const R = "rooms";

export const getRoomQueue = () =>
  adminRequest<{ items: RoomQueueItem[] }>(`${R}/queue`);

export const getRoomHeld = () =>
  adminRequest<{ items: RoomHeldItem[] }>(`${R}/held`);

export const getRoomReport = (type: RoomReportTarget, id: string) =>
  adminRequest<RoomReportDetail>(`${R}/reports/${type}/${enc(id)}`);

export const decideRoomReport = (
  type: RoomReportTarget,
  id: string,
  decision: "dismissed" | "actioned",
) =>
  adminRequest<{ decided: number; decision: string }>(
    `${R}/reports/${type}/${enc(id)}/decide`,
    { body: { decision } },
  );

export const hideRoomMessage = (messageId: string) =>
  adminRequest<{ hidden: true }>(`${R}/messages/${enc(messageId)}/hide`, {
    method: "POST",
  });

export const restoreRoomMessage = (messageId: string) =>
  adminRequest<{ hidden: false }>(`${R}/messages/${enc(messageId)}/restore`, {
    method: "POST",
  });

export const getRoomAdmin = (roomId: string) =>
  adminRequest<RoomAdminDetail>(`${R}/room/${enc(roomId)}`);

export const endRoomAdmin = (roomId: string) =>
  adminRequest<unknown>(`${R}/room/${enc(roomId)}/end`, { method: "POST" });

export const removeRoomMember = (roomId: string, userId: string) =>
  adminRequest<{ result: string }>(
    `${R}/room/${enc(roomId)}/members/${enc(userId)}/remove`,
    { method: "POST" },
  );

export const getRoomStrikes = (userId: string) =>
  adminRequest<RoomStrike[]>(`${R}/users/${enc(userId)}/strikes`);

export const addRoomStrike = (
  userId: string,
  input: {
    level: "warning" | "rooms_ban";
    reason: string;
    reportId?: string;
    days?: number;
  },
) =>
  adminRequest<{ id: string }>(`${R}/users/${enc(userId)}/strikes`, {
    body: input,
  });

export const liftRoomStrike = (strikeId: string) =>
  adminRequest<{ lifted: true }>(`${R}/strikes/${enc(strikeId)}/lift`, {
    method: "POST",
  });

// Owner only (the API answers 403 for everyone else).
export const getRoomHolds = () => adminRequest<RoomHoldRow[]>(`${R}/holds`);

export const getRoomHold = (id: string) =>
  adminRequest<RoomHoldDetail>(`${R}/holds/${enc(id)}`);

export const createRoomHold = (reportId: string) =>
  adminRequest<{ id: string }>(`${R}/holds`, { body: { reportId } });

export const setRoomHoldNcmec = (id: string, ncmecReportId: string) =>
  adminRequest<{ id: string; ncmecReportId: string }>(
    `${R}/holds/${enc(id)}/ncmec`,
    { method: "PUT", body: { ncmecReportId } },
  );

// ───────────────────────── room profiles (Mega hubs) ─────────────────────────

export const ROOM_TAB_OPTIONS = [
  { key: "plan", label: "Plan" },
  { key: "crew", label: "Crew" },
  { key: "list", label: "List" },
  { key: "map", label: "Map" },
] as const;

export const CREW_PLATFORM_OPTIONS = [
  { key: "psn", label: "PSN" },
  { key: "xbox", label: "Xbox" },
  { key: "steam", label: "Steam" },
  { key: "switch", label: "Switch" },
  { key: "epic", label: "Epic" },
] as const;

/** Server rules (UpsertRoomProfileDto), mirrored for inline checks. */
export const ROOM_PROFILE_LIMITS = {
  keyRe: /^[a-z0-9_-]{1,24}$/,
  absoluteMaxSize: 200,
  kinds: 8,
  spoilerStages: 40,
  listTemplates: 12,
  listItems: 200,
  listLabel: 120,
} as const;

export interface RoomKindConfig {
  key: string;
  label: string;
  defaultSize: number;
  maxSize: number;
  persistent?: boolean;
  staffOnly?: boolean;
}

export interface RoomProfileInput {
  enabled: boolean;
  kinds: RoomKindConfig[];
  tabs: string[];
  crewPlatforms: string[];
  spoilerStages: Array<{ key: string; label: string }>;
  listTemplates: Array<{ key: string; label: string; items: string[] }>;
  minAge: number;
}

export interface RoomProfileAdmin {
  game: { id: string; name: string; slug: string };
  profile:
    | (RoomProfileInput & { updatedAt: string; updatedBy: string | null })
    | null;
}

export const getRoomProfile = (gameId: string) =>
  adminRequest<RoomProfileAdmin>(`room-profiles/${enc(gameId)}`);

export const saveRoomProfile = (gameId: string, input: RoomProfileInput) =>
  adminRequest<unknown>(`room-profiles/${enc(gameId)}`, {
    method: "PUT",
    body: input,
  });

/** Empty profile used when a game has none yet (rooms off). */
export const EMPTY_ROOM_PROFILE: RoomProfileInput = {
  enabled: false,
  kinds: [],
  tabs: ["plan", "crew", "list"],
  crewPlatforms: [],
  spoilerStages: [],
  listTemplates: [],
  minAge: 18,
};

// ───────────────────────── labels shared by the UI ─────────────────────────

export const REASON_LABEL: Record<RoomReportReason, string> = {
  harassment: "Harassment",
  hate: "Hate",
  sexual: "Sexual",
  child_safety: "Child safety",
  self_harm: "Self-harm",
  spam: "Spam",
  scam: "Scam",
  personal_info: "Personal info",
  other: "Other",
};

export const HIDDEN_LABEL: Record<string, string> = {
  auto: "Hidden: auto",
  pending: "Hidden: pending",
  reports: "Hidden: reports",
  staff: "Hidden: staff",
  child_safety: "Hidden: child safety",
};
