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

import { useEffect, useMemo, useRef, useState } from "react";
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

type TplKey = "news" | "review" | "deal" | "patch" | "quote" | "soon";
type FmtKey = "universal" | "square" | "story" | "wide";
type Theme = { accent: string; dark: string; light: string; tint: boolean };
type Shape = "circle" | "square";
type Pos = "BL" | "BR" | "TR" | "ML";

const TEMPLATES: { key: TplKey; label: string; accent: string }[] = [
  { key: "news", label: "News", accent: "#4DA3FF" },
  { key: "review", label: "Review", accent: "#FFD700" },
  { key: "deal", label: "Deal Alert", accent: "#1DB954" },
  { key: "patch", label: "Patch Notes", accent: "#007BFF" },
  { key: "quote", label: "Quote", accent: "#FFD700" },
  { key: "soon", label: "Coming Soon", accent: "#b56bff" },
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
    `<span style="color:${accent}">$1</span>`,
  );
}

type Data = Record<string, string>;

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
): string {
  const k = w / 1080;
  const HEAD = "var(--font-chakra-petch), var(--font-inter), sans-serif";
  const LABEL = "var(--font-space-grotesk), var(--font-inter), sans-serif";
  const BODY = "var(--font-inter), system-ui, sans-serif";
  const pad = Math.round(60 * k);
  const accent = t.accent;
  const fit = (s: string, base: number, min: number, per: number) =>
    Math.round(Math.max(min, base - (s || "").length * per) * k);

  // The source image as a framable <img>: object-position pans, scale zooms.
  const scale = Math.max(1.12, frame.zoom / 100);
  const maxOff = (1 - 1 / scale) * 50;
  const tx = ((50 - frame.x) / 50) * maxOff;
  const ty = ((50 - frame.y) / 50) * maxOff;
  const imgTag = (filter: string, blend: string, opacity: string) =>
    imgA
      ? `<img src="${imgA}" crossorigin="anonymous" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:center;transform:scale(${scale}) translate(${tx}%, ${ty}%);filter:${filter};mix-blend-mode:${blend};opacity:${opacity}"/>`
      : `<div style="position:absolute;inset:0;background:#1b2140"></div>`;

  const shell = t.tint
    ? `
    <div style="position:absolute;inset:0;background:${t.dark}"></div>
    ${imgTag("grayscale(1) contrast(1.2) brightness(1.05)", "screen", "1")}
    <div style="position:absolute;inset:0;background:${t.light};mix-blend-mode:multiply"></div>
    ${imgTag("grayscale(1) contrast(1.1)", "soft-light", ".35")}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,6,12,.35),transparent 32%,rgba(4,6,12,.9))"></div>
    <div style="position:absolute;inset:0;background:rgba(6,8,16,${darken})"></div>`
    : `
    ${imgTag("none", "normal", "1")}
    <div style="position:absolute;inset:0;mix-blend-mode:screen;background:radial-gradient(circle at 80% 12%,rgba(77,163,255,.32),rgba(18,22,43,0) 46%),radial-gradient(circle at 6% 98%,rgba(255,183,77,.2),rgba(18,22,43,0) 46%)"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(18,22,43,.78),rgba(18,22,43,.1) 32%,rgba(18,22,43,.12) 58%,rgba(18,22,43,.84))"></div>
    <div style="position:absolute;inset:0;background:rgba(10,13,24,${darken})"></div>`;

  const chip = (text: string) =>
    `<span style="font-family:${LABEL};font-weight:700;font-size:${28 * k}px;letter-spacing:${4 * k}px;padding:${9 * k}px ${20 * k}px;border-radius:${10 * k}px;background:${accent};color:#0a1020">${esc(text)}</span>`;

  const mark = `<img src="/NexzyLogo.png" crossorigin="anonymous" style="position:absolute;bottom:${36 * k}px;right:${44 * k}px;height:${58 * k}px;filter:drop-shadow(0 3px 10px rgba(0,0,0,.6))"/>`;

  let inner = "";

  if (tpl === "news") {
    const size = (shape === "square" ? 360 : 340) * k;
    const rad = shape === "square" ? `${28 * k}px` : "50%";
    let where = `left:${pad}px;bottom:${150 * k}px`;
    if (pos === "BR") where = `right:${pad}px;bottom:${150 * k}px`;
    else if (pos === "TR") where = `right:${pad}px;top:${h * 0.42}px`;
    else if (pos === "ML") where = `left:${pad}px;top:${h * 0.42}px`;
    const circle = imgB
      ? `<div style="position:absolute;${where};width:${size}px;height:${size}px;border-radius:${rad};border:${6 * k}px solid ${accent};background:#0b1020 url('${imgB}') center/cover;box-shadow:0 ${14 * k}px ${44 * k}px rgba(0,0,0,.55)"></div>`
      : "";
    inner = `
      <div style="position:absolute;top:${66 * k}px;left:${pad}px;right:${pad}px">
        ${chip(d.kicker || "NEWS")}<span style="color:${accent};font-size:${34 * k}px;position:relative;top:${2 * k}px;left:${8 * k}px">✦</span>
        <div style="font-family:${HEAD};font-weight:700;color:${CREAM};font-size:${fit(d.headline, 80, 46, 0.55)}px;line-height:1.02;text-transform:uppercase;margin-top:${22 * k}px;text-shadow:0 3px 16px rgba(0,0,0,.5)">${hl(d.headline || "", accent)}</div>
        <div style="font-family:${BODY};color:#c9d4e5;font-size:${24 * k}px;letter-spacing:${2 * k}px;margin-top:${16 * k}px;text-transform:uppercase">${esc(d.source || "")}</div>
      </div>${circle}`;
  } else if (tpl === "review") {
    inner = `
      <div style="position:absolute;top:${64 * k}px;left:${pad}px">${chip(d.kicker || "REVIEW")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${180 * k}px;font-family:${HEAD};font-weight:700;color:${CREAM};font-size:${fit(d.title, 74, 40, 0.9)}px;line-height:.98;text-transform:uppercase;max-width:${600 * k}px">${esc(d.title || "")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${125 * k}px;font-family:${BODY};color:#c9d4e5;font-size:${26 * k}px;letter-spacing:${2 * k}px;text-transform:uppercase">${esc(d.cta || "Read the full review →")}</div>
      <div style="position:absolute;right:${56 * k}px;bottom:${150 * k}px;width:${270 * k}px;height:${270 * k}px;border-radius:50%;background:rgba(6,8,16,.6);border:${6 * k}px solid ${accent};display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 ${12 * k}px ${40 * k}px rgba(0,0,0,.5)">
        <div style="font-family:${HEAD};font-weight:700;color:${accent};font-size:${150 * k}px;line-height:.8">${esc(d.score || "8")}</div>
        <div style="font-family:${HEAD};font-weight:700;color:#fff;font-size:${38 * k}px">/ ${esc(d.outof || "10")}</div>
      </div>`;
  } else if (tpl === "deal") {
    inner = `
      <div style="position:absolute;top:${150 * k}px;right:${56 * k}px;transform:rotate(6deg);background:${accent};color:#0a1020;font-family:${HEAD};font-weight:700;font-size:${84 * k}px;padding:${6 * k}px ${24 * k}px;border-radius:${16 * k}px;box-shadow:0 ${12 * k}px ${34 * k}px rgba(0,0,0,.4)">${esc(d.pct || "-67%")}</div>
      <div style="position:absolute;top:${64 * k}px;left:${pad}px">${chip(d.kicker || "DEAL ALERT")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${290 * k}px;font-family:${HEAD};font-weight:700;color:${CREAM};font-size:${fit(d.title, 78, 42, 0.8)}px;text-transform:uppercase">${esc(d.title || "")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${215 * k}px;font-family:${HEAD};font-size:${60 * k}px;color:#fff"><span style="text-decoration:line-through;color:#8b98b5;font-size:${44 * k}px">${esc(d.oldPrice || "")}</span> &nbsp;<b style="color:${accent}">${esc(d.newPrice || "")}</b></div>
      <div style="position:absolute;left:${pad}px;bottom:${125 * k}px"><span style="font-family:${LABEL};font-weight:700;font-size:${26 * k}px;letter-spacing:${2 * k}px;padding:${12 * k}px ${24 * k}px;border-radius:${12 * k}px;background:${accent};color:#0a1020">⚡ ${esc(d.cta || "Grab the deal →")}</span></div>`;
  } else if (tpl === "patch") {
    const notes = (d.notes || "")
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, 8);
    const list = notes
      .map(
        (n) =>
          `<div style="display:flex;gap:${20 * k}px;margin-bottom:${26 * k}px;align-items:flex-start"><div style="flex:0 0 ${16 * k}px;width:${16 * k}px;height:${16 * k}px;background:${accent};transform:rotate(45deg);margin-top:${12 * k}px"></div><div style="font-family:${BODY};color:#eaf1fb;font-size:${34 * k}px;line-height:1.35">${esc(n)}</div></div>`,
      )
      .join("");
    inner = `
      <div style="position:absolute;left:0;right:0;top:${frame.header}%;bottom:0;background:linear-gradient(180deg,transparent,${NAVY} 12%,${NAVY})"></div>
      <div style="position:absolute;top:${56 * k}px;left:${pad}px">${chip(d.kicker || "PATCH NOTES")}</div>
      <div style="position:absolute;top:${frame.header + 4}%;left:${pad}px;right:${pad}px;font-family:${HEAD};font-weight:700;color:${CREAM};font-size:${fit(d.title, 64, 40, 0.5)}px;text-transform:uppercase;line-height:1.02">${esc(d.title || "")} <span style="color:${accent}">· ${esc(d.version || "v1.0")}</span></div>
      <div style="position:absolute;top:${frame.header + 20}%;left:${pad}px;right:${pad}px">${list}</div>
      <div style="position:absolute;left:${pad}px;bottom:${70 * k}px;font-family:${LABEL};font-weight:700;color:${accent};font-size:${30 * k}px;letter-spacing:${2 * k}px">${esc(d.cta || "+ Read the full patch notes on Nexzy →")}</div>`;
  } else if (tpl === "quote") {
    inner = `
      <div style="position:absolute;left:${pad}px;top:${140 * k}px;font-family:${HEAD};font-weight:700;font-size:${300 * k}px;color:${accent};opacity:.9;line-height:.6">“</div>
      <div style="position:absolute;top:${120 * k}px;right:${56 * k}px;transform:rotate(-4deg);background:#0a0d18;border:${3 * k}px solid ${accent};padding:${8 * k}px ${20 * k}px"><span style="font-family:${LABEL};font-weight:700;font-size:${28 * k}px;letter-spacing:${6 * k}px;color:${accent}">${esc(d.kicker || "HOT TAKE")}</span></div>
      <div style="position:absolute;left:${pad}px;right:${70 * k}px;top:${360 * k}px;font-family:${HEAD};font-weight:700;color:#fff;font-size:${fit(d.quote, 92, 44, 0.55)}px;line-height:1.04">${hl(d.quote || "", accent)}</div>
      <div style="position:absolute;left:${pad}px;bottom:${150 * k}px;display:flex;align-items:center;gap:${26 * k}px">
        ${imgB ? `<div style="width:${130 * k}px;height:${130 * k}px;border-radius:50%;border:${4 * k}px solid ${accent};background:#1b2140 url('${imgB}') center/cover"></div>` : ""}
        <div><div style="font-family:${HEAD};font-weight:700;color:${accent};font-size:${44 * k}px;text-transform:uppercase">${esc(d.attr || "")}</div><div style="font-family:${BODY};color:#c9d4e5;font-size:${24 * k}px;letter-spacing:${2 * k}px;text-transform:uppercase">${esc(d.source || "")}</div></div>
      </div>`;
  } else {
    inner = `
      <div style="position:absolute;top:${64 * k}px;left:${pad}px">${chip(d.kicker || "COMING SOON")}</div>
      <div style="position:absolute;left:${pad}px;right:${pad}px;bottom:${300 * k}px;font-family:${HEAD};font-weight:700;color:${CREAM};font-size:${fit(d.title, 76, 42, 0.8)}px;text-transform:uppercase;line-height:1">${esc(d.title || "")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${215 * k}px;font-family:${HEAD};font-weight:700;color:#fff;font-size:${64 * k}px">📅 ${esc(d.date || "")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${125 * k}px"><span style="font-family:${LABEL};font-weight:700;font-size:${26 * k}px;letter-spacing:${2 * k}px;padding:${12 * k}px ${24 * k}px;border-radius:${12 * k}px;background:${accent};color:#0a1020">${esc(d.cta || "Wishlist it now →")}</span></div>`;
  }

  return `<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${NAVY};font-family:${BODY}">${shell}${inner}${mark}</div>`;
}

const DEFAULTS: Record<TplKey, Data> = {
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
  const cardRef = useRef<HTMLDivElement>(null);

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
    return cardHtml(tpl, F.w, F.h, d, imgA, imgB, theme, darken, shape, pos, {
      x: imgX,
      y: imgY,
      zoom: imgZoom,
      header: headerPct,
    });
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
  ]);
  const scale = Math.min(480 / F.w, 640 / F.h);

  function set(key: string, value: string) {
    setData((prev) => ({ ...prev, [tpl]: { ...prev[tpl], [key]: value } }));
  }
  function loadFromPost(pst: BlogPost) {
    if (pst.heroImageUrl)
      setImgA("/api/admin/img?url=" + encodeURIComponent(pst.heroImageUrl));
    set(MAIN[tpl], pst.title || "");
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
      });
      if (!blob) throw new Error("no blob");
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
      <VStack align="stretch" gap={4} w={{ base: "100%", lg: "380px" }}>
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
                onClick={() => setTpl(tt.key)}
              >
                {tt.label}
              </Button>
            ))}
          </HStack>
        </Box>

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
                  borderColor={themeKey === th.key ? "white" : "transparent"}
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

        <ImageDrop label="IMAGE" value={imgA} onChange={setImgA} />
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

        <Box>
          <Text fontSize="xs" color="gray.400" mb={1}>
            Darken image · {Math.round(darken * 100)}% (raise for busy images)
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
                  max={220}
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

        <Button colorPalette="blue" onClick={download} loading={busy} size="lg">
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
            <div ref={cardRef} dangerouslySetInnerHTML={{ __html: html }} />
          </Box>
        </Box>
        <Text fontSize="xs" color="gray.500" mt={2}>
          {F.w} × {F.h} · exports at 2× ({F.w * 2} × {F.h * 2})
        </Text>
      </VStack>
    </HStack>
  );
}
