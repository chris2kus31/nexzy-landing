"use client";

// Interactive guide map (MapLibre GL, GPU-drawn). Everything it shows comes
// from the game's template: the map art, pin types (color, icon, label),
// eras and spoiler stages. Pins load in one compact request; details load
// when a pin is tapped. MapLibre itself loads only when the map scrolls into
// view, so hub pages stay fast.
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  FiCheck,
  FiEye,
  FiEyeOff,
  FiMaximize2,
  FiSearch,
  FiX,
} from "react-icons/fi";
import type {
  Map as MlMap,
  GeoJSONSource,
  MapLayerMouseEvent,
} from "maplibre-gl";
import {
  baseZoom,
  imageCorners,
  panBounds,
  pxToLngLat,
} from "@/lib/hub-engine/coords";
import {
  artErrorRetry,
  fitWholeArt,
  loadMapLibre,
  mapArtUrl,
} from "@/lib/hub-engine/maplibre";
import {
  entryPath,
  eraVisible,
  spoilerVisible,
  typeOf,
  type HubCard,
  type HubMapDef,
  type HubPinRow,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";
import { useGuideProgress } from "@/components/games/guide/GuideProgress";
import { G } from "@/components/games/guide/GuideBits";
import GuideEntryPanel from "@/components/games/guide/GuideEntryPanel";

const GREEN = "#7EE2A0";

/** MapLibre's popup chrome is WHITE by default; ours carries light text, so
 *  every popup (pin card and hover label) is restyled here, in code. */
function darkChrome(pop: import("maplibre-gl").Popup, compact = false) {
  const chrome = pop.getElement();
  if (!chrome) return;
  const content = chrome.querySelector(
    ".maplibregl-popup-content",
  ) as HTMLElement | null;
  if (content) {
    content.style.background = "#11162c";
    content.style.color = "#EDF2F7";
    content.style.border = "1px solid rgba(255,255,255,0.16)";
    content.style.borderRadius = compact ? "8px" : "10px";
    content.style.boxShadow = "0 10px 30px rgba(0,0,0,0.55)";
    if (compact) {
      content.style.padding = "5px 10px";
      content.style.fontSize = "13px";
      content.style.fontWeight = "700";
    }
  }
  const close = chrome.querySelector(
    ".maplibregl-popup-close-button",
  ) as HTMLElement | null;
  if (close) {
    close.style.color = "#EDF2F7";
    close.style.fontSize = "16px";
  }
  // The white arrow tip can't be recolored per anchor side reliably; the
  // popup offset keeps it clear of the pin without it.
  chrome
    .querySelectorAll<HTMLElement>(".maplibregl-popup-tip")
    .forEach((tip) => (tip.style.display = "none"));
}

/** White check mark drawn once on a canvas (no sprite sheet needed). */
function checkIcon(): ImageData | null {
  const sz = 48;
  const cv = document.createElement("canvas");
  cv.width = sz;
  cv.height = sz;
  const cx = cv.getContext("2d");
  if (!cx) return null;
  cx.strokeStyle = "#ffffff";
  cx.lineWidth = 7;
  cx.lineCap = "round";
  cx.lineJoin = "round";
  cx.beginPath();
  cx.moveTo(13, 25);
  cx.lineTo(21, 33);
  cx.lineTo(35, 16);
  cx.stroke();
  return cx.getImageData(0, 0, sz, sz);
}

// Desktop = the details panel sits over the right side of the map.
const WIDE = "(min-width: 48em)";
const PANEL_W = 380;

type Props = {
  slug: string;
  config: HubTemplateConfig;
  map: HubMapDef;
  /** Preview on the hub page: shorter, no side panel, links to the full map. */
  preview?: boolean;
  /** Open zoomed to this pin (from ?pin=). */
  focusPin?: string | null;
};

export default function GuideMap({
  slug,
  config,
  map,
  preview = false,
  focusPin = null,
}: Props) {
  const box = useRef<HTMLDivElement | null>(null);
  const ml = useRef<MlMap | null>(null);
  const [visible, setVisible] = useState(!preview);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pins, setPins] = useState<HubPinRow[] | null>(null);
  const [pinsFailed, setPinsFailed] = useState(false);
  const [off, setOff] = useState<Set<string>>(new Set());
  // Hide pins already marked found (remembered per game in this browser).
  const hideKey = `nexzy-guide-hidefound:${slug}`;
  const [hideFound, setHideFound] = useState(false);
  useEffect(() => {
    try {
      setHideFound(window.localStorage.getItem(hideKey) === "1");
    } catch {
      /* storage blocked: default stays off */
    }
  }, [hideKey]);
  const flipHideFound = () =>
    setHideFound((v) => {
      try {
        window.localStorage.setItem(hideKey, v ? "0" : "1");
      } catch {
        /* storage blocked: still works for this visit */
      }
      return !v;
    });
  // Pins lit up by "Show on map" in the details panel.
  const [highlight, setHighlight] = useState<{
    ids: Set<string>;
    label: string;
  } | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HubCard[] | null>(null);
  // Entry slug whose details are open on the map (full map only).
  const [detail, setDetail] = useState<string | null>(null);
  const popupRef = useRef<import("maplibre-gl").Popup | null>(null);
  // Repaints the open pin card's found button from the real state, so a
  // save that fails (and rolls back) never leaves it saying "Found".
  const popupPaintRef = useRef<(() => void) | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { found, toggle, era, setEra, spoiler, setSpoiler } =
    useGuideProgress();
  const foundRef = useRef(found);
  foundRef.current = found;

  const pinnable = useMemo(
    () => config.types.filter((t) => t.pinnable),
    [config],
  );
  const { eraSwitch, spoilers, search } = config.features;

  // Load MapLibre only when the preview scrolls near the screen.
  useEffect(() => {
    if (visible || !box.current) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(box.current);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setPinsFailed(false);
    fetch(`/api/hub-engine/${slug}/maps/${map.key}/pins`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { pins: HubPinRow[] }) => alive && setPins(d.pins))
      .catch(() => {
        // A failed pins request must not look like "nothing placed yet".
        if (alive) {
          setPins([]);
          setPinsFailed(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [visible, slug, map.key]);

  // Pins after the reader's filters, as GeoJSON for the GPU layer.
  const data = useMemo(() => {
    const feats = (pins ?? [])
      .filter(
        ([, eid, type, , , , , stage, eras]) =>
          !off.has(type) &&
          !(hideFound && found.has(eid) && !highlight?.ids.has(eid)) &&
          eraVisible(eras, eraSwitch ? era : null) &&
          (!spoilers || spoilerVisible(config.spoilerStages, stage, spoiler)),
      )
      .map(([pid, eid, type, x, y, title, confirmed, , , eslug]) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: pxToLngLat(x, y, map.width, map.height),
        },
        properties: {
          pid,
          eid,
          type,
          title,
          s: eslug,
          c: confirmed,
          f: found.has(eid) ? 1 : 0,
          h: highlight?.ids.has(eid) ? 1 : 0,
        },
      }));
    // Lit-up pins ("Show on map") go to their own unclustered source so
    // they never hide inside a cluster bubble.
    return {
      main: {
        type: "FeatureCollection" as const,
        features: feats.filter((f) => f.properties.h !== 1),
      },
      hl: {
        type: "FeatureCollection" as const,
        features: feats.filter((f) => f.properties.h === 1),
      },
    };
  }, [
    pins,
    off,
    era,
    spoiler,
    eraSwitch,
    spoilers,
    config.spoilerStages,
    map.width,
    map.height,
    found,
    hideFound,
    highlight,
  ]);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Create the map once.
  useEffect(() => {
    if (!visible || !box.current) return;
    let alive = true;
    let instance: MlMap | null = null;
    (async () => {
      try {
        const maplibregl = await loadMapLibre();
        if (!alive || !box.current) return;
        const z0 = baseZoom(map.width, map.height);
        const corners = imageCorners(map.width, map.height);
        const colorMatch: unknown[] = ["match", ["get", "type"]];
        config.types.forEach((t) => colorMatch.push(t.key, t.color));
        colorMatch.push("#cccccc");
        const m0 = new maplibregl.Map({
          container: box.current,
          style: {
            version: 8,
            sources: {
              art: {
                type: "image",
                url: mapArtUrl(map.url),
                coordinates: corners,
              },
            },
            layers: [
              {
                id: "bg",
                type: "background",
                paint: { "background-color": "#0a0f22" },
              },
              {
                id: "art",
                type: "raster",
                source: "art",
                paint: { "raster-fade-duration": 0 },
              },
            ],
          },
          bounds: [corners[3], corners[1]],
          fitBoundsOptions: { padding: 12 },
          minZoom: Math.max(-2, z0 + map.minZoom),
          maxZoom: Math.max(0, z0 + map.maxZoom),
          maxBounds: panBounds(map.width, map.height),
          renderWorldCopies: false,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          cooperativeGestures: preview,
        });
        instance = m0;
        fitWholeArt(m0, corners[3], corners[1]);
        m0.touchZoomRotate.disableRotation();
        m0.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          // The details panel covers the right side of the full map.
          preview ? "top-right" : "top-left",
        );
        // Full screen takes the whole frame (map + details panel). Phones
        // without the Fullscreen API get MapLibre's CSS fallback.
        if (!preview && frame.current)
          m0.addControl(
            new maplibregl.FullscreenControl({ container: frame.current }),
            "top-left",
          );
        ml.current = m0;
        // Art failure self-heals through the same-origin copy; only when
        // that fails too does the map show the failed state.
        m0.on(
          "error",
          artErrorRetry(m0, map.url, corners, () => alive && setFailed(true)),
        );
        m0.on("load", () => {
          if (!alive || !instance) return;
          instance.addSource("pins", {
            type: "geojson",
            data: dataRef.current.main,
            cluster: true,
            clusterRadius: 36,
            clusterMaxZoom: Math.floor(z0 + map.maxZoom - 1),
          });
          instance.addLayer({
            id: "clusters",
            type: "circle",
            source: "pins",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": "#FFD700",
              "circle-opacity": 0.85,
              "circle-stroke-color": "#0b0e1d",
              "circle-stroke-width": 2,
              "circle-radius": [
                "step",
                ["get", "point_count"],
                12,
                10,
                16,
                50,
                21,
                200,
                26,
              ],
            },
          });
          // One paint for normal and lit-up pins.
          const pinPaint = {
            // Found pins turn dark green with a check: clearly done.
            "circle-color": [
              "case",
              ["==", ["get", "f"], 1],
              "#1f7a4a",
              colorMatch,
            ] as never,
            "circle-radius": 8,
            "circle-opacity": [
              "case",
              ["==", ["get", "f"], 1],
              0.95,
              ["==", ["get", "c"], 1],
              1,
              0.6,
            ],
            "circle-stroke-width": ["case", ["==", ["get", "f"], 1], 2, 1.5],
            "circle-stroke-color": [
              "case",
              ["==", ["get", "f"], 1],
              GREEN,
              "#ffffff",
            ],
          };
          instance.addLayer({
            id: "pins",
            type: "circle",
            source: "pins",
            filter: ["!", ["has", "point_count"]],
            paint: pinPaint as never,
          });
          const check = checkIcon();
          if (check) {
            instance.addImage("found-check", check, { pixelRatio: 3 });
            instance.addLayer({
              id: "pins-found",
              type: "symbol",
              source: "pins",
              filter: [
                "all",
                ["!", ["has", "point_count"]],
                ["==", ["get", "f"], 1],
              ],
              layout: {
                "icon-image": "found-check",
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
              },
            });
          }
          instance.addSource("hl", {
            type: "geojson",
            data: dataRef.current.hl,
          });
          instance.addLayer({
            id: "hl-halo",
            type: "circle",
            source: "hl",
            paint: {
              "circle-color": "#FFD700",
              "circle-radius": 17,
              "circle-opacity": 0.3,
              "circle-stroke-color": "#FFD700",
              "circle-stroke-width": 2,
            },
          });
          instance.addLayer({
            id: "hl-pins",
            type: "circle",
            source: "hl",
            paint: pinPaint as never,
          });
          if (check)
            instance.addLayer({
              id: "hl-found",
              type: "symbol",
              source: "hl",
              filter: ["==", ["get", "f"], 1],
              layout: {
                "icon-image": "found-check",
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
              },
            });
          instance.on("click", "clusters", async (e: MapLayerMouseEvent) => {
            const f = e.features?.[0];
            const id = f?.properties?.cluster_id;
            const src = instance?.getSource("pins") as
              | GeoJSONSource
              | undefined;
            if (!src || id == null || !f || f.geometry.type !== "Point") return;
            const zoom = await src.getClusterExpansionZoom(id);
            instance?.easeTo({
              center: f.geometry.coordinates as [number, number],
              zoom,
            });
          });
          // Desktop: the pin's name on hover, no click needed.
          let hoverPop: import("maplibre-gl").Popup | null = null;
          const canHover = window.matchMedia("(hover: hover)").matches;
          if (canHover) {
            instance.on(
              "mousemove",
              ["pins", "hl-pins"],
              (e: MapLayerMouseEvent) => {
                const f = e.features?.[0];
                if (!f || f.geometry.type !== "Point" || !instance) return;
                // No hover label over an open pin card.
                if (popupRef.current?.isOpen()) return;
                hoverPop ??= new maplibregl.Popup({
                  closeButton: false,
                  closeOnClick: false,
                  offset: 12,
                  maxWidth: "240px",
                  className: "nexzy-guide-hover",
                });
                hoverPop
                  .setLngLat(f.geometry.coordinates as [number, number])
                  .setText(String(f.properties?.title ?? ""))
                  .addTo(instance);
                darkChrome(hoverPop, true);
              },
            );
            instance.on("mouseleave", ["pins", "hl-pins"], () =>
              hoverPop?.remove(),
            );
          }
          instance.on("click", ["pins", "hl-pins"], (e: MapLayerMouseEvent) => {
            const f = e.features?.[0];
            hoverPop?.remove();
            if (!f || f.geometry.type !== "Point" || !instance) return;
            openPopupRef.current(
              maplibregl,
              instance,
              f.geometry.coordinates as [number, number],
              f.properties as PinProps,
            );
          });
          for (const id of ["clusters", "pins", "hl-pins"]) {
            instance.on(
              "mouseenter",
              id,
              () => instance && (instance.getCanvas().style.cursor = "pointer"),
            );
            instance.on(
              "mouseleave",
              id,
              () => instance && (instance.getCanvas().style.cursor = ""),
            );
          }
          setReady(true);
        });
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      instance?.remove();
      ml.current = null;
      setReady(false);
    };
    // The map is rebuilt only when its art or size changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, map.url, map.width, map.height, map.minZoom, map.maxZoom]);

  useEffect(() => {
    if (popupRef.current?.isOpen()) popupPaintRef.current?.();
  }, [found]);

  // Push filter / progress changes to the GPU source.
  useEffect(() => {
    if (!ready || !ml.current) return;
    (ml.current.getSource("pins") as GeoJSONSource | undefined)?.setData(
      data.main,
    );
    (ml.current.getSource("hl") as GeoJSONSource | undefined)?.setData(data.hl);
  }, [data, ready]);

  // ?pin=<id>: fly there once pins are in.
  useEffect(() => {
    if (!ready || !pins || !focusPin || !ml.current) return;
    const row = pins.find((p) => p[0] === focusPin);
    if (!row) return;
    // The full map opens the pin's details (a shared ?pin= link); a preview
    // just frames the pin.
    if (!preview && row[9]) {
      openDetailRef.current(row[9], row[0]);
      return;
    }
    ml.current.flyTo({
      center: pxToLngLat(row[3], row[4], map.width, map.height),
      zoom: focusZoom(),
    });
    // Only when the pin or the loaded pins change, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pins, focusPin]);

  // A pin's close-up: about 3x the whole-map view of THIS box, so a small
  // box (entry page) and a big one (full map) frame the spot the same way.
  const focusZoom = useCallback(() => {
    const m = ml.current;
    if (!m) return 0;
    // Worked out from the box size (no camera call): the zoom that fits the
    // whole art in this box, then about 3x closer, but never past 1:1 so
    // the art is never blown up into blurry pixels.
    const one = baseZoom(map.width, map.height);
    const el = m.getContainer();
    const fit =
      one +
      Math.log2(
        Math.min(
          Math.max(1, el.clientWidth - 24) / map.width,
          Math.max(1, el.clientHeight - 24) / map.height,
        ),
      );
    return Math.min(one, m.getMaxZoom(), fit + 1.6);
  }, [map.width, map.height]);

  type PinProps = {
    pid: string;
    eid: string;
    type: string;
    title: string;
    s: string;
    c: number;
  };

  // Popup built with DOM text nodes only (no HTML strings from data).
  const openPopup = useCallback(
    (
      maplibregl: typeof import("maplibre-gl"),
      m: MlMap,
      at: [number, number],
      p: PinProps,
    ) => {
      const t = typeOf(config, p.type);
      const el = document.createElement("div");
      el.style.cssText =
        "min-width:180px;max-width:240px;font-family:inherit;color:#EDF2F7";
      const kind = document.createElement("div");
      kind.textContent = t?.label ?? "";
      kind.style.cssText = `font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${t?.color ?? "#9aa3bf"}`;
      const title = document.createElement("div");
      title.textContent = p.title;
      title.style.cssText = "font-weight:700;margin:2px 0 6px";
      el.append(kind, title);
      if (Number(p.c) !== 1) {
        const u = document.createElement("div");
        u.textContent = config.features.unconfirmedLabel;
        u.style.cssText = "font-size:11px;color:#FFB86B;margin-bottom:6px";
        el.append(u);
      }
      const row = document.createElement("div");
      row.style.cssText = "display:flex;gap:8px;align-items:center";
      const btn = document.createElement("button");
      const paint = (state?: boolean) => {
        const on = state ?? foundRef.current.has(p.eid);
        btn.textContent = on ? "Found" : "Mark found";
        btn.style.cssText = `cursor:pointer;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700;border:1px solid ${on ? "#7EE2A0" : "#FFD700"};background:${on ? "#7EE2A0" : "#FFD700"};color:#0b0e1d`;
      };
      paint();
      popupPaintRef.current = () => paint();
      btn.onclick = () => {
        // Paint from the state we are moving to, not from a re-render.
        const next = !foundRef.current.has(p.eid);
        toggle(p.eid);
        paint(next);
      };
      row.append(btn);
      if (p.s) {
        const a = document.createElement("a");
        a.textContent = "Details";
        // Preview maps go to the full map with this pin open; the full map
        // opens the details beside the pin (a new-tab click still gets the
        // entry's own page when it has one).
        a.href = preview
          ? `/games/${slug}/map?pin=${encodeURIComponent(p.pid)}`
          : t?.page
            ? entryPath(slug, p.type, p.s)
            : "#";
        if (!preview)
          a.onclick = (ev) => {
            if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) {
              if (t?.page) return;
            }
            ev.preventDefault();
            openDetailRef.current(p.s, p.pid);
          };
        a.style.cssText =
          "font-size:12px;color:#FFD700;text-decoration:underline";
        row.append(a);
      }
      el.append(row);
      const pop = new maplibregl.Popup({
        closeButton: true,
        maxWidth: "260px",
        offset: 10,
        className: "nexzy-guide-popup",
      })
        .setLngLat(at)
        .setDOMContent(el)
        .addTo(m);
      popupRef.current?.remove();
      popupRef.current = pop;
      darkChrome(pop);
    },
    [config, slug, toggle, preview],
  );
  // Map click handlers are bound once; they call the latest popup builder
  // through this ref (fresh toggle, signed-in state, config).
  const openPopupRef = useRef(openPopup);
  openPopupRef.current = openPopup;

  // Open an entry's details on the map: close the popup, bring its pin into
  // view beside the panel, and put ?pin= in the address so it can be shared.
  const openDetail = useCallback(
    (entrySlug: string, pinId?: string) => {
      popupRef.current?.remove();
      popupRef.current = null;
      setResults(null);
      setDetail(entrySlug);
      // The exact pin when known (an entry can have several pins), else
      // the entry's first pin on this map.
      const row =
        (pinId && pins?.find((p) => p[0] === pinId)) ||
        pins?.find((p) => p[9] === entrySlug);
      const m = ml.current;
      const wide = window.matchMedia(WIDE).matches;
      if (row && m) {
        m.easeTo({
          center: pxToLngLat(row[3], row[4], map.width, map.height),
          // Keep the reader's own closer zoom, but never past 1:1 (blurry).
          zoom: Math.min(
            baseZoom(map.width, map.height),
            Math.max(m.getZoom(), focusZoom()),
          ),
          padding: wide
            ? { right: PANEL_W + 24, left: 0, top: 0, bottom: 0 }
            : 0,
          duration: 500,
        });
      }
      const u = new URL(window.location.href);
      if (row) u.searchParams.set("pin", row[0]);
      else u.searchParams.delete("pin");
      // null state: Next copies its own history state and keeps
      // useSearchParams in sync with the address.
      window.history.replaceState(null, "", u);
      if (!wide)
        requestAnimationFrame(() =>
          panelRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          }),
        );
    },
    [pins, map.width, map.height, focusZoom],
  );
  const openDetailRef = useRef(openDetail);
  openDetailRef.current = openDetail;

  const closeDetail = useCallback(() => {
    setDetail(null);
    ml.current?.easeTo({
      padding: { right: 0, left: 0, top: 0, bottom: 0 },
      duration: 300,
    });
    const u = new URL(window.location.href);
    if (u.searchParams.has("pin")) {
      u.searchParams.delete("pin");
      // null state: Next copies its own history state and keeps
      // useSearchParams in sync with the address.
      window.history.replaceState(null, "", u);
    }
  }, []);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDetail();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail, closeDetail]);

  // Search: titles in this game's guide, then fly to the hit's pin.
  useEffect(() => {
    const q = query.trim();
    if (!search || q.length < 2) {
      setResults(null);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/hub-engine/${slug}/entries?q=${encodeURIComponent(q.slice(0, 60))}&limit=8`,
          { signal: ctl.signal },
        );
        const items = r.ok
          ? ((await r.json()) as { items: HubCard[] }).items
          : [];
        // Same era / spoiler rules as the pins: search never spoils.
        setResults(
          items.filter(
            (c) =>
              eraVisible(c.eras, eraSwitch ? era : null) &&
              (!spoilers ||
                spoilerVisible(config.spoilerStages, c.spoilerStage, spoiler)),
          ),
        );
      } catch {
        /* aborted by a newer search, or offline */
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [
    query,
    search,
    slug,
    era,
    spoiler,
    eraSwitch,
    spoilers,
    config.spoilerStages,
  ]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    (pins ?? []).forEach((p) => c.set(p[2], (c.get(p[2]) ?? 0) + 1));
    return c;
  }, [pins]);
  const foundCounts = useMemo(() => {
    const c = new Map<string, number>();
    (pins ?? []).forEach(
      (p) => found.has(p[1]) && c.set(p[2], (c.get(p[2]) ?? 0) + 1),
    );
    return c;
  }, [pins, found]);
  // Pins the reader's era / spoiler choices allow (type chips and "Hide
  // found" are overridden by Show on map, these are not).
  const visibleRows = useMemo(
    () =>
      (pins ?? []).filter(
        ([, , , , , , , stage, eras]) =>
          eraVisible(eras, eraSwitch ? era : null) &&
          (!spoilers || spoilerVisible(config.spoilerStages, stage, spoiler)),
      ),
    [pins, era, spoiler, eraSwitch, spoilers, config.spoilerStages],
  );
  const pinned = useMemo(
    () => new Set(visibleRows.map((p) => p[1])),
    [visibleRows],
  );

  // "Show on map" from the details panel: light those pins up and frame
  // them, leaving room for the panel on desktop.
  const showOnMap = useCallback(
    (ids: string[], label: string) => {
      const m = ml.current;
      const rows = visibleRows.filter((p) => ids.includes(p[1]));
      if (!m || !rows.length) return;
      setHighlight({ ids: new Set(ids), label });
      // A type switched off would hide them; switch it back on.
      setOff((prev) => {
        const n = new Set(prev);
        rows.forEach((r) => n.delete(r[2]));
        return n.size === prev.size ? prev : n;
      });
      const pts = rows.map((r) =>
        pxToLngLat(r[3], r[4], map.width, map.height),
      );
      const lngs = pts.map((q) => q[0]);
      const lats = pts.map((q) => q[1]);
      // The map already keeps room for the open panel (its camera padding
      // from openDetail), so only a small margin is added here.
      m.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        {
          padding: 60,
          maxZoom: focusZoom(),
          duration: 600,
        },
      );
    },
    [visibleRows, map.width, map.height, focusZoom],
  );

  // Only types that have pins on this map get a chip; a chip that hides
  // nothing reads as a broken button.
  const chips = useMemo(
    () => pinnable.filter((t) => (counts.get(t.key) ?? 0) > 0),
    [pinnable, counts],
  );

  const controls = !preview && (
    <Flex gap={2} wrap="wrap" mb={3} align="center">
      {chips.map((t) => {
        const on = !off.has(t.key);
        const total = counts.get(t.key) ?? 0;
        const done = foundCounts.get(t.key) ?? 0;
        return (
          <Button
            key={t.key}
            size="xs"
            h="auto"
            py={1.5}
            borderRadius="10px"
            variant="outline"
            borderColor={on ? t.color : G.line}
            color={on ? "white" : G.muted}
            bg={on ? "rgba(255,255,255,0.06)" : "transparent"}
            title={on ? `Hide ${t.plural}` : `Show ${t.plural}`}
            onClick={() =>
              setOff((prev) => {
                const n = new Set(prev);
                if (n.has(t.key)) n.delete(t.key);
                else n.add(t.key);
                return n;
              })
            }
            aria-pressed={on}
          >
            <Stack gap={1} align="stretch">
              <HStack gap={1.5}>
                <Box w="8px" h="8px" borderRadius="full" bg={t.color} />
                <Text>{t.plural}</Text>
                <Text color={G.muted} fontWeight="600">
                  {done} / {total}
                </Text>
              </HStack>
              <Box
                h="3px"
                bg="rgba(255,255,255,0.1)"
                borderRadius="999px"
                overflow="hidden"
              >
                <Box
                  h="100%"
                  w={`${total ? Math.round((done / total) * 100) : 0}%`}
                  bg={GREEN}
                />
              </Box>
            </Stack>
          </Button>
        );
      })}
      {(pins?.length ?? 0) > 0 && (
        <Button
          size="xs"
          borderRadius="999px"
          variant="outline"
          borderColor={hideFound ? GREEN : G.line}
          color={hideFound ? "white" : G.muted}
          bg={hideFound ? "rgba(126,226,160,0.12)" : "transparent"}
          onClick={flipHideFound}
          aria-pressed={hideFound}
        >
          {hideFound ? <FiEyeOff aria-hidden /> : <FiEye aria-hidden />}
          Hide found
        </Button>
      )}
      {eraSwitch && config.eras.length > 0 && (
        <NativeSelect.Root size="xs" width="auto">
          <NativeSelect.Field
            aria-label="Era"
            value={era ?? ""}
            onChange={(e) => setEra(e.target.value || null)}
            bg={G.card}
            color="white"
          >
            <option value="">All eras</option>
            {config.eras.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      )}
      {spoilers && config.spoilerStages.length > 0 && (
        <NativeSelect.Root size="xs" width="auto">
          <NativeSelect.Field
            aria-label="Spoilers"
            value={spoiler ?? ""}
            onChange={(e) => setSpoiler(e.target.value || null)}
            bg={G.card}
            color="white"
          >
            <option value="">No spoilers</option>
            {config.spoilerStages.map((s) => (
              <option key={s.key} value={s.key}>
                Up to: {s.label}
              </option>
            ))}
            <option value="all">Show everything</option>
          </NativeSelect.Field>
        </NativeSelect.Root>
      )}
    </Flex>
  );

  return (
    <Box>
      {controls}
      {!preview && search && (
        <Box position="relative" mb={3} maxW="420px">
          <HStack
            bg={G.card}
            border="1px solid"
            borderColor={G.line}
            borderRadius="10px"
            px={3}
          >
            <FiSearch color={G.muted} aria-hidden />
            <Input
              aria-label="Search the guide"
              placeholder="Search this guide"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              border="none"
              color="white"
              _focusVisible={{ outline: "none" }}
            />
          </HStack>
          {results && (
            <Box
              position="absolute"
              zIndex={5}
              top="100%"
              left={0}
              right={0}
              mt={1}
              bg={G.panel}
              border="1px solid"
              borderColor={G.line}
              borderRadius="10px"
              maxH="280px"
              overflowY="auto"
            >
              {results.length === 0 && (
                <Text p={3} color={G.muted} fontSize="sm">
                  No matches
                </Text>
              )}
              {results.map((r) => {
                const onMap = pins?.some((p) => p[1] === r.id);
                const hasPage = !!typeOf(config, r.type)?.page;
                // Every hit opens its details on the map (flying to its pin
                // when it has one); only a hit with neither does nothing.
                const dead = !onMap && !hasPage;
                return (
                  <Flex
                    key={r.id}
                    as="button"
                    w="100%"
                    textAlign="left"
                    p={3}
                    gap={2}
                    align="center"
                    _hover={dead ? {} : { bg: "rgba(255,255,255,0.05)" }}
                    cursor={dead ? "default" : "pointer"}
                    onClick={() => {
                      if (!dead) openDetail(r.slug);
                    }}
                    opacity={dead ? 0.6 : 1}
                  >
                    <Box
                      w="8px"
                      h="8px"
                      borderRadius="full"
                      bg={typeOf(config, r.type)?.color ?? G.muted}
                    />
                    <Text color="white" fontSize="sm" flex="1">
                      {r.title}
                    </Text>
                    {!onMap && (
                      <Text fontSize="xs" color={G.muted}>
                        {hasPage ? "open page" : "not on this map"}
                      </Text>
                    )}
                    {found.has(r.id) && (
                      <FiCheck color="#7EE2A0" aria-label="Found" />
                    )}
                  </Flex>
                );
              })}
            </Box>
          )}
        </Box>
      )}
      <Box
        position="relative"
        ref={frame}
        // In full screen (native or MapLibre's CSS fallback) the map fills
        // the frame and the phone sheet floats over the bottom of the map.
        css={{
          "&:fullscreen, &.maplibregl-pseudo-fullscreen": {
            maxWidth: "none",
            background: "#0a0f22",
          },
          "&:fullscreen > [data-map-box], &.maplibregl-pseudo-fullscreen > [data-map-box]":
            {
              height: "100%",
              aspectRatio: "auto",
              borderRadius: 0,
              border: 0,
            },
          "@media (max-width: 47.99em)": {
            "&:fullscreen > [data-panel], &.maplibregl-pseudo-fullscreen > [data-panel]":
              {
                position: "absolute",
                left: "12px",
                right: "12px",
                bottom: "12px",
                width: "auto",
                maxHeight: "55%",
                overflowY: "auto",
                marginTop: 0,
              },
          },
        }}
        // The full map keeps the art's shape (no empty bands above or
        // below), capped so it still fits the screen. The details panel
        // sits inside this same frame.
        {...(preview
          ? {}
          : {
              w: "100%",
              maxW: `calc(78vh * ${map.width / map.height})`,
              mx: "auto",
            })}
      >
        <Box
          position="relative"
          ref={box}
          data-map-box=""
          {...(preview
            ? { h: { base: "280px", md: "380px" } }
            : { w: "100%", aspectRatio: `${map.width} / ${map.height}` })}
          minH={preview ? "300px" : "200px"}
          borderRadius="14px"
          overflow="hidden"
          bg="#0a0f22"
          border="1px solid"
          borderColor={G.line}
        >
          {(!ready || pins === null) && !failed && (
            <Flex
              position="absolute"
              inset={0}
              align="center"
              justify="center"
              zIndex={1}
              pointerEvents="none"
            >
              <Spinner color={G.gold} />
            </Flex>
          )}
          {failed && (
            <Flex
              position="absolute"
              inset={0}
              align="center"
              justify="center"
              zIndex={1}
            >
              <Text color={G.muted}>
                The map could not load on this device.
              </Text>
            </Flex>
          )}
          {!failed && ready && pinsFailed && (
            <Flex
              position="absolute"
              top={3}
              left="50%"
              transform="translateX(-50%)"
              zIndex={2}
              bg={G.panel}
              border="1px solid"
              borderColor={G.line}
              borderRadius="999px"
              px={4}
              py={1.5}
            >
              <Text color={G.muted} fontSize="sm">
                Pins could not load. Refresh the page to try again.
              </Text>
            </Flex>
          )}
          {highlight && (
            <Flex
              position="absolute"
              // Top left beside the zoom buttons: the details panel owns the
              // right side, and the label must stay clickable.
              top={3}
              left="56px"
              zIndex={5}
              align="center"
              gap={2}
              bg={G.panel}
              border="1px solid"
              borderColor="rgba(255,215,0,0.5)"
              borderRadius="999px"
              pl={4}
              pr={1}
              py={1}
              maxW={{
                base: "calc(100% - 70px)",
                md: detail
                  ? `calc(100% - ${PANEL_W + 90}px)`
                  : "calc(100% - 70px)",
              }}
            >
              <Text color="white" fontSize="sm" truncate>
                {highlight.label}
              </Text>
              <Button
                size="xs"
                variant="ghost"
                color={G.text}
                borderRadius="999px"
                _hover={{ bg: "rgba(255,255,255,0.08)" }}
                onClick={() => setHighlight(null)}
                aria-label="Clear highlight"
              >
                <FiX />
              </Button>
            </Flex>
          )}
          {preview && (
            <Box position="absolute" bottom={3} right={3} zIndex={2}>
              <NextLink href={`/games/${slug}/map`}>
                <HStack
                  bg={G.gold}
                  color={G.ink}
                  fontWeight="700"
                  fontSize="sm"
                  px={3}
                  py={1.5}
                  borderRadius="999px"
                >
                  <FiMaximize2 aria-hidden />
                  <Text>Open full map</Text>
                </HStack>
              </NextLink>
            </Box>
          )}
        </Box>
        {!preview && detail && (
          <Box
            ref={panelRef}
            data-panel=""
            position={{ base: "static", md: "absolute" }}
            top={{ md: 3 }}
            right={{ md: 3 }}
            bottom={{ md: 3 }}
            w={{ base: "100%", md: `${PANEL_W}px` }}
            maxW={{ md: "calc(100% - 24px)" }}
            mt={{ base: 3, md: 0 }}
            zIndex={4}
            overflowY={{ md: "auto" }}
            borderRadius="14px"
          >
            <GuideEntryPanel
              key={detail}
              slug={slug}
              config={config}
              entrySlug={detail}
              found={found}
              pinned={pinned}
              onToggleFound={toggle}
              onOpenEntry={openDetail}
              onShowOnMap={showOnMap}
              onClose={closeDetail}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
