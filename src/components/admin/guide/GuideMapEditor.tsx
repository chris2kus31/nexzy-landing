"use client";

// Admin -> Guides -> Map: place pins. Pick an entry, then click the map to
// drop its pin; drag its pins to adjust; Save writes that entry's pins. All
// other pins show faded (drafts included) so you can see what's covered.
// Uses the same MapLibre setup and pixel math as the public map.
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { FiTrash2, FiX } from "react-icons/fi";
import {
  fitWholeArt,
  loadMapLibre,
  mapArtUrl,
} from "@/lib/hub-engine/maplibre";
import type { GeoJSONSource, Map as MlMap, Marker } from "maplibre-gl";
import type { HubTemplateConfig } from "@/lib/hub-engine/types";
import {
  baseZoom,
  imageCorners,
  lngLatToPx,
  pxToLngLat,
} from "@/lib/hub-engine/coords";
import {
  errorLines,
  getEngineEntry,
  getEngineMapPins,
  listEngineEntries,
  setEngineEntryPins,
  type AdminMapPin,
  type EngineEntry,
  type EngineEntryRow,
} from "@/lib/admin/client-hub-engine";
import {
  C,
  Gold,
  Pick,
  Plain,
  Problems,
  TextIn,
} from "@/components/admin/guide/ui";

type PinDraft = { mapKey: string; x: number; y: number };

export default function GuideMapEditor({
  gameId,
  config,
  initialEntryId,
  onDirtyChange,
}: {
  gameId: string;
  config: HubTemplateConfig;
  initialEntryId?: string | null;
  /** Lets the panel warn before a tab switch drops unsaved pins. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const maps = config.maps;
  const [mapKey, setMapKey] = useState(maps[0]?.key ?? "");
  const map = maps.find((m) => m.key === mapKey);
  const box = useRef<HTMLDivElement | null>(null);
  const ml = useRef<MlMap | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [all, setAll] = useState<AdminMapPin[]>([]);
  const [entry, setEntry] = useState<EngineEntry | null>(null);
  const [pins, setPins] = useState<PinDraft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<EngineEntryRow[]>([]);
  const entryRef = useRef(entry);
  entryRef.current = entry;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  const pinnable = new Set(
    config.types.filter((t) => t.pinnable).map((t) => t.key),
  );

  const loadAll = useCallback(async () => {
    if (!mapKey) return;
    try {
      setAll(await getEngineMapPins(gameId, mapKey));
    } catch (e) {
      setErr(errorLines(e));
    }
  }, [gameId, mapKey]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const pick = useCallback(
    async (id: string) => {
      if (
        dirtyRef.current &&
        !window.confirm("You have unsaved pin changes. Switch entry anyway?")
      )
        return;
      setErr([]);
      try {
        const e = await getEngineEntry(gameId, id);
        setEntry(e);
        setPins(e.pins.map((p) => ({ mapKey: p.mapKey, x: p.x, y: p.y })));
        setDirty(false);
        setQ("");
        setHits([]);
      } catch (x) {
        setErr(errorLines(x));
      }
    },
    [gameId],
  );
  const pickRef = useRef(pick);
  pickRef.current = pick;

  useEffect(() => {
    if (initialEntryId) void pick(initialEntryId);
  }, [initialEntryId, pick]);

  // Map instance per map art.
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
            "circle-radius": 6,
            "circle-opacity": 0.55,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
          },
        });
        setReady(true);
      });
      // One click handler decides: a click on a faded pin opens that entry;
      // anywhere else drops a pin for the selected entry.
      m0.on("click", (e) => {
        const hit = m0.queryRenderedFeatures(e.point, { layers: ["all"] })[0];
        const hitId = hit?.properties?.entryId;
        if (typeof hitId === "string" && hitId !== entryRef.current?.id) {
          void pickRef.current(hitId);
          return;
        }
        if (!entryRef.current) return;
        const [x, y] = lngLatToPx(
          e.lngLat.lng,
          e.lngLat.lat,
          map.width,
          map.height,
        );
        if (x < 0 || y < 0 || x > map.width || y > map.height) return;
        setPins((cur) => [
          ...cur,
          {
            mapKey: map.key,
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
          },
        ]);
        setDirty(true);
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

  // Faded layer: every pin except the selected entry's.
  useEffect(() => {
    if (!ready || !ml.current || !map) return;
    const feats = all
      .filter((p) => p.entryId !== entry?.id)
      .map((p) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: pxToLngLat(p.x, p.y, map.width, map.height),
        },
        properties: { entryId: p.entryId, type: p.type },
      }));
    (ml.current.getSource("all") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: feats,
    });
  }, [all, entry?.id, ready, map]);

  // Draggable markers for the selected entry's pins on this map.
  useEffect(() => {
    const maplibregl = lib.current;
    if (!ready || !ml.current || !map || !maplibregl) return;
    markers.current.forEach((m) => m.remove());
    const color =
      config.types.find((t) => t.key === entry?.typeKey)?.color ?? C.gold;
    markers.current = pins
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.mapKey === map.key)
      .map(({ p, i }) => {
        const m = new maplibregl.Marker({ color, draggable: true })
          .setLngLat(pxToLngLat(p.x, p.y, map.width, map.height))
          .addTo(ml.current!);
        // A click on the marker must not also drop a new pin on the map.
        m.getElement().addEventListener("click", (ev) => ev.stopPropagation());
        m.on("dragend", () => {
          const ll = m.getLngLat();
          const [x, y] = lngLatToPx(ll.lng, ll.lat, map.width, map.height);
          setPins((cur) =>
            cur.map((q, j) =>
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
          setDirty(true);
        });
        return m;
      });
  }, [pins, ready, map, entry?.typeKey, config.types]);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await listEngineEntries(gameId, { search: s });
        setHits(r.items.filter((x) => pinnable.has(x.type)).slice(0, 8));
      } catch {
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, gameId]);

  const save = async () => {
    if (!entry) return;
    setBusy(true);
    setErr([]);
    try {
      const saved = await setEngineEntryPins(gameId, entry.id, pins);
      setPins(saved.map((p) => ({ mapKey: p.mapKey, x: p.x, y: p.y })));
      setDirty(false);
      await loadAll();
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      setBusy(false);
    }
  };

  if (!maps.length)
    return (
      <Text color={C.warn}>
        Upload map art on the Setup tab and publish it first.
      </Text>
    );
  const typeLabel = (k: string) =>
    config.types.find((t) => t.key === k)?.label ?? k;
  return (
    <Stack gap={3}>
      <Flex gap={3} wrap="wrap" align="flex-start">
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
        <Box position="relative" w="320px">
          <TextIn
            value={q}
            placeholder="Find an entry to place"
            onChange={setQ}
          />
          {hits.length > 0 && (
            <Box
              position="absolute"
              zIndex={5}
              top="100%"
              left={0}
              right={0}
              bg={C.surface}
              border="1px solid"
              borderColor={C.line}
              borderRadius="8px"
              mt={1}
            >
              {hits.map((h) => (
                <Flex
                  key={h.id}
                  as="button"
                  w="100%"
                  textAlign="left"
                  p={2}
                  gap={2}
                  _hover={{ bg: C.raised }}
                  onClick={() => void pick(h.id)}
                >
                  <Text fontSize="sm" color={C.text} flex="1">
                    {h.title}
                  </Text>
                  <Text fontSize="xs" color={C.muted}>
                    {typeLabel(h.type)} · {h.pins}
                  </Text>
                </Flex>
              ))}
            </Box>
          )}
        </Box>
        {entry && (
          <HStack
            bg={C.raised}
            borderRadius="10px"
            px={3}
            py={2}
            gap={3}
            wrap="wrap"
          >
            <Text color={C.text} fontWeight="700">
              {entry.title}
            </Text>
            <Text fontSize="xs" color={C.muted}>
              {pins.filter((p) => p.mapKey === mapKey).length} pin(s) here
            </Text>
            {pins.length > 0 && (
              <Plain
                danger
                onClick={() => {
                  setPins((cur) => cur.filter((p) => p.mapKey !== mapKey));
                  setDirty(true);
                }}
              >
                <FiTrash2 aria-hidden /> Clear pins on this map
              </Plain>
            )}
            <Gold onClick={() => void save()} loading={busy} disabled={!dirty}>
              Save pins
            </Gold>
            <Plain
              onClick={() => {
                setEntry(null);
                setPins([]);
                setDirty(false);
              }}
            >
              <FiX aria-label="Done" />
            </Plain>
          </HStack>
        )}
      </Flex>
      <Text fontSize="sm" color={C.muted}>
        {entry
          ? "Click the map to drop a pin for this entry. Drag a pin to move it. Save when done."
          : "Pick an entry (search above, or click a faded pin), then click the map to place it."}
      </Text>
      <Problems lines={err} />
      <Box
        ref={box}
        h="70vh"
        minH="420px"
        borderRadius="12px"
        overflow="hidden"
        border="1px solid"
        borderColor={C.line}
      />
    </Stack>
  );
}
