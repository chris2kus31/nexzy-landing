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
  Text,
} from "@chakra-ui/react";
import { FiCheck, FiMaximize2, FiSearch } from "react-icons/fi";
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HubCard[] | null>(null);
  // Entry slug whose details are open on the map (full map only).
  const [detail, setDetail] = useState<string | null>(null);
  const popupRef = useRef<import("maplibre-gl").Popup | null>(null);
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
        ([, , type, , , , , stage, eras]) =>
          !off.has(type) &&
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
        },
      }));
    return { type: "FeatureCollection" as const, features: feats };
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
            data: dataRef.current,
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
          instance.addLayer({
            id: "pins",
            type: "circle",
            source: "pins",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": colorMatch as never,
              "circle-radius": 8,
              "circle-opacity": ["case", ["==", ["get", "c"], 1], 1, 0.6],
              "circle-stroke-width": ["case", ["==", ["get", "f"], 1], 3, 1.5],
              "circle-stroke-color": [
                "case",
                ["==", ["get", "f"], 1],
                "#7EE2A0",
                "#ffffff",
              ],
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
          instance.on("click", "pins", (e: MapLayerMouseEvent) => {
            const f = e.features?.[0];
            if (!f || f.geometry.type !== "Point" || !instance) return;
            openPopupRef.current(
              maplibregl,
              instance,
              f.geometry.coordinates as [number, number],
              f.properties as PinProps,
            );
          });
          for (const id of ["clusters", "pins"]) {
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

  // Push filter / progress changes to the GPU source.
  useEffect(() => {
    if (!ready || !ml.current) return;
    (ml.current.getSource("pins") as GeoJSONSource | undefined)?.setData(data);
  }, [data, ready]);

  // ?pin=<id>: fly there once pins are in.
  useEffect(() => {
    if (!ready || !pins || !focusPin || !ml.current) return;
    const row = pins.find((p) => p[0] === focusPin);
    if (!row) return;
    // The full map opens the pin's details (a shared ?pin= link); a preview
    // just frames the pin.
    if (!preview && row[9]) {
      openDetailRef.current(row[9]);
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
    const c = imageCorners(map.width, map.height);
    const fit = m.cameraForBounds([c[3], c[1]], { padding: 12 })?.zoom;
    const base =
      typeof fit === "number" && Number.isFinite(fit) ? fit : m.getZoom();
    return Math.min(m.getMaxZoom(), base + 1.6);
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
            openDetailRef.current(p.s);
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
      // MapLibre's default popup chrome is WHITE; ours carries light text and
      // a gold link, so the chrome is restyled here (no global CSS to forget).
      const chrome = pop.getElement();
      const content = chrome.querySelector(
        ".maplibregl-popup-content",
      ) as HTMLElement | null;
      if (content) {
        content.style.background = "#11162c";
        content.style.border = "1px solid rgba(255,255,255,0.16)";
        content.style.borderRadius = "10px";
        content.style.boxShadow = "0 10px 30px rgba(0,0,0,0.55)";
      }
      const close = chrome.querySelector(
        ".maplibregl-popup-close-button",
      ) as HTMLElement | null;
      if (close) {
        close.style.color = "#EDF2F7";
        close.style.fontSize = "16px";
      }
      // The white arrow tip can't be recolored per anchor side reliably;
      // the offset above keeps the popup clear of the pin without it.
      chrome
        .querySelectorAll<HTMLElement>(".maplibregl-popup-tip")
        .forEach((tip) => (tip.style.display = "none"));
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
    (entrySlug: string) => {
      popupRef.current?.remove();
      popupRef.current = null;
      setResults(null);
      setDetail(entrySlug);
      const row = pins?.find((p) => p[9] === entrySlug);
      const m = ml.current;
      const wide = window.matchMedia(WIDE).matches;
      if (row && m) {
        m.easeTo({
          center: pxToLngLat(row[3], row[4], map.width, map.height),
          zoom: Math.max(m.getZoom(), focusZoom()),
          padding: wide
            ? { right: PANEL_W + 24, left: 0, top: 0, bottom: 0 }
            : 0,
          duration: 500,
        });
      }
      const u = new URL(window.location.href);
      if (row) u.searchParams.set("pin", row[0]);
      else u.searchParams.delete("pin");
      window.history.replaceState(window.history.state, "", u);
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
      window.history.replaceState(window.history.state, "", u);
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

  // Only types that have pins on this map get a chip; a chip that hides
  // nothing reads as a broken button.
  const chips = useMemo(
    () => pinnable.filter((t) => (counts.get(t.key) ?? 0) > 0),
    [pinnable, counts],
  );

  const controls = !preview && (
    <Flex gap={2} wrap="wrap" mb={3} align="center">
      {chips.length > 1 &&
        chips.map((t) => {
          const on = !off.has(t.key);
          return (
            <Button
              key={t.key}
              size="xs"
              borderRadius="999px"
              variant="outline"
              borderColor={on ? t.color : G.line}
              color={on ? "white" : G.muted}
              bg={on ? "rgba(255,255,255,0.06)" : "transparent"}
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
              <Box w="8px" h="8px" borderRadius="full" bg={t.color} mr={1.5} />
              {t.plural} ({counts.get(t.key)})
            </Button>
          );
        })}
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
              slug={slug}
              config={config}
              entrySlug={detail}
              found={found}
              onToggleFound={toggle}
              onOpenEntry={openDetail}
              onClose={closeDetail}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
