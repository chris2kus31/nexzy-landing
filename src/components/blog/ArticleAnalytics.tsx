"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

/**
 * Fires read-depth events for an article so you can tell a real read from a
 * bounce: article_view on load, then article_read at 25/50/75/100% scroll
 * (each once). This is the "did they actually read it" signal — far more
 * meaningful than a raw pageview.
 */
export default function ArticleAnalytics({ slug }: { slug: string }) {
  const fired = useRef<Set<number>>(new Set());

  useEffect(() => {
    track("article_view", { slug });

    const milestones = [25, 50, 75, 100];
    const onScroll = () => {
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable <= 0) return;
      const pct = (el.scrollTop / scrollable) * 100;
      for (const m of milestones) {
        if (pct >= m && !fired.current.has(m)) {
          fired.current.add(m);
          track("article_read", { slug, depth: m });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // catch short articles already fully visible
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  return null;
}
