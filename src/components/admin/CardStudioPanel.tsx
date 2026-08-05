"use client";

/**
 * Card Studio — Phase 1 + 2A (+ color themes / inset options).
 * Branded Nexzy social cards (News / Review / Deal / Patch Notes / Quote /
 * Coming Soon) for X, Threads, Facebook, Instagram, TikTok.
 *
 * Deterministic (no LLM): the card is styled DOM, exported to PNG client-side
 * via `html-to-image`. A Color theme duotones the source image into a Nexzy
 * palette (keeps detail, guarantees legibility + brand cohesion); a Darken
 * slider fine-tunes; headlines auto-fit so long titles never overflow.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
  type ChangeEvent as RChangeEvent,
} from "react";
import {
  Box,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  Image,
} from "@chakra-ui/react";
import { toPng, toBlob } from "html-to-image";
import { getPublished, type BlogPost } from "@/lib/admin/client";

type TplKey = "news" | "review" | "deal" | "patch" | "quote" | "soon" | "blank";
type FmtKey = "universal" | "square" | "story" | "wide";
type Theme = { accent: string; dark: string; light: string; tint: boolean };
type Shape = "circle" | "square";
type Pos = "BL" | "BR" | "TR" | "ML";
type CutShape = "circle" | "rounded" | "rect";
// Phase 1 free layer (image cutout or text) stacked over the template. Geometry
// is in native card px; rescaled when the format changes.
type Layer = {
  id: string;
  kind: "image" | "text";
  x: number;
  y: number;
  w: number;
  h: number;
  src?: string;
  shape?: CutShape;
  ring?: boolean;
  ringColor?: string;
  shadow?: boolean;
  text?: string;
  size?: number;
  color?: string;
  weight?: number;
  italic?: boolean;
  align?: "left" | "center" | "right";
  upper?: boolean;
  font?: "head" | "label" | "body";
  key?: string;
  bg?: string;
};
// html-to-image drops editor chrome (selection outline + resize handles).
const exportFilter = (node: HTMLElement) =>
  !(node?.dataset && node.dataset.nocapture === "1");

const TEMPLATES: { key: TplKey; label: string; accent: string }[] = [
  { key: "news", label: "News", accent: "#4DA3FF" },
  { key: "review", label: "Review", accent: "#FFD700" },
  { key: "deal", label: "Deal Alert", accent: "#1DB954" },
  { key: "patch", label: "Patch Notes", accent: "#007BFF" },
  { key: "quote", label: "Quote", accent: "#FFD700" },
  { key: "soon", label: "Coming Soon", accent: "#b56bff" },
  { key: "blank", label: "Blank", accent: "#4DA3FF" },
];

const FORMATS: Record<FmtKey, { label: string; w: number; h: number }> = {
  universal: { label: "Universal · 4:5", w: 1080, h: 1350 },
  square: { label: "Square 1:1", w: 1080, h: 1080 },
  story: { label: "Story 9:16", w: 1080, h: 1920 },
  wide: { label: "Wide 16:9", w: 1200, h: 675 },
};

const THEMES: { key: string; label: string; sw: string; theme: Theme }[] = [
  {
    key: "original",
    label: "Original",
    sw: "linear-gradient(135deg,#4DA3FF,#FFD700)",
    theme: { accent: "#4DA3FF", dark: "", light: "", tint: false },
  },
  {
    key: "blue",
    label: "Blue",
    sw: "#4DA3FF",
    theme: { accent: "#4DA3FF", dark: "#06132e", light: "#4DA3FF", tint: true },
  },
  {
    key: "gold",
    label: "Gold",
    sw: "#FFD100",
    theme: { accent: "#FFD100", dark: "#241900", light: "#FFD100", tint: true },
  },
  {
    key: "green",
    label: "Green",
    sw: "#3ad07a",
    theme: { accent: "#3ad07a", dark: "#04160b", light: "#3ad07a", tint: true },
  },
  {
    key: "purple",
    label: "Purple",
    sw: "#b56bff",
    theme: { accent: "#b56bff", dark: "#160a2e", light: "#b56bff", tint: true },
  },
];

const NAVY = "#12162b";
const CREAM = "#F5EFE0";

const FIELD = {
  color: "whiteAlpha.900",
  bg: "whiteAlpha.100",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  _hover: { borderColor: "whiteAlpha.400" },
  _focus: { borderColor: "#4DA3FF", boxShadow: "0 0 0 1px #4DA3FF" },
} as const;

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function hl(s: string, accent: string): string {
  return esc(s).replace(
    /\[\[(.+?)\]\]/g,
    `<span style="${st({ color: accent })}">$1</span>`,
  );
}

type Data = Record<string, string>;

function st(o: Record<string, string | number>): string {
  return Object.entries(o)
    .map(
      ([key, val]) =>
        `${key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${val}`,
    )
    .join(";");
}

function cardHtml(
  tpl: TplKey,
  w: number,
  h: number,
  d: Data,
  imgA: string,
  imgB: string,
  t: Theme,
  darken: number,
  shape: Shape,
  pos: Pos,
  frame: { x: number; y: number; zoom: number; header: number },
  hideBuiltins: boolean,
): string {
  const k = w / 1080;
  const HEAD = "var(--font-chakra-petch), var(--font-inter), sans-serif";
  const LABEL = "var(--font-space-grotesk), var(--font-inter), sans-serif";
  const BODY = "var(--font-inter), system-ui, sans-serif";
  const pad = Math.round(60 * k);
  const accent = t.accent;
  const fit = (s: string, base: number, min: number, per: number) =>
    Math.round(Math.max(min, base - (s || "").length * per) * k);
  const scale = Math.max(1, frame.zoom / 100);
  const maxOff = (1 - 1 / scale) * 50;
  const tx = ((50 - frame.x) / 50) * maxOff;
  const ty = ((50 - frame.y) / 50) * maxOff;

  const imgTag = (filter: string, blend: string, opacity: string) =>
    imgA
      ? `<img src="${imgA}" alt="" style="${st({ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transformOrigin: "center", transform: `scale(${scale}) translate(${tx}%, ${ty}%)`, filter, mixBlendMode: blend, opacity })}"/>`
      : `<div style="${st({ position: "absolute", inset: 0, background: "#1b2140" })}"></div>`;

  const shell = t.tint
    ? `<div style="${st({ position: "absolute", inset: 0, background: t.dark })}"></div>
    ${imgTag("grayscale(1) contrast(1.2) brightness(1.05)", "screen", "1")}
    <div style="${st({ position: "absolute", inset: 0, background: t.light, mixBlendMode: "multiply" })}"></div>
    ${imgTag("grayscale(1) contrast(1.1)", "soft-light", ".35")}
    <div style="${st({ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(4,6,12,.35),transparent 32%,rgba(4,6,12,.9))" })}"></div>
    <div style="${st({ position: "absolute", inset: 0, background: `rgba(6,8,16,${darken})` })}"></div>`
    : `${imgTag("none", "normal", "1")}
    <div style="${st({ position: "absolute", inset: 0, mixBlendMode: "screen", background: "radial-gradient(circle at 80% 12%,rgba(77,163,255,.32),rgba(18,22,43,0) 46%),radial-gradient(circle at 6% 98%,rgba(255,183,77,.2),rgba(18,22,43,0) 46%)" })}"></div>
    <div style="${st({ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(18,22,43,.78),rgba(18,22,43,.1) 32%,rgba(18,22,43,.12) 58%,rgba(18,22,43,.84))" })}"></div>
    <div style="${st({ position: "absolute", inset: 0, background: `rgba(10,13,24,${darken})` })}"></div>`;

  const chip = (text: string) =>
    `<span style="${st({ fontFamily: LABEL, fontWeight: 700, fontSize: `${28 * k}px`, letterSpacing: `${4 * k}px`, padding: `${9 * k}px ${20 * k}px`, borderRadius: `${10 * k}px`, background: accent, color: "#0a1020" })}">${esc(text)}</span>`;

  const mark = `<img src="/NexzyLogo.png" alt="" style="${st({ position: "absolute", bottom: `${36 * k}px`, right: `${44 * k}px`, height: `${58 * k}px`, filter: "drop-shadow(0 3px 10px rgba(0,0,0,.6))" })}"/>`;

  let inner: string;

  if (tpl === "blank" || hideBuiltins) {
    inner = "";
  } else if (tpl === "news") {
    const size = (shape === "square" ? 360 : 340) * k;
    const rad = shape === "square" ? `${28 * k}px` : "50%";
    let where: Record<string, string> = {
      left: `${pad}px`,
      bottom: `${150 * k}px`,
    };
    if (pos === "BR") where = { right: `${pad}px`, bottom: `${150 * k}px` };
    else if (pos === "TR") where = { right: `${pad}px`, top: `${h * 0.42}px` };
    else if (pos === "ML") where = { left: `${pad}px`, top: `${h * 0.42}px` };
    const circle = imgB
      ? `<div style="${st({ position: "absolute", ...where, width: `${size}px`, height: `${size}px`, borderRadius: rad, border: `${6 * k}px solid ${accent}`, background: `#0b1020 url('${imgB}') center/cover`, boxShadow: `0 ${14 * k}px ${44 * k}px rgba(0,0,0,.55)` })}"></div>`
      : "";
    inner = `<div style="${st({ position: "absolute", top: `${66 * k}px`, left: `${pad}px`, right: `${pad}px` })}">${chip(d.kicker || "NEWS")}<span style="${st({ color: accent, fontSize: `${34 * k}px`, position: "relative", top: `${2 * k}px`, left: `${8 * k}px` })}">✦</span>
        <div style="${st({ fontFamily: HEAD, fontWeight: 700, color: CREAM, fontSize: `${fit(d.headline, 80, 46, 0.55)}px`, lineHeight: 1.02, textTransform: "uppercase", marginTop: `${22 * k}px`, textShadow: "0 3px 16px rgba(0,0,0,.5)" })}">${hl(d.headline || "", accent)}</div>
        <div style="${st({ fontFamily: BODY, color: "#c9d4e5", fontSize: `${24 * k}px`, letterSpacing: `${2 * k}px`, marginTop: `${16 * k}px`, textTransform: "uppercase" })}">${esc(d.source || "")}</div>
      </div>${circle}`;
  } else if (tpl === "review") {
    inner = `<div style="${st({ position: "absolute", top: `${64 * k}px`, left: `${pad}px` })}">${chip(d.kicker || "REVIEW")}</div>
      <div style="${st({ position: "absolute", left: `${pad}px`, bottom: `${180 * k}px`, fontFamily: HEAD, fontWeight: 700, color: CREAM, fontSize: `${fit(d.title, 74, 40, 0.9)}px`, lineHeight: 0.98, textTransform: "uppercase", maxWidth: `${600 * k}px` })}">${esc(d.title || "")}</div>
      <div style="${st({ position: "absolute", left: `${pad}px`, bottom: `${125 * k}px`, fontFamily: BODY, color: "#c9d4e5", fontSize: `${26 * k}px`, letterSpacing: `${2 * k}px`, textTransform: "uppercase" })}">${esc(d.cta || "Read the full review →")}</div>
      <div style="${st({ position: "absolute", right: `${56 * k}px`, bottom: `${150 * k}px`, width: `${270 * k}px`, height: `${270 * k}px`, borderRadius: "50%", background: "rgba(6,8,16,.6)", border: `${6 * k}px solid ${accent}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 ${12 * k}px ${40 * k}px rgba(0,0,0,.5)` })}">
        <div style="${st({ fontFamily: HEAD, fontWeight: 700, color: accent, fontSize: `${150 * k}px`, lineHeight: 0.8 })}">${esc(d.score || "8")}</div>
        <div style="${st({ fontFamily: HEAD, fontWeight: 700, color: "#fff", fontSize: `${38 * k}px` })}">/ ${esc(d.outof || "10")}</div>
      </div>`;
  } else if (tpl === "deal") {
    inner = `<div style="${st({ position: "absolute", top: `${150 * k}px`, right: `${56 * k}px`, transform: "rotate(6deg)", background: accent, color: "#0a1020", fontFamily: HEAD, fontWeight: 700, fontSize: `${84 * k}px`, padding: `${6 * k}px ${24 * k}px`, borderRadius: `${16 * k}px`, boxShadow: `0 ${12 * k}px ${34 * k}px rgba(0,0,0,.4)` })}">${esc(d.pct || "-67%")}</div>
      <div style="${st({ position: "absolute", top: `${64 * k}px`, left: `${pad}px` })}">${chip(d.kicker || "DEAL ALERT")}</div>
      <div style="${st({ position: "absolute", left: `${pad}px`, bottom: `${290 * k}px`, fontFamily: HEAD, fontWeight: 700, color: CREAM, fontSize: `${fit(d.title, 78, 42, 0.8)}px`, textTransform: "uppercase" })}">${esc(d.title || "")}</div>
      <div style="${st({ position: "absolute", left: `${pad}px`, bottom: `${215 * k}px`, fontFamily: HEAD, fontSize: `${60 * k}px`, color: "#fff" })}"><span style="${st({ textDecoration: "line-through", color: "#8b98b5", fontSize: `${44 * k}px` })}">${esc(d.oldPrice || "")}</span> &nbsp;<b style="${st({ color: accent })}">${esc(d.newPrice || "")}</b></div>
      <div style="${st({ position: "absolute", left: `${pad}px`, bottom: `${125 * k}px` })}"><span style="${st({ fontFamily: LABEL, fontWeight: 700, fontSize: `${26 * k}px`, letterSpacing: `${2 * k}px`, padding: `${12 * k}px ${24 * k}px`, borderRadius: `${12 * k}px`, background: accent, color: "#0a1020" })}">⚡ ${esc(d.cta || "Grab the deal →")}</span></div>`;
  } else if (tpl === "patch") {
    const notes = (d.notes || "")
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, 8);
    const list = notes
      .map(
        (n) =>
          `<div style="${st({ display: "flex", gap: `${20 * k}px`, marginBottom: `${26 * k}px`, alignItems: "flex-start" })}"><div style="${st({ flex: `0 0 ${16 * k}px`, width: `${16 * k}px`, height: `${16 * k}px`, background: accent, transform: "rotate(45deg)", marginTop: `${12 * k}px` })}"></div><div style="${st({ fontFamily: BODY, color: "#eaf1fb", fontSize: `${34 * k}px`, lineHeight: 1.35 })}">${esc(n)}</div></div>`,
      )
      .join("");
    inner = `<div style="${st({ position: "absolute", left: 0, right: 0, top: `${frame.header}%`, bottom: 0, background: `linear-gradient(180deg,transparent,${NAVY} 12%,${NAVY})` })}"></div>
      <div style="${st({ position: "absolute", top: `${56 * k}px`, left: `${pad}px` })}">${chip(d.kicker || "PATCH NOTES")}</div>
      <div style="${st({ position: "absolute", top: `${frame.header + 4}%`, left: `${pad}px`, right: `${pad}px`, fontFamily: HEAD, fontWeight: 700, color: CREAM, fontSize: `${fit(d.title, 64, 40, 0.5)}px`, textTransform: "uppercase", lineHeight: 1.02 })}">${esc(d.title || "")} <span style="${st({ color: accent })}">· ${esc(d.version || "v1.0")}</span></div>
      <div style="${st({ position: "absolute", top: `${frame.header + 20}%`, left: `${pad}px`, right: `${pad}px` })}">${list}</div>
      <div style="${st({ position: "absolute", left: `${pad}px`, bottom: `${70 * k}px`, fontFamily: LABEL, fontWeight: 700, color: accent, fontSize: `${30 * k}px`, letterSpacing: `${2 * k}px` })}">${esc(d.cta || "+ Read the full patch notes on Nexzy →")}</div>`;
  } else if (tpl === "quote") {
    inner = `<div style="${st({ position: "absolute", left: `${pad}px`, top: `${140 * k}px`, fontFamily: HEAD, fontWeight: 700, fontSize: `${300 * k}px`, color: accent, opacity: 0.9, lineHeight: 0.6 })}">“</div>
      <div style="${st({ position: "absolute", top: `${120 * k}px`, right: `${56 * k}px`, transform: "rotate(-4deg)", background: "#0a0d18", border: `${3 * k}px solid ${accent}`, padding: `${8 * k}px ${20 * k}px` })}"><span style="${st({ fontFamily: LABEL, fontWeight: 700, fontSize: `${28 * k}px`, letterSpacing: `${6 * k}px`, color: accent })}">${esc(d.kicker || "HOT TAKE")}</span></div>
      <div style="${st({ position: "absolute", left: `${pad}px`, right: `${70 * k}px`, top: `${360 * k}px`, fontFamily: HEAD, fontWeight: 700, color: "#fff", fontSize: `${fit(d.quote, 92, 44, 0.55)}px`, lineHeight: 1.04 })}">${hl(d.quote || "", accent)}</div>
      <div style="${st({ position: "absolute", left: `${pad}px`, bottom: `${150 * k}px`, display: "flex", alignItems: "center", gap: `${26 * k}px` })}">
        ${imgB ? `<div style="${st({ width: `${130 * k}px`, height: `${130 * k}px`, borderRadius: "50%", border: `${4 * k}px solid ${accent}`, background: `#1b2140 url('${imgB}') center/cover` })}"></div>` : ""}
        <div><div style="${st({ fontFamily: HEAD, fontWeight: 700, color: accent, fontSize: `${44 * k}px`, textTransform: "uppercase" })}">${esc(d.attr || "")}</div><div style="${st({ fontFamily: BODY, color: "#c9d4e5", fontSize: `${24 * k}px`, letterSpacing: `${2 * k}px`, textTransform: "uppercase" })}">${esc(d.source || "")}</div></div>
      </div>`;
  } else {
    inner = `<div style="${st({ position: "absolute", top: `${64 * k}px`, left: `${pad}px` })}">${chip(d.kicker || "COMING SOON")}</div>
      <div style="${st({ position: "absolute", left: `${pad}px`, right: `${pad}px`, bottom: `${300 * k}px`, fontFamily: HEAD, fontWeight: 700, color: CREAM, fontSize: `${fit(d.title, 76, 42, 0.8)}px`, textTransform: "uppercase", lineHeight: 1 })}">${esc(d.title || "")}</div>
      <div style="${st({ position: "absolute", left: `${pad}px`, bottom: `${215 * k}px`, fontFamily: HEAD, fontWeight: 700, color: "#fff", fontSize: `${64 * k}px` })}">📅 ${esc(d.date || "")}</div>
      <div style="${st({ position: "absolute", left: `${pad}px`, bottom: `${125 * k}px` })}"><span style="${st({ fontFamily: LABEL, fontWeight: 700, fontSize: `${26 * k}px`, letterSpacing: `${2 * k}px`, padding: `${12 * k}px ${24 * k}px`, borderRadius: `${12 * k}px`, background: accent, color: "#0a1020" })}">${esc(d.cta || "Wishlist it now →")}</span></div>`;
  }

  return `<div style="${st({ position: "relative", width: `${w}px`, height: `${h}px`, overflow: "hidden", background: NAVY, fontFamily: BODY })}">${shell}${inner}${mark}</div>`;
}

const DEFAULTS: Record<TplKey, Data> = {
  blank: {},
  news: {
    kicker: "NEWS",
    headline: "Dave Bautista in talks to play [[Kratos]]",
    source: "Via: Variety",
  },
  review: {
    kicker: "REVIEW",
    title: "Beast of Reincarnation",
    score: "6",
    outof: "10",
    cta: "Read the full review →",
  },
  deal: {
    kicker: "DEAL ALERT",
    title: "It Takes Two",
    oldPrice: "$39.99",
    newPrice: "$13.19",
    pct: "-67%",
    cta: "Grab the deal →",
  },
  patch: {
    kicker: "PATCH NOTES",
    title: "Bellwright",
    version: "v1.17",
    notes:
      "Fixed storage UIs showing as Wagon Cargo at wagon workshops\nImproved regional wagon pathing & load times\nRebalanced early-game gathering rates\nVarious crash fixes on Xbox & PlayStation",
    cta: "+ Read the full patch notes on Nexzy →",
  },
  quote: {
    kicker: "HOT TAKE",
    quote: "The game is just [[so good]] it hurts.",
    attr: "Tom Holland",
    source: "Via: Happy Sad Confused",
  },
  soon: {
    kicker: "COMING SOON",
    title: "Hollow Knight: Silksong",
    date: "Sept 4, 2026",
    cta: "Wishlist it now →",
  },
};

const FIELDS: Record<TplKey, { key: string; label: string; area?: boolean }[]> =
  {
    blank: [],
    news: [
      { key: "kicker", label: "Label" },
      {
        key: "headline",
        label: "Headline (wrap accent word in [[ ]])",
        area: true,
      },
      { key: "source", label: "Source line" },
    ],
    review: [
      { key: "title", label: "Game title", area: true },
      { key: "score", label: "Score" },
      { key: "outof", label: "Out of" },
      { key: "cta", label: "CTA" },
    ],
    deal: [
      { key: "title", label: "Game title" },
      { key: "pct", label: "Discount badge" },
      { key: "oldPrice", label: "Old price" },
      { key: "newPrice", label: "New price" },
      { key: "cta", label: "CTA" },
    ],
    patch: [
      { key: "title", label: "Game" },
      { key: "version", label: "Version" },
      { key: "notes", label: "Notes (one per line)", area: true },
      { key: "cta", label: "Footer CTA" },
    ],
    quote: [
      { key: "kicker", label: "Label" },
      { key: "quote", label: "Quote (wrap accent word in [[ ]])", area: true },
      { key: "attr", label: "Attribution" },
      { key: "source", label: "Source line" },
    ],
    soon: [
      { key: "title", label: "Game title" },
      { key: "date", label: "Release date" },
      { key: "cta", label: "CTA" },
    ],
  };

const MAIN: Record<TplKey, string> = {
  blank: "",
  news: "headline",
  review: "title",
  deal: "title",
  patch: "title",
  quote: "quote",
  soon: "title",
};

function ImageDrop({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const read = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onChange(String(r.result));
    r.readAsDataURL(f);
  };
  return (
    <Box>
      <Text fontSize="xs" color="gray.400" mb={1}>
        {label}
      </Text>
      <Box
        onClick={() => ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          read(e.dataTransfer.files?.[0]);
        }}
        cursor="pointer"
        borderWidth="1.5px"
        borderStyle="dashed"
        borderColor={over ? "#4DA3FF" : "whiteAlpha.300"}
        bg={over ? "whiteAlpha.100" : "whiteAlpha.50"}
        borderRadius="lg"
        p={3}
        transition="all .12s"
      >
        {value ? (
          <HStack gap={3}>
            <Image
              src={value}
              alt=""
              boxSize="52px"
              objectFit="cover"
              borderRadius="md"
            />
            <Text fontSize="sm" color="whiteAlpha.800" flex="1">
              Image added
            </Text>
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            >
              Remove
            </Button>
          </HStack>
        ) : (
          <Text fontSize="sm" color="whiteAlpha.600" textAlign="center">
            Click or drop an image here
          </Text>
        )}
      </Box>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => read(e.target.files?.[0])}
      />
    </Box>
  );
}

const POSN: { key: Pos; label: string }[] = [
  { key: "BL", label: "Btm-L" },
  { key: "BR", label: "Btm-R" },
  { key: "TR", label: "Top-R" },
  { key: "ML", label: "Mid-L" },
];

function stripAcc(s?: string): string {
  return (s || "").replace(/\[\[(.+?)\]\]/g, "$1");
}
// Phase 2: turn a template's built-in text into editable/draggable layers, so
// the whole card is editable using the same layer engine. Structured extras
// (score bubble, deal badge) become plain text layers you can restyle.
function templateTextLayers(
  tpl: TplKey,
  d: Data,
  F: { w: number; h: number },
  accent: string,
): Layer[] {
  const k = F.w / 1080;
  const pad = Math.round(60 * k);
  const W = F.w - pad * 2;
  type Row = {
    text: string;
    base: number;
    color: string;
    font: "head" | "label" | "body";
    upper?: boolean;
  };
  const L = (text: string): Row => ({
    text,
    base: 28,
    color: accent,
    font: "label",
    upper: true,
  });
  const rowsByTpl: Record<string, Row[]> = {
    news: [
      L(d.kicker || "NEWS"),
      {
        text: stripAcc(d.headline),
        base: 74,
        color: "#F5EFE0",
        font: "head",
        upper: true,
      },
      {
        text: d.source || "",
        base: 24,
        color: "#c9d4e5",
        font: "body",
        upper: true,
      },
    ],
    review: [
      L(d.kicker || "REVIEW"),
      {
        text: d.title || "",
        base: 70,
        color: "#F5EFE0",
        font: "head",
        upper: true,
      },
      {
        text: `${d.score || "8"} / ${d.outof || "10"}`,
        base: 90,
        color: accent,
        font: "head",
      },
      {
        text: d.cta || "",
        base: 26,
        color: "#c9d4e5",
        font: "body",
        upper: true,
      },
    ],
    deal: [
      L(d.kicker || "DEAL ALERT"),
      {
        text: d.title || "",
        base: 72,
        color: "#F5EFE0",
        font: "head",
        upper: true,
      },
      {
        text: `${d.oldPrice || ""}   ${d.newPrice || ""}`.trim(),
        base: 56,
        color: "#ffffff",
        font: "head",
      },
      { text: d.pct || "", base: 80, color: accent, font: "head" },
      {
        text: d.cta || "",
        base: 26,
        color: "#c9d4e5",
        font: "body",
        upper: true,
      },
    ],
    patch: [
      L(d.kicker || "PATCH NOTES"),
      {
        text: `${d.title || ""} ${d.version || ""}`.trim(),
        base: 60,
        color: "#F5EFE0",
        font: "head",
        upper: true,
      },
      { text: d.notes || "", base: 32, color: "#eaf1fb", font: "body" },
      { text: d.cta || "", base: 28, color: accent, font: "label" },
    ],
    quote: [
      L(d.kicker || "HOT TAKE"),
      { text: stripAcc(d.quote), base: 80, color: "#ffffff", font: "head" },
      {
        text: d.attr || "",
        base: 44,
        color: accent,
        font: "head",
        upper: true,
      },
      {
        text: d.source || "",
        base: 24,
        color: "#c9d4e5",
        font: "body",
        upper: true,
      },
    ],
    soon: [
      L(d.kicker || "COMING SOON"),
      {
        text: d.title || "",
        base: 72,
        color: "#F5EFE0",
        font: "head",
        upper: true,
      },
      { text: d.date || "", base: 60, color: "#ffffff", font: "head" },
      {
        text: d.cta || "",
        base: 26,
        color: "#c9d4e5",
        font: "body",
        upper: true,
      },
    ],
  };
  const startY: Record<string, number> = {
    news: 0.09,
    review: 0.44,
    deal: 0.4,
    patch: 0.12,
    quote: 0.28,
    soon: 0.44,
  };
  const keysByTpl: Record<string, (string | undefined)[]> = {
    news: ["kicker", "headline", "source"],
    review: ["kicker", "title", undefined, "cta"],
    deal: ["kicker", "title", undefined, "pct", "cta"],
    patch: ["kicker", undefined, "notes", "cta"],
    quote: ["kicker", "quote", "attr", "source"],
    soon: ["kicker", "title", "date", "cta"],
  };
  const keys = keysByTpl[tpl] || [];
  const rows = (rowsByTpl[tpl] || [])
    .map((r, i) => ({ ...r, key: keys[i], badge: i === 0 }))
    .filter((r) => r.text && r.text.trim());
  let y = Math.round(F.h * (startY[tpl] ?? 0.2));
  const out: Layer[] = [];
  rows.forEach((r, i) => {
    const size = Math.round(r.base * k);
    out.push({
      id: `tl${Date.now()}${i}${Math.round(Math.random() * 1000)}`,
      kind: "text",
      x: pad,
      y,
      w: W,
      h: size,
      text: r.text,
      size,
      color: r.badge ? "#0a1020" : r.color,
      key: r.key,
      bg: r.badge ? accent : undefined,
      weight: 700,
      italic: false,
      align: "left",
      upper: !!r.upper,
      font: r.font,
    });
    y += Math.round(size * 1.5) + Math.round(16 * k);
  });
  return out;
}

export default function CardStudioPanel({
  isOwner: _isOwner,
}: {
  isOwner: boolean;
}) {
  const [tpl, setTpl] = useState<TplKey>("news");
  const [fmt, setFmt] = useState<FmtKey>("universal");
  const [themeKey, setThemeKey] = useState("original");
  const [shape, setShape] = useState<Shape>("circle");
  const [pos, setPos] = useState<Pos>("BL");
  const [darken, setDarken] = useState(0.4);
  const [imgX, setImgX] = useState(50);
  const [imgY, setImgY] = useState(50);
  const [imgZoom, setImgZoom] = useState(100);
  const [headerPct, setHeaderPct] = useState(38);
  const [data, setData] = useState<Record<TplKey, Data>>(DEFAULTS);
  const [imgA, setImgA] = useState<string>("");
  const [imgB, setImgB] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [q, setQ] = useState("");
  const [panelTab, setPanelTab] = useState<
    "content" | "design" | "image" | "layers"
  >("content");
  const cardRef = useRef<HTMLDivElement>(null);

  // ---- Phase 1: free layers (image cutouts + text) over the template ----
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [hideBuiltins, setHideBuiltins] = useState(true);
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const fullBleedRef = useRef(false);
  const layerFileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<null | {
    mode: "move" | "resize" | "bgpan";
    id: string;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
    osize: number;
  }>(null);
  const prevF = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const newLayerId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `l${Date.now()}${Math.round(Math.abs(performance.now()))}`;
  const updLayer = (id: string, patch: Partial<Layer>) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const delLayer = (id: string) => {
    setLayers((ls) => ls.filter((l) => l.id !== id));
    setSelId((cur) => (cur === id ? null : cur));
  };
  const raise = (id: string) =>
    setLayers((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      if (i < 0 || i === ls.length - 1) return ls;
      const c = ls.slice();
      const [it] = c.splice(i, 1);
      c.push(it);
      return c;
    });

  useEffect(() => {
    getPublished()
      .then(setPosts)
      .catch(() => {});
  }, []);

  const F = FORMATS[fmt];
  const d = data[tpl];
  const html = useMemo(() => {
    const def = THEMES.find((x) => x.key === themeKey)!.theme;
    const per = TEMPLATES.find((x) => x.key === tpl)!.accent;
    const theme: Theme = def.tint
      ? def
      : { accent: per, dark: "", light: "", tint: false };
    return cardHtml(
      tpl,
      F.w,
      F.h,
      d,
      imgA,
      imgB,
      theme,
      darken,
      shape,
      pos,
      {
        x: imgX,
        y: imgY,
        zoom: imgZoom,
        header: headerPct,
      },
      hideBuiltins,
    );
  }, [
    tpl,
    F.w,
    F.h,
    d,
    imgA,
    imgB,
    themeKey,
    darken,
    shape,
    pos,
    imgX,
    imgY,
    imgZoom,
    headerPct,
    hideBuiltins,
  ]);
  const scale = Math.min(480 / F.w, 640 / F.h);

  // rescale layers when the card format changes (keeps them where they were)
  useEffect(() => {
    const p = prevF.current;
    if (p.w && (p.w !== F.w || p.h !== F.h)) {
      const rx = F.w / p.w;
      const ry = F.h / p.h;
      setLayers((ls) =>
        ls.map((l) => ({
          ...l,
          x: l.x * rx,
          y: l.y * ry,
          w: l.w * rx,
          h: l.h * ry,
          size: l.size ? l.size * ry : l.size,
        })),
      );
    }
    prevF.current = { w: F.w, h: F.h };
  }, [F.w, F.h]);

  // Templates ARE editable layers: picking one seeds the canvas with its
  // elements as fully draggable / resizable / recolorable layers (no convert
  // step). Blank = empty canvas. Re-seeds only when the template changes, so
  // your edits persist until you switch templates.
  useEffect(() => {
    if (tpl === "blank") {
      setLayers([]);
      setSelId(null);
      return;
    }
    const def = THEMES.find((x) => x.key === themeKey)!.theme;
    const per = TEMPLATES.find((x) => x.key === tpl)!.accent;
    const acc = def.tint ? def.accent : per;
    setLayers(templateTextLayers(tpl, data[tpl], F, acc));
    setSelId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tpl]);

  const addImageLayer = () => layerFileRef.current?.click();
  const addFullBleedPhoto = () => {
    fullBleedRef.current = true;
    layerFileRef.current?.click();
  };
  // Add an image directly as a full-bleed, movable/resizable layer (base of the
  // stack, so text sits on top). Used by uploads + "start from article".
  const addPhotoLayer = (src: string) => {
    if (!src) return;
    const id = newLayerId();
    setLayers((ls) => [
      {
        id,
        kind: "image",
        x: 0,
        y: 0,
        w: F.w,
        h: F.h,
        src,
        shape: "rect",
        ring: false,
        shadow: false,
      },
      ...ls,
    ]);
    setSelId(id);
    setPanelTab("layers");
  };
  const onLayerFile = (e: RChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fullBleed = fullBleedRef.current;
    fullBleedRef.current = false;
    const r = new FileReader();
    r.onload = () => {
      const src = String(r.result || "");
      const id = newLayerId();
      const layer: Layer = fullBleed
        ? {
            id,
            kind: "image",
            x: 0,
            y: 0,
            w: F.w,
            h: F.h,
            src,
            shape: "rect",
            ring: false,
            shadow: false,
          }
        : {
            id,
            kind: "image",
            x: Math.round(F.w * 0.36),
            y: Math.round(F.h * 0.36),
            w: Math.round(F.w * 0.28),
            h: Math.round(F.w * 0.28),
            src,
            shape: "circle",
            ring: true,
            ringColor: "#4DA3FF",
            shadow: true,
          };
      // full-bleed photo goes to the BOTTOM (base); cutouts stack on top
      setLayers((ls) => (fullBleed ? [layer, ...ls] : [...ls, layer]));
      setSelId(id);
      setPanelTab("layers");
    };
    r.readAsDataURL(file);
  };
  const addTextLayer = () => {
    const id = newLayerId();
    const size = Math.round(F.h * 0.06);
    setLayers((ls) => [
      ...ls,
      {
        id,
        kind: "text",
        x: Math.round(F.w * 0.1),
        y: Math.round(F.h * 0.44),
        w: Math.round(F.w * 0.8),
        h: size,
        text: "Your text",
        size,
        color: "#F5EFE0",
        weight: 700,
        italic: false,
        align: "left",
        upper: true,
        font: "head",
      },
    ]);
    setSelId(id);
  };
  const nativeXY = (clientX: number, clientY: number) => {
    const rect = cardRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  };
  const startMove = (e: RPointerEvent, id: string) => {
    e.stopPropagation();
    const l = layers.find((x) => x.id === id);
    if (!l) return;
    setSelId(id);
    const { x, y } = nativeXY(e.clientX, e.clientY);
    dragRef.current = {
      mode: "move",
      id,
      sx: x,
      sy: y,
      ox: l.x,
      oy: l.y,
      ow: l.w,
      oh: l.h,
      osize: l.size || 0,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const startResize = (e: RPointerEvent, id: string) => {
    e.stopPropagation();
    const l = layers.find((x) => x.id === id);
    if (!l) return;
    setSelId(id);
    const { x, y } = nativeXY(e.clientX, e.clientY);
    dragRef.current = {
      mode: "resize",
      id,
      sx: x,
      sy: y,
      ox: l.x,
      oy: l.y,
      ow: l.w,
      oh: l.h,
      osize: l.size || 0,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onCanvasMove = (e: RPointerEvent) => {
    const dr = dragRef.current;
    if (!dr) return;
    const { x, y } = nativeXY(e.clientX, e.clientY);
    const dx = x - dr.sx;
    const dy = y - dr.sy;
    if (dr.mode === "bgpan") {
      // drag the background image directly (only pans when zoomed in)
      setImgX(Math.min(100, Math.max(0, dr.ox - (dx / F.w) * 100)));
      setImgY(Math.min(100, Math.max(0, dr.oy - (dy / F.h) * 100)));
      return;
    }
    if (dr.mode === "move") {
      const lay = layers.find((z) => z.id === dr.id);
      let nx = dr.ox + dx;
      let ny = dr.oy + dy;
      const lw = lay ? lay.w : 0;
      const lh = lay
        ? lay.kind === "image"
          ? lay.h
          : (lay.size || 24) * 1.2
        : 0;
      const th = Math.max(8, F.w * 0.008);
      const pad = Math.round(60 * (F.w / 1080));
      const tX = [0, pad, F.w / 2, F.w - pad, F.w];
      const tY = [0, pad, F.h / 2, F.h - pad, F.h];
      let gx: number | undefined;
      let gy: number | undefined;
      const ax = [nx, nx + lw / 2, nx + lw];
      for (const t of tX) {
        for (let i = 0; i < ax.length; i++) {
          if (Math.abs(ax[i] - t) <= th) {
            nx += t - ax[i];
            gx = t;
            break;
          }
        }
        if (gx !== undefined) break;
      }
      const ay = [ny, ny + lh / 2, ny + lh];
      for (const t of tY) {
        for (let i = 0; i < ay.length; i++) {
          if (Math.abs(ay[i] - t) <= th) {
            ny += t - ay[i];
            gy = t;
            break;
          }
        }
        if (gy !== undefined) break;
      }
      setGuides({ x: gx, y: gy });
      updLayer(dr.id, { x: nx, y: ny });
      return;
    }
    const l = layers.find((z) => z.id === dr.id);
    if (!l) return;
    if (l.kind === "image") {
      let nw = Math.max(40, dr.ow + dx);
      let nh = Math.max(40, dr.oh + dy);
      if (l.shape !== "rect") {
        const sq = Math.max(nw, nh);
        nw = sq;
        nh = sq;
      }
      updLayer(dr.id, { w: nw, h: nh });
    } else {
      const ratio = Math.max(0.2, (dr.ow + dx) / Math.max(1, dr.ow));
      updLayer(dr.id, {
        w: Math.max(60, dr.ow + dx),
        size: Math.max(12, Math.round(dr.osize * ratio)),
      });
    }
  };
  const onCanvasUp = () => {
    dragRef.current = null;
    setGuides({});
  };
  const onBgDown = (e: RPointerEvent) => {
    setSelId(null);
    if (!imgA) return;
    const { x, y } = nativeXY(e.clientX, e.clientY);
    dragRef.current = {
      mode: "bgpan",
      id: "",
      sx: x,
      sy: y,
      ox: imgX,
      oy: imgY,
      ow: 0,
      oh: 0,
      osize: 0,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const selLayer = layers.find((l) => l.id === selId) || null;

  function set(key: string, value: string) {
    setData((prev) => ({ ...prev, [tpl]: { ...prev[tpl], [key]: value } }));
    setLayers((ls) =>
      ls.map((l) => (l.key === key ? { ...l, text: stripAcc(value) } : l)),
    );
  }
  function loadFromPost(pst: BlogPost) {
    if (MAIN[tpl]) set(MAIN[tpl], pst.title || "");
    if (pst.heroImageUrl)
      addPhotoLayer(
        "/api/admin/img?url=" + encodeURIComponent(pst.heroImageUrl),
      );
  }
  async function download() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const url = await toPng(cardRef.current, {
        width: F.w,
        height: F.h,
        pixelRatio: 2,
        cacheBust: true,
        filter: exportFilter,
      });
      const a = document.createElement("a");
      a.download = `nexzy-${tpl}-${F.w}x${F.h}.png`;
      a.href = url;
      a.click();
    } catch (err) {
      console.error("[CardStudio] export failed", err);
      alert("Export failed — see console.");
    } finally {
      setBusy(false);
    }
  }
  async function copyToClipboard() {
    if (!cardRef.current) return;
    try {
      const blob = await toBlob(cardRef.current, {
        width: F.w,
        height: F.h,
        pixelRatio: 2,
        cacheBust: true,
        filter: exportFilter,
      });
      if (!blob) {
        alert("Copy failed — try Download instead.");
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      alert("Copied — paste into your post.");
    } catch (err) {
      console.error("[CardStudio] copy failed", err);
      alert("Copy not supported in this browser — use Download.");
    }
  }

  return (
    <HStack align="flex-start" gap={8} wrap="wrap">
      <VStack align="stretch" gap={4} w={{ base: "100%", lg: "400px" }}>
        {/* Template — always visible */}
        <Box>
          <Text fontSize="xs" color="gray.400" mb={2} letterSpacing="wider">
            TEMPLATE
          </Text>
          <HStack wrap="wrap" gap={2}>
            {TEMPLATES.map((tt) => (
              <Button
                key={tt.key}
                size="sm"
                variant={tpl === tt.key ? "solid" : "outline"}
                colorPalette="blue"
                onClick={() => {
                  setTpl(tt.key);
                  setHideBuiltins(false);
                }}
              >
                {tt.label}
              </Button>
            ))}
          </HStack>
        </Box>

        {/* Group switcher */}
        <HStack
          gap={2}
          borderBottomWidth="1px"
          borderColor="whiteAlpha.200"
          pb={3}
        >
          {(
            [
              ["content", "Content"],
              ["design", "Design"],
              ["image", "Image"],
              ["layers", "Layers"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              flex="1"
              size="sm"
              variant={panelTab === key ? "solid" : "ghost"}
              colorPalette="blue"
              onClick={() => setPanelTab(key)}
            >
              {label}
            </Button>
          ))}
        </HStack>

        {/* CONTENT */}
        {panelTab === "content" && (
          <VStack align="stretch" gap={4}>
            <Box
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              p={3}
            >
              <Text fontSize="xs" color="gray.400" mb={2} letterSpacing="wider">
                START FROM A PUBLISHED ARTICLE
              </Text>
              <Input
                {...FIELD}
                size="sm"
                mb={2}
                placeholder="Search your articles…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <VStack align="stretch" gap={1} maxH="180px" overflowY="auto">
                {posts
                  .filter((pst) =>
                    (pst.title || "").toLowerCase().includes(q.toLowerCase()),
                  )
                  .slice(0, 30)
                  .map((pst) => (
                    <HStack
                      key={pst.id}
                      p={2}
                      borderRadius="md"
                      cursor="pointer"
                      _hover={{ bg: "whiteAlpha.100" }}
                      onClick={() => loadFromPost(pst)}
                    >
                      {pst.heroImageUrl && (
                        <Image
                          src={pst.heroImageUrl}
                          alt=""
                          boxSize="34px"
                          objectFit="cover"
                          borderRadius="sm"
                        />
                      )}
                      <Text fontSize="sm" color="whiteAlpha.900" lineClamp={1}>
                        {pst.title}
                      </Text>
                    </HStack>
                  ))}
                {posts.length === 0 && (
                  <Text fontSize="xs" color="gray.500">
                    No published articles loaded.
                  </Text>
                )}
              </VStack>
            </Box>

            {FIELDS[tpl].map((f) => (
              <Box key={f.key}>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  {f.label}
                </Text>
                {f.area ? (
                  <Textarea
                    {...FIELD}
                    value={d[f.key] || ""}
                    rows={3}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                ) : (
                  <Input
                    {...FIELD}
                    value={d[f.key] || ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </Box>
            ))}
          </VStack>
        )}

        {/* DESIGN */}
        {panelTab === "design" && (
          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontSize="xs" color="gray.400" mb={2} letterSpacing="wider">
                COLOR — grades the image into a Nexzy tone
              </Text>
              <HStack wrap="wrap" gap={3}>
                {THEMES.map((th) => (
                  <VStack
                    key={th.key}
                    gap={1}
                    onClick={() => setThemeKey(th.key)}
                    cursor="pointer"
                  >
                    <Box
                      boxSize="32px"
                      borderRadius="full"
                      style={{ background: th.sw }}
                      borderWidth="2px"
                      borderColor={
                        themeKey === th.key ? "white" : "transparent"
                      }
                    />
                    <Text fontSize="10px" color="gray.400">
                      {th.label}
                    </Text>
                  </VStack>
                ))}
              </HStack>
            </Box>

            <Box>
              <Text fontSize="xs" color="gray.400" mb={2} letterSpacing="wider">
                FORMAT
              </Text>
              <HStack wrap="wrap" gap={2}>
                {(Object.keys(FORMATS) as FmtKey[]).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={fmt === f ? "solid" : "outline"}
                    colorPalette={f === "universal" ? "purple" : "blue"}
                    onClick={() => setFmt(f)}
                  >
                    {FORMATS[f].label}
                  </Button>
                ))}
              </HStack>
            </Box>

            <Box>
              <Text fontSize="xs" color="gray.400" mb={1}>
                Darken image · {Math.round(darken * 100)}% (raise for busy
                images)
              </Text>
              <input
                type="range"
                min={0}
                max={85}
                value={Math.round(darken * 100)}
                onChange={(e) => setDarken(Number(e.target.value) / 100)}
                style={{ width: "100%" }}
              />
            </Box>
          </VStack>
        )}

        {/* IMAGE */}
        {panelTab === "image" && (
          <VStack align="stretch" gap={4}>
            <ImageDrop
              label="IMAGE (adds a movable, resizable layer)"
              value=""
              onChange={addPhotoLayer}
            />
            {(tpl === "news" || tpl === "quote") && (
              <ImageDrop
                label={
                  tpl === "news"
                    ? "Second image (circle/square inset)"
                    : "Headshot (optional)"
                }
                value={imgB}
                onChange={setImgB}
              />
            )}

            {tpl === "news" && imgB && (
              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Inset shape &amp; position
                </Text>
                <HStack gap={2} mb={2}>
                  {(["circle", "square"] as Shape[]).map((sh) => (
                    <Button
                      key={sh}
                      size="xs"
                      variant={shape === sh ? "solid" : "outline"}
                      colorPalette="blue"
                      onClick={() => setShape(sh)}
                    >
                      {sh}
                    </Button>
                  ))}
                </HStack>
                <HStack gap={2} wrap="wrap">
                  {POSN.map((pp) => (
                    <Button
                      key={pp.key}
                      size="xs"
                      variant={pos === pp.key ? "solid" : "outline"}
                      colorPalette="blue"
                      onClick={() => setPos(pp.key)}
                    >
                      {pp.label}
                    </Button>
                  ))}
                </HStack>
              </Box>
            )}

            {imgA && (
              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Image framing (position the game so it shows)
                </Text>
                <HStack gap={3}>
                  <VStack gap={0} flex="1" align="stretch">
                    <Text fontSize="10px" color="gray.500">
                      Up / Down
                    </Text>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={imgY}
                      onChange={(e) => setImgY(Number(e.target.value))}
                    />
                  </VStack>
                  <VStack gap={0} flex="1" align="stretch">
                    <Text fontSize="10px" color="gray.500">
                      Left / Right
                    </Text>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={imgX}
                      onChange={(e) => setImgX(Number(e.target.value))}
                    />
                  </VStack>
                  <VStack gap={0} flex="1" align="stretch">
                    <Text fontSize="10px" color="gray.500">
                      Zoom
                    </Text>
                    <input
                      type="range"
                      min={100}
                      max={300}
                      value={imgZoom}
                      onChange={(e) => setImgZoom(Number(e.target.value))}
                    />
                  </VStack>
                </HStack>
              </Box>
            )}

            {tpl === "patch" && (
              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Header image height · {headerPct}%
                </Text>
                <input
                  type="range"
                  min={28}
                  max={55}
                  value={headerPct}
                  onChange={(e) => setHeaderPct(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </Box>
            )}
          </VStack>
        )}

        {/* LAYERS */}
        {panelTab === "layers" && (
          <VStack align="stretch" gap={4}>
            <input
              ref={layerFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onLayerFile}
            />
            <Text fontSize="xs" color="gray.400" letterSpacing="wider">
              LAYERS — drag on the card to move · pull the corner to resize
            </Text>
            <HStack gap={2}>
              <Button size="sm" colorPalette="blue" onClick={addImageLayer}>
                + Image cutout
              </Button>
              <Button
                size="sm"
                colorPalette="blue"
                variant="outline"
                onClick={addFullBleedPhoto}
              >
                + Full-bleed photo
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorPalette="blue"
                onClick={addTextLayer}
              >
                + Text
              </Button>
            </HStack>
            {tpl !== "blank" && (
              <Button
                size="sm"
                variant="outline"
                colorPalette="purple"
                onClick={() => {
                  const def = THEMES.find((x) => x.key === themeKey)!.theme;
                  const per = TEMPLATES.find((x) => x.key === tpl)!.accent;
                  const acc = def.tint ? def.accent : per;
                  setLayers(templateTextLayers(tpl, d, F, acc));
                  setSelId(null);
                }}
              >
                ↺ Reset to template layout
              </Button>
            )}
            {layers.length === 0 && (
              <Text fontSize="xs" color="gray.500">
                No layers yet. Add an image cutout (circle / rounded / rect) or
                a text block, then drag it on the card. Works on any template —
                or pick the Blank template for a free canvas.
              </Text>
            )}
            {layers.length > 0 && (
              <VStack align="stretch" gap={1}>
                {layers.map((l) => (
                  <HStack
                    key={l.id}
                    p={2}
                    borderRadius="md"
                    cursor="pointer"
                    bg={selId === l.id ? "whiteAlpha.200" : "whiteAlpha.50"}
                    onClick={() => setSelId(l.id)}
                  >
                    <Text
                      fontSize="xs"
                      color="whiteAlpha.900"
                      flex="1"
                      lineClamp={1}
                    >
                      {l.kind === "image"
                        ? `Image · ${l.shape}`
                        : `Text · ${l.text || ""}`}
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        raise(l.id);
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        delLayer(l.id);
                      }}
                    >
                      ✕
                    </Button>
                  </HStack>
                ))}
              </VStack>
            )}
            {selLayer && selLayer.kind === "image" && (
              <Box
                borderWidth="1px"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
                p={3}
              >
                <Text fontSize="xs" color="gray.400" mb={2}>
                  SELECTED CUTOUT
                </Text>
                <HStack gap={2} mb={2}>
                  {(["circle", "rounded", "rect"] as CutShape[]).map((sh) => (
                    <Button
                      key={sh}
                      size="xs"
                      variant={selLayer.shape === sh ? "solid" : "outline"}
                      colorPalette="blue"
                      onClick={() =>
                        updLayer(selLayer.id, {
                          shape: sh,
                          ...(sh !== "rect" ? { h: selLayer.w } : {}),
                        })
                      }
                    >
                      {sh}
                    </Button>
                  ))}
                </HStack>
                <HStack gap={2} mb={2}>
                  <Button
                    size="xs"
                    variant={selLayer.ring ? "solid" : "outline"}
                    colorPalette="blue"
                    onClick={() =>
                      updLayer(selLayer.id, { ring: !selLayer.ring })
                    }
                  >
                    Ring
                  </Button>
                  <Button
                    size="xs"
                    variant={selLayer.shadow ? "solid" : "outline"}
                    colorPalette="blue"
                    onClick={() =>
                      updLayer(selLayer.id, { shadow: !selLayer.shadow })
                    }
                  >
                    Shadow
                  </Button>
                </HStack>
                <Text fontSize="10px" color="gray.500" mb={1}>
                  Ring color
                </Text>
                <HStack gap={1}>
                  {["#4DA3FF", "#FFD100", "#3ad07a", "#b56bff", "#ffffff"].map(
                    (c) => (
                      <Box
                        as="button"
                        key={c}
                        onClick={() => updLayer(selLayer.id, { ringColor: c })}
                        w="20px"
                        h="20px"
                        borderRadius="full"
                        style={{ background: c }}
                        borderWidth="2px"
                        borderColor={
                          selLayer.ringColor === c ? "white" : "transparent"
                        }
                      />
                    ),
                  )}
                </HStack>
              </Box>
            )}
            {selLayer && selLayer.kind === "text" && (
              <Box
                borderWidth="1px"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
                p={3}
              >
                <Text fontSize="xs" color="gray.400" mb={2}>
                  SELECTED TEXT
                </Text>
                <Textarea
                  {...FIELD}
                  rows={2}
                  value={selLayer.text || ""}
                  onChange={(e) =>
                    updLayer(selLayer.id, { text: e.target.value })
                  }
                  mb={2}
                />
                <Text fontSize="10px" color="gray.500">
                  Size · {selLayer.size}px
                </Text>
                <input
                  type="range"
                  min={Math.round(F.h * 0.02)}
                  max={Math.round(F.h * 0.16)}
                  value={selLayer.size || 24}
                  onChange={(e) =>
                    updLayer(selLayer.id, { size: Number(e.target.value) })
                  }
                  style={{ width: "100%" }}
                />
                <HStack gap={1} mt={2} mb={2}>
                  {["#F5EFE0", "#FFFFFF", "#4DA3FF", "#FFD100", "#0a1020"].map(
                    (c) => (
                      <Box
                        as="button"
                        key={c}
                        onClick={() => updLayer(selLayer.id, { color: c })}
                        w="20px"
                        h="20px"
                        borderRadius="full"
                        style={{ background: c }}
                        borderWidth="2px"
                        borderColor={
                          selLayer.color === c ? "white" : "transparent"
                        }
                      />
                    ),
                  )}
                </HStack>
                <HStack gap={1} wrap="wrap">
                  <Button
                    size="xs"
                    variant={selLayer.weight === 700 ? "solid" : "outline"}
                    colorPalette="blue"
                    onClick={() =>
                      updLayer(selLayer.id, {
                        weight: selLayer.weight === 700 ? 400 : 700,
                      })
                    }
                  >
                    Bold
                  </Button>
                  <Button
                    size="xs"
                    variant={selLayer.italic ? "solid" : "outline"}
                    colorPalette="blue"
                    onClick={() =>
                      updLayer(selLayer.id, { italic: !selLayer.italic })
                    }
                  >
                    Italic
                  </Button>
                  <Button
                    size="xs"
                    variant={selLayer.upper ? "solid" : "outline"}
                    colorPalette="blue"
                    onClick={() =>
                      updLayer(selLayer.id, { upper: !selLayer.upper })
                    }
                  >
                    UPPER
                  </Button>
                  {(["left", "center", "right"] as const).map((a) => (
                    <Button
                      key={a}
                      size="xs"
                      variant={selLayer.align === a ? "solid" : "outline"}
                      colorPalette="blue"
                      onClick={() => updLayer(selLayer.id, { align: a })}
                    >
                      {a[0].toUpperCase()}
                    </Button>
                  ))}
                </HStack>
                <HStack gap={1} mt={2}>
                  {(["head", "label", "body"] as const).map((fk) => (
                    <Button
                      key={fk}
                      size="xs"
                      variant={selLayer.font === fk ? "solid" : "outline"}
                      colorPalette="blue"
                      onClick={() => updLayer(selLayer.id, { font: fk })}
                    >
                      {fk}
                    </Button>
                  ))}
                </HStack>
              </Box>
            )}
          </VStack>
        )}

        {/* Export — always visible */}
        <VStack
          align="stretch"
          gap={2}
          pt={3}
          borderTopWidth="1px"
          borderColor="whiteAlpha.200"
        >
          <Button
            colorPalette="blue"
            onClick={download}
            loading={busy}
            size="lg"
          >
            ⬇ Download PNG · {FORMATS[fmt].label}
          </Button>
          <Button
            variant="outline"
            colorPalette="blue"
            onClick={copyToClipboard}
            size="sm"
          >
            ⧉ Copy to clipboard
          </Button>
        </VStack>
      </VStack>

      {/* Preview */}
      <VStack align="center" flex="1" minW="320px" position="sticky" top="16px">
        <Heading size="sm" color="gray.400" mb={2}>
          Preview
        </Heading>
        <Box
          w={`${F.w * scale}px`}
          h={`${F.h * scale}px`}
          overflow="hidden"
          borderRadius="lg"
          boxShadow="0 20px 60px rgba(0,0,0,.5)"
        >
          <Box
            style={{
              width: F.w,
              height: F.h,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div
              ref={cardRef}
              style={{ position: "relative", width: F.w, height: F.h }}
              onPointerMove={onCanvasMove}
              onPointerUp={onCanvasUp}
              onPointerLeave={onCanvasUp}
              onPointerDown={onBgDown}
            >
              <div
                style={{ position: "absolute", inset: 0 }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
              {layers.map((l) => {
                const selected = selId === l.id;
                return (
                  <div
                    key={l.id}
                    onPointerDown={(e) => startMove(e, l.id)}
                    style={{
                      position: "absolute",
                      left: `${l.x}px`,
                      top: `${l.y}px`,
                      width: `${l.w}px`,
                      height: l.kind === "image" ? `${l.h}px` : "auto",
                      cursor: "grab",
                      touchAction: "none",
                    }}
                  >
                    {l.kind === "image" ? (
                      <div
                        style={{
                          width: `${l.w}px`,
                          height: `${l.h}px`,
                          backgroundImage: `url('${l.src}')`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          borderRadius:
                            l.shape === "circle"
                              ? "50%"
                              : l.shape === "rounded"
                                ? `${Math.round(l.w * 0.12)}px`
                                : "0px",
                          border: l.ring
                            ? `${Math.max(3, Math.round(l.w * 0.03))}px solid ${l.ringColor || "#4DA3FF"}`
                            : "none",
                          boxShadow: l.shadow
                            ? "0 18px 50px rgba(0,0,0,.55)"
                            : "none",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: `${l.w}px`,
                          fontFamily:
                            l.font === "body"
                              ? "var(--font-inter), system-ui, sans-serif"
                              : l.font === "label"
                                ? "var(--font-space-grotesk), var(--font-inter), sans-serif"
                                : "var(--font-chakra-petch), var(--font-inter), sans-serif",
                          fontWeight: l.weight || 700,
                          fontStyle: l.italic ? "italic" : "normal",
                          fontSize: `${l.size || 24}px`,
                          lineHeight: 1.05,
                          color: l.color || "#F5EFE0",
                          textAlign: l.align || "left",
                          textTransform: l.upper ? "uppercase" : "none",
                          textShadow: "0 2px 12px rgba(0,0,0,.5)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          ...(l.bg
                            ? {
                                background: l.bg,
                                padding: `${Math.round((l.size || 24) * 0.28)}px ${Math.round((l.size || 24) * 0.6)}px`,
                                borderRadius: `${Math.round((l.size || 24) * 0.32)}px`,
                                width: "auto",
                                display: "inline-block",
                                textShadow: "none",
                              }
                            : {}),
                        }}
                      >
                        {l.text}
                      </div>
                    )}
                    {selected && (
                      <>
                        <div
                          data-nocapture="1"
                          style={{
                            position: "absolute",
                            inset: "-3px",
                            border: "3px solid #4DA3FF",
                            borderRadius: "6px",
                            pointerEvents: "none",
                          }}
                        />
                        <div
                          data-nocapture="1"
                          onPointerDown={(e) => startResize(e, l.id)}
                          style={{
                            position: "absolute",
                            right: "-9px",
                            bottom: "-9px",
                            width: "18px",
                            height: "18px",
                            background: "#4DA3FF",
                            border: "2px solid #fff",
                            borderRadius: "4px",
                            cursor: "nwse-resize",
                            touchAction: "none",
                          }}
                        />
                      </>
                    )}
                  </div>
                );
              })}
              {guides.x !== undefined && (
                <div
                  data-nocapture="1"
                  style={{
                    position: "absolute",
                    left: `${guides.x}px`,
                    top: 0,
                    width: "2px",
                    height: "100%",
                    background: "#4DA3FF",
                    pointerEvents: "none",
                  }}
                />
              )}
              {guides.y !== undefined && (
                <div
                  data-nocapture="1"
                  style={{
                    position: "absolute",
                    top: `${guides.y}px`,
                    left: 0,
                    height: "2px",
                    width: "100%",
                    background: "#4DA3FF",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          </Box>
        </Box>
        <Text fontSize="xs" color="gray.500" mt={2}>
          {F.w} × {F.h} · exports at 2× ({F.w * 2} × {F.h * 2})
        </Text>
      </VStack>
    </HStack>
  );
}
