// ============================================
// FILE: app/opengraph-image.tsx
// Dynamic 1200x630 social share card (Open Graph).
// Next.js auto-wires this as the og:image for the site.
// ============================================
import { ImageResponse } from "next/og";

export const alt = "Nexzy — Never get stuck in a game again";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background:
          "radial-gradient(circle at 75% 15%, rgba(74,159,255,0.35) 0%, rgba(26,31,58,0) 45%), radial-gradient(circle at 10% 100%, rgba(255,183,77,0.25) 0%, rgba(26,31,58,0) 45%), #1a1f3a",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          color: "#FFD700",
          fontSize: "30px",
          fontWeight: 700,
          letterSpacing: "2px",
        }}
      >
        ⚡ NEXZY
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          marginTop: "28px",
          color: "#FFFFFF",
          fontSize: "84px",
          fontWeight: 800,
          lineHeight: 1.05,
          maxWidth: "900px",
        }}
      >
        Never get stuck in a&nbsp;
        <span style={{ color: "#4DA3FF" }}>game</span>
        &nbsp;again
      </div>
      <div
        style={{
          marginTop: "36px",
          color: "#C9D4E5",
          fontSize: "34px",
          fontWeight: 400,
          maxWidth: "920px",
        }}
      >
        Your AI gaming assistant — instant help for any game, your whole library
        in one place, and rewards for playing.
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "48px",
          gap: "16px",
        }}
      >
        <div
          style={{
            background: "#FFD700",
            color: "#1a1f3a",
            fontSize: "26px",
            fontWeight: 700,
            padding: "14px 32px",
            borderRadius: "999px",
          }}
        >
          Free on iOS &amp; Android
        </div>
      </div>
    </div>,
    { ...size },
  );
}
