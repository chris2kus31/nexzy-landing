"use client";

import { useEffect, useRef } from "react";

// One view per game per browser per 12h — dedup client-side (no server cache),
// so refreshes don't inflate the count. Mirrors the article ViewPing.
const DEDUP_MS = 12 * 60 * 60 * 1000;

/** Records a game-page view once per visit window. Renders nothing. */
export default function GameViewPing({ slug }: { slug: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    try {
      const key = `nx_game_viewed_${slug}`;
      const last = Number(localStorage.getItem(key) || 0);
      if (Date.now() - last < DEDUP_MS) return; // already counted recently
      localStorage.setItem(key, String(Date.now()));
    } catch {
      // localStorage blocked (private mode) — fall through and still count.
    }

    fetch("/api/games/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}
