"use client";

// A guide map with its own progress/preferences provider, for pages that
// show one map on its own (the full map page, an entry page's mini map).
import { useSearchParams } from "next/navigation";
import type { HubMapDef, HubTemplateConfig } from "@/lib/hub-engine/types";
import GuideMap from "@/components/games/guide/GuideMap";
import { GuideProgressProvider } from "@/components/games/guide/GuideProgress";

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
  const map =
    fixed ?? config.maps.find((m) => m.key === wanted) ?? config.maps[0];
  if (!map) return null;
  return (
    <GuideProgressProvider slug={slug}>
      <GuideMap
        slug={slug}
        config={config}
        map={map}
        preview={preview}
        focusPin={pin}
        focusEntry={entry}
      />
    </GuideProgressProvider>
  );
}
