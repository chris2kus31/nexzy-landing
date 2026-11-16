"use client";
// Counts a trend page view (once per tab session per trend) and, when the
// visitor came from a shared link (?s=<tag>), the visit by source. Feeds
// Admin > Trends > Stats and GA4. Renders nothing.
import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { logTrendEvent } from "@/lib/trends/client";
import { VISIT_SOURCES } from "@/lib/trends/types";

export default function TrendPing({
  slug,
  page,
}: {
  slug: string;
  page: "trend" | "entry";
}) {
  useEffect(() => {
    const key = `trend:seen:${slug}`;
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {
      // storage blocked: count it
    }
    const s = new URLSearchParams(window.location.search).get("s");
    if (s && VISIT_SOURCES.includes(s)) {
      logTrendEvent(slug, "visit", { source: s });
      track("trend_visit", { trend: slug, from: s, page });
    }
    if (!seen) {
      logTrendEvent(slug, "view");
      track("trend_view", { trend: slug, page, source: "web" });
    }
  }, [slug, page]);
  return null;
}
