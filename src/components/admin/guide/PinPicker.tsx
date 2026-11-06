"use client";

// Click-to-pin map for forms (Quick add). Shows the map art with every
// existing pin faded (so you can see what's covered), drops a pin where you
// click, and lets you drag or remove it. Same MapLibre setup and pixel math
// as the public map and the Map tab.
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { FiTrash2 } from "react-icons/fi";
import type { GeoJSONSource, Map as MlMap, Marker } from "maplibre-gl";
import {
  artErrorRetry,
  fitWholeArt,
  loadMapLibre,
  mapArtUrl,
} from "@/lib/hub-engine/maplibre";
import {
  baseZoom,
  imageCorners,
  lngLatToPx,
  pxToLngLat,
} from "@/lib/hub-engine/coords";
import type { HubTemplateConfig } from "@/lib/hub-engine/types";
import { getEngineMapPins } from "@/lib/admin/client-hub-engine";
import { C, Pick, Plain } from "@/components/admin/guide/ui";

export type PickedPin = { mapKey: string; x: number; y: number };

export default function PinPicker({
  gameId,
  config,
  pins,
  color,
  onChange,
  refreshKey = 0,
}: {
  gameId: string;
  config: HubTemplateConfig;
  pins: PickedPin[];
  color: string;
  onChange: (pins: PickedPin[]) => void;
  /** Bump after a save so the faded layer shows the new pin. */
  refreshKey?: number;
}) {
  const maps = config.maps;
  const [mapKey, setMapKey] = useState(maps[0]?.key ?? "");
  const map = maps.find((m) => m.key === mapKey);
  const box = useRef<HTMLDivElement | null>(null);
  const ml = useRef<MlMap | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!map || !box.current) return;
    let alive = true;
    let instance: MlMap | null = null;
    (async () => {
      const maplibregl = await loadMapLibre();
      lib.current = maplibregl;
      if (!alive || !box.current) return;
      const corners = imageCorners(map.width, map.height);
      const z0 = baseZoom(map.width, map.height);
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
            { id: "art", type: "raster", source: "art" },
          ],
        },
        bounds: [corners[3], corners[1]],
        minZoom: z0 + map.minZoom,
        maxZoom: z0 + map.maxZoom + 1,
        renderWorldCopies: false,
        attributionControl: false,
        dragRotate: false,
      });
      instance = m0;
      fitWholeArt(m0, corners[3], corners[1]);
      m0.on(
        "error",
        artErrorRetry(m0, map.url, corners, () => {
          if (alive) setErr("The map art could not load. Reload the page.");
        }),
      );
      m0.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      ml.current = m0;
      m0.on("load", () => {
        if (!alive || !instance) return;
        instance.addSource("all", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        instance.addLayer({
          id: "all",
          type: "circle",
          source: "all",
          paint: {
            "circle-color": colorMatch as never,
            "circle-radius": 5,
            "circle-opacity": 0.45,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
          },
        });
        setReady(true);
      });
      m0.on("click", (e) => {
        const [x, y] = lngLatToPx(
          e.lngLat.lng,
          e.lngLat.lat,
          map.width,
          map.height,
        );
        if (x < 0 || y < 0 || x > map.width || y > map.height) return;
        onChangeRef.current([
          ...pinsRef.current,
          {
            mapKey: map.key,
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
          },
        ]);
      });
    })();
    return () => {
      alive = false;
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      instance?.remove();
      ml.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map?.key, map?.url, map?.width, map?.height]);

  // Faded layer: every pin already on this map.
  useEffect(() => {
    if (!ready || !ml.current || !map) return;
    let alive = true;
    getEngineMapPins(gameId, map.key)
      .then((rows) => {
        if (!alive || !ml.current) return;
        (ml.current.getSource("all") as GeoJSONSource | undefined)?.setData({
          type: "FeatureCollection",
          features: rows.map((p) => ({
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: pxToLngLat(p.x, p.y, map.width, map.height),
            },
            properties: { type: p.type },
          })),
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [ready, map, gameId, refreshKey]);

  // Draggable markers for the picked pins on this map.
  useEffect(() => {
    const maplibregl = lib.current;
    if (!ready || !ml.current || !map || !maplibregl) return;
    markers.current.forEach((m) => m.remove());
    markers.current = pins
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.mapKey === map.key)
      .map(({ p, i }) => {
        const m = new maplibregl.Marker({ color, draggable: true })
          .setLngLat(pxToLngLat(p.x, p.y, map.width, map.height))
          .addTo(ml.current!);
        m.getElement().addEventListener("click", (ev) => ev.stopPropagation());
        m.on("dragend", () => {
          const ll = m.getLngLat();
          const [x, y] = lngLatToPx(ll.lng, ll.lat, map.width, map.height);
          onChangeRef.current(
            pinsRef.current.map((q, j) =>
              j === i
                ? {
                    ...q,
                    x:
                      Math.round(Math.min(Math.max(x, 0), map.width) * 10) / 10,
                    y:
                      Math.round(Math.min(Math.max(y, 0), map.height) * 10) /
                      10,
                  }
                : q,
            ),
          );
        });
        return m;
      });
  }, [pins, ready, map, color]);

  if (!maps.length)
    return (
      <Text color={C.warn} fontSize="sm">
        Upload map art on the Setup tab to place pins.
      </Text>
    );
  const here = pins.filter((p) => p.mapKey === mapKey).length;
  return (
    <Box>
      <Flex gap={3} align="center" wrap="wrap" mb={2}>
        {maps.length > 1 && (
          <Box w="200px">
            <Pick
              label="Map"
              value={mapKey}
              onChange={setMapKey}
              options={maps.map((m) => ({ value: m.key, label: m.name }))}
            />
          </Box>
        )}
        <Text fontSize="sm" color={C.muted} flex="1">
          Click the map to drop a pin. Drag to move it.
          {here ? ` ${here} pin${here > 1 ? "s" : ""} here.` : ""}
        </Text>
        {pins.length > 0 && (
          <Plain danger onClick={() => onChange([])}>
            <FiTrash2 aria-hidden /> Remove pins
          </Plain>
        )}
      </Flex>
      {err && (
        <Text color={C.bad} fontSize="sm" mb={2}>
          {err}
        </Text>
      )}
      <Box
        ref={box}
        w="100%"
        aspectRatio={map ? `${map.width} / ${map.height}` : undefined}
        maxW={map ? `calc(60vh * ${map.width / map.height})` : undefined}
        mx="auto"
        minH="300px"
        borderRadius="12px"
        overflow="hidden"
        border="1px solid"
        borderColor={C.line}
      />
    </Box>
  );
}
