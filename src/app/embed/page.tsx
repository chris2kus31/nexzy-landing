// ============================================
// FILE: app/embed/page.tsx
// Full-bleed in-app YouTube player page.
//
// The Nexzy mobile app loads THIS page inside a WebView (not the raw YouTube
// embed) on purpose: YouTube only allows inline playback when the request comes
// from a real web page on a real domain (a valid HTTP Referer). Loading the bare
// embed URL from a WebView has no enclosing page, so strict videos fall back to
// "Watch on YouTube". Because this route lives on www.nexzyapp.com — an allowed
// embedding origin — the player plays inline and autoplays (muted). Embedded
// plays still credit the video's YouTube view count, so this keeps users in the
// app AND feeds the channel. noindex: this is an app surface, not SEO content.
// ============================================
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Nexzy player",
};

/** Only accept a valid 11-char YouTube id (guards the iframe src). */
function safeId(v?: string): string | null {
  if (!v) return null;
  return /^[A-Za-z0-9_-]{11}$/.test(v) ? v : null;
}

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; mute?: string }>;
}) {
  const sp = await searchParams;
  const id = safeId(sp.v);
  const mute = sp.mute === "0" ? "0" : "1"; // default muted so autoplay is allowed

  if (!id) {
    return (
      <main
        style={{
          margin: 0,
          height: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#000",
          color: "#8892A6",
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        Video unavailable.
      </main>
    );
  }

  const src =
    `https://www.youtube-nocookie.com/embed/${id}` +
    `?autoplay=1&mute=${mute}&playsinline=1&rel=0&modestbranding=1&fs=1`;

  return (
    <main
      style={{
        margin: 0,
        height: "100dvh",
        width: "100vw",
        background: "#000",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", aspectRatio: "16 / 9" }}>
        <iframe
          src={src}
          title="Nexzy video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        />
      </div>
    </main>
  );
}
