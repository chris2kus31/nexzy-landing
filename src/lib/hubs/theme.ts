// lib/hubs/theme.ts
// The Admin "Look and colors" theme as CSS variables on the hub's wrapper.
// Hub components color themselves with var(--hub-accent, <nexzy gold>) and
// friends, so with no theme (or outside the wrapper) they render exactly the
// gold look they always had, and a themed hub repaints every accent at once.
// The dark surfaces stay the site's navy on purpose: the hub sits inside the
// site page, unlike the app where the themed Hub tab is the whole screen.
import type { CSSProperties } from "react";
import type { HubThemeColors } from "@/lib/hubs/types";

export function hubThemeVars(
  theme: HubThemeColors | null | undefined,
): CSSProperties | undefined {
  if (!theme?.accent) return undefined;
  return {
    "--hub-accent": theme.accent,
    "--hub-accent-hover": theme.accent,
    "--hub-on-accent": theme.onAccent,
    "--hub-accent-soft": theme.accentSoft,
    "--hub-accent-line": theme.accentLine,
    "--hub-live": theme.live,
    "--hub-on-live": theme.onLive,
  } as CSSProperties;
}
