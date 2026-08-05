"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  Textarea,
} from "@chakra-ui/react";
import { FiImage } from "react-icons/fi";
import { uploadArticleImage, uploadBodyImage } from "@/lib/admin/client";
import type { PostEditor } from "./usePostEditor";

/**
 * Collage maker (general purpose, Nexzy-styled). Pick a layout + ratio, drop an
 * image into each cell (drag to reposition, slider to zoom), add movable/editable
 * title/body text overlays, optionally turn on Nexzy accents (gold bar + N +
 * glow), then Download the PNG — or push it straight to the article as the hero
 * or into the body. Pure client-side <canvas>: what you see IS what exports, so
 * there is no backend, no image-processing library, and no new package.
 */

// Fallback font stacks; at runtime we resolve the app's real Chakra Petch / Inter
// families from the CSS variables so the canvas matches the site.
const TITLE_FB = "'Chakra Petch', system-ui, sans-serif";
const BODY_FB = "'Inter', system-ui, sans-serif";

type Ratio = { key: string; label: string; w: number; h: number };
const RATIOS: Ratio[] = [
  { key: "16:9", label: "16:9 hero", w: 1280, h: 720 },
  { key: "1:1", label: "1:1 square", w: 1080, h: 1080 },
  { key: "4:5", label: "4:5 portrait", w: 1080, h: 1350 },
  { key: "9:16", label: "9:16 story", w: 1080, h: 1920 },
];

type LayoutKey = "1" | "2h" | "2v" | "3h" | "4" | "6";
const LAYOUTS: { key: LayoutKey; label: string; cells: number }[] = [
  { key: "1", label: "1", cells: 1 },
  { key: "2h", label: "2 ▮▮", cells: 2 },
  { key: "2v", label: "2 ▬", cells: 2 },
  { key: "3h", label: "3", cells: 3 },
  { key: "4", label: "4 (2×2)", cells: 4 },
  { key: "6", label: "6 (2×3)", cells: 6 },
];

type Bg = "navy" | "dark" | "white" | "transparent";
const BGS: { key: Bg; label: string }[] = [
  { key: "navy", label: "Navy" },
  { key: "dark", label: "Dark" },
  { key: "white", label: "White" },
  { key: "transparent", label: "Transparent" },
];

const SWATCHES = [
  "#FFFFFF",
  "#FFB74D",
  "#007BFF",
  "#4DA3FF",
  "#1A1F3A",
  "#0a0d1a",
];

type Cell = {
  src: string | null;
  img: HTMLImageElement | null;
  zoom: number;
  ox: number; // -1..1 pan
  oy: number;
};
type TextBlock = {
  id: string;
  kind: "title" | "body";
  text: string;
  xN: number; // 0..1 center
  yN: number;
  size: number; // px at native res
  color: string;
  bold: boolean;
  italic: boolean;
  align: CanvasTextAlign;
};
type Sel =
  | { type: "cell"; index: number }
  | { type: "text"; id: string }
  | null;

const blankCell = (): Cell => ({ src: null, img: null, zoom: 1, ox: 0, oy: 0 });

// ---- pure drawing (shared by the live canvas + the export canvas) ----
function hexA(h: string, a: number): string {
  const n = h.replace("#", "");
  return `rgba(${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)},${a})`;
}
function roundPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function coverPZ(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  zoom: number,
  ox: number,
  oy: number,
) {
  const base = Math.max(w / img.width, h / img.height);
  const s = base * (zoom || 1);
  const dw = img.width * s;
  const dh = img.height * s;
  const mx = (dw - w) / 2;
  const my = (dh - h) / 2;
  ctx.drawImage(
    img,
    x + (w - dw) / 2 + ox * mx,
    y + (h - dh) / 2 + oy * my,
    dw,
    dh,
  );
}

type Rect = { x: number; y: number; w: number; h: number };
function layoutRects(
  layout: LayoutKey,
  W: number,
  H: number,
  g: number,
  accent: boolean,
): Rect[] {
  const pad = Math.round(Math.min(W, H) * 0.03);
  const bottom = accent ? Math.round(H * 0.06) : pad;
  const x0 = pad;
  const y0 = pad;
  const w = W - pad * 2;
  const h = H - y0 - bottom;
  const grid = (cols: number, rows: number): Rect[] => {
    const cw = (w - g * (cols - 1)) / cols;
    const ch = (h - g * (rows - 1)) / rows;
    const R: Rect[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        R.push({ x: x0 + c * (cw + g), y: y0 + r * (ch + g), w: cw, h: ch });
    return R;
  };
  switch (layout) {
    case "1":
      return grid(1, 1);
    case "2h":
      return grid(2, 1);
    case "2v":
      return grid(1, 2);
    case "3h":
      return grid(3, 1);
    case "4":
      return grid(2, 2);
    case "6":
      return grid(3, 2);
    default:
      return grid(2, 2);
  }
}

const measureCtx =
  typeof document !== "undefined"
    ? document.createElement("canvas").getContext("2d")
    : null;
function textFont(
  t: TextBlock,
  fonts: { title: string; body: string },
): string {
  return `${t.italic ? "italic " : ""}${t.bold ? 700 : 600} ${t.size}px ${t.kind === "body" ? fonts.body : fonts.title}`;
}
function textMetrics(t: TextBlock, fonts: { title: string; body: string }) {
  const lines = (t.text || " ").split("\n");
  let w = 0;
  if (measureCtx) {
    measureCtx.font = textFont(t, fonts);
    for (const ln of lines) w = Math.max(w, measureCtx.measureText(ln).width);
  }
  return { w, h: t.size * 1.14 * lines.length, lines };
}
function drawText(
  ctx: CanvasRenderingContext2D,
  t: TextBlock,
  W: number,
  H: number,
  fonts: { title: string; body: string },
) {
  const x = t.xN * W;
  const y = t.yN * H;
  ctx.font = textFont(t, fonts);
  ctx.textAlign = t.align;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = t.size * 0.22;
  const lines = (t.text || "").split("\n");
  const lh = t.size * 1.14;
  lines.forEach((ln, i) => {
    ctx.fillStyle = t.color;
    ctx.fillText(ln, x, y + (i - (lines.length - 1) / 2) * lh);
  });
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

type DrawState = {
  ratio: Ratio;
  layout: LayoutKey;
  bg: Bg;
  accent: boolean;
  gutter: number;
  cells: Cell[];
  texts: TextBlock[];
};
function coreDraw(
  ctx: CanvasRenderingContext2D,
  s: DrawState,
  fonts: { title: string; body: string },
) {
  const W = s.ratio.w;
  const H = s.ratio.h;
  ctx.clearRect(0, 0, W, H);
  if (s.bg === "navy") {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#20264a");
    g.addColorStop(0.5, "#1A1F3A");
    g.addColorStop(1, "#12162b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (s.bg === "dark") {
    ctx.fillStyle = "#0a0d1a";
    ctx.fillRect(0, 0, W, H);
  } else if (s.bg === "white") {
    ctx.fillStyle = "#f4f6fb";
    ctx.fillRect(0, 0, W, H);
  }
  if (s.accent) {
    const rg = ctx.createRadialGradient(W * 0.16, 0, 0, W * 0.16, 0, W * 0.55);
    rg.addColorStop(0, hexA("#007BFF", 0.22));
    rg.addColorStop(1, hexA("#007BFF", 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }
  const R = layoutRects(s.layout, W, H, s.gutter, s.accent);
  R.forEach((r, i) => {
    const c = s.cells[i] || blankCell();
    const rad = Math.max(6, Math.min(r.w, r.h) * 0.03);
    ctx.save();
    roundPath(ctx, r.x, r.y, r.w, r.h, rad);
    ctx.clip();
    if (c.img) coverPZ(ctx, c.img, r.x, r.y, r.w, r.h, c.zoom, c.ox, c.oy);
    else {
      ctx.fillStyle = "rgba(255,255,255,0.045)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = `600 ${Math.round(r.h * 0.06)}px ${fonts.body}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("＋ Add image", r.x + r.w / 2, r.y + r.h / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
    roundPath(ctx, r.x, r.y, r.w, r.h, rad);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.stroke();
  });
  if (s.accent) {
    const bh = Math.round(H * 0.014);
    ctx.fillStyle = "#FFB74D";
    ctx.fillRect(0, H - bh, W, bh);
    const ls = Math.round(H * 0.065);
    const lx = W - Math.round(W * 0.022) - ls;
    const ly = H - bh - Math.round(H * 0.02) - ls;
    roundPath(ctx, lx, ly, ls, ls, 9);
    const lg = ctx.createLinearGradient(lx, ly, lx + ls, ly + ls);
    lg.addColorStop(0, "#007BFF");
    lg.addColorStop(0.6, "#4DA3FF");
    lg.addColorStop(1, "#FFB74D");
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.fillStyle = "#1A1F3A";
    ctx.font = `700 ${Math.round(ls * 0.6)}px ${fonts.title}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", lx + ls / 2, ly + ls / 2 + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  s.texts.forEach((t) => drawText(ctx, t, W, H, fonts));
}

// ---- small styled control atoms ----
function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="xs"
      onClick={onClick}
      bg={active ? "nexzy.blue" : "transparent"}
      color={active ? "white" : "nexzy.gray.100"}
      borderWidth="1px"
      borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
      _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
    >
      {children}
    </Button>
  );
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      color="nexzy.gray.100"
      fontSize="10px"
      fontWeight="700"
      textTransform="uppercase"
      letterSpacing="0.06em"
      mb={1}
    >
      {children}
    </Text>
  );
}

export default function CollageBuilder({ ed }: { ed: PostEditor }) {
  const [open, setOpen] = useState(false);
  const [ratio, setRatio] = useState<Ratio>(RATIOS[0]);
  const [layout, setLayout] = useState<LayoutKey>("4");
  const [bg, setBg] = useState<Bg>("navy");
  const [accent, setAccent] = useState(false);
  const [gutter, setGutter] = useState(10);
  const [cells, setCells] = useState<Cell[]>(() =>
    Array.from({ length: 4 }, blankCell),
  );
  const [texts, setTexts] = useState<TextBlock[]>([]);
  const [sel, setSel] = useState<Sel>(null);
  const [busy, setBusy] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [fonts, setFonts] = useState({ title: TITLE_FB, body: BODY_FB });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingCell = useRef<number | null>(null);
  const drag = useRef<null | {
    kind: "text" | "pan";
    id: string | number;
    startX: number;
    startY: number;
    a: number; // origin xN / ox
    b: number; // origin yN / oy
    mx?: number;
    my?: number;
  }>(null);

  // resolve the app's real fonts so the canvas matches the site
  useEffect(() => {
    const probe = (v: string) => {
      const el = document.createElement("span");
      el.style.fontFamily = `var(${v})`;
      el.style.position = "absolute";
      el.style.visibility = "hidden";
      document.body.appendChild(el);
      const f = getComputedStyle(el).fontFamily;
      el.remove();
      return f;
    };
    const title = probe("--font-chakra-petch") || TITLE_FB;
    const body = probe("--font-inter") || BODY_FB;
    setFonts({ title, body });
    const fs = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fs?.ready) fs.ready.then(() => setFonts({ title, body }));
  }, []);

  // keep cells array length in sync with the chosen layout
  const cellCount = useMemo(
    () => LAYOUTS.find((l) => l.key === layout)?.cells ?? 4,
    [layout],
  );
  useEffect(() => {
    setCells((prev) => {
      if (prev.length === cellCount) return prev;
      const next = prev.slice(0, cellCount);
      while (next.length < cellCount) next.push(blankCell());
      return next;
    });
    setSel((s) => (s?.type === "cell" && s.index >= cellCount ? null : s));
  }, [cellCount]);

  const state: DrawState = useMemo(
    () => ({ ratio, layout, bg, accent, gutter, cells, texts }),
    [ratio, layout, bg, accent, gutter, cells, texts],
  );

  // draw to the visible canvas (+ selection outline) whenever anything changes
  const redraw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = ratio.w;
    cv.height = ratio.h;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    coreDraw(ctx, state, fonts);
    // selection outline
    if (sel?.type === "cell") {
      const r = layoutRects(layout, ratio.w, ratio.h, gutter, accent)[
        sel.index
      ];
      if (r) {
        ctx.strokeStyle = "#4DA3FF";
        ctx.lineWidth = 4;
        roundPath(ctx, r.x, r.y, r.w, r.h, 8);
        ctx.stroke();
      }
    } else if (sel?.type === "text") {
      const t = texts.find((x) => x.id === sel.id);
      if (t) {
        const m = textMetrics(t, fonts);
        const cx = t.xN * ratio.w;
        const cy = t.yN * ratio.h;
        const bx =
          t.align === "left"
            ? cx
            : t.align === "right"
              ? cx - m.w
              : cx - m.w / 2;
        ctx.strokeStyle = "#4DA3FF";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(bx - 10, cy - m.h / 2 - 6, m.w + 20, m.h + 12);
        ctx.setLineDash([]);
      }
    }
  }, [state, fonts, sel, layout, ratio, gutter, accent, texts]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // ---- pointer → canvas coords ----
  const toNative = (e: RPointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * ratio.w,
      y: ((e.clientY - rect.top) / rect.height) * ratio.h,
    };
  };
  const hitText = (x: number, y: number): TextBlock | null => {
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      const m = textMetrics(t, fonts);
      const cx = t.xN * ratio.w;
      const cy = t.yN * ratio.h;
      const bx =
        t.align === "left" ? cx : t.align === "right" ? cx - m.w : cx - m.w / 2;
      if (
        x >= bx - 10 &&
        x <= bx + m.w + 10 &&
        y >= cy - m.h / 2 - 6 &&
        y <= cy + m.h / 2 + 6
      )
        return t;
    }
    return null;
  };
  const hitCell = (x: number, y: number): number => {
    const R = layoutRects(layout, ratio.w, ratio.h, gutter, accent);
    for (let i = 0; i < R.length; i++) {
      const r = R[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
  };
  const onDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toNative(e);
    const t = hitText(x, y);
    if (t) {
      setSel({ type: "text", id: t.id });
      drag.current = {
        kind: "text",
        id: t.id,
        startX: x,
        startY: y,
        a: t.xN,
        b: t.yN,
      };
      canvasRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    const ci = hitCell(x, y);
    if (ci >= 0) {
      setSel({ type: "cell", index: ci });
      const c = cells[ci];
      const R = layoutRects(layout, ratio.w, ratio.h, gutter, accent)[ci];
      // pan is only meaningful with an image; compute max-pan for delta mapping
      let mx = 1;
      let my = 1;
      if (c?.img && R) {
        const base = Math.max(R.w / c.img.width, R.h / c.img.height);
        const s = base * (c.zoom || 1);
        mx = Math.max(1, (c.img.width * s - R.w) / 2);
        my = Math.max(1, (c.img.height * s - R.h) / 2);
      }
      drag.current = {
        kind: "pan",
        id: ci,
        startX: x,
        startY: y,
        a: c?.ox ?? 0,
        b: c?.oy ?? 0,
        mx,
        my,
      };
      canvasRef.current?.setPointerCapture(e.pointerId);
    } else {
      setSel(null);
    }
  };
  const onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const { x, y } = toNative(e);
    if (d.kind === "text") {
      const nx = Math.min(1, Math.max(0, d.a + (x - d.startX) / ratio.w));
      const ny = Math.min(1, Math.max(0, d.b + (y - d.startY) / ratio.h));
      setTexts((ts) =>
        ts.map((t) => (t.id === d.id ? { ...t, xN: nx, yN: ny } : t)),
      );
    } else {
      const nx = Math.min(1, Math.max(-1, d.a + (x - d.startX) / (d.mx || 1)));
      const ny = Math.min(1, Math.max(-1, d.b + (y - d.startY) / (d.my || 1)));
      setCells((cs) =>
        cs.map((c, i) => (i === d.id ? { ...c, ox: nx, oy: ny } : c)),
      );
    }
  };
  const onUp = (e: RPointerEvent<HTMLCanvasElement>) => {
    drag.current = null;
    canvasRef.current?.releasePointerCapture?.(e.pointerId);
  };
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (sel?.type !== "cell") return;
    e.preventDefault();
    const idx = sel.index;
    setCells((cs) =>
      cs.map((c, i) =>
        i === idx
          ? { ...c, zoom: Math.min(3, Math.max(1, c.zoom - e.deltaY * 0.001)) }
          : c,
      ),
    );
  };

  // ---- image upload into the selected/pending cell ----
  const pickImageFor = (index: number) => {
    pendingCell.current = index;
    fileRef.current?.click();
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const idx = pendingCell.current;
    pendingCell.current = null;
    if (!file || idx == null) return;
    if (file.size > 12 * 1024 * 1024) {
      setMsg("Image is too large (max 12 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      const img = new Image();
      img.onload = () =>
        setCells((cs) =>
          cs.map((c, i) =>
            i === idx ? { ...c, src, img, zoom: 1, ox: 0, oy: 0 } : c,
          ),
        );
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // ---- text blocks ----
  const addText = (kind: "title" | "body") => {
    const id = `t${Date.now()}${Math.round(texts.length * 7 + 1)}`;
    const t: TextBlock = {
      id,
      kind,
      text: kind === "title" ? "YOUR TITLE" : "your body text",
      xN: 0.5,
      yN: kind === "title" ? 0.16 : 0.85,
      size: Math.round(ratio.h * (kind === "title" ? 0.09 : 0.04)),
      color: kind === "title" ? "#FFB74D" : "#FFFFFF",
      bold: true,
      italic: false,
      align: "center",
    };
    setTexts((ts) => [...ts, t]);
    setSel({ type: "text", id });
  };
  const updText = (id: string, patch: Partial<TextBlock>) =>
    setTexts((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const delText = (id: string) => {
    setTexts((ts) => ts.filter((t) => t.id !== id));
    setSel(null);
  };

  // ---- export ----
  const toDataUrl = useCallback((): string => {
    const off = document.createElement("canvas");
    off.width = ratio.w;
    off.height = ratio.h;
    const ctx = off.getContext("2d");
    if (!ctx) return "";
    coreDraw(ctx, state, fonts);
    return off.toDataURL("image/png");
  }, [ratio, state, fonts]);

  const download = () => {
    const url = toDataUrl();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexzy-collage-${ratio.key.replace(":", "x")}.png`;
    a.click();
    setMsg("Downloaded ✓");
  };
  const setAsHero = async () => {
    setBusy("hero");
    setMsg("");
    try {
      await ed.run("Collage set as hero", () =>
        uploadArticleImage(ed.id, toDataUrl()),
      );
      setMsg("Set as hero ✓");
    } catch (err) {
      setMsg((err as Error)?.message || "Failed to set hero.");
    } finally {
      setBusy("");
    }
  };
  const insertBody = async () => {
    setBusy("body");
    setMsg("");
    try {
      const { url } = await uploadBodyImage(ed.id, toDataUrl());
      const cur = ed.form?.bodyMarkdown ?? "";
      const next = `${cur ? cur.replace(/\s+$/, "") + "\n\n" : ""}![collage](${url})\n`;
      await ed.saveBody(next);
      setMsg("Inserted into body ✓");
    } catch (err) {
      setMsg((err as Error)?.message || "Failed to insert.");
    } finally {
      setBusy("");
    }
  };

  const selText =
    sel?.type === "text" ? texts.find((t) => t.id === sel.id) : null;
  const selCell = sel?.type === "cell" ? cells[sel.index] : null;

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={3}
    >
      <Flex
        align="center"
        justify="space-between"
        cursor="pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <HStack gap={2}>
          <FiImage />
          <Text color="nexzy.white" fontWeight="700" fontSize="sm">
            Collage maker
          </Text>
        </HStack>
        <Text color="nexzy.gray.100" fontSize="lg">
          {open ? "▾" : "▸"}
        </Text>
      </Flex>

      {open && (
        <VStack align="stretch" gap={3} mt={3}>
          {/* live canvas */}
          <Box
            borderRadius="lg"
            overflow="hidden"
            border="1px solid"
            borderColor="whiteAlpha.200"
            bg="blackAlpha.400"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onWheel={onWheel}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                touchAction: "none",
                cursor: "grab",
              }}
            />
          </Box>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            style={{ display: "none" }}
          />

          {/* ratio + layout */}
          <Box>
            <FieldLabel>Ratio</FieldLabel>
            <HStack gap={1} wrap="wrap">
              {RATIOS.map((r) => (
                <Chip
                  key={r.key}
                  active={ratio.key === r.key}
                  onClick={() => setRatio(r)}
                >
                  {r.label}
                </Chip>
              ))}
            </HStack>
          </Box>
          <Box>
            <FieldLabel>Layout</FieldLabel>
            <HStack gap={1} wrap="wrap">
              {LAYOUTS.map((l) => (
                <Chip
                  key={l.key}
                  active={layout === l.key}
                  onClick={() => setLayout(l.key)}
                >
                  {l.label}
                </Chip>
              ))}
            </HStack>
          </Box>

          {/* background + accent + gutter */}
          <Box>
            <FieldLabel>Background</FieldLabel>
            <HStack gap={1} wrap="wrap">
              {BGS.map((b) => (
                <Chip
                  key={b.key}
                  active={bg === b.key}
                  onClick={() => setBg(b.key)}
                >
                  {b.label}
                </Chip>
              ))}
              <Chip active={accent} onClick={() => setAccent((v) => !v)}>
                Nexzy accents {accent ? "ON" : "OFF"}
              </Chip>
            </HStack>
          </Box>
          <Box>
            <FieldLabel>Gutter ({gutter}px)</FieldLabel>
            <input
              type="range"
              min={0}
              max={40}
              value={gutter}
              onChange={(e) => setGutter(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </Box>

          {/* add text */}
          <HStack gap={2}>
            <Button
              size="xs"
              variant="outline"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() => addText("title")}
            >
              + Title text
            </Button>
            <Button
              size="xs"
              variant="outline"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() => addText("body")}
            >
              + Body text
            </Button>
          </HStack>

          {/* selection controls */}
          {selCell && sel?.type === "cell" && (
            <Box
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="md"
              p={3}
            >
              <FieldLabel>Selected image cell</FieldLabel>
              <HStack gap={2} mb={2} wrap="wrap">
                <Button
                  size="xs"
                  bg="nexzy.blue"
                  color="white"
                  _hover={{ bg: "nexzy.blue" }}
                  onClick={() => pickImageFor(sel.index)}
                >
                  {selCell.img ? "Replace image" : "Upload image"}
                </Button>
                {selCell.img && (
                  <>
                    <Button
                      size="xs"
                      variant="ghost"
                      color="nexzy.gray.100"
                      _hover={{ bg: "whiteAlpha.100" }}
                      onClick={() =>
                        setCells((cs) =>
                          cs.map((c, i) =>
                            i === sel.index
                              ? { ...c, zoom: 1, ox: 0, oy: 0 }
                              : c,
                          ),
                        )
                      }
                    >
                      Reset framing
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      color="red.300"
                      _hover={{ bg: "whiteAlpha.100" }}
                      onClick={() =>
                        setCells((cs) =>
                          cs.map((c, i) => (i === sel.index ? blankCell() : c)),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </>
                )}
              </HStack>
              {selCell.img && (
                <>
                  <FieldLabel>Zoom ({selCell.zoom.toFixed(2)}×)</FieldLabel>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={selCell.zoom}
                    onChange={(e) =>
                      setCells((cs) =>
                        cs.map((c, i) =>
                          i === sel.index
                            ? { ...c, zoom: Number(e.target.value) }
                            : c,
                        ),
                      )
                    }
                    style={{ width: "100%" }}
                  />
                  <Text color="nexzy.gray.100" fontSize="10px" mt={1}>
                    Drag on the image to reposition · scroll to zoom.
                  </Text>
                </>
              )}
            </Box>
          )}

          {selText && (
            <Box
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="md"
              p={3}
            >
              <FieldLabel>
                Selected {selText.kind === "title" ? "title" : "body"} text
              </FieldLabel>
              <Textarea
                value={selText.text}
                onChange={(e) => updText(selText.id, { text: e.target.value })}
                rows={2}
                size="sm"
                bg="whiteAlpha.50"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                mb={2}
              />
              <FieldLabel>Size ({selText.size}px)</FieldLabel>
              <input
                type="range"
                min={Math.round(ratio.h * 0.02)}
                max={Math.round(ratio.h * 0.18)}
                value={selText.size}
                onChange={(e) =>
                  updText(selText.id, { size: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
              <FieldLabel>Color</FieldLabel>
              <HStack gap={1} mb={2} wrap="wrap">
                {SWATCHES.map((c) => (
                  <Box
                    key={c}
                    as="button"
                    onClick={() => updText(selText.id, { color: c })}
                    w="22px"
                    h="22px"
                    borderRadius="full"
                    bg={c}
                    border="2px solid"
                    borderColor={
                      selText.color.toLowerCase() === c.toLowerCase()
                        ? "nexzy.lightBlue"
                        : "whiteAlpha.400"
                    }
                  />
                ))}
                <input
                  type="color"
                  value={selText.color}
                  onChange={(e) =>
                    updText(selText.id, { color: e.target.value })
                  }
                  style={{
                    width: 24,
                    height: 24,
                    background: "transparent",
                    border: "none",
                  }}
                />
              </HStack>
              <HStack gap={1} wrap="wrap">
                <Chip
                  active={selText.bold}
                  onClick={() => updText(selText.id, { bold: !selText.bold })}
                >
                  Bold
                </Chip>
                <Chip
                  active={selText.italic}
                  onClick={() =>
                    updText(selText.id, { italic: !selText.italic })
                  }
                >
                  Italic
                </Chip>
                {(["left", "center", "right"] as CanvasTextAlign[]).map((a) => (
                  <Chip
                    key={a}
                    active={selText.align === a}
                    onClick={() => updText(selText.id, { align: a })}
                  >
                    {a[0].toUpperCase()}
                  </Chip>
                ))}
                <Button
                  size="xs"
                  variant="ghost"
                  color="red.300"
                  _hover={{ bg: "whiteAlpha.100" }}
                  onClick={() => delText(selText.id)}
                >
                  Delete
                </Button>
              </HStack>
              <Text color="nexzy.gray.100" fontSize="10px" mt={1}>
                Drag the text on the canvas to position it.
              </Text>
            </Box>
          )}

          {!sel && (
            <Text color="nexzy.gray.100" fontSize="11px">
              Tap a cell to add/adjust an image, or add a text block. Then use
              the buttons below.
            </Text>
          )}

          {/* actions */}
          <HStack gap={2} wrap="wrap" pt={1}>
            <Button
              size="sm"
              bg="nexzy.blue"
              color="white"
              _hover={{ bg: "nexzy.blue" }}
              onClick={download}
            >
              ⬇ Download PNG
            </Button>
            <Button
              size="sm"
              variant="outline"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
              loading={busy === "hero"}
              onClick={setAsHero}
            >
              Set as hero
            </Button>
            <Button
              size="sm"
              variant="outline"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
              loading={busy === "body"}
              onClick={insertBody}
            >
              Insert into body
            </Button>
          </HStack>
          {msg && (
            <Text color="nexzy.lightBlue" fontSize="xs">
              {msg}
            </Text>
          )}
        </VStack>
      )}
    </Box>
  );
}
