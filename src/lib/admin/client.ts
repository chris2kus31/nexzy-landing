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
  youtubeUrl: string | null;
  beat: string;
  type?: string;
  parentId?: string | null;
  chapterOrder?: number | null;
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
  if (res.status === 401) {
    // Session expired / not signed in → bounce to the login page instead of
    // leaving "Not signed in" scattered across the admin panels.
    if (
      typeof window !== "undefined" &&
      !location.pathname.startsWith("/admin/login")
    ) {
      location.href = "/admin/login";
    }
    throw new AuthError("Not signed in");
  }
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

export async function getMe(): Promise<{ email: string; isOwner: boolean }> {
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
  failedJobs: number;
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

/** Quick: assign named authors (Chuy/Eli) to legacy/unbylined articles.
 *  Guarded server-side by the maintenance secret. */
export async function backfillAuthors(secret: string): Promise<{
  scanned: number;
  updated: number;
}> {
  return handle(
    await fetch("/api/newsroom/admin/backfill/authors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    }),
  );
}

/** Bulk reprocess: regenerate all published articles in their author's voice.
 *  Guarded by the maintenance secret. `review:true` routes each into the review
 *  queue instead of updating it live. */
export async function reprocessPublished(
  secret: string,
  review = false,
): Promise<{
  published: number;
  queued: number;
}> {
  return handle(
    await fetch("/api/newsroom/admin/reprocess/published", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, review }),
    }),
  );
}

/** Reassign an article's byline (Chuy/Eli/Nexzy Editorial). Relabel only. */
export async function setPostAuthor(
  id: string,
  author: string,
): Promise<BlogPost> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${id}/author`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author }),
    }),
  );
}

// ---- Marketing Desk (social publicist) ----

export type SocialChannel = "x" | "facebook" | "discord" | "reddit";

export interface SocialPostResult {
  channel: string;
  ok: boolean;
  skipped?: boolean;
  error?: string;
  id?: string;
}

export interface MarketingRecommendation {
  id: string; // persisted social_post id (used for skip/post)
  source: "article" | "lead";
  title: string;
  url: string | null;
  imageUrl: string | null;
  author: string;
  reason: string | null;
  recommendedChannels: SocialChannel[] | null;
  captions: Partial<Record<SocialChannel, string>> | null;
  status: "open" | "posted" | "skipped";
}

/** Which channels have credentials configured + whether auto-post is on. */
export async function getMarketingChannels(): Promise<{
  enabled: SocialChannel[];
  autoPost: boolean;
}> {
  return handle(await fetch("/api/newsroom/admin/marketing/channels"));
}

/** The persisted recommendation board (open items) — survives a refresh. */
export async function getMarketingRecommendations(): Promise<
  MarketingRecommendation[]
> {
  return handle(await fetch("/api/newsroom/admin/marketing/recommendations"));
}

/** Generate + persist fresh ideas, then return the open board. */
export async function generateMarketingRecommendations(
  channels?: SocialChannel[],
): Promise<MarketingRecommendation[]> {
  const qs =
    channels && channels.length ? `?channels=${channels.join(",")}` : "";
  return handle(
    await fetch(`/api/newsroom/admin/marketing/recommendations/generate${qs}`, {
      method: "POST",
    }),
  );
}

/** Bury a recommendation. */
export async function skipMarketingRecommendation(
  id: string,
): Promise<MarketingRecommendation> {
  return handle(
    await fetch(`/api/newsroom/admin/marketing/recommendations/${id}/skip`, {
      method: "POST",
    }),
  );
}

/** Post a persisted recommendation (with any edited channels/captions). */
export async function postMarketingRecommendation(
  id: string,
  channels: SocialChannel[],
  captions: Partial<Record<SocialChannel, string>>,
): Promise<{ posted: SocialPostResult[] }> {
  return handle(
    await fetch(`/api/newsroom/admin/marketing/recommendations/${id}/post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels, captions }),
    }),
  );
}

/** Draft a caption per channel from a free topic, in an author's voice.
 *  Optional reference image (data URL) informs the caption. */
export async function marketingDraft(
  topic: string,
  channels: SocialChannel[],
  opts?: { url?: string; author?: string; imageDataUrl?: string },
): Promise<{ captions: Partial<Record<SocialChannel, string>> }> {
  return handle(
    await fetch("/api/newsroom/admin/marketing/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        channels,
        url: opts?.url,
        author: opts?.author,
        imageDataUrl: opts?.imageDataUrl,
      }),
    }),
  );
}

/** Post the chosen captions to the chosen channels. */
export async function marketingPost(input: {
  channels: SocialChannel[];
  captions: Partial<Record<SocialChannel, string>>;
  url?: string;
  imageUrl?: string | null;
  title?: string;
}): Promise<{ posted: SocialPostResult[] }> {
  return handle(
    await fetch("/api/newsroom/admin/marketing/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

// ---- Content Desk (short-form video suggestions) ----

export interface PlatformKit {
  title?: string;
  description?: string;
  caption?: string;
  hashtags?: string[];
}

export interface ContentSuggestion {
  id: string;
  kind: string;
  lane: string | null;
  title: string;
  hook: string | null;
  script: string | null;
  rationale: string | null;
  sourceType: string | null;
  url: string | null;
  imageUrl: string | null;
  author: string;
  payload: {
    broll?: string;
    cta?: string;
    platforms?: {
      youtube?: PlatformKit;
      tiktok?: PlatformKit;
      reels?: PlatformKit;
    };
    // Guide-lead fields (kind === "guide")
    game?: string;
    released?: string;
    genres?: string[];
    angles?: string[];
    focus?: string;
  } | null;
  status: string;
  createdAt: string;
}

/** The open board of content suggestions (survives a refresh). */
export async function getContentSuggestions(): Promise<ContentSuggestion[]> {
  return handle(await fetch("/api/newsroom/admin/content"));
}

/** Generate fresh suggestions now, then return the open board. */
export async function suggestContentNow(): Promise<ContentSuggestion[]> {
  return handle(
    await fetch("/api/newsroom/admin/content/suggest-now", { method: "POST" }),
  );
}

/** Bury a suggestion. */
export async function skipContentSuggestion(
  id: string,
): Promise<ContentSuggestion> {
  return handle(
    await fetch(`/api/newsroom/admin/content/${id}/skip`, { method: "POST" }),
  );
}

/** Mark a suggestion used (you shot/posted it). */
export async function useContentSuggestion(
  id: string,
): Promise<ContentSuggestion> {
  return handle(
    await fetch(`/api/newsroom/admin/content/${id}/use`, { method: "POST" }),
  );
}

/**
 * Approve a guide LEAD → generate the real guide (lands in the review queue).
 * Optional focus/instructions steer the angle before generating.
 */
export async function approveContentGuide(
  id: string,
  overrides?: { focus?: string; instructions?: string },
): Promise<ContentSuggestion> {
  return handle(
    await fetch(`/api/newsroom/admin/content/${id}/approve-guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(overrides ?? {}),
    }),
  );
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
  suggestedAuthor?: string;
  youtubeUrl: string | null;
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

/** Email the current leads digest to the admin allowlist (both editors). */
export async function sendLeadDigest(): Promise<{
  leads: number;
  sent: number;
  failed: number;
}> {
  return handle(
    await fetch("/api/newsroom/admin/leads/digest", { method: "POST" }),
  );
}

/** "Write this": assign a lead to the writer, optionally choosing the author. */
export async function writeLead(id: string, author?: string): Promise<Lead> {
  return handle(
    await fetch(`/api/newsroom/admin/leads/${id}/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(author ? { author } : {}),
    }),
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
  author?: string;
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

export interface GuideInput {
  game: string;
  focus?: string;
  instructions?: string;
  /** Author's firsthand strategy notes — authoritative source for the guide. */
  notes?: string;
  /** Approved section outline (outline-first) — writer fills these in order. */
  outline?: string[];
  /** 'walkthrough' = longer chaptered full-playthrough; default 'guide'. */
  format?: "guide" | "walkthrough";
}

export async function proposeGuideOutline(
  input: GuideInput,
): Promise<{ outline: string[] }> {
  return handle(
    await fetch("/api/newsroom/admin/guides/outline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

/** Generate an evergreen "how to beat X" guide (lands in the review queue). */
export async function generateGuide(
  input: GuideInput,
): Promise<{ queued: true }> {
  return handle(
    await fetch("/api/newsroom/admin/guides/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export type ListKind = "upcoming" | "new";

/**
 * Generate an evergreen LIST article ("upcoming" games or "new this week")
 * straight from the games DB. Lands in the review queue as a draft.
 */
export async function generateList(
  kind: ListKind = "upcoming",
): Promise<{ queued: true }> {
  return handle(
    await fetch("/api/newsroom/admin/lists/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
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

/** Upload a custom hero image (base64 data URL) — swaps the article's image. */
export async function uploadArticleImage(
  id: string,
  dataUrl: string,
): Promise<BlogPost> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${id}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    }),
  );
}

/** Regenerate a draft's excerpt, body, or the whole article from its brief.
 *  Optional author rewrites the draft in that persona's voice (Chuy/Eli). */
export async function regenerateSection(
  postId: string,
  input: {
    heading: string;
    action: "rewrite" | "expand" | "draft";
    instructions?: string;
  },
): Promise<
  | { ok: true; heading: string; before: string; after: string }
  | { ok: false; message: string }
> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${postId}/section`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function regeneratePost(
  id: string,
  scope: "excerpt" | "body" | "all",
  author?: string,
): Promise<BlogPost> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(author ? { scope, author } : { scope }),
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

// ---- Forum Moderation ----

export interface ForumReport {
  reason: string | null;
  additionalDetails: string | null;
  createdAt: string;
}

export interface ForumQueuePost {
  id: string;
  title: string;
  content: string;
  platform: string | null;
  console: string | null;
  author: { id: string; username: string } | null;
  flagged: boolean;
  reportCount: number;
  reports: ForumReport[];
  createdAt: string;
}

export interface ForumQueueComment {
  id: string;
  content: string;
  author: { id: string; username: string } | null;
  post: { id: string; title: string } | null;
  flagged: boolean;
  reportCount: number;
  reports: ForumReport[];
  createdAt: string;
}

export interface ForumQueue {
  posts: ForumQueuePost[];
  comments: ForumQueueComment[];
  counts: { posts: number; comments: number };
}

export async function getForumQueue(): Promise<ForumQueue> {
  return handle(await fetch("/api/newsroom/admin/forum/queue"));
}

async function forumAction(
  path: string,
  reason?: string,
): Promise<{ success: boolean }> {
  return handle(
    await fetch(`/api/newsroom/admin/forum/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reason ? { reason } : {}),
    }),
  );
}

export const removeForumPost = (id: string, reason?: string) =>
  forumAction(`posts/${id}/remove`, reason);
export const approveForumPost = (id: string) =>
  forumAction(`posts/${id}/approve`);
export const removeForumComment = (id: string, reason?: string) =>
  forumAction(`comments/${id}/remove`, reason);
export const approveForumComment = (id: string) =>
  forumAction(`comments/${id}/approve`);

// ---- Forum seed suggestions (approve-first bot threads) ----

export interface ForumSeed {
  id: string;
  blogPostId: string;
  postType: string | null;
  slug: string | null;
  title: string;
  content: string;
  status: "pending" | "approved" | "skipped";
  communityPostId: string | null;
  createdAt: string;
}

export async function getForumSeeds(): Promise<ForumSeed[]> {
  return handle(await fetch("/api/newsroom/admin/forum/seeds"));
}

export async function approveForumSeed(
  id: string,
  edits?: { title?: string; content?: string },
): Promise<ForumSeed | null> {
  return handle(
    await fetch(`/api/newsroom/admin/forum/seeds/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edits ?? {}),
    }),
  );
}

export async function skipForumSeed(id: string): Promise<ForumSeed | null> {
  return handle(
    await fetch(`/api/newsroom/admin/forum/seeds/${id}/skip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }),
  );
}

// ---- Growth Intelligence (daily marketing brief) ----

export interface GrowthBriefResponse {
  day: string | null;
  briefMarkdown: string | null;
  brief: Record<string, unknown> | null;
  briefModel?: string | null;
  briefCostEstimate?: number | null;
  generatedAt?: string | null;
  kpis?: Record<string, number>;
  sources?: Record<string, unknown>;
}

export async function getGrowthBrief(
  day?: string,
): Promise<GrowthBriefResponse> {
  const qs = day ? `?day=${encodeURIComponent(day)}` : "";
  return handle(await fetch(`/api/newsroom/admin/growth/brief${qs}`));
}

export interface GrowthBriefMeta {
  day: string;
  generatedAt: string | null;
  briefModel: string | null;
}

export async function getGrowthBriefs(limit = 30): Promise<GrowthBriefMeta[]> {
  return handle(
    await fetch(`/api/newsroom/admin/growth/briefs?limit=${limit}`),
  );
}

export async function getGrowthMetrics(
  days = 30,
): Promise<Array<{ day: string; kpis: Record<string, number> }>> {
  return handle(await fetch(`/api/newsroom/admin/growth/metrics?days=${days}`));
}

export async function runGrowth(): Promise<{
  ok: boolean;
  day: string | null;
}> {
  return handle(
    await fetch("/api/newsroom/admin/growth/run", { method: "POST" }),
  );
}

// --- Game-Linked Content Graph: missing-games queue (Phase 2) ---

export interface UnresolvedGameRef {
  id: string;
  rawName: string;
  normalized: string;
  sourceType: string;
  sourceId: string | null;
  context: Record<string, unknown> | null;
  candidateGameIds: { gameId: string; name: string; score: number }[] | null;
  status: string;
  createdAt: string;
}

export interface GameLite {
  id: string;
  name: string;
  slug: string;
  backgroundImage: string | null;
  released: string | null;
}

export async function getUnresolvedGames(): Promise<UnresolvedGameRef[]> {
  return handle(await fetch("/api/newsroom/admin/games/unresolved"));
}

export async function searchGamesForLink(q: string): Promise<GameLite[]> {
  return handle(
    await fetch(`/api/newsroom/admin/games/search?q=${encodeURIComponent(q)}`),
  );
}

export async function mapUnresolvedGame(
  id: string,
  gameId: string,
): Promise<{ ok: boolean; gameId?: string }> {
  return handle(
    await fetch(`/api/newsroom/admin/games/unresolved/${id}/map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    }),
  );
}

export async function importUnresolvedGame(id: string): Promise<{
  result: {
    imported: boolean;
    reason?: string;
    game?: GameLite | null;
  } | null;
}> {
  return handle(
    await fetch(`/api/newsroom/admin/games/unresolved/${id}/import`, {
      method: "POST",
    }),
  );
}

export async function skipUnresolvedGame(
  id: string,
): Promise<UnresolvedGameRef | null> {
  return handle(
    await fetch(`/api/newsroom/admin/games/unresolved/${id}/skip`, {
      method: "POST",
    }),
  );
}

// --- Post <-> game links + backfills (Phase 4) ---

export interface PostGameLink {
  gameId: string;
  status: string;
  source: string;
  isPrimary: boolean;
  game: {
    id: string;
    name: string;
    slug: string;
    backgroundImage: string | null;
    released: string | null;
  } | null;
}

export async function getPostGames(postId: string): Promise<PostGameLink[]> {
  return handle(await fetch(`/api/newsroom/admin/posts/${postId}/games`));
}

export async function addPostGame(
  postId: string,
  gameId: string,
  isPrimary = false,
): Promise<PostGameLink | null> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${postId}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, isPrimary }),
    }),
  );
}

export async function confirmPostGame(
  postId: string,
  gameId: string,
): Promise<PostGameLink | null> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${postId}/games/${gameId}/confirm`, {
      method: "POST",
    }),
  );
}

export async function removePostGame(
  postId: string,
  gameId: string,
): Promise<{ ok: boolean }> {
  return handle(
    await fetch(`/api/newsroom/admin/posts/${postId}/games/${gameId}`, {
      method: "DELETE",
    }),
  );
}

export interface BackfillDetail {
  postId: string;
  title: string;
  type: string;
  result:
    | "linked-confirmed"
    | "linked-suggested"
    | "already-linked"
    | "no-match"
    | "error";
  gameName?: string;
  matchedOn?: string;
  reason?: string;
}

export async function backfillGameLinks(): Promise<{
  scanned: number;
  linked: number;
  errors: number;
  remaining: number;
  details: BackfillDetail[];
}> {
  return handle(
    await fetch(`/api/newsroom/admin/backfill/game-links`, { method: "POST" }),
  );
}

export interface ImportDetail {
  rawName: string;
  result: "imported" | "already in DB" | "no_rawg_match" | "error";
  gameName?: string;
}

export async function importAllUnresolved(limit = 25): Promise<{
  attempted: number;
  imported: number;
  failed: number;
  details: ImportDetail[];
}> {
  return handle(
    await fetch(`/api/newsroom/admin/games/unresolved/import-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit }),
    }),
  );
}

// ---- YouTube editorial search (post editor) ----
export interface YoutubeResult {
  videoId: string;
  url: string;
  title: string;
  channel: string;
  thumbnail: string | null;
}
export async function searchYoutube(q: string): Promise<YoutubeResult[]> {
  const r = (await handle(
    await fetch(
      `/api/newsroom/admin/youtube/search?q=${encodeURIComponent(q)}`,
    ),
  )) as { results?: YoutubeResult[] };
  return r?.results || [];
}

// ---- Writer personas (Writers tab) ----

export interface WriterPersona {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  bio: string | null;
  title: string | null;
  avatarUrl: string | null;
  socials: Record<string, string> | null;
  toneBible: string;
  exemplars: string | null;
  styleNotes: string | null;
  guideBible: string | null;
  modelWriter: string | null;
  promptVersion: string | null;
  beats: string[] | null;
  channels: string[] | null;
  priorityBoost: number;
  createdAt: string;
  updatedAt: string;
}

export type PersonaInput = Partial<
  Pick<
    WriterPersona,
    | "name"
    | "slug"
    | "active"
    | "bio"
    | "title"
    | "avatarUrl"
    | "toneBible"
    | "exemplars"
    | "styleNotes"
    | "guideBible"
    | "modelWriter"
    | "beats"
    | "channels"
  >
>;

export async function listPersonas(): Promise<WriterPersona[]> {
  return handle(await fetch("/api/newsroom/admin/personas"));
}

export async function createPersona(
  input: PersonaInput,
): Promise<WriterPersona> {
  return handle(
    await fetch("/api/newsroom/admin/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updatePersona(
  id: string,
  input: PersonaInput,
): Promise<WriterPersona> {
  return handle(
    await fetch(`/api/newsroom/admin/personas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

/** Active writer names for admin author pickers (falls back to Chuy/Eli). */
export async function getWriterNames(): Promise<string[]> {
  try {
    const ps = await listPersonas();
    const names = ps.filter((p) => p.active).map((p) => p.name);
    return names.length ? names : ["Chuy", "Eli"];
  } catch {
    return ["Chuy", "Eli"];
  }
}
