"use client";

// Admin -> Mega hubs -> Look and colors (1.1.11). One game's mega hub colors:
// pick a preset, override any color, see the Hub tab update live, save.
// The API resolves every color (derived ones too) and checks readability;
// this screen only edits and previews, so it can never disagree with what the
// app and the website paint. Saved on its own, apart from the profile's Save
// bar, and live in the app on the next card load (no app release).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Flex, Input, Spinner, Text } from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiRotateCcw,
} from "react-icons/fi";
import {
  HUB_THEME_COLOR_KEYS,
  HUB_TILE_KEYS,
  getHubTheme,
  previewHubTheme,
  saveHubTheme,
  type HubThemeAdmin,
  type HubThemeColorKey,
  type HubThemeInput,
  type HubTileKey,
  type ResolvedHubTheme,
} from "@/lib/admin/client-hub-theme";

const C = {
  surface: "#222849",
  raised: "#2a3156",
  line: "rgba(255,255,255,0.08)",
  text: "#EDF2F7",
  muted: "#9AA3BF",
  faint: "#6B7394",
  good: "#7EE2A0",
  bad: "#FF8A80",
  warn: "#FFB86B",
  gold: "#FFD700",
  ink: "#0b0e1d",
};

const COLOR_LABEL: Record<HubThemeColorKey, { name: string; hint: string }> = {
  accent: {
    name: "Accent",
    hint: "Hero edge, main buttons, active tab, pills and labels.",
  },
  accent2: {
    name: "Second accent",
    hint: "Small highlights: new reply counts, badges.",
  },
  background: { name: "Background", hint: "The page behind the Hub tab." },
  surface: { name: "Cards", hint: "Tiles, posts and the hero card." },
  live: { name: "Live", hint: "Live dot and the rooms live tile." },
};

const TILE_LABEL: Record<HubTileKey, string> = {
  rooms: "Rooms live",
  thread: "Launch thread",
  predict: "Predict the score",
  scores: "Critics vs Players",
  shortVersion: "The short version",
  players: "Who's playing",
  guide: "Trending guide",
  news: "In this game: News",
  media: "In this game: Media",
  guides: "In this game: Guides",
};

const EMPTY: HubThemeInput = {
  preset: null,
  accent: null,
  accent2: null,
  background: null,
  surface: null,
  live: null,
  tiles: {},
};

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const same = (a: HubThemeInput, b: HubThemeInput) =>
  JSON.stringify(a) === JSON.stringify(b);

/** One color: swatch picker + hex text + "Auto" (back to derived). */
function ColorRow({
  label,
  hint,
  value,
  resolved,
  error,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string | null | undefined;
  resolved: string;
  error?: string;
  onChange: (v: string | null) => void;
}) {
  const [text, setText] = useState(value ?? "");
  useEffect(() => setText(value ?? ""), [value]);
  const id = useMemo(
    () => `c-${label.replace(/\W+/g, "-").toLowerCase()}`,
    [label],
  );
  const commit = (v: string) => {
    const s = v.trim();
    if (!s) return onChange(null);
    if (HEX_RE.test(s)) onChange(s.toUpperCase());
  };
  return (
    <Flex
      align="center"
      gap={3}
      py={2}
      borderBottom="1px solid"
      borderColor={C.line}
      wrap="wrap"
    >
      <Box flex="1" minW="180px">
        <label
          htmlFor={id}
          style={{ fontSize: 13, fontWeight: 700, color: C.text }}
        >
          {label}
        </label>
        {hint && (
          <Text fontSize="xs" color={C.muted}>
            {hint}
          </Text>
        )}
        {error && (
          <Text fontSize="xs" color={C.bad} mt={1}>
            {error}
          </Text>
        )}
      </Box>
      <input
        type="color"
        aria-label={`${label} color`}
        value={(value ?? resolved).slice(0, 7)}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        style={{
          width: 40,
          height: 36,
          border: `1px solid ${error ? C.bad : C.line}`,
          borderRadius: 8,
          background: "transparent",
          padding: 2,
          cursor: "pointer",
        }}
      />
      <Input
        id={id}
        size="sm"
        w="110px"
        bg={C.raised}
        color={C.text}
        borderColor={error ? C.bad : C.line}
        fontFamily="mono"
        value={text}
        placeholder={resolved}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
        }}
      />
      <Button
        size="xs"
        variant="ghost"
        color={value ? C.text : C.faint}
        disabled={!value}
        onClick={() => onChange(null)}
        title="Use the preset or derived color"
      >
        Auto
      </Button>
    </Flex>
  );
}

/** The Hub tab, painted with the resolved theme (matches the app mockups). */
function Preview({ t, gameName }: { t: ResolvedHubTheme; gameName: string }) {
  const tile = (key: HubTileKey, title: string, big: string, sub: string) => (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.line}`,
        borderRadius: 14,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 96,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.06em",
          color: t.tiles[key],
        }}
      >
        {title}
      </span>
      <span style={{ fontSize: 22, fontWeight: 700, color: t.text }}>
        {big}
      </span>
      <span style={{ fontSize: 11, color: t.muted }}>{sub}</span>
    </div>
  );
  return (
    <div
      aria-label="Preview of the Hub tab"
      style={{
        width: 340,
        background: t.background,
        borderRadius: 28,
        border: "6px solid #05060d",
        padding: "14px 12px 18px",
        color: t.text,
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 13,
          fontWeight: 600,
          borderBottom: `1px solid ${t.line}`,
        }}
      >
        <span
          style={{
            color: t.accent,
            borderBottom: `3px solid ${t.accent}`,
            paddingBottom: 8,
          }}
        >
          Hub
        </span>
        <span style={{ color: t.muted }}>Rooms</span>
        <span style={{ color: t.muted }}>About</span>
        <span style={{ color: t.muted }}>News</span>
      </div>

      <div
        style={{
          background: t.surface,
          border: `1.5px solid ${t.accent}`,
          boxShadow: `0 0 0 4px ${t.glow}`,
          borderRadius: 16,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
          }}
        >
          <span style={{ color: t.accent }}>{gameName.toUpperCase()} HUB</span>
          <span style={{ color: t.live }}>LIVE</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 6,
          }}
        >
          {["06", "17", "42", "08"].map((n, i) => (
            <div
              key={i}
              style={{
                background: t.raised,
                borderRadius: 10,
                padding: "8px 0",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: i === 3 ? t.accent : t.text,
                }}
              >
                {n}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: t.muted }}>
                {["DAYS", "HRS", "MIN", "SEC"][i]}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span
            style={{
              flex: 1,
              background: t.accent,
              color: t.onAccent,
              borderRadius: 10,
              padding: "10px 0",
              textAlign: "center",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            I'm in, day one
          </span>
          <span
            style={{
              border: `1px solid ${t.line}`,
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13,
            }}
          >
            Share
          </span>
        </div>
      </div>

      <div
        style={{
          background: t.liveSoft,
          border: `1.5px solid ${t.tiles.rooms}`,
          borderRadius: 14,
          padding: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: t.tiles.rooms }}>
            12 ROOMS LIVE NOW
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            Launch Night watch party
          </div>
        </div>
        <span
          style={{
            background: t.live,
            color: t.onLive,
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          Join
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {tile("thread", "LAUNCH THREAD", "214", "replies")}
        {tile("predict", "PREDICT", "91", "average")}
        {tile("shortVersion", "SHORT VERSION", "4 min", "By the editor")}
        {tile("players", "WHO'S PLAYING", "3.4K", "players")}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {(["news", "media", "guides"] as HubTileKey[]).map((k) => (
          <div
            key={k}
            style={{
              flex: 1,
              background: t.surface,
              border: `1px solid ${t.line}`,
              borderRadius: 10,
              padding: 8,
              fontSize: 10,
              fontWeight: 800,
              color: t.tiles[k],
            }}
          >
            {k.toUpperCase()} · 9
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <span
          style={{
            background: t.accentSoft,
            border: `1px solid ${t.accent}`,
            color: t.accent,
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Top
        </span>
        <span
          style={{
            border: `1px solid ${t.line}`,
            color: t.muted,
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 12,
          }}
        >
          New
        </span>
        <span
          style={{
            border: `1px solid ${t.line}`,
            color: t.muted,
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 12,
          }}
        >
          Following
        </span>
      </div>
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.line}`,
          borderRadius: 12,
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700 }}>
          @player <span style={{ color: t.muted, fontWeight: 400 }}>· 1h</span>
        </span>
        <span style={{ fontSize: 13 }}>
          Pre-loaded and ready. Who's in tonight?
        </span>
        <span style={{ fontSize: 11, color: t.muted }}>
          48 likes · <b style={{ color: t.accent2 }}>12 new</b>
        </span>
      </div>
    </div>
  );
}

export default function HubThemeEditor({
  gameId,
  gameName,
}: {
  gameId: string;
  gameName: string;
}) {
  const [view, setView] = useState<HubThemeAdmin | null>(null);
  const [saved, setSaved] = useState<HubThemeInput>(EMPTY);
  const [draft, setDraft] = useState<HubThemeInput>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [tilesOpen, setTilesOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const v = await getHubTheme(gameId);
      const input = { ...EMPTY, ...v.input, tiles: v.input.tiles ?? {} };
      setView(v);
      setSaved(input);
      setDraft(input);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live preview: re-resolve the draft on the API (debounced, cancellable).
  useEffect(() => {
    if (loading) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setChecking(true);
    const id = setTimeout(async () => {
      try {
        setView(await previewHubTheme(draft, ctrl.signal));
      } catch (e) {
        if ((e as Error).name !== "AbortError") setErr((e as Error).message);
      } finally {
        if (!ctrl.signal.aborted) setChecking(false);
      }
    }, 250);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [draft, loading]);

  const issues = view?.issues ?? [];
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const fieldError = (f: string) => errors.find((i) => i.field === f)?.message;
  const dirty = !same(draft, saved);

  const setColor = (k: HubThemeColorKey, v: string | null) => {
    setOk(false);
    setDraft((d) => ({ ...d, [k]: v }));
  };
  const setTile = (k: HubTileKey, v: string | null) => {
    setOk(false);
    setDraft((d) => {
      const tiles = { ...d.tiles };
      if (v) tiles[k] = v;
      else delete tiles[k];
      return { ...d, tiles };
    });
  };
  const pickPreset = (id: string) => {
    setOk(false);
    setDraft({ ...EMPTY, preset: id, tiles: {} });
  };

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const v = await saveHubTheme(gameId, draft);
      const input = { ...EMPTY, ...v.input, tiles: v.input.tiles ?? {} };
      setView(v);
      setSaved(input);
      setDraft(input);
      setOk(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <Flex p={6} justify="center">
        <Spinner color={C.gold} />
      </Flex>
    );
  if (!view)
    return (
      <Text color={C.bad} p={4}>
        {err ?? "Could not load the look for this game."}
      </Text>
    );

  const r = view.resolved;

  return (
    <Flex gap={6} align="start" wrap="wrap">
      <Box
        flex="1"
        minW="320px"
        bg={C.surface}
        borderRadius="14px"
        p={5}
        border="1px solid"
        borderColor={C.line}
      >
        <Text fontWeight="700" color={C.text}>
          Look and colors
        </Text>
        <Text fontSize="xs" color={C.muted} mb={4}>
          Start from a preset, then change any color. Anything left on Auto
          comes from the preset or is worked out from the accent. Shows in the
          app the next time the game card opens, no app update needed.
        </Text>

        <Text fontSize="xs" color={C.muted} fontWeight="600" mb={2}>
          Presets
        </Text>
        <Flex gap={2} wrap="wrap" mb={5}>
          {view.presets.map((p) => {
            const on = draft.preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPreset(p.id)}
                aria-pressed={on}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 40,
                  padding: "0 12px 0 8px",
                  borderRadius: 999,
                  border: `1.5px solid ${on ? p.theme.accent : C.line}`,
                  background: on ? C.raised : "transparent",
                  color: C.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    background: p.theme.background,
                    border: `5px solid ${p.theme.accent}`,
                  }}
                />
                {p.name}
              </button>
            );
          })}
        </Flex>

        <Text fontSize="xs" color={C.muted} fontWeight="600">
          Colors
        </Text>
        {HUB_THEME_COLOR_KEYS.map((k) => (
          <ColorRow
            key={k}
            label={COLOR_LABEL[k].name}
            hint={COLOR_LABEL[k].hint}
            value={draft[k]}
            resolved={r[k]}
            error={fieldError(k)}
            onChange={(v) => setColor(k, v)}
          />
        ))}

        <button
          type="button"
          onClick={() => setTilesOpen((o) => !o)}
          aria-expanded={tilesOpen}
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
            minHeight: 40,
            background: "transparent",
            border: "none",
            color: C.text,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {tilesOpen ? <FiChevronDown /> : <FiChevronRight />}
          Tile label colors ({Object.keys(draft.tiles).length} changed)
        </button>
        {tilesOpen &&
          HUB_TILE_KEYS.map((k) => (
            <ColorRow
              key={k}
              label={TILE_LABEL[k]}
              value={draft.tiles[k]}
              resolved={r.tiles[k]}
              error={fieldError(`tiles.${k}`)}
              onChange={(v) => setTile(k, v)}
            />
          ))}

        <Box mt={5}>
          <Text fontSize="xs" color={C.muted} fontWeight="600" mb={2}>
            Readability {checking && <Spinner size="xs" ml={1} />}
          </Text>
          {errors.length === 0 && warnings.length === 0 && (
            <Flex align="center" gap={2} color={C.good} fontSize="sm">
              <FiCheck /> Every text passes 4.5:1 contrast.
            </Flex>
          )}
          {[...errors, ...warnings].map((i, n) => (
            <Flex
              key={n}
              align="start"
              gap={2}
              fontSize="sm"
              color={i.level === "error" ? C.bad : C.warn}
              mb={1}
            >
              <Box pt="3px">
                <FiAlertTriangle />
              </Box>
              <Text>{i.message}</Text>
            </Flex>
          ))}
        </Box>

        {err && (
          <Text color={C.bad} fontSize="sm" mt={3}>
            {err}
          </Text>
        )}

        <Flex gap={2} mt={5} align="center" wrap="wrap">
          <Button
            size="sm"
            bg={C.gold}
            color={C.ink}
            fontWeight="700"
            onClick={save}
            loading={saving}
            disabled={!dirty || errors.length > 0 || checking}
          >
            Save look
          </Button>
          <Button
            size="sm"
            variant="outline"
            borderColor={C.line}
            color={C.text}
            onClick={() => setDraft(saved)}
            disabled={!dirty}
          >
            <FiRotateCcw /> Undo changes
          </Button>
          {ok && !dirty && (
            <Text fontSize="sm" color={C.good}>
              Saved. Live on the next card load.
            </Text>
          )}
          {errors.length > 0 && (
            <Text fontSize="xs" color={C.bad}>
              Fix the red items to save.
            </Text>
          )}
        </Flex>
      </Box>

      <Box position="sticky" top="16px">
        <Text fontSize="xs" color={C.muted} fontWeight="600" mb={2}>
          Preview: Hub tab in the app
        </Text>
        <Preview t={r} gameName={gameName} />
      </Box>
    </Flex>
  );
}
