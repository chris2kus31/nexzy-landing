"use client";

/**
 * Card Studio — Phase 1 (+ UX pass).
 * Spin up branded Nexzy social cards (News / Review / Deal / Patch Notes /
 * Quote / Coming Soon) for X, Threads, Facebook, Instagram, TikTok.
 * Drop an image, type the text, pick a format, download a PNG.
 *
 * Rendering is deterministic (no LLM, no cost): the card is styled DOM, and
 * export is a client-side DOM->PNG via `html-to-image`. Templates share the
 * Nexzy signature (navy + dual-glow, blue keyword, Chakra Petch, logo mark);
 * each type has its own composition + a soft CTA to drive the click.
 *
 * Phase 2 will prefill this from a Leads article and save to S3.
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
import { toPng } from "html-to-image";
import { getPublished, type BlogPost } from "@/lib/admin/client";

type TplKey = "news" | "review" | "deal" | "patch" | "quote" | "soon";
type FmtKey = "universal" | "square" | "story" | "wide";

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

const NAVY = "#12162b";
const CREAM = "#F5EFE0";

// which text field an article prefill drops the title into, per template
const MAIN: Record<TplKey, string> = {
  news: "headline",
  review: "title",
  deal: "title",
  patch: "title",
  quote: "quote",
  soon: "title",
};

// shared field styling so text is readable on the dark admin panel
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

// keyword highlight: wrap [[word]] in the blue accent
function hl(s: string): string {
  return esc(s).replace(
    /\[\[(.+?)\]\]/g,
    '<span style="color:#4DA3FF">$1</span>',
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
  accent: string,
): string {
  const k = w / 1080; // scale everything off width so ratios hold across formats
  const HEAD = "var(--font-chakra-petch), var(--font-inter), sans-serif";
  const LABEL = "var(--font-space-grotesk), var(--font-inter), sans-serif";
  const BODY = "var(--font-inter), system-ui, sans-serif";
  const pad = Math.round(60 * k);
  const bg = imgA ? `url('${imgA}')` : "#1b2140";

  const shell = `
    <div style="position:absolute;inset:0;background:${bg} center/cover"></div>
    <div style="position:absolute;inset:0;mix-blend-mode:screen;background:radial-gradient(circle at 80% 12%,rgba(77,163,255,.32),rgba(18,22,43,0) 46%),radial-gradient(circle at 6% 98%,rgba(255,183,77,.2),rgba(18,22,43,0) 46%)"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(18,22,43,.78),rgba(18,22,43,.1) 32%,rgba(18,22,43,.12) 58%,rgba(18,22,43,.84))"></div>`;

  const chip = (text: string, ink = "#0a1836") =>
    `<span style="font-family:${LABEL};font-weight:700;font-size:${28 * k}px;letter-spacing:${4 * k}px;padding:${9 * k}px ${20 * k}px;border-radius:${10 * k}px;background:${accent};color:${ink}">${esc(text)}</span>`;

  const mark = `<img src="/NexzyLogo.png" crossorigin="anonymous" style="position:absolute;bottom:${36 * k}px;right:${44 * k}px;height:${58 * k}px;filter:drop-shadow(0 3px 10px rgba(0,0,0,.6))"/>`;

  let inner = "";

  if (tpl === "news") {
    const circle = imgB
      ? `<div style="position:absolute;left:${pad}px;top:${h * 0.42}px;width:${360 * k}px;height:${360 * k}px;border-radius:50%;border:${6 * k}px solid ${accent};background:#0b1020 url('${imgB}') center/cover;box-shadow:0 ${14 * k}px ${44 * k}px rgba(0,0,0,.55)"></div>`
      : "";
    inner = `
      <div style="position:absolute;top:${66 * k}px;left:${pad}px;right:${pad}px">
        ${chip(d.kicker || "NEWS")}<span style="color:#4DA3FF;font-size:${34 * k}px;position:relative;top:${2 * k}px;left:${8 * k}px">✦</span>
        <div style="font-family:${HEAD};font-weight:700;color:${CREAM};font-size:${80 * k}px;line-height:1.02;text-transform:uppercase;margin-top:${22 * k}px;text-shadow:0 3px 16px rgba(0,0,0,.5)">${hl(d.headline || "")}</div>
        <div style="font-family:${BODY};color:#8fd0ff;font-size:${24 * k}px;letter-spacing:${2 * k}px;margin-top:${16 * k}px;text-transform:uppercase">${esc(d.source || "")}</div>
      </div>${circle}`;
  } else if (tpl === "review") {
    inner = `
      <div style="position:absolute;top:${64 * k}px;left:${pad}px">${chip(d.kicker || "REVIEW", "#1a1f3a")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${180 * k}px;font-family:${HEAD};font-weight:700;color:${CREAM};font-size:${74 * k}px;line-height:.98;text-transform:uppercase;max-width:${600 * k}px">${esc(d.title || "")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${125 * k}px;font-family:${BODY};color:#9fb0d0;font-size:${26 * k}px;letter-spacing:${2 * k}px;text-transform:uppercase">${esc(d.cta || "Read the full review →")}</div>
      <div style="position:absolute;right:${56 * k}px;bottom:${150 * k}px;width:${280 * k}px;height:${280 * k}px;border-radius:50%;background:rgba(18,22,43,.75);border:${6 * k}px solid ${accent};display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 ${12 * k}px ${40 * k}px rgba(0,0,0,.5)">
        <div style="font-family:${HEAD};font-weight:700;color:${accent};font-size:${150 * k}px;line-height:.8">${esc(d.score || "8")}</div>
        <div style="font-family:${HEAD};font-weight:700;color:#fff;font-size:${40 * k}px;margin-top:${-6 * k}px">/ ${esc(d.outof || "10")}</div>
      </div>`;
  } else if (tpl === "deal") {
    inner = `
      <div style="position:absolute;top:${150 * k}px;right:${56 * k}px;transform:rotate(6deg);background:${accent};color:#04160b;font-family:${HEAD};font-weight:700;font-size:${84 * k}px;padding:${6 * k}px ${24 * k}px;border-radius:${16 * k}px;box-shadow:0 ${12 * k}px ${34 * k}px rgba(0,0,0,.4)">${esc(d.pct || "-67%")}</div>
      <div style="position:absolute;top:${64 * k}px;left:${pad}px">${chip(d.kicker || "DEAL ALERT", "#04160b")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${290 * k}px;font-family:${HEAD};font-weight:700;color:${CREAM};font-size:${78 * k}px;text-transform:uppercase">${esc(d.title || "")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${215 * k}px;font-family:${HEAD};font-size:${60 * k}px;color:#fff"><span style="text-decoration:line-through;color:#7d8aa8;font-size:${44 * k}px">${esc(d.oldPrice || "")}</span> &nbsp;<b style="color:#38d16a">${esc(d.newPrice || "")}</b></div>
      <div style="position:absolute;left:${pad}px;bottom:${125 * k}px"><span style="font-family:${LABEL};font-weight:700;font-size:${26 * k}px;letter-spacing:${2 * k}px;padding:${12 * k}px ${24 * k}px;border-radius:${12 * k}px;background:${accent};color:#04160b">⚡ ${esc(d.cta || "Grab the deal →")}</span></div>`;
  } else if (tpl === "patch") {
    const notes = (d.notes || "")
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, 8);
    const list = notes
      .map(
        (n) =>
          `<div style="display:flex;gap:${20 * k}px;margin-bottom:${26 * k}px;align-items:flex-start"><div style="flex:0 0 ${16 * k}px;width:${16 * k}px;height:${16 * k}px;background:#4DA3FF;transform:rotate(45deg);margin-top:${12 * k}px"></div><div style="font-family:${BODY};color:#dbe4f2;font-size:${34 * k}px;line-height:1.35">${esc(n)}</div></div>`,
      )
      .join("");
    inner = `
      <div style="position:absolute;top:${60 * k}px;left:${pad}px">${chip(d.kicker || "PATCH NOTES", "#fff")}</div>
      <div style="position:absolute;top:${300 * k}px;left:${pad}px;right:${pad}px;font-family:${HEAD};font-weight:700;color:${CREAM};font-size:${68 * k}px;text-transform:uppercase;line-height:1">${esc(d.title || "")} <span style="color:#4DA3FF">· ${esc(d.version || "v1.0")}</span></div>
      <div style="position:absolute;top:${425 * k}px;left:${pad}px;right:${pad}px">${list}</div>
      <div style="position:absolute;left:${pad}px;bottom:${115 * k}px;font-family:${LABEL};font-weight:700;color:#4DA3FF;font-size:${30 * k}px;letter-spacing:${2 * k}px">${esc(d.cta || "+ Read the full patch notes on Nexzy →")}</div>`;
  } else if (tpl === "quote") {
    inner = `
      <div style="position:absolute;left:${pad}px;top:${140 * k}px;font-family:${HEAD};font-weight:700;font-size:${300 * k}px;color:#4DA3FF;opacity:.9;line-height:.6">“</div>
      <div style="position:absolute;top:${120 * k}px;right:${56 * k}px;transform:rotate(-4deg);background:#0a0d18;border:${3 * k}px solid ${accent};padding:${8 * k}px ${20 * k}px"><span style="font-family:${LABEL};font-weight:700;font-size:${28 * k}px;letter-spacing:${6 * k}px;color:${accent}">${esc(d.kicker || "HOT TAKE")}</span></div>
      <div style="position:absolute;left:${pad}px;right:${70 * k}px;top:${360 * k}px;font-family:${HEAD};font-weight:700;color:#fff;font-size:${92 * k}px;line-height:1.04">${hl(d.quote || "")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${150 * k}px;display:flex;align-items:center;gap:${26 * k}px">
        ${imgB ? `<div style="width:${130 * k}px;height:${130 * k}px;border-radius:50%;border:${4 * k}px solid #4DA3FF;background:#1b2140 url('${imgB}') center/cover"></div>` : ""}
        <div><div style="font-family:${HEAD};font-weight:700;color:${accent};font-size:${44 * k}px;text-transform:uppercase">${esc(d.attr || "")}</div><div style="font-family:${BODY};color:#9fb0d0;font-size:${24 * k}px;letter-spacing:${2 * k}px;text-transform:uppercase">${esc(d.source || "")}</div></div>
      </div>`;
  } else {
    // soon
    inner = `
      <div style="position:absolute;top:${64 * k}px;left:${pad}px">${chip(d.kicker || "COMING SOON", "#12081f")}</div>
      <div style="position:absolute;left:${pad}px;right:${pad}px;bottom:${300 * k}px;font-family:${HEAD};font-weight:700;color:${CREAM};font-size:${76 * k}px;text-transform:uppercase;line-height:1">${esc(d.title || "")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${215 * k}px;font-family:${HEAD};font-weight:700;color:#fff;font-size:${64 * k}px">📅 ${esc(d.date || "")}</div>
      <div style="position:absolute;left:${pad}px;bottom:${125 * k}px"><span style="font-family:${LABEL};font-weight:700;font-size:${26 * k}px;letter-spacing:${2 * k}px;padding:${12 * k}px ${24 * k}px;border-radius:${12 * k}px;background:${accent};color:#12081f">${esc(d.cta || "Wishlist it now →")}</span></div>`;
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

/** Click-or-drop image field with thumbnail + remove. */
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

export default function CardStudioPanel({
  isOwner: _isOwner,
}: {
  isOwner: boolean;
}) {
  const [tpl, setTpl] = useState<TplKey>("news");
  const [fmt, setFmt] = useState<FmtKey>("universal");
  const [data, setData] = useState<Record<TplKey, Data>>(DEFAULTS);
  const [imgA, setImgA] = useState<string>("");
  const [imgB, setImgB] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    getPublished()
      .then(setPosts)
      .catch(() => {});
  }, []);

  const accent = TEMPLATES.find((t) => t.key === tpl)!.accent;
  const F = FORMATS[fmt];
  const d = data[tpl];
  const html = useMemo(
    () => cardHtml(tpl, F.w, F.h, d, imgA, imgB, accent),
    [tpl, F.w, F.h, d, imgA, imgB, accent],
  );
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

  return (
    <HStack align="flex-start" gap={8} wrap="wrap">
      {/* Controls */}
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
            {TEMPLATES.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant={tpl === t.key ? "solid" : "outline"}
                colorPalette="blue"
                onClick={() => setTpl(t.key)}
              >
                {t.label}
              </Button>
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
          <Text fontSize="xs" color="gray.500" mt={2}>
            Universal (4:5) posts well everywhere — pick a specific size only if
            a platform needs it.
          </Text>
        </Box>

        <ImageDrop label="IMAGE" value={imgA} onChange={setImgA} />
        {(tpl === "news" || tpl === "quote") && (
          <ImageDrop
            label={
              tpl === "news"
                ? "Second image (circle inset — casting/adaptation)"
                : "Headshot (optional)"
            }
            value={imgB}
            onChange={setImgB}
          />
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
