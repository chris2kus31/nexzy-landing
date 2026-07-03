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
  featured: boolean;
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

export interface AdminHealth {
  last24h: { runs: number; errors: number; cost: number };
  last7d: { runs: number; errors: number; cost: number };
  byAgent: { agent: string; runs: number; errors: number; cost: number }[];
  recentErrors: {
    agent: string;
    model: string | null;
    error: string | null;
    at: string;
  }[];
  lastRunAt: string | null;
}

export async function getHealth(): Promise<AdminHealth> {
  return handle(await fetch("/api/newsroom/admin/health"));
}

// ---- Analytics (Phase 7) ----

export interface TopArticle {
  slug: string;
  title: string;
  beat: string;
  reads: number;
}

export interface ContentAnalytics {
  readsToday: number;
  reads7d: number;
  reads30d: number;
  topToday: TopArticle[];
  top7d: TopArticle[];
  topAllTime: TopArticle[];
  byBeat: { beat: string; reads: number }[];
}

export interface CostBreakdownRow {
  key: string;
  runs: number;
  cost: number;
}

export interface CostAnalytics {
  costToday: number;
  cost7d: number;
  cost30d: number;
  costMtd: number;
  projectedMonth: number;
  prev7d: number;
  curr7d: number;
  costPerArticle30d: number;
  publishedArticles30d: number;
  byModel: CostBreakdownRow[];
  byAgent: CostBreakdownRow[];
  byBeat: CostBreakdownRow[];
  priciestRuns: {
    agent: string;
    model: string | null;
    cost: number;
    at: string;
    articleId: string | null;
  }[];
}

export async function getContentAnalytics(): Promise<ContentAnalytics> {
  return handle(await fetch("/api/newsroom/admin/analytics/content"));
}

export async function getCostAnalytics(): Promise<CostAnalytics> {
  return handle(await fetch("/api/newsroom/admin/analytics/cost"));
}

/** Direct download URL for the cost CSV (goes through the admin proxy). */
export const COST_CSV_URL = "/api/newsroom/admin/analytics/cost.csv";

export interface Subscriber {
  id: string;
  email: string;
  source: string;
  status: "active" | "unsubscribed";
  createdAt: string;
  unsubscribedAt: string | null;
}

export interface SubscribersResult {
  total: number;
  active: number;
  unsubscribed: number;
  bySource: { source: string; count: number }[];
  subscribers: Subscriber[];
}

export async function getSubscribers(): Promise<SubscribersResult> {
  return handle(await fetch("/api/newsroom/admin/subscribers"));
}

// ---- Assignment Desk: Leads Board ----

export interface Lead {
  id: string;
  beat: string;
  headline: string | null;
  workingTitle: string;
  whyItMatters: string | null;
  trendScore: number;
  sourceCount: number;
  latestSourceDate: string | null;
  sources: { name: string; url: string }[] | null;
  confidenceFacts: "high" | "medium" | "low" | null;
  status: string;
  createdAt: string;
}

export async function getLeads(): Promise<Lead[]> {
  return handle(await fetch("/api/newsroom/admin/leads"));
}

/** Trigger an Assignment Desk scan right now. */
export async function runDesk(): Promise<{ queued: true }> {
  return handle(
    await fetch("/api/newsroom/admin/desk/run", { method: "POST" }),
  );
}

/** "Write this": assign a lead to the writer. */
export async function writeLead(id: string): Promise<Lead> {
  return handle(
    await fetch(`/api/newsroom/admin/leads/${id}/write`, { method: "POST" }),
  );
}

/** "Skip": bury a lead. */
export async function skipLead(id: string): Promise<Lead> {
  return handle(
    await fetch(`/api/newsroom/admin/leads/${id}/skip`, { method: "POST" }),
  );
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

export interface CommissionInput {
  beat: string;
  instructions: string;
  sourceUrl?: string;
  workingTitle?: string;
}

/** Commission a specific story for the AI staff to research + write. */
export async function commissionStory(
  input: CommissionInput,
): Promise<{ queued: true }> {
  return handle(
    await fetch("/api/newsroom/admin/commission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
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

/** Regenerate a draft's excerpt, body, or the whole article from its brief. */
export async function regeneratePost(
  id: string,
  scope: "excerpt" | "body" | "all",
): Promise<BlogPost> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    }),
  );
}

/** Pin/unpin an article as the front-page hero (single-featured). */
export async function setFeatured(
  id: string,
  featured: boolean,
): Promise<BlogPost> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${id}/feature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured }),
    }),
  );
}
