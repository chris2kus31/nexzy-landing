"use client";

// A guide map with its own progress/preferences provider, for pages that
// show one map on its own (the full map page, an entry page's mini map).
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Box } from "@chakra-ui/react";
import type {
  HubEntryFull,
  HubMapDef,
  HubTemplateConfig,
} from "@/lib/hub-engine/types";
import GuideMapFloors from "@/components/games/guide/GuideMapFloors";
import { GuideProgressProvider } from "@/components/games/guide/GuideProgress";
import { bestPin } from "@/lib/hub-engine/maps";

const PIN_RE = /^[0-9a-f-]{36}$/i;

/** `map` fixes the map; otherwise ?map=<key> picks one of the template's maps
 *  (read in the browser so the page itself stays statically cached). */
export default function GuideMapScreen({
  slug,
  config,
  map: fixed,
  preview = false,
  focusPin = null,
}: {
  slug: string;
  config: HubTemplateConfig;
  map?: HubMapDef;
  preview?: boolean;
  focusPin?: string | null;
}) {
  const sp = useSearchParams();
  const fromUrl = sp?.get("pin");
  const pin = focusPin ?? (fromUrl && PIN_RE.test(fromUrl) ? fromUrl : null);
  // ?entry=<slug> (guide page "Show on map"): open that entry's first pin.
  const entryFromUrl = sp?.get("entry");
  const entry =
    !pin && entryFromUrl && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entryFromUrl)
      ? entryFromUrl.slice(0, 80)
      : null;
  const wanted = sp?.get("map");
  const asked = config.maps.find((m) => m.key === wanted);
  // ?entry=<slug> without ?map: open the map (floor) that entry is pinned on.
  const lookUp = !fixed && !asked && !!entry && config.maps.length > 1;
  const [entryMap, setEntryMap] = useState<string | null | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!lookUp || !entry) return;
    const ctl = new AbortController();
    fetch(`/api/hub-engine/${slug}/entries/${encodeURIComponent(entry)}`, {
      signal: ctl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: HubEntryFull) =>
        setEntryMap(bestPin(config, d.pins)?.map ?? null),
      )
      .catch(() => {
        if (!ctl.signal.aborted) setEntryMap(null);
      });
    return () => ctl.abort();
  }, [lookUp, entry, slug, config]);
  if (lookUp && entryMap === undefined)
    return (
      <Box h={preview ? "320px" : "70vh"} bg="#0a0f22" borderRadius="14px" />
    );
  const map =
    fixed ??
    asked ??
    config.maps.find((m) => m.key === entryMap) ??
    config.maps[0];
  if (!map) return null;
  return (
    <GuideProgressProvider slug={slug}>
      <GuideMapFloors
        slug={slug}
        config={config}
        map={map}
        preview={preview}
        focusPin={pin}
        focusEntry={entry}
        syncUrl={!fixed && !preview}
      />
    </GuideProgressProvider>
  );
}
