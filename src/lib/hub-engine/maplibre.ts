// One place that loads MapLibre for every map (public guide map, admin pin
// editor), so both get the same two fixes:
//
// 1. Worker: MapLibre 6 looks for its web worker next to its own module
//    file, which the Next bundler renames and moves, so the default lookup
//    404s in production. We serve the worker ourselves (copied into
//    public/vendor/maplibre by scripts/copy-maplibre-worker.mjs on every
//    dev/build) and point MapLibre at it before the first map is created.
//
// 2. Art URL: the map draws its art with WebGL, which needs a CORS-approved
//    copy of the image. If the browser already cached the same URL from a
//    plain <img> (no CORS), it reuses that copy and WebGL refuses it. A
//    query flag gives the map its own browser cache entry. The CDN ignores
//    query strings for caching, so it is still the same cached file there.
type MapLibre = typeof import("maplibre-gl");

let loading: Promise<MapLibre> | null = null;

export function loadMapLibre(): Promise<MapLibre> {
  if (!loading) {
    loading = import("maplibre-gl")
      .then((m) => {
        m.setWorkerUrl(
          `/vendor/maplibre/maplibre-gl-worker.js?v=${encodeURIComponent(m.getVersion())}`,
        );
        return m;
      })
      .catch((err) => {
        loading = null; // let a later mount retry (offline, chunk error)
        throw err;
      });
  }
  return loading;
}

export function mapArtUrl(url: string): string {
  return url + (url.includes("?") ? "&" : "?") + "ml=1";
}

/**
 * Opens the map with the WHOLE art in view on any screen. The template's
 * zoom-out limit is relative to the art's own size, so on a phone (or a
 * wide, short desktop box) it can stop the camera before the art fits and
 * the map opens cropped. Here the limit is relaxed to "whole art fits", and
 * kept that way when the box resizes (rotation, window resize).
 */
export function fitWholeArt(
  m: import("maplibre-gl").Map,
  sw: [number, number],
  ne: [number, number],
  padding = 12,
): void {
  const relax = (jump: boolean) => {
    const cam = m.cameraForBounds([sw, ne], { padding });
    if (!cam || typeof cam.zoom !== "number" || !Number.isFinite(cam.zoom))
      return;
    if (cam.zoom < m.getMinZoom()) m.setMinZoom(cam.zoom);
    if (jump && cam.center) m.jumpTo({ center: cam.center, zoom: cam.zoom });
  };
  relax(true);
  m.on("resize", () => relax(false));
}
