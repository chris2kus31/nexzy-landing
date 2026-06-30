"use client";

import { useEffect, useRef } from "react";

/** Fires one read-count ping per mount (real browser load). Renders nothing. */
export default function ViewPing({ slug }: { slug: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch("/api/blog/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}
