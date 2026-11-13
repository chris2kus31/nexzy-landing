// src/lib/admin/client-hub-theme.ts
// Admin > Mega hubs > Look and colors. Mirrors nexzy-api
// src/game-profile/hub-theme.ts (shapes only: all color math and the
// readability check live in the API, so the admin preview, the app and the
// website always agree).
"use client";

import { adminRequest } from "@/lib/admin/client";

const enc = encodeURIComponent;

export const HUB_TILE_KEYS = [
  "rooms",
  "thread",
  "predict",
  "scores",
  "shortVersion",
  "players",
  "guide",
  "news",
  "media",
  "guides",
] as const;
export type HubTileKey = (typeof HUB_TILE_KEYS)[number];

export const HUB_THEME_COLOR_KEYS = [
  "accent",
  "accent2",
  "background",
  "surface",
  "live",
] as const;
export type HubThemeColorKey = (typeof HUB_THEME_COLOR_KEYS)[number];

export interface HubThemeInput {
  preset: string | null;
  accent: string | null;
  accent2: string | null;
  background: string | null;
  surface: string | null;
  live: string | null;
  tiles: Partial<Record<HubTileKey, string | null>>;
}

export interface ResolvedHubTheme {
  v: number;
  preset: string | null;
  accent: string;
  onAccent: string;
  accent2: string;
  accentSoft: string;
  accentLine: string;
  glow: string;
  background: string;
  surface: string;
  raised: string;
  line: string;
  text: string;
  muted: string;
  live: string;
  onLive: string;
  liveSoft: string;
  tiles: Record<HubTileKey, string>;
}

export interface HubThemeIssue {
  field: string;
  level: "error" | "warning";
  message: string;
  ratio?: number;
  needs?: number;
}

export interface HubThemePreset {
  id: string;
  name: string;
  theme: {
    accent: string;
    accent2: string;
    background: string;
    surface: string;
    live: string;
    tiles: Partial<Record<HubTileKey, string>>;
  };
}

export interface HubThemeAdmin {
  input: HubThemeInput;
  resolved: ResolvedHubTheme;
  issues: HubThemeIssue[];
  presets: HubThemePreset[];
}

const T = "game-profiles";

export const getHubTheme = (gameId: string) =>
  adminRequest<HubThemeAdmin>(`${T}/${enc(gameId)}/theme`);

export const previewHubTheme = (input: HubThemeInput, signal?: AbortSignal) =>
  adminRequest<HubThemeAdmin>(`${T}/theme/preview`, {
    method: "POST",
    body: input,
    signal,
  });

export const saveHubTheme = (gameId: string, input: HubThemeInput) =>
  adminRequest<HubThemeAdmin>(`${T}/${enc(gameId)}/theme`, {
    method: "PUT",
    body: input,
  });
