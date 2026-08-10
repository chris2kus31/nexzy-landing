// Shared types, utilities, and fetch helpers for the content comments UI.
// All calls go through the same-origin /api/comments proxy, which injects the
// reader's httpOnly session cookie server-side.

export type CommentSort = "top" | "newest" | "oldest";

export interface CommentT {
  id: string;
  parentId: string | null;
  content: string;
  author: { id: string; username: string };
  upvotes: number;
  downvotes: number;
  myVote: number; // -1 | 0 | 1
  replyCount: number;
  editedAt: string | null;
  createdAt: string;
}

export interface CommentPage {
  items: CommentT[];
  nextCursor: string | null;
  total: number;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function initials(name: string): string {
  const parts = (name || "user").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Deterministic avatar color from the username (navy-friendly palette).
const AVATAR_COLORS: Array<{ bg: string; fg: string }> = [
  { bg: "#2b5c86", fg: "#cfe6ff" },
  { bg: "#1f6d55", fg: "#c6f2df" },
  { bg: "#7a3d86", fg: "#f0d3f6" },
  { bg: "#8a5a1c", fg: "#f6dcae" },
  { bg: "#8a3050", fg: "#f6ccda" },
  { bg: "#3a5aa8", fg: "#cdd9ff" },
  { bg: "#2f7d7d", fg: "#c6f0f0" },
];

export function avatarColor(name: string): { bg: string; fg: string } {
  let h = 0;
  const key = name || "user";
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchPage(
  slug: string,
  sort: CommentSort,
  cursor: string | null,
): Promise<CommentPage | null> {
  const qs = new URLSearchParams({ sort });
  if (cursor) qs.set("cursor", cursor);
  const res = await fetch(
    `/api/comments/${encodeURIComponent(slug)}?${qs.toString()}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  // Tolerate the legacy array response (pre-pagination API).
  if (Array.isArray(json)) {
    return { items: json, nextCursor: null, total: json.length };
  }
  return json;
}

export async function fetchReplies(parentId: string): Promise<CommentT[]> {
  const res = await fetch(`/api/comments/replies/${parentId}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createComment(
  slug: string,
  content: string,
  parentId?: string,
): Promise<{ ok: boolean; status: number; held?: boolean; message?: string }> {
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ slug, content, parentId }),
  });
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    held: data?.held,
    message: data?.message,
  };
}

export async function voteComment(
  commentId: string,
  value: number,
): Promise<{
  ok: boolean;
  status: number;
  upvotes?: number;
  downvotes?: number;
  myVote?: number;
}> {
  const res = await fetch("/api/comments/vote", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ commentId, value }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...data };
}

export async function editComment(
  id: string,
  content: string,
): Promise<{ ok: boolean; held?: boolean; message?: string }> {
  const res = await fetch(`/api/comments/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ content }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, held: data?.held, message: data?.message };
}

export async function reportComment(id: string): Promise<boolean> {
  const res = await fetch(`/api/comments/${id}/report`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({}),
  });
  return res.ok;
}

export async function deleteComment(id: string): Promise<boolean> {
  const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
  return res.ok;
}
