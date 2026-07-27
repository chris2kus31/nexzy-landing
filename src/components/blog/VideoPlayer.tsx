"use client";

import { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";
import { track } from "@/lib/analytics";

/**
 * Inline YouTube player wired through the IFrame Player API so we can fire
 * precise engagement events (not just a click): video_play on first play,
 * video_progress at 25/50/75/90%, and video_complete on finish. This is the
 * heart of the video hub's analytics — it tells real watches from bounces.
 * Portrait (9:16) for a Short, wide (16:9) otherwise.
 */

interface YTPlayerInstance {
  getDuration?: () => number;
  getCurrentTime?: () => number;
  destroy?: () => void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: unknown) => YTPlayerInstance;
  PlayerState: { PLAYING: number; ENDED: number };
}

// Load the IFrame API once per page and resolve when YT is ready.
let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  };
  if (w.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export default function VideoPlayer({
  videoId,
  slug,
  source,
  isShort,
  gameSlug,
  from = "video_detail",
}: {
  videoId: string;
  slug: string;
  source: "nexzy" | "external";
  isShort: boolean;
  gameSlug?: string | null;
  from?: string;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const played = useRef(false);
  const milestones = useRef<Set<number>>(new Set());
  const poll = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const base: Record<string, string | number | boolean> = {
      slug,
      video_id: videoId,
      video_source: source,
      is_short: isShort,
      from,
    };
    if (gameSlug) base.game_slug = gameSlug;

    const stopPoll = () => {
      if (poll.current) {
        window.clearInterval(poll.current);
        poll.current = null;
      }
    };
    const startPoll = () => {
      stopPoll();
      poll.current = window.setInterval(() => {
        const p = playerRef.current;
        if (!p?.getDuration || !p?.getCurrentTime) return;
        const dur = p.getDuration() || 0;
        const cur = p.getCurrentTime() || 0;
        if (dur <= 0) return;
        const pct = (cur / dur) * 100;
        for (const m of [25, 50, 75, 90]) {
          if (pct >= m && !milestones.current.has(m)) {
            milestones.current.add(m);
            track("video_progress", { ...base, percent: m });
          }
        }
      }, 1000);
    };

    loadApi().then(() => {
      if (cancelled || !holderRef.current) return;
      const YT = (window as unknown as { YT?: YTNamespace }).YT;
      if (!YT) return;
      playerRef.current = new YT.Player(holderRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === YT.PlayerState.PLAYING) {
              if (!played.current) {
                played.current = true;
                track("video_play", base);
              }
              startPoll();
            } else {
              stopPoll();
            }
            if (e.data === YT.PlayerState.ENDED) {
              track("video_complete", base);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      stopPoll();
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* player already gone */
      }
    };
  }, [videoId, slug, source, isShort, gameSlug, from]);

  return (
    <Box
      position="relative"
      w="full"
      aspectRatio={isShort ? 9 / 16 : 16 / 9}
      borderRadius="2xl"
      overflow="hidden"
      bg="black"
    >
      <div ref={holderRef} style={{ width: "100%", height: "100%" }} />
    </Box>
  );
}
