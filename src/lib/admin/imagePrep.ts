// Client-side image prep for admin uploads. Uploads travel as base64 JSON
// through a Netlify function (~6 MB hard body cap) and nginx, so big PNGs (e.g.
// Card Studio 4:5 exports) 413 before the API ever sees them. The API converts
// everything to AVIF at <=1920px anyway, so downscaling + re-encoding in the
// browser loses nothing and keeps every upload comfortably under the caps.
"use client";

// Longest edge after prep — matches the server's AVIF resize ceiling.
const MAX_EDGE = 2048;
// Files already this small are sent as-is (no visible gain from re-encoding).
const SKIP_BELOW_BYTES = 1.2 * 1024 * 1024;
const WEBP_QUALITY = 0.9;
const JPEG_QUALITY = 0.9;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Could not read that file."));
    r.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode that image."));
    };
    img.src = url;
  });
}

/**
 * File → upload-ready data URL. GIFs pass through untouched (animation).
 * Everything else is downscaled to MAX_EDGE and re-encoded WebP (JPEG fallback
 * for browsers that can't encode WebP). Falls back to the raw file on any
 * failure, so uploads never get stuck behind the optimizer.
 */
export async function prepareImageDataUrl(file: File): Promise<string> {
  if (file.type === "image/gif") return readAsDataUrl(file);
  if (file.size <= SKIP_BELOW_BYTES) return readAsDataUrl(file);

  try {
    const img = await loadImage(file);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return await readAsDataUrl(file);

    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const outW = Math.round(w * scale);
    const outH = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return await readAsDataUrl(file);
    ctx.drawImage(img, 0, 0, outW, outH);

    // WebP keeps transparency and compresses text-heavy cards well. If the
    // browser can't encode WebP, fall back to JPEG on a solid background.
    let out = canvas.toDataURL("image/webp", WEBP_QUALITY);
    if (!out.startsWith("data:image/webp")) {
      const jpegCanvas = document.createElement("canvas");
      jpegCanvas.width = outW;
      jpegCanvas.height = outH;
      const jctx = jpegCanvas.getContext("2d");
      if (!jctx) return await readAsDataUrl(file);
      jctx.fillStyle = "#0B0F2A"; // brand-dark backing for any transparency
      jctx.fillRect(0, 0, outW, outH);
      jctx.drawImage(img, 0, 0, outW, outH);
      out = jpegCanvas.toDataURL("image/jpeg", JPEG_QUALITY);
    }

    // If re-encoding somehow grew the payload, keep the original.
    const original = await readAsDataUrl(file);
    return out.length < original.length ? out : original;
  } catch {
    return readAsDataUrl(file);
  }
}
