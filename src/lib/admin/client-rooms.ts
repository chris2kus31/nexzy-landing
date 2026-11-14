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
  /** A reported photo: short staff links (the copy kept for the report, and
   *  the original while the room still has it), or why it isn't shown.
   *  Child-safety photos are never shown here. */
  photo?:
    | { url: string; liveUrl: string | null }
    | { withheld: true }
    | { unavailable: true };
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
  listName: 60,
  blurb: 80,
} as const;

export const JOIN_MODE_OPTIONS = [
  { key: "request", label: "Ask to join" },
  { key: "open", label: "Open" },
  { key: "invite", label: "Invite only" },
] as const;
export type RoomJoinMode = (typeof JOIN_MODE_OPTIONS)[number]["key"];

/** One room kind. Optional fields mirror the API's RoomKindDto: absent means
 *  the default (all the game's tabs, spoiler shield on, has a start time). */
export interface RoomKindConfig {
  key: string;
  label: string;
  defaultSize: number;
  maxSize: number;
  persistent?: boolean;
  staffOnly?: boolean;
  /** One short line under the kind in the app's create sheet (80 max). */
  blurb?: string;
  /** The tabs this kind turns on, within the game's tabs. */
  tabs?: string[];
  /** false = no spoiler shield for this kind. */
  spoilers?: boolean;
  /** false = no start time: the room opens live when made (Hang out). */
  scheduled?: boolean;
  /** The host picks the tabs, within this kind's tabs. */
  custom?: boolean;
  /** Join mode the create sheet starts on. */
  joinMode?: RoomJoinMode;
}

export interface RoomProfileInput {
  enabled: boolean;
  kinds: RoomKindConfig[];
  tabs: string[];
  crewPlatforms: string[];
  spoilerStages: Array<{ key: string; label: string }>;
  minAge: number;
}

/** Saved profile as the API returns it (lists are edited on their own tab
 *  and never sent with the profile, so a save can't overwrite them). */
interface RoomProfileStored extends RoomProfileInput {
  listTemplates?: unknown[];
}

export interface RoomProfileAdmin {
  game: { id: string; name: string; slug: string };
  profile:
    | (RoomProfileStored & { updatedAt: string; updatedBy: string | null })
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
  minAge: 18,
};

// ───────────────────────── recommended lists (Mega hubs > Room lists) ─────────────────────────

export interface RoomListRow {
  key: string;
  label: string;
  items: string[];
  /** Kind keys it is suggested for; empty = every kind. */
  kinds: string[];
  /** false = hidden from hosts (kept here). */
  enabled: boolean;
  /** Rooms that loaded it. */
  rooms: number;
}

export interface RoomListsAdmin {
  game: { id: string; name: string; slug: string };
  kinds: Array<{ key: string; label: string }>;
  max: number;
  lists: RoomListRow[];
}

export interface RoomListInput {
  label: string;
  items: string[];
  kinds: string[];
  enabled: boolean;
}

export const getRoomLists = (gameId: string) =>
  adminRequest<RoomListsAdmin>(`room-profiles/${enc(gameId)}/lists`);

export const saveRoomList = (
  gameId: string,
  key: string,
  input: RoomListInput,
) =>
  adminRequest<RoomListsAdmin>(
    `room-profiles/${enc(gameId)}/lists/${enc(key)}`,
    { method: "PUT", body: input },
  );

export const deleteRoomList = (gameId: string, key: string) =>
  adminRequest<RoomListsAdmin>(
    `room-profiles/${enc(gameId)}/lists/${enc(key)}`,
    { method: "DELETE" },
  );

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
