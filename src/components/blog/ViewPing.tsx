"use client";

import { useEffect, useRef } from "react";

// One read per article per browser per 12h — dedup client-side (no server
// cache), so refreshes don't inflate the count.
const DEDUP_MS = 12 * 60 * 60 * 1000;

/** Records a read once per visit window. Renders nothing. */
export default function ViewPing({ slug }: { slug: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    try {
      const key = `nx_viewed_${slug}`;
      const last = Number(localStorage.getItem(key) || 0);
      if (Date.now() - last < DEDUP_MS) return; // already counted recently
      localStorage.setItem(key, String(Date.now()));
    } catch {
      // localStorage blocked (private mode) — fall through and still count.
    }

    // Who-sent-this signals for Admin → Analytics → Who's reading: the page's
    // ORIGINAL referrer (the ping's own Referer is always our article page)
    // and an optional ?src= tag. Counting itself is unchanged.
    let ref = "";
    let src = "";
    try {
      ref = document.referrer || "";
      src = new URLSearchParams(window.location.search).get("src") || "";
    } catch {
      /* best-effort */
    }

    fetch("/api/blog/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, ref, src }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}
