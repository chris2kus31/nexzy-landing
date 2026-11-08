"use client";

// Links in a guide page's text to entries of the game (any game, any type):
// a plain click opens the entry's details in a window instead of leaving the
// page, and "Show on map" there jumps to the entry's pin on a map block of
// THIS page (switching to the right floor) when the page has one. New-tab
// clicks still follow the link. Map blocks register themselves here.
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Box } from "@chakra-ui/react";
import type { HubEntryFull, HubTemplateConfig } from "@/lib/hub-engine/types";
import { typeOf } from "@/lib/hub-engine/types";
import GuideEntryDialog from "@/components/games/guide/GuideEntryDialog";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PageMap = {
  /** Every map key this block can show (its floors). */
  keys: ReadonlySet<string>;
  /** Switch to that map/floor, open on the entry's pin, scroll to it. */
  show: (mapKey: string, entrySlug: string) => void;
};

type Ctx = {
  register: (id: string, m: PageMap) => () => void;
  /** A handler that shows the entry on this page's map, or null. */
  showOnPage: (e: HubEntryFull) => (() => void) | null;
  openEntry: (entrySlug: string) => void;
};

const PageMapsContext = createContext<Ctx | null>(null);

/** Null outside a guide page (hub, map page): blocks then work as before. */
export const usePageMaps = () => useContext(PageMapsContext);

export default function GuidePageMaps({
  slug,
  config,
  children,
}: {
  slug: string;
  config: HubTemplateConfig;
  children: ReactNode;
}) {
  const maps = useRef(new Map<string, PageMap>());
  const [open, setOpen] = useState<string | null>(null);

  const register = useCallback((id: string, m: PageMap) => {
    maps.current.set(id, m);
    return () => {
      maps.current.delete(id);
    };
  }, []);

  const showOnPage = useCallback(
    (e: HubEntryFull) => {
      // A floor map (a map in a group) is the precise spot: prefer it.
      const order = [...e.pins].sort(
        (a, b) =>
          Number(!!config.maps.find((m) => m.key === b.map)?.group) -
          Number(!!config.maps.find((m) => m.key === a.map)?.group),
      );
      for (const p of order)
        for (const m of maps.current.values())
          if (m.keys.has(p.map))
            return () => {
              setOpen(null);
              m.show(p.map, e.slug);
            };
      return null;
    },
    [config],
  );

  // /games/<slug>/<type>/<entry> links in the page text open the details.
  const onClickCapture = (ev: MouseEvent<HTMLDivElement>) => {
    if (ev.defaultPrevented || ev.button !== 0) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const a = (ev.target as HTMLElement).closest("a");
    if (!a || a.hasAttribute("data-direct")) return;
    let url: URL;
    try {
      url = new URL(a.href, window.location.href);
    } catch {
      return;
    }
    if (url.origin !== window.location.origin) return;
    const parts = url.pathname.split("/").filter(Boolean);
    if (
      parts.length === 4 &&
      parts[0] === "games" &&
      parts[1] === slug &&
      typeOf(config, parts[2]) &&
      SLUG_RE.test(parts[3])
    ) {
      ev.preventDefault();
      setOpen(parts[3]);
    }
  };

  const value = useMemo(
    () => ({ register, showOnPage, openEntry: setOpen }),
    [register, showOnPage],
  );

  return (
    <PageMapsContext.Provider value={value}>
      <Box onClickCapture={onClickCapture}>{children}</Box>
      <GuideEntryDialog
        slug={slug}
        config={config}
        entrySlug={open}
        onOpenEntry={setOpen}
        onClose={() => setOpen(null)}
        onShowOnPage={showOnPage}
      />
    </PageMapsContext.Provider>
  );
}
