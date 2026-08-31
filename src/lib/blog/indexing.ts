// ============================================
// FILE: lib/blog/indexing.ts
// Phase 0 (2026-08-31) — index/noindex policy, derived from data the pages
// already carry (beat + content type) so it needs NO DB column or migration.
//
// Why: commodity beats (deals, patch notes) and per-game Rewind stubs are
// published for readers / social / the app, but kept OUT of Google's index —
// they copy a primary source everyone has, they go stale, and at volume they
// drag the whole domain's quality signal ("crawled/discovered - not indexed").
// See NEXZY_INDEXING_TURNAROUND_PLAN.md (Phase 0) + NEXZY_ARTICLE_QUALITY_STANDARD.md.
//
// Reversible by design: flip a beat out of NOINDEX_BEATS and it indexes again.
// ============================================

/** News/article beats kept out of the index (commodity + time-sensitive). */
export const NOINDEX_BEATS = new Set<string>(["deals", "patch_notes"]);

/** Robots directive for noindexed pages — still followed, so link equity flows. */
export const NOINDEX_ROBOTS = { index: false, follow: true } as const;

/** True if a /blog article's beat is allowed in the index. */
export function isArticleBeatIndexable(beat?: string | null): boolean {
  return !beat || !NOINDEX_BEATS.has(beat);
}

/**
 * Per-game Rewind episode stubs (/rewind/<slug>) are noindex — thin, templated,
 * near-duplicate. The /rewind/on-this-day day-hubs stay indexed (aggregated,
 * stronger). Flip to true to re-index the stubs.
 */
export const REWIND_EPISODE_INDEXABLE = false;
