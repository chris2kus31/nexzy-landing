"use client";

/**
 * Card Studio — Fabric.js canvas editor.
 *
 * A real design surface: every element (image, headline, badge, text) is a
 * Fabric object you can select, drag, resize from any handle, rotate, recolor,
 * and reorder. Templates seed editable objects; "Blank" is a free canvas.
 * Images import at TRUE size (fit, never force-zoomed). Exports the full-res PNG
 * straight from the canvas (crisp, 2×). Fabric is loaded client-side only.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  Image as CkImage,
  Spinner,
} from "@chakra-ui/react";
import type { Canvas as FCanvas, FabricObject } from "fabric";
import { getPublished, type BlogPost } from "@/lib/admin/client";

type TplKey = "news" | "review" | "deal" | "patch" | "quote" | "soon" | "blank";
type FmtKey = "universal" | "square" | "story" | "wide";

const TEMPLATES: { key: TplKey; label: string }[] = [
  { key: "news", label: "News" },
  { key: "review", label: "Review" },
  { key: "deal", label: "Deal Alert" },
  { key: "patch", label: "Patch Notes" },
  { key: "quote", label: "Quote" },
  { key: "soon", label: "Coming Soon" },
  { key: "blank", label: "Blank" },
];

const FORMATS: Record<FmtKey, { label: string; w: number; h: number }> = {
  universal: { label: "Universal · 4:5", w: 1080, h: 1350 },
  square: { label: "Square 1:1", w: 1080, h: 1080 },
  story: { label: "Story 9:16", w: 1080, h: 1920 },
  wide: { label: "Wide 16:9", w: 1200, h: 675 },
};

const ACCENTS: Record<TplKey, string> = {
  news: "#4DA3FF",
  review: "#FFD700",
  deal: "#1DB954",
  patch: "#007BFF",
  quote: "#FFD700",
  soon: "#b56bff",
  blank: "#4DA3FF",
};

const NAVY = "#1A1F3A"; // Nexzy navy
const CREAM = "#F5EFE0";
// Nexzy palette (text + element colors): white, cream, blue, light blue,
// amber, gold, navy.
const SWATCHES = [
  "#FFFFFF",
  "#F5EFE0",
  "#007BFF",
  "#4DA3FF",
  "#FFB74D",
  "#FFD700",
  "#1A1F3A",
];

// Complementary colors beyond the core Nexzy palette, for more range on text,
// borders and score badges.
const EXTRA_COLORS = [
  "#000000",
  "#E23B3B",
  "#1DB954",
  "#00D1B2",
  "#b56bff",
  "#FF6B6B",
  "#FF9F1C",
  "#22D3EE",
];
const ALL_COLORS = [...SWATCHES, ...EXTRA_COLORS];

// The Nexzy brand mark (served from /public). Dropped into every template and
// addable on demand.
const LOGO_SRC = "/NexzyLogo.png";

// One-click background gradients — Nexzy tones plus complementary options.
const BG_GRADIENTS: { name: string; from: string; to: string }[] = [
  { name: "Navy", from: "#20264a", to: "#12162b" },
  { name: "Blue", from: "#0a4bd0", to: "#0a1e5a" },
  { name: "Sky", from: "#4DA3FF", to: "#0a2a66" },
  { name: "Sunset", from: "#b56b3a", to: "#2a1508" },
  { name: "Amber", from: "#FFB74D", to: "#7a3d00" },
  { name: "Emerald", from: "#0f5132", to: "#04160d" },
  { name: "Violet", from: "#3b0764", to: "#12081f" },
  { name: "Crimson", from: "#7a1020", to: "#1a0509" },
  { name: "Ink", from: "#0a0d1a", to: "#000000" },
];

const FIELD = {
  color: "whiteAlpha.900",
  bg: "whiteAlpha.100",
  borderColor: "whiteAlpha.300",
  size: "sm" as const,
  _placeholder: { color: "whiteAlpha.500" },
} as const;

type Seed = {
  role: string;
  text: string;
  xF: number;
  yF: number;
  wF: number;
  sizeF: number;
  color: string;
  font: "head" | "label" | "body";
  weight?: number;
  upper?: boolean;
  spacing?: number;
  chip?: boolean; // render as a filled badge pill (bg behind text)
  bg?: string; // chip background color
  stroke?: string; // outline (e.g. score badge)
  strokeWidth?: number;
  opacity?: number; // e.g. quote-mark watermark
};

function seedsFor(tpl: TplKey, accent: string): Seed[] {
  // A filled badge pill (accent background, navy text) like the QUOTE/NEWS/
  // REVIEW chips on the reference cards.
  const label = (text: string): Seed => ({
    role: "kicker",
    text,
    xF: 0.06,
    yF: 0.06,
    wF: 0.5,
    sizeF: 0.026,
    color: NAVY,
    font: "label",
    weight: 700,
    upper: true,
    spacing: 120,
    chip: true,
    bg: accent,
  });
  const head = (text: string, yF: number): Seed => ({
    role: "headline",
    text,
    xF: 0.06,
    yF,
    wF: 0.88,
    sizeF: 0.062,
    color: CREAM,
    font: "head",
    weight: 700,
    upper: true,
  });
  const body = (role: string, text: string, yF: number): Seed => ({
    role,
    text,
    xF: 0.06,
    yF,
    wF: 0.88,
    sizeF: 0.022,
    color: "#c9d4e5",
    font: "body",
    weight: 600,
    upper: true,
    spacing: 40,
  });
  switch (tpl) {
    case "news":
      return [
        label("NEWS"),
        head("Your headline here", 0.12),
        body("source", "VIA: SOURCE", 0.26),
      ];
    case "review":
      return [
        label("REVIEW"),
        {
          role: "headline",
          text: "Game title",
          xF: 0.06,
          yF: 0.6,
          wF: 0.56,
          sizeF: 0.062,
          color: CREAM,
          font: "head",
          weight: 700,
          upper: true,
        },
        {
          role: "score",
          text: "8",
          xF: 0.66,
          yF: 0.56,
          wF: 0.3,
          sizeF: 0.2,
          color: "#E23B3B",
          font: "head",
          weight: 700,
          stroke: accent,
          strokeWidth: 10,
        },
        {
          role: "scoreMax",
          text: "/10",
          xF: 0.83,
          yF: 0.74,
          wF: 0.16,
          sizeF: 0.05,
          color: CREAM,
          font: "head",
          weight: 700,
        },
        body("cta", "Read the full review →", 0.86),
      ];
    case "deal":
      return [
        label("DEAL ALERT"),
        head("Game title", 0.55),
        {
          role: "pct",
          text: "-67%",
          xF: 0.62,
          yF: 0.1,
          wF: 0.34,
          sizeF: 0.08,
          color: accent,
          font: "head",
          weight: 700,
        },
        {
          role: "price",
          text: "$39.99   $13.19",
          xF: 0.06,
          yF: 0.68,
          wF: 0.6,
          sizeF: 0.05,
          color: "#fff",
          font: "head",
          weight: 700,
        },
        body("cta", "Grab the deal →", 0.82),
      ];
    case "patch":
      return [
        label("PATCH NOTES"),
        head("Game · v1.0", 0.14),
        {
          role: "notes",
          text: "• Fix one\n• Fix two\n• Fix three",
          xF: 0.06,
          yF: 0.3,
          wF: 0.88,
          sizeF: 0.03,
          color: "#eaf1fb",
          font: "body",
          weight: 500,
        },
        body("cta", "Full notes on Nexzy →", 0.9),
      ];
    case "quote":
      return [
        {
          role: "watermark",
          text: "\u201D",
          xF: 0.68,
          yF: 0.34,
          wF: 0.4,
          sizeF: 0.3,
          color: accent,
          font: "head",
          weight: 700,
          opacity: 0.18,
        },
        label("QUOTE"),
        {
          role: "quote",
          text: "\u201CThe quote goes here.\u201D",
          xF: 0.06,
          yF: 0.3,
          wF: 0.88,
          sizeF: 0.07,
          color: "#fff",
          font: "head",
          weight: 700,
        },
        {
          role: "attr",
          text: "ATTRIBUTION",
          xF: 0.06,
          yF: 0.8,
          wF: 0.6,
          sizeF: 0.032,
          color: accent,
          font: "head",
          weight: 700,
          upper: true,
        },
        body("source", "VIA: SOURCE", 0.86),
      ];
    case "soon":
      return [
        label("COMING SOON"),
        head("Game title", 0.55),
        {
          role: "date",
          text: "SEPT 4, 2026",
          xF: 0.06,
          yF: 0.7,
          wF: 0.6,
          sizeF: 0.05,
          color: "#fff",
          font: "head",
          weight: 700,
        },
        body("cta", "Wishlist it now →", 0.82),
      ];
    default:
      return [];
  }
}

type Tagged = FabricObject & { role?: string; oid?: string };
let OID = 0;
const nextOid = () => `o${Date.now()}_${OID++}`;

type Fab = typeof import("fabric");
type PhotoShape = "original" | "circle" | "square" | "rounded";
type PhotoProps = {
  isPhoto?: boolean;
  srcEl?: HTMLImageElement | HTMLCanvasElement;
  natW?: number;
  natH?: number;
  shape?: PhotoShape;
};
type PhotoOpts = {
  left: number;
  top: number;
  scale: number; // canvas-px per natural-px
  angle?: number;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
};

// Build a "photo": a Rect/Circle whose fill is an image Pattern, so a stroke
// (border) follows the shape's outline. Circle/Square centre-crop to the
// shortest side; Original/Rounded keep the full image. `scale` is applied so a
// shape switch never resizes the image, only recuts it.
function makePhoto(
  fab: Fab,
  el: HTMLImageElement | HTMLCanvasElement,
  natW: number,
  natH: number,
  shape: PhotoShape,
  opts: PhotoOpts,
): FabricObject {
  const m = Math.min(natW, natH);
  const pat = (ox: number, oy: number) =>
    new fab.Pattern({
      source: el as HTMLImageElement,
      repeat: "no-repeat",
      offsetX: ox,
      offsetY: oy,
    });
  const common = {
    left: opts.left,
    top: opts.top,
    originX: "left" as const,
    originY: "top" as const,
    angle: opts.angle || 0,
    opacity: opts.opacity ?? 1,
    stroke: opts.stroke || undefined,
    strokeWidth: opts.strokeWidth || 0,
    strokeUniform: true,
    objectCaching: false,
  };
  let obj: FabricObject;
  if (shape === "circle")
    obj = new fab.Circle({
      ...common,
      radius: m / 2,
      fill: pat(-(natW - m) / 2, -(natH - m) / 2),
    });
  else if (shape === "square")
    obj = new fab.Rect({
      ...common,
      width: m,
      height: m,
      fill: pat(-(natW - m) / 2, -(natH - m) / 2),
    });
  else if (shape === "rounded")
    obj = new fab.Rect({
      ...common,
      width: natW,
      height: natH,
      rx: m * 0.08,
      ry: m * 0.08,
      fill: pat(0, 0),
    });
  else
    obj = new fab.Rect({
      ...common,
      width: natW,
      height: natH,
      fill: pat(0, 0),
    });
  obj.set({ scaleX: opts.scale, scaleY: opts.scale });
  const p = obj as unknown as PhotoProps;
  p.isPhoto = true;
  p.srcEl = el;
  p.natW = natW;
  p.natH = natH;
  p.shape = shape;
  return obj;
}

// Native Fabric `padding` only pads the selection box, not the drawn
// background. This override renders the text's backgroundColor expanded by
// padX/padY, so any text can become a padded pill/highlight.
type PadObj = {
  backgroundColor?: string;
  padX?: number;
  padY?: number;
  _getNonTransformedDimensions: () => { x: number; y: number };
  _removeShadow?: (ctx: CanvasRenderingContext2D) => void;
  _renderBackground?: (ctx: CanvasRenderingContext2D) => void;
};
function installPaddedBg(o: FabricObject) {
  const t = o as unknown as PadObj;
  t._renderBackground = function (this: PadObj, ctx: CanvasRenderingContext2D) {
    if (!this.backgroundColor) return;
    const dim = this._getNonTransformedDimensions();
    const px = this.padX || 0;
    const py = this.padY || 0;
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(
      -dim.x / 2 - px,
      -dim.y / 2 - py,
      dim.x + px * 2,
      dim.y + py * 2,
    );
    this._removeShadow?.(ctx);
  };
}

/**
 * A seed handed over from Content Studio (Suggestions): the AI-written copy for
 * an image card or a slide deck. When present, Card Studio switches to the
 * platform's aspect + template and drops the copy onto the branded canvas. When
 * absent, the editor behaves exactly as before (non-breaking).
 */
export type CardSeed = {
  token: number;
  format?: string;
  template?: string;
  title?: string;
  slides: string[][];
};

const FMT_KEYS: FmtKey[] = ["universal", "square", "story", "wide"];
const TPL_KEYS: TplKey[] = [
  "news",
  "review",
  "deal",
  "patch",
  "quote",
  "soon",
  "blank",
];
const isFmtKey = (v?: string): v is FmtKey =>
  !!v && (FMT_KEYS as string[]).includes(v);
const isTplKey = (v?: string): v is TplKey =>
  !!v && (TPL_KEYS as string[]).includes(v);

export default function CardStudioPanel({
  isOwner: _isOwner,
  seed,
}: {
  isOwner: boolean;
  seed?: CardSeed | null;
}) {
  const [tpl, setTpl] = useState<TplKey>("news");
  const [slideIdx, setSlideIdx] = useState(0);
  const [fmt, setFmt] = useState<FmtKey>("universal");
  const [panelTab, setPanelTab] = useState<
    "content" | "design" | "image" | "layers"
  >("content");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [q, setQ] = useState("");
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [sel, setSel] = useState<{
    type: "text" | "image";
    text?: string;
    fill?: string;
    fontSize?: number;
    textAlign?: string;
    bold?: boolean;
    italic?: boolean;
    opacity?: number;
    shape?: string;
    stroke?: string;
    strokeWidth?: number;
    pad?: number;
    bg?: string;
  } | null>(null);

  const F = FORMATS[fmt];
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fcRef = useRef<FCanvas | null>(null);
  const fabricRef = useRef<typeof import("fabric") | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const bgGrad = useRef<{ from: string; to: string } | null>(null);
  const fonts = useRef({
    head: "sans-serif",
    label: "sans-serif",
    body: "sans-serif",
  });
  const dims = useRef({ dispW: 480, dispH: 600 });
  const prevF = useRef({ w: 1080, h: 1350 });

  useEffect(() => {
    getPublished()
      .then(setPosts)
      .catch(() => {});
  }, []);

  const fontFamily = (role: "head" | "label" | "body") => fonts.current[role];

  const refreshSel = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    const o = c.getActiveObject() as Tagged | undefined;
    if (!o) {
      setSel(null);
      return;
    }
    if (o.type === "textbox" || o.type === "i-text" || o.type === "text") {
      const t = o as unknown as {
        text: string;
        fill: string;
        fontSize: number;
        textAlign: string;
        fontWeight: number | string;
        fontStyle: string;
      };
      setSel({
        type: "text",
        text: t.text,
        fill: String(t.fill),
        fontSize: Math.round(t.fontSize),
        textAlign: t.textAlign,
        bold: t.fontWeight === 700 || t.fontWeight === "bold",
        italic: t.fontStyle === "italic",
        opacity: Math.round(((o.opacity ?? 1) as number) * 100),
        pad: Math.round((o as unknown as { padX?: number }).padX || 0),
        bg: String(
          (o as unknown as { backgroundColor?: string }).backgroundColor || "",
        ),
      });
    } else {
      const p = o as unknown as {
        shape?: string;
        stroke?: string;
        strokeWidth?: number;
      };
      setSel({
        type: "image",
        opacity: Math.round(((o.opacity ?? 1) as number) * 100),
        shape: p.shape || "original",
        stroke: p.stroke || "",
        strokeWidth: Math.round(p.strokeWidth || 0),
      });
    }
  }, []);

  function fitDisplay(w: number, h: number) {
    const maxW = 500;
    const maxH = 660;
    const s = Math.min(maxW / w, maxH / h);
    return { dispW: Math.round(w * s), dispH: Math.round(h * s) };
  }

  // Drop the Nexzy brand mark onto the canvas (top-right by default; drag
  // anywhere). Replaces any existing logo so templates never stack duplicates.
  const addBrandLogo = useCallback(
    (canvas?: FCanvas | null, fabric?: typeof import("fabric") | null) => {
      const c0 = canvas ?? fcRef.current;
      const fab = fabric ?? fabricRef.current;
      if (!c0 || !fab) return;
      fab.FabricImage.fromURL(LOGO_SRC, { crossOrigin: "anonymous" }).then(
        (img) => {
          const c = canvas ?? fcRef.current;
          if (!c) return;
          c.getObjects()
            .filter((o) => (o as Tagged).role === "logo")
            .forEach((o) => c.remove(o));
          const target = F.w * 0.12;
          const sc = target / (img.width || 1);
          img.set({
            left: Math.round(F.w - target - F.w * 0.05),
            top: Math.round(F.h * 0.05),
            scaleX: sc,
            scaleY: sc,
            originX: "left",
            originY: "top",
          });
          (img as Tagged).oid = nextOid();
          (img as Tagged).role = "logo";
          c.add(img);
          c.bringObjectToFront(img);
          c.requestRenderAll();
          setTick((t) => t + 1);
        },
      );
    },
    [F.w, F.h],
  );

  const seedTemplate = useCallback(
    (
      key: TplKey,
      canvas?: FCanvas | null,
      fabric?: typeof import("fabric") | null,
    ) => {
      const c = canvas ?? fcRef.current;
      const fab = fabric ?? fabricRef.current;
      if (!c || !fab) return;
      // Keep the user's photos and background scrim; only replace template text
      // + the old logo.
      c.getObjects()
        .filter((o) => {
          const t = o as Tagged & PhotoProps;
          return !t.isPhoto && t.role !== "scrim";
        })
        .forEach((o) => c.remove(o));
      const accent = ACCENTS[key];
      for (const s of seedsFor(key, accent)) {
        const text = s.upper ? s.text.toUpperCase() : s.text;
        const common = {
          left: Math.round(s.xF * F.w),
          top: Math.round(s.yF * F.h),
          fontSize: Math.round(s.sizeF * F.h),
          fill: s.color,
          fontFamily: fontFamily(s.font),
          fontWeight: s.weight ?? 700,
          textAlign: "left" as const,
          charSpacing: s.spacing ?? 0,
          editable: true,
          lineHeight: 1.02,
          originX: "left" as const,
          originY: "top" as const,
          opacity: s.opacity ?? 1,
          stroke: s.stroke || undefined,
          strokeWidth: s.strokeWidth || 0,
          paintFirst: "stroke" as const,
          strokeUniform: true,
        };
        let obj: FabricObject;
        if (s.chip) {
          obj = new fab.IText(text, {
            ...common,
            backgroundColor: s.bg || accent,
          });
        } else {
          obj = new fab.Textbox(text, {
            ...common,
            width: Math.round(s.wF * F.w),
          });
        }
        installPaddedBg(obj);
        if (s.chip) {
          const pt = obj as unknown as PadObj;
          pt.padX = Math.round(F.h * 0.012);
          pt.padY = Math.round(F.h * 0.007);
        }
        (obj as Tagged).role = s.role;
        (obj as Tagged).oid = nextOid();
        c.add(obj);
      }
      addBrandLogo(c, fab);
      c.requestRenderAll();
      setTick((t) => t + 1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [F.w, F.h],
  );

  // init Fabric once
  useEffect(() => {
    let disposed = false;
    let canvas: FCanvas | null = null;
    (async () => {
      const fabric = await import("fabric");
      if (disposed || !canvasElRef.current) return;
      fabricRef.current = fabric;
      const probe = (v: string) => {
        const el = document.createElement("span");
        el.style.fontFamily = `var(${v})`;
        el.style.position = "absolute";
        el.style.visibility = "hidden";
        document.body.appendChild(el);
        const f = getComputedStyle(el).fontFamily;
        el.remove();
        return f || "sans-serif";
      };
      fonts.current = {
        head: probe("--font-chakra-petch"),
        label: probe("--font-space-grotesk"),
        body: probe("--font-inter"),
      };
      try {
        await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      } catch {
        /* ignore */
      }
      const disp = fitDisplay(F.w, F.h);
      dims.current = disp;
      canvas = new fabric.Canvas(canvasElRef.current, {
        width: disp.dispW,
        height: disp.dispH,
        backgroundColor: NAVY,
        preserveObjectStacking: true,
        selection: true,
      });
      canvas.setZoom(disp.dispW / F.w);
      fcRef.current = canvas;

      const bump = () => setTick((t) => t + 1);
      canvas.on("selection:created", refreshSel);
      canvas.on("selection:updated", refreshSel);
      canvas.on("selection:cleared", () => setSel(null));
      canvas.on("object:modified", () => {
        refreshSel();
        bump();
      });
      canvas.on("text:changed", refreshSel);
      canvas.on("object:moving", (e) => {
        const o = e.target as FabricObject | undefined;
        if (!o) return;
        const sw = o.getScaledWidth();
        const sh = o.getScaledHeight();
        const cx = (o.left ?? 0) + sw / 2;
        const cy = (o.top ?? 0) + sh / 2;
        const th = Math.max(6, F.w * 0.008);
        if (Math.abs(cx - F.w / 2) < th) o.set({ left: F.w / 2 - sw / 2 });
        if (Math.abs(cy - F.h / 2) < th) o.set({ top: F.h / 2 - sh / 2 });
      });

      setReady(true);
      seedTemplate("news", canvas, fabric);
      bump();
    })();
    return () => {
      disposed = true;
      canvas?.dispose();
      fcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seed the canvas from ONE Content Studio slide (its text lines). Reuses the
  // same "clear text but keep photos + scrim" rule as seedTemplate, lays out a
  // headline + body in brand fonts, and re-adds the logo. Everything stays
  // editable like any other text object.
  const seedFromSlide = useCallback(
    (
      lines: string[],
      canvas?: FCanvas | null,
      fabric?: typeof import("fabric") | null,
    ) => {
      const c = canvas ?? fcRef.current;
      const fab = fabric ?? fabricRef.current;
      if (!c || !fab) return;
      c.getObjects()
        .filter((o) => {
          const t = o as Tagged & PhotoProps;
          return !t.isPhoto && t.role !== "scrim";
        })
        .forEach((o) => c.remove(o));
      const clean = (lines || []).map((l) => (l ?? "").trim()).filter(Boolean);
      const head = clean[0] ?? "";
      const body = clean.slice(1);
      if (head) {
        const t = new fab.Textbox(head, {
          left: Math.round(0.06 * F.w),
          top: Math.round(0.1 * F.h),
          width: Math.round(0.88 * F.w),
          fontSize: Math.round(0.085 * F.h),
          fill: "#ffffff",
          fontFamily: fontFamily("head"),
          fontWeight: 800,
          lineHeight: 1.02,
          originX: "left" as const,
          originY: "top" as const,
          editable: true,
        });
        (t as Tagged).role = "head";
        (t as Tagged).oid = nextOid();
        c.add(t);
      }
      body.forEach((line, i) => {
        const t = new fab.Textbox(line, {
          left: Math.round(0.06 * F.w),
          top: Math.round((0.42 + i * 0.11) * F.h),
          width: Math.round(0.88 * F.w),
          fontSize: Math.round(0.045 * F.h),
          fill: "#e6edf6",
          fontFamily: fontFamily("body"),
          fontWeight: 600,
          lineHeight: 1.12,
          originX: "left" as const,
          originY: "top" as const,
          editable: true,
        });
        (t as Tagged).role = "body";
        (t as Tagged).oid = nextOid();
        c.add(t);
      });
      addBrandLogo(c, fab);
      c.requestRenderAll();
      setTick((n) => n + 1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [F.w, F.h],
  );

  const goSlide = useCallback(
    (delta: number) => {
      if (!seed?.slides?.length) return;
      const next = Math.min(
        Math.max(0, slideIdx + delta),
        seed.slides.length - 1,
      );
      setSlideIdx(next);
      seedFromSlide(seed.slides[next] ?? []);
    },
    [seed, slideIdx, seedFromSlide],
  );

  // When a seed arrives from Content Studio, switch aspect/template and drop the
  // first slide's copy onto the canvas (runs once the canvas is ready).
  useEffect(() => {
    if (!seed?.token || !ready) return;
    if (isFmtKey(seed.format)) setFmt(seed.format);
    if (isTplKey(seed.template)) setTpl(seed.template);
    setSlideIdx(0);
    seedFromSlide(seed.slides?.[0] ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.token, ready]);

  const onTemplate = (key: TplKey) => {
    setTpl(key);
    seedTemplate(key);
    setSel(null);
  };

  // format change: resize the canvas, then reposition content by its relative
  // centre and scale it UNIFORMLY (same factor on X and Y) so nothing ever
  // stretches. The uniform factor is the smaller axis ratio, which keeps
  // content in bounds when the aspect ratio changes.
  useEffect(() => {
    const c = fcRef.current;
    const fab = fabricRef.current;
    if (!c) return;
    const p = prevF.current;
    const rx = F.w / p.w;
    const ry = F.h / p.h;
    if ((rx !== 1 || ry !== 1) && fab) {
      const s = Math.min(rx, ry);
      c.getObjects().forEach((o) => {
        // The scrim always refills the whole canvas; don't scale/move it.
        const role = (o as Tagged).role;
        // Scrim and background photos refit to the whole canvas separately.
        if (role === "scrim" || role === "bgphoto") return;
        const cp = o.getCenterPoint();
        const fracX = cp.x / p.w;
        const fracY = cp.y / p.h;
        o.set({
          scaleX: (o.scaleX ?? 1) * s,
          scaleY: (o.scaleY ?? 1) * s,
        });
        o.setCoords();
        o.setPositionByOrigin(
          new fab.Point(fracX * F.w, fracY * F.h),
          "center",
          "center",
        );
        o.setCoords();
      });
      // Refit the scrim to the new canvas.
      c.getObjects()
        .filter((o) => (o as Tagged).role === "scrim")
        .forEach((o) => {
          o.set({
            left: 0,
            top: 0,
            scaleX: 1,
            scaleY: 1,
            width: F.w,
            height: F.h,
            fill: buildScrimFill(fab),
          });
          o.setCoords();
        });
      // Re-cover any background photo layers to the new canvas.
      c.getObjects()
        .filter((o) => (o as Tagged).role === "bgphoto")
        .forEach((o) => {
          const meta = o as unknown as PhotoProps;
          const natW = meta.natW || 1;
          const natH = meta.natH || 1;
          const cover = Math.max(F.w / natW, F.h / natH);
          o.set({ scaleX: cover, scaleY: cover });
          o.setCoords();
          o.setPositionByOrigin(
            new fab.Point(F.w / 2, F.h / 2),
            "center",
            "center",
          );
          o.setCoords();
        });
      if (bgGrad.current) {
        // Rebuild the gradient background at the new size.
        c.backgroundColor = new fab.Gradient({
          type: "linear",
          gradientUnits: "pixels",
          coords: { x1: 0, y1: 0, x2: F.w, y2: F.h },
          colorStops: [
            { offset: 0, color: bgGrad.current.from },
            { offset: 1, color: bgGrad.current.to },
          ],
        });
      }
    }
    const disp = fitDisplay(F.w, F.h);
    dims.current = disp;
    c.setDimensions({ width: disp.dispW, height: disp.dispH });
    c.setZoom(disp.dispW / F.w);
    c.requestRenderAll();
    prevF.current = { w: F.w, h: F.h };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fmt, ready]);

  const addImageFromSrc = useCallback(
    async (src: string) => {
      const c = fcRef.current;
      const fab = fabricRef.current;
      if (!c || !fab || !src) return;
      // Load the pixels once, then draw them as a Pattern fill on a shape so a
      // border can follow that shape. Never upscale past 1x (keeps it crisp).
      const loader = await fab.FabricImage.fromURL(src, {
        crossOrigin: "anonymous",
      });
      const el = loader.getElement() as HTMLImageElement | HTMLCanvasElement;
      const natW = loader.width || 1;
      const natH = loader.height || 1;
      const scale = Math.min((F.w * 0.9) / natW, (F.h * 0.9) / natH, 1);
      const obj = makePhoto(fab, el, natW, natH, "original", {
        left: Math.round((F.w - natW * scale) / 2),
        top: Math.round((F.h - natH * scale) / 2),
        scale,
      });
      (obj as Tagged).oid = nextOid();
      (obj as Tagged).role = "image";
      c.add(obj);
      c.sendObjectToBack(obj);
      c.setActiveObject(obj);
      c.requestRenderAll();
      refreshSel();
      setTick((t) => t + 1);
    },
    [F.w, F.h, refreshSel],
  );

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const r = new FileReader();
    r.onload = () => addImageFromSrc(String(r.result || ""));
    r.readAsDataURL(file);
  };

  // ---- Backgrounds -------------------------------------------------------
  // A branded gradient fill. Clears any background image so it shows through.
  const applyBgGradient = (g: { from: string; to: string }) => {
    const c = fcRef.current;
    const fab = fabricRef.current;
    if (!c || !fab) return;
    bgGrad.current = { from: g.from, to: g.to };
    c.backgroundColor = new fab.Gradient({
      type: "linear",
      gradientUnits: "pixels",
      coords: { x1: 0, y1: 0, x2: F.w, y2: F.h },
      colorStops: [
        { offset: 0, color: g.from },
        { offset: 1, color: g.to },
      ],
    });
    c.requestRenderAll();
    setTick((t) => t + 1);
  };
  const applyBgSolid = (color: string) => {
    const c = fcRef.current;
    if (!c) return;
    bgGrad.current = null;
    c.backgroundColor = color;
    c.requestRenderAll();
    setTick((t) => t + 1);
  };
  // Fill the canvas edge-to-edge with an image, locked behind everything.
  const addBgImageFromSrc = useCallback(
    async (src: string) => {
      const c = fcRef.current;
      const fab = fabricRef.current;
      if (!c || !fab || !src) return;
      // A background is just a normal photo layer sized to cover the canvas and
      // sent to the back — so it stays fully movable, resizable and deletable.
      const loader = await fab.FabricImage.fromURL(src, {
        crossOrigin: "anonymous",
      });
      const el = loader.getElement() as HTMLImageElement | HTMLCanvasElement;
      const natW = loader.width || 1;
      const natH = loader.height || 1;
      const cover = Math.max(F.w / natW, F.h / natH);
      const obj = makePhoto(fab, el, natW, natH, "original", {
        left: 0,
        top: 0,
        scale: cover,
      });
      (obj as Tagged).oid = nextOid();
      (obj as Tagged).role = "bgphoto";
      c.add(obj);
      obj.setPositionByOrigin(
        new fab.Point(F.w / 2, F.h / 2),
        "center",
        "center",
      );
      obj.setCoords();
      c.sendObjectToBack(obj);
      c.setActiveObject(obj);
      c.requestRenderAll();
      refreshSel();
      setTick((t) => t + 1);
    },
    [F.w, F.h, refreshSel],
  );
  const onPickBgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const r = new FileReader();
    r.onload = () => addBgImageFromSrc(String(r.result || ""));
    r.readAsDataURL(file);
  };
  // Promote the selected photo layer to the full-bleed background.
  const setSelectedAsBackground = () => {
    const o = active();
    const c = fcRef.current;
    const fab = fabricRef.current;
    const p = o as unknown as PhotoProps;
    if (!o || !c || !fab || !p.isPhoto || !p.srcEl) return;
    // Recut to full-frame, size to cover, drop to the back — but keep it a
    // normal, fully-editable photo layer (still selected afterward).
    const natW = p.natW || 1;
    const natH = p.natH || 1;
    const cover = Math.max(F.w / natW, F.h / natH);
    const next = makePhoto(fab, p.srcEl, natW, natH, "original", {
      left: 0,
      top: 0,
      scale: cover,
      opacity: (o.opacity as number) ?? 1,
    });
    (next as Tagged).oid = (o as Tagged).oid || nextOid();
    (next as Tagged).role = "bgphoto";
    c.remove(o);
    c.add(next);
    next.setPositionByOrigin(
      new fab.Point(F.w / 2, F.h / 2),
      "center",
      "center",
    );
    next.setCoords();
    c.sendObjectToBack(next);
    c.setActiveObject(next);
    c.requestRenderAll();
    refreshSel();
    setTick((t) => t + 1);
  };
  // A dark bottom-up gradient over the background so text stays readable.
  const buildScrimFill = (fab: typeof import("fabric")) =>
    new fab.Gradient({
      type: "linear",
      gradientUnits: "pixels",
      coords: { x1: 0, y1: 0, x2: 0, y2: F.h },
      colorStops: [
        { offset: 0, color: "rgba(0,0,0,0)" },
        { offset: 0.5, color: "rgba(0,0,0,0)" },
        { offset: 1, color: "rgba(0,0,0,0.85)" },
      ],
    });
  const addScrim = () => {
    const c = fcRef.current;
    const fab = fabricRef.current;
    if (!c || !fab) return;
    c.getObjects()
      .filter((o) => (o as Tagged).role === "scrim")
      .forEach((o) => c.remove(o));
    const rect = new fab.Rect({
      left: 0,
      top: 0,
      width: F.w,
      height: F.h,
      originX: "left",
      originY: "top",
      fill: buildScrimFill(fab),
      objectCaching: false,
    });
    (rect as Tagged).oid = nextOid();
    (rect as Tagged).role = "scrim";
    c.add(rect);
    c.sendObjectToBack(rect);
    // Keep background photos beneath the scrim.
    c.getObjects()
      .filter((o) => (o as Tagged).role === "bgphoto")
      .forEach((o) => c.sendObjectToBack(o));
    c.requestRenderAll();
    setTick((t) => t + 1);
  };

  const addTextObject = () => {
    const c = fcRef.current;
    const fab = fabricRef.current;
    if (!c || !fab) return;
    const tb = new fab.Textbox("Your text", {
      left: Math.round(F.w * 0.1),
      top: Math.round(F.h * 0.45),
      width: Math.round(F.w * 0.8),
      fontSize: Math.round(F.h * 0.05),
      fill: CREAM,
      fontFamily: fontFamily("head"),
      fontWeight: 700,
      editable: true,
      originX: "left",
      originY: "top",
    });
    installPaddedBg(tb);
    (tb as Tagged).role = "text";
    (tb as Tagged).oid = nextOid();
    c.add(tb);
    c.setActiveObject(tb);
    c.requestRenderAll();
    refreshSel();
    setTick((t) => t + 1);
  };

  function loadFromPost(pst: BlogPost) {
    const c = fcRef.current;
    if (!c) return;
    const head = c.getObjects().find((o) => (o as Tagged).role === "headline");
    if (head) {
      (head as unknown as { set: (k: string, v: string) => void }).set(
        "text",
        (pst.title || "").toUpperCase(),
      );
    }
    c.requestRenderAll();
    if (pst.heroImageUrl)
      addImageFromSrc(
        "/api/admin/img?url=" + encodeURIComponent(pst.heroImageUrl),
      );
    setTick((t) => t + 1);
  }

  const active = () => fcRef.current?.getActiveObject() as Tagged | undefined;
  const applyActive = (patch: Record<string, unknown>) => {
    const o = active();
    const c = fcRef.current;
    if (!o || !c) return;
    o.set(patch);
    o.setCoords();
    c.requestRenderAll();
    refreshSel();
  };
  // Padding + highlight background for any text element.
  const setTextPad = (v: number) => {
    const o = active();
    const c = fcRef.current;
    if (!o || !c) return;
    const pt = o as unknown as PadObj;
    pt.padX = v;
    pt.padY = Math.round(v * 0.6);
    installPaddedBg(o);
    o.set("dirty", true);
    c.requestRenderAll();
    refreshSel();
    setTick((t) => t + 1);
  };
  const setTextBg = (color: string) => {
    const o = active();
    const c = fcRef.current;
    if (!o || !c) return;
    o.set({ backgroundColor: color || undefined });
    installPaddedBg(o);
    const pt = o as unknown as PadObj;
    if (color && !pt.padX) {
      pt.padX = Math.round(F.h * 0.012);
      pt.padY = Math.round(F.h * 0.007);
    }
    o.set("dirty", true);
    c.requestRenderAll();
    refreshSel();
    setTick((t) => t + 1);
  };
  // Recut an image layer to a shape. Rebuilds it as a Pattern-filled shape so a
  // border (stroke) follows the outline. Preserves centre, scale, rotation,
  // opacity, border and stacking order.
  const applyImageShape = (shape: PhotoShape) => {
    const o = active();
    const fab = fabricRef.current;
    const c = fcRef.current;
    const p = o as unknown as PhotoProps & {
      scaleX?: number;
      angle?: number;
      opacity?: number;
      stroke?: string;
      strokeWidth?: number;
    };
    if (!o || !fab || !c || !p.isPhoto || !p.srcEl) return;
    const center = o.getCenterPoint();
    const next = makePhoto(fab, p.srcEl, p.natW || 1, p.natH || 1, shape, {
      left: o.left ?? 0,
      top: o.top ?? 0,
      scale: p.scaleX ?? 1,
      angle: p.angle ?? 0,
      opacity: p.opacity ?? 1,
      stroke: p.stroke || "",
      strokeWidth: p.strokeWidth || 0,
    });
    (next as Tagged).oid = (o as Tagged).oid || nextOid();
    (next as Tagged).role = "image";
    const idx = c.getObjects().indexOf(o);
    c.remove(o);
    c.add(next);
    if (idx >= 0) c.moveObjectTo(next, idx);
    next.setPositionByOrigin(center, "center", "center");
    next.setCoords();
    c.setActiveObject(next);
    c.requestRenderAll();
    refreshSel();
    setTick((t) => t + 1);
  };
  const deleteActive = () => {
    const o = active();
    const c = fcRef.current;
    if (!o || !c) return;
    c.remove(o);
    c.discardActiveObject();
    c.requestRenderAll();
    setSel(null);
    setTick((t) => t + 1);
  };
  // Delete / Backspace removes the selected object (unless editing text or typing
  // in a form field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const o = fcRef.current?.getActiveObject() as
        | (FabricObject & { isEditing?: boolean })
        | undefined;
      if (!o || o.isEditing) return;
      e.preventDefault();
      deleteActive();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const duplicateActive = async () => {
    const o = active();
    const c = fcRef.current;
    const fab = fabricRef.current;
    if (!o || !c) return;
    const p = o as unknown as PhotoProps & {
      scaleX?: number;
      angle?: number;
      opacity?: number;
      stroke?: string;
      strokeWidth?: number;
    };
    let clone: FabricObject;
    if (fab && p.isPhoto && p.srcEl) {
      // Pattern fills don't survive clone(), so rebuild the photo instead.
      clone = makePhoto(
        fab,
        p.srcEl,
        p.natW || 1,
        p.natH || 1,
        p.shape || "original",
        {
          left: (o.left ?? 0) + 24,
          top: (o.top ?? 0) + 24,
          scale: p.scaleX ?? 1,
          angle: p.angle ?? 0,
          opacity: p.opacity ?? 1,
          stroke: p.stroke || "",
          strokeWidth: p.strokeWidth || 0,
        },
      );
    } else {
      clone = await o.clone();
      clone.set({ left: (o.left ?? 0) + 24, top: (o.top ?? 0) + 24 });
      const srcP = o as unknown as PadObj;
      const clP = clone as unknown as PadObj;
      clP.padX = srcP.padX;
      clP.padY = srcP.padY;
      installPaddedBg(clone);
    }
    (clone as Tagged).oid = nextOid();
    (clone as Tagged).role = (o as Tagged).role;
    c.add(clone);
    c.setActiveObject(clone);
    c.requestRenderAll();
    refreshSel();
    setTick((t) => t + 1);
  };
  const orderActive = (dir: "front" | "back") => {
    const o = active();
    const c = fcRef.current;
    if (!o || !c) return;
    if (dir === "front") c.bringObjectToFront(o);
    else c.sendObjectToBack(o);
    c.requestRenderAll();
    setTick((t) => t + 1);
  };
  const selectByOid = (oid: string) => {
    const c = fcRef.current;
    if (!c) return;
    const o = c.getObjects().find((x) => (x as Tagged).oid === oid);
    if (o) {
      c.setActiveObject(o);
      c.requestRenderAll();
      refreshSel();
    }
  };

  const renderFull = (): string => {
    const c = fcRef.current;
    if (!c) return "";
    const disp = dims.current;
    c.discardActiveObject();
    c.setZoom(1);
    c.setDimensions({ width: F.w, height: F.h });
    const url = c.toDataURL({ format: "png", multiplier: 2 });
    c.setDimensions({ width: disp.dispW, height: disp.dispH });
    c.setZoom(disp.dispW / F.w);
    c.requestRenderAll();
    return url;
  };
  const download = () => {
    const url = renderFull();
    if (!url) return;
    const a = document.createElement("a");
    a.download = `nexzy-${tpl}-${F.w}x${F.h}.png`;
    a.href = url;
    a.click();
  };
  const copyToClipboard = async () => {
    try {
      const url = renderFull();
      const blob = await (await fetch(url)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      alert("Copied — paste into your post.");
    } catch {
      alert("Copy not supported here — use Download.");
    }
  };

  const layerList = (() => {
    void tick;
    const c = fcRef.current;
    if (!c) return [] as { oid: string; label: string }[];
    return c
      .getObjects()
      .map((o) => {
        const t = o as Tagged;
        const role = (o as Tagged).role;
        const label = (o as unknown as PhotoProps).isPhoto
          ? role === "bgphoto"
            ? "Background"
            : "Image"
          : role === "logo"
            ? "Nexzy logo"
            : role === "scrim"
              ? "Scrim"
              : `Text · ${(o as unknown as { text?: string }).text?.slice(0, 22) || ""}`;
        return { oid: t.oid || "", label };
      })
      .reverse();
  })();

  return (
    <HStack align="flex-start" gap={8} wrap="wrap">
      <VStack align="stretch" gap={4} w={{ base: "100%", lg: "400px" }}>
        {seed && seed.slides && seed.slides.length > 0 && (
          <Box
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="whiteAlpha.300"
            borderRadius="lg"
            p={3}
          >
            <Text fontSize="xs" color="gray.400" mb={2} letterSpacing="wider">
              FROM CONTENT STUDIO{seed.title ? ` · ${seed.title}` : ""}
            </Text>
            <HStack justify="space-between" align="center">
              <Button
                size="sm"
                variant="outline"
                colorPalette="blue"
                disabled={slideIdx <= 0}
                onClick={() => goSlide(-1)}
              >
                Prev
              </Button>
              <Text color="white" fontSize="sm" fontWeight="700">
                {seed.slides.length > 1 ? "Slide " : ""}
                {slideIdx + 1} / {seed.slides.length}
              </Text>
              <Button
                size="sm"
                variant="outline"
                colorPalette="blue"
                disabled={slideIdx >= seed.slides.length - 1}
                onClick={() => goSlide(1)}
              >
                Next
              </Button>
            </HStack>
            <Button
              size="xs"
              variant="ghost"
              colorPalette="blue"
              mt={2}
              onClick={() => seedFromSlide(seed.slides[slideIdx] ?? [])}
            >
              Re-seed this slide&apos;s text
            </Button>
          </Box>
        )}
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
                onClick={() => onTemplate(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </HStack>
        </Box>

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

        {sel && (
          <Box
            borderWidth="1px"
            borderColor="whiteAlpha.300"
            borderRadius="lg"
            p={3}
          >
            <Text fontSize="xs" color="nexzy.lightBlue" fontWeight="700" mb={2}>
              SELECTED {sel.type === "image" ? "IMAGE" : "TEXT"} — drag & pull
              handles on the card
            </Text>
            {sel.type === "text" && (
              <VStack align="stretch" gap={2}>
                <Textarea
                  {...FIELD}
                  rows={2}
                  value={sel.text || ""}
                  onChange={(e) => applyActive({ text: e.target.value })}
                />
                <HStack gap={1} wrap="wrap">
                  {ALL_COLORS.map((c) => (
                    <Box
                      as="button"
                      key={c}
                      onClick={() => applyActive({ fill: c })}
                      w="22px"
                      h="22px"
                      borderRadius="full"
                      style={{ background: c }}
                      borderWidth="2px"
                      borderColor={
                        (sel.fill || "").toLowerCase() === c.toLowerCase()
                          ? "white"
                          : "whiteAlpha.400"
                      }
                    />
                  ))}
                </HStack>
                <Text fontSize="10px" color="gray.500">
                  Size · {sel.fontSize}px
                </Text>
                <input
                  type="range"
                  min={Math.round(F.h * 0.015)}
                  max={Math.round(F.h * 0.16)}
                  value={sel.fontSize || 24}
                  onChange={(e) =>
                    applyActive({ fontSize: Number(e.target.value) })
                  }
                  style={{ width: "100%" }}
                />
                <HStack gap={1} wrap="wrap">
                  <Button
                    size="xs"
                    variant={sel.bold ? "solid" : "outline"}
                    colorPalette="blue"
                    onClick={() =>
                      applyActive({ fontWeight: sel.bold ? 400 : 700 })
                    }
                  >
                    Bold
                  </Button>
                  <Button
                    size="xs"
                    variant={sel.italic ? "solid" : "outline"}
                    colorPalette="blue"
                    onClick={() =>
                      applyActive({
                        fontStyle: sel.italic ? "normal" : "italic",
                      })
                    }
                  >
                    Italic
                  </Button>
                  {(["left", "center", "right"] as const).map((a) => (
                    <Button
                      key={a}
                      size="xs"
                      variant={sel.textAlign === a ? "solid" : "outline"}
                      colorPalette="blue"
                      onClick={() => applyActive({ textAlign: a })}
                    >
                      {a[0].toUpperCase()}
                    </Button>
                  ))}
                </HStack>
                <Text fontSize="10px" color="gray.500" mt={2}>
                  Padding · {sel.pad ?? 0}px
                </Text>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={sel.pad ?? 0}
                  onChange={(e) => setTextPad(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <Text fontSize="10px" color="gray.500" mt={1} mb={1}>
                  Highlight background
                </Text>
                <HStack gap={1} wrap="wrap">
                  <Button
                    size="xs"
                    variant={!sel.bg ? "solid" : "outline"}
                    colorPalette="gray"
                    onClick={() => setTextBg("")}
                  >
                    None
                  </Button>
                  {ALL_COLORS.map((col) => (
                    <Box
                      key={col}
                      as="button"
                      onClick={() => setTextBg(col)}
                      w="20px"
                      h="20px"
                      borderRadius="4px"
                      bg={col}
                      borderWidth={
                        (sel.bg || "").toLowerCase() === col.toLowerCase()
                          ? "2px"
                          : "1px"
                      }
                      borderColor={
                        (sel.bg || "").toLowerCase() === col.toLowerCase()
                          ? "blue.400"
                          : "whiteAlpha.400"
                      }
                    />
                  ))}
                </HStack>
              </VStack>
            )}
            {sel.type === "image" && (
              <Box mb={1}>
                <Text fontSize="10px" color="gray.500" mb={1}>
                  Shape
                </Text>
                <HStack gap={1} wrap="wrap">
                  {(["original", "circle", "square", "rounded"] as const).map(
                    (sh) => (
                      <Button
                        key={sh}
                        size="xs"
                        variant={
                          (sel.shape || "original") === sh ? "solid" : "outline"
                        }
                        colorPalette="blue"
                        onClick={() => applyImageShape(sh)}
                      >
                        {sh}
                      </Button>
                    ),
                  )}
                </HStack>
              </Box>
            )}
            {sel.type === "image" && (
              <Box mt={2}>
                <Text fontSize="10px" color="gray.500" mb={1}>
                  Border
                </Text>
                <HStack gap={1} wrap="wrap" mb={1}>
                  <Button
                    size="xs"
                    variant={!sel.strokeWidth ? "solid" : "outline"}
                    colorPalette="gray"
                    onClick={() => applyActive({ stroke: "", strokeWidth: 0 })}
                  >
                    None
                  </Button>
                  {ALL_COLORS.map((col) => (
                    <Box
                      key={col}
                      as="button"
                      onClick={() =>
                        applyActive({
                          stroke: col,
                          strokeWidth: sel.strokeWidth || 8,
                        })
                      }
                      w="22px"
                      h="22px"
                      borderRadius="4px"
                      bg={col}
                      borderWidth={sel.stroke === col ? "2px" : "1px"}
                      borderColor={
                        sel.stroke === col ? "blue.400" : "whiteAlpha.400"
                      }
                    />
                  ))}
                </HStack>
                <Text fontSize="10px" color="gray.500">
                  Thickness · {sel.strokeWidth ?? 0}px
                </Text>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={sel.strokeWidth ?? 0}
                  onChange={(e) =>
                    applyActive({
                      strokeWidth: Number(e.target.value),
                      stroke: sel.stroke || "#FFFFFF",
                    })
                  }
                  style={{ width: "100%" }}
                />
              </Box>
            )}
            <Box mt={2}>
              <Text fontSize="10px" color="gray.500">
                Opacity · {sel.opacity ?? 100}%
              </Text>
              <input
                type="range"
                min={0}
                max={100}
                value={sel.opacity ?? 100}
                onChange={(e) =>
                  applyActive({ opacity: Number(e.target.value) / 100 })
                }
                style={{ width: "100%" }}
              />
            </Box>
            <HStack gap={2} mt={2} wrap="wrap">
              <Button
                size="xs"
                variant="outline"
                colorPalette="blue"
                onClick={() => orderActive("front")}
              >
                Front
              </Button>
              <Button
                size="xs"
                variant="outline"
                colorPalette="blue"
                onClick={() => orderActive("back")}
              >
                Back
              </Button>
              <Button
                size="xs"
                variant="outline"
                colorPalette="blue"
                onClick={duplicateActive}
              >
                Duplicate
              </Button>
              {sel.type === "image" && (
                <Button
                  size="xs"
                  variant="outline"
                  colorPalette="purple"
                  onClick={setSelectedAsBackground}
                >
                  Set as BG
                </Button>
              )}
              <Button
                size="xs"
                variant="solid"
                colorPalette="red"
                onClick={deleteActive}
              >
                🗑 Delete
              </Button>
            </HStack>
          </Box>
        )}

        {panelTab === "content" && (
          <VStack align="stretch" gap={3}>
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
                mb={2}
                placeholder="Search your articles…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <VStack align="stretch" gap={1} maxH="220px" overflowY="auto">
                {posts
                  .filter((p) =>
                    (p.title || "").toLowerCase().includes(q.toLowerCase()),
                  )
                  .slice(0, 30)
                  .map((p) => (
                    <HStack
                      key={p.id}
                      p={2}
                      borderRadius="md"
                      cursor="pointer"
                      _hover={{ bg: "whiteAlpha.100" }}
                      onClick={() => loadFromPost(p)}
                    >
                      {p.heroImageUrl && (
                        <CkImage
                          src={p.heroImageUrl}
                          alt=""
                          boxSize="34px"
                          objectFit="cover"
                          borderRadius="sm"
                        />
                      )}
                      <Text fontSize="sm" color="whiteAlpha.900" lineClamp={1}>
                        {p.title}
                      </Text>
                    </HStack>
                  ))}
              </VStack>
            </Box>
            <Text fontSize="11px" color="gray.500">
              Tip: double-click any text on the card to edit it inline, or
              select it and edit above.
            </Text>
          </VStack>
        )}

        {panelTab === "design" && (
          <VStack align="stretch" gap={4}>
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
              <Text fontSize="xs" color="gray.400" mb={2} letterSpacing="wider">
                BACKGROUND · GRADIENTS
              </Text>
              <HStack gap={1} wrap="wrap">
                {BG_GRADIENTS.map((g) => (
                  <Box
                    as="button"
                    key={g.name}
                    title={g.name}
                    onClick={() => applyBgGradient(g)}
                    w="30px"
                    h="30px"
                    borderRadius="md"
                    style={{
                      background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                    }}
                    borderWidth="2px"
                    borderColor="whiteAlpha.400"
                  />
                ))}
              </HStack>
              <Text
                fontSize="xs"
                color="gray.400"
                mt={3}
                mb={2}
                letterSpacing="wider"
              >
                BACKGROUND · SOLID
              </Text>
              <HStack gap={1} wrap="wrap">
                {[
                  "#1A1F3A",
                  "#12162b",
                  "#0a0d1a",
                  "#000000",
                  "#007BFF",
                  "#4DA3FF",
                  "#FFB74D",
                  "#FFD700",
                  "#F5EFE0",
                  "#FFFFFF",
                ].map((c) => (
                  <Box
                    as="button"
                    key={c}
                    onClick={() => applyBgSolid(c)}
                    w="26px"
                    h="26px"
                    borderRadius="md"
                    style={{ background: c }}
                    borderWidth="2px"
                    borderColor="whiteAlpha.400"
                  />
                ))}
              </HStack>
              <VStack align="stretch" gap={2} mt={3}>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="blue"
                  onClick={() => bgFileRef.current?.click()}
                >
                  🖼 Set background image
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="gray"
                  onClick={addScrim}
                >
                  🌗 Add readability scrim
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="blue"
                  onClick={() => addBrandLogo()}
                >
                  ⚡ Add Nexzy logo
                </Button>
              </VStack>
            </Box>
          </VStack>
        )}

        {panelTab === "image" && (
          <VStack align="stretch" gap={3}>
            <Button
              size="sm"
              colorPalette="blue"
              onClick={() => fileRef.current?.click()}
            >
              + Add photo (movable layer)
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorPalette="blue"
              onClick={addTextObject}
            >
              + Add text
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorPalette="blue"
              onClick={() => addBrandLogo()}
            >
              ⚡ Add Nexzy logo
            </Button>
            <Text fontSize="11px" color="gray.500">
              Photos import at true size (nothing cropped). Drag to move, pull a
              corner to resize, the top handle to rotate. Select a photo and hit
              “Set as BG” to make it the full-bleed background.
            </Text>
          </VStack>
        )}

        {panelTab === "layers" && (
          <VStack align="stretch" gap={2}>
            <HStack gap={2}>
              <Button
                size="sm"
                colorPalette="blue"
                onClick={() => fileRef.current?.click()}
              >
                + Photo
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorPalette="blue"
                onClick={addTextObject}
              >
                + Text
              </Button>
            </HStack>
            {layerList.length === 0 && (
              <Text fontSize="xs" color="gray.500">
                No layers yet.
              </Text>
            )}
            {layerList.map((l) => (
              <HStack
                key={l.oid}
                p={2}
                borderRadius="md"
                cursor="pointer"
                bg="whiteAlpha.50"
                _hover={{ bg: "whiteAlpha.100" }}
                onClick={() => selectByOid(l.oid)}
              >
                <Text fontSize="xs" color="whiteAlpha.900" lineClamp={1}>
                  {l.label}
                </Text>
              </HStack>
            ))}
          </VStack>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onPickFile}
        />
        <input
          ref={bgFileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onPickBgFile}
        />

        <VStack
          align="stretch"
          gap={2}
          pt={3}
          borderTopWidth="1px"
          borderColor="whiteAlpha.200"
        >
          <Button colorPalette="blue" size="lg" onClick={download}>
            ⬇ Download PNG · {FORMATS[fmt].label}
          </Button>
          <Button
            variant="outline"
            colorPalette="blue"
            size="sm"
            onClick={copyToClipboard}
          >
            ⧉ Copy to clipboard
          </Button>
        </VStack>
      </VStack>

      <VStack align="center" flex="1" minW="320px" position="sticky" top="16px">
        <Heading size="sm" color="gray.400" mb={2}>
          Preview
        </Heading>
        <Box
          borderRadius="lg"
          overflow="hidden"
          boxShadow="0 20px 60px rgba(0,0,0,.5)"
          position="relative"
        >
          {!ready && (
            <Box
              position="absolute"
              inset={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              zIndex={1}
            >
              <Spinner color="nexzy.blue" />
            </Box>
          )}
          <canvas ref={canvasElRef} />
        </Box>
        <Text fontSize="xs" color="gray.500" mt={2}>
          {F.w} × {F.h} · exports at 2× ({F.w * 2} × {F.h * 2})
        </Text>
      </VStack>
    </HStack>
  );
}
