// Map art pixels <-> MapLibre coordinates (shared rule for web AND app).
//
// Our maps are flat pictures, so pins are stored as pixels on the art (0,0 =
// top-left). MapLibre works in Web Mercator, so we place the picture inside a
// small square of the Mercator world and convert linearly in Mercator space
// (not in lat/lng), which keeps the picture undistorted. The app must use this
// exact function (copied in the mobile doc) so pins land on the same spot.
//
// WORLD = 4: the picture's longer side spans a quarter of the world width.
// BASE zoom = the zoom where 1 picture pixel = 1 screen pixel.

const WORLD = 4;
const TILE = 512; // MapLibre world size at zoom 0, in screen pixels

function scale(width: number, height: number): number {
  return Math.max(width, height) * WORLD;
}

/** Pixel on the art -> [lng, lat]. */
export function pxToLngLat(
  x: number,
  y: number,
  width: number,
  height: number,
): [number, number] {
  const s = scale(width, height);
  const mx = 0.5 + (x - width / 2) / s;
  const my = 0.5 + (y - height / 2) / s;
  const lng = mx * 360 - 180;
  const lat =
    (360 / Math.PI) * Math.atan(Math.exp(Math.PI * (1 - 2 * my))) - 90;
  return [lng, lat];
}

/** [lng, lat] -> pixel on the art. */
export function lngLatToPx(
  lng: number,
  lat: number,
  width: number,
  height: number,
): [number, number] {
  const s = scale(width, height);
  const mx = (lng + 180) / 360;
  const my =
    (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
  return [(mx - 0.5) * s + width / 2, (my - 0.5) * s + height / 2];
}

/** MapLibre zoom where the art shows at 1:1. Template zooms are relative to it. */
export function baseZoom(width: number, height: number): number {
  return Math.log2(scale(width, height) / TILE);
}

/** The four corners MapLibre's image source wants: TL, TR, BR, BL. */
export function imageCorners(
  width: number,
  height: number,
): [[number, number], [number, number], [number, number], [number, number]] {
  return [
    pxToLngLat(0, 0, width, height),
    pxToLngLat(width, 0, width, height),
    pxToLngLat(width, height, width, height),
    pxToLngLat(0, height, width, height),
  ];
}

/** How far readers may pan: the art plus `pad` of its size on every side.
 *  A tight limit forces MapLibre to zoom in on screens wider (or taller)
 *  than the art, cropping it; this margin lets the whole map fit. */
export function panBounds(
  width: number,
  height: number,
  pad = 0.5,
): [[number, number], [number, number]] {
  return [
    pxToLngLat(-width * pad, height * (1 + pad), width, height),
    pxToLngLat(width * (1 + pad), -height * pad, width, height),
  ];
}
