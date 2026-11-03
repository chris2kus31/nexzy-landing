// Public (signed-out) reads for Squad Rooms on the website: the hub showcase
// list and the /r/<code> invite preview. Rooms themselves are app-only.
export interface PublicRoomSummary {
  id: string;
  game: { id: string; name: string; slug: string };
  kind: string;
  title: string;
  visibility: "public" | "private";
  joinMode: string;
  status: "waiting" | "live" | "ended" | "cancelled";
  maxSize: number;
  memberCount: number;
  locked: boolean;
  isOfficial: boolean;
  startsAt: string;
  startedAt: string | null;
  endedAt: string | null;
  host: { id: string; username: string; avatarUrl: string | null };
}

export interface PublicRoomKind {
  key: string;
  label: string;
  staffOnly?: boolean;
  persistent?: boolean;
}

export interface HubRoomsList {
  enabled: boolean;
  live: number;
  upcoming: number;
  rooms: PublicRoomSummary[];
  profile: { kinds: PublicRoomKind[]; minAge: number } | null;
}

export type InviteResult =
  | { state: "ok"; room: PublicRoomSummary }
  | { state: "gone" }
  | { state: "off" }
  | { state: "busy" }
  | { state: "error" };

/** Room invite codes are 24 base64url characters (18 random bytes). */
export const INVITE_RE = /^[A-Za-z0-9_-]{24}$/;

/** "play-along" -> "Play-along" when no profile label is at hand. */
export function kindLabel(
  key: string,
  kinds?: PublicRoomKind[] | null,
): string {
  const hit = kinds?.find((k) => k.key === key);
  if (hit) return hit.label;
  const s = key.replace(/[-_]+/g, " ").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : "Room";
}

/** "Fri, Nov 18, 11:00 PM CT" */
export function fmtRoomTime(iso: string): string {
  return (
    new Date(iso).toLocaleString("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) + " CT"
  );
}
