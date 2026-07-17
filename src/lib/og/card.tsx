/* eslint-disable @next/next/no-img-element */
// ============================================
// FILE: src/lib/og/card.tsx
// Shared branded Open Graph card, rendered by next/og's ImageResponse.
// One consistent Nexzy-branded 1200x630 template reused by every dynamic
// share image (game hubs, author pages, and — later — data cards).
//
// Satori (the engine behind ImageResponse) supports a flexbox subset: every
// element with more than one child MUST set display:flex, so we're explicit
// about it throughout.
// ============================================

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const NAVY = "#1a1f3a";
const AMBER = "#FFB74D";
const BLUE = "#6AB7FF";
const LIGHT = "#C9D4E5";
const SUBTLE = "#9FB0C7";

/** The navy brand gradient used whenever there's no background art. */
const BRAND_GRADIENT =
  "radial-gradient(circle at 75% 15%, rgba(74,159,255,0.35) 0%, rgba(26,31,58,0) 45%), radial-gradient(circle at 10% 100%, rgba(255,183,77,0.25) 0%, rgba(26,31,58,0) 45%), #1a1f3a";

export interface BrandCardProps {
  /** Small letter-spaced kicker above the title, e.g. "GAME HUB". */
  eyebrow: string;
  /** The headline — the game or author name. */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string | null;
  /** Optional pill text at the bottom, e.g. "Guides · Walkthroughs · News". */
  footer?: string | null;
  /** Optional background art (e.g. a game's key art); scrimmed for legibility. */
  backgroundImage?: string | null;
}

/** Returns the card element tree for `new ImageResponse(brandCard(props), {...OG_SIZE})`. */
export function brandCard({
  eyebrow,
  title,
  subtitle,
  footer,
  backgroundImage,
}: BrandCardProps) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: BRAND_GRADIENT,
        fontFamily: "sans-serif",
      }}
    >
      {backgroundImage ? (
        <img
          src={backgroundImage}
          alt=""
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${OG_SIZE.width}px`,
            height: `${OG_SIZE.height}px`,
            objectFit: "cover",
          }}
        />
      ) : null}
      {backgroundImage ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            width: `${OG_SIZE.width}px`,
            height: `${OG_SIZE.height}px`,
            background:
              "linear-gradient(115deg, rgba(16,20,40,0.96) 0%, rgba(16,20,40,0.86) 42%, rgba(16,20,40,0.55) 100%)",
          }}
        />
      ) : null}

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px 80px",
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            color: AMBER,
            fontSize: "30px",
            fontWeight: 700,
            letterSpacing: "3px",
          }}
        >
          ⚡ NEXZY
        </div>

        {/* Middle: eyebrow + title + subtitle */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: BLUE,
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "4px",
              textTransform: "uppercase",
              marginBottom: "18px",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              color: "#FFFFFF",
              fontSize: title.length > 26 ? "72px" : "88px",
              fontWeight: 800,
              lineHeight: 1.04,
              maxWidth: "1000px",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                color: LIGHT,
                fontSize: "34px",
                fontWeight: 400,
                marginTop: "24px",
                maxWidth: "940px",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Footer pill */}
        {footer ? (
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                background: AMBER,
                color: NAVY,
                fontSize: "26px",
                fontWeight: 700,
                padding: "14px 32px",
                borderRadius: "999px",
              }}
            >
              {footer}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", color: SUBTLE, fontSize: "26px" }}>
            nexzyapp.com
          </div>
        )}
      </div>
    </div>
  );
}
