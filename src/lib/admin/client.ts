// Client helpers for the admin UI. Everything goes through the same-origin
// proxy (/api/newsroom/...) or the session route (/api/admin/session); the
// admin JWT is in an httpOnly cookie, so these calls carry no token directly.
"use client";

export interface BlogPost {
  id: string;
  slug: string;
  title: string | null;
  seoTitle: string | null;
  excerpt: string | null;
  seoDescription: string | null;
  bodyMarkdown: string | null;
  heroImageUrl: string | null;
  appImageUrl: string | null;
  imageAlt: string | null;
  imageCredit: string | null;
  beat: string;
  tags: string[] | null;
  sources: { name: string; url: string }[] | null;
  status: string;
  confidence: string | null;
  editorReport: Record<string, unknown> | null;
  aiModelWriter: string | null;
  aiModelEditor: string | null;
  briefId: string | null;
  author: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class AuthError extends Error {}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) throw new AuthError("Not signed in");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body?.message || body?.error || `Request failed (${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}

export async function requestMagicLink(email: string): Promise<void> {
  await fetch("/api/newsroom/admin/auth/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function createSession(token: string): Promise<{ email: string }> {
  const res = await fetch("/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return handle(res);
}

export async function signOut(): Promise<void> {
  await fetch("/api/admin/session", { method: "DELETE" });
}

export async function getMe(): Promise<{ email: string }> {
  return handle(await fetch("/api/newsroom/admin/me"));
}

export async function getQueue(): Promise<BlogPost[]> {
  return handle(await fetch("/api/newsroom/admin/queue"));
}

export async function getPublished(): Promise<BlogPost[]> {
  return handle(await fetch("/api/newsroom/admin/published"));
}

export interface AdminStats {
  awaitingReview: number;
  inProgress: number;
  published: number;
}

export async function getStats(): Promise<AdminStats> {
  return handle(await fetch("/api/newsroom/admin/stats"));
}

/** Kick off the pipeline for one beat, or all beats when beat is omitted. */
export async function runPipeline(
  beat?: string,
): Promise<{ enqueued: string[] }> {
  return handle(
    await fetch("/api/newsroom/admin/run-pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(beat ? { beat } : {}),
    }),
  );
}

export async function getPost(id: string): Promise<BlogPost> {
  return handle(await fetch(`/api/newsroom/admin/posts/${id}`));
}

export async function updatePost(
  id: string,
  patch: Partial<BlogPost>,
): Promise<BlogPost> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

async function action(
  id: string,
  verb: string,
  reason?: string,
): Promise<BlogPost> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${id}/${verb}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reason ? { reason } : {}),
    }),
  );
}

export const approvePost = (id: string) => action(id, "approve");
export const rejectPost = (id: string, reason?: string) =>
  action(id, "reject", reason);
export const sendBackPost = (id: string, reason?: string) =>
  action(id, "send-back", reason);
export const unpublishPost = (id: string) => action(id, "unpublish");

export async function regenerateImage(
  id: string,
): Promise<{ enqueued: string }> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${id}/regenerate-image`, {
      method: "POST",
    }),
  );
}
