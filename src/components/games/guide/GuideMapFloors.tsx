"use client";

// A guide map with floor tabs. Maps that share a `group` in the template are
// one map with floors (a dungeon); this shows a tab per floor and swaps the
// map below. A map outside a group renders exactly like GuideMap.
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import GuideMap from "@/components/games/guide/GuideMap";
import { G } from "@/components/games/guide/GuideBits";
import { usePageMaps } from "@/components/games/guide/GuidePageMaps";
import { floorsOf, mapTitle } from "@/lib/hub-engine/maps";

type Props = ComponentProps<typeof GuideMap> & {
  /** Full map page: keep ?map=<floor> in the address as floors change. */
  syncUrl?: boolean;
};

export default function GuideMapFloors({ syncUrl = false, ...props }: Props) {
  const { config, map, focusPin = null, focusEntry = null } = props;
  const floors = useMemo(() => floorsOf(config, map), [config, map]);
  const [cur, setCur] = useState(map.key);
  useEffect(() => setCur(map.key), [map.key]);
  // "Show on map" from the page text: an entry to open on, and a counter
  // so asking for the same floor again re-focuses the map.
  const [asked, setAsked] = useState<{ entry: string; n: number } | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const id = useId();
  const pageMaps = usePageMaps();
  useEffect(() => {
    if (!pageMaps) return;
    return pageMaps.register(id, {
      keys: new Set(floors.map((f) => f.key)),
      show: (mapKey, entry) => {
        setCur(mapKey);
        setAsked((a) => ({ entry, n: (a?.n ?? 0) + 1 }));
        box.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
    });
  }, [pageMaps, id, floors]);

  const active = floors.find((f) => f.key === cur) ?? map;
  const pick = (key: string) => {
    setCur(key);
    setAsked(null);
    if (!syncUrl) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("map", key);
      url.searchParams.delete("pin");
      url.searchParams.delete("entry");
      // Next's router listens to this form without reloading the page.
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* address bar stays as it was; the map still switches */
    }
  };
  // The focus pin/entry belongs to the floor the map opened on.
  const opened = active.key === map.key;
  return (
    <Box ref={box}>
      {floors.length > 1 && (
        <Flex align="center" gap={1.5} wrap="wrap" mb={2}>
          <Text
            fontSize="xs"
            fontWeight="700"
            color={G.muted}
            textTransform="uppercase"
            letterSpacing="0.06em"
            mr={1}
          >
            {mapTitle(map)}
          </Text>
          <Flex role="tablist" aria-label={`${mapTitle(map)} floors`} gap={1.5}>
            {floors.map((f) => {
              const on = f.key === active.key;
              return (
                <Box
                  as="button"
                  key={f.key}
                  role="tab"
                  aria-selected={on}
                  onClick={() => pick(f.key)}
                  px={3}
                  py={1}
                  minW="44px"
                  borderRadius="999px"
                  border="1px solid"
                  borderColor={on ? G.gold : G.line}
                  bg={on ? G.gold : "transparent"}
                  color={on ? G.ink : G.text}
                  fontSize="sm"
                  fontWeight="800"
                  cursor="pointer"
                  _hover={on ? undefined : { borderColor: G.gold }}
                >
                  {f.floor ?? f.name}
                </Box>
              );
            })}
          </Flex>
        </Flex>
      )}
      <GuideMap
        key={`${active.key}:${asked?.n ?? 0}`}
        {...props}
        map={active}
        focusPin={asked ? null : opened ? focusPin : null}
        focusEntry={asked ? asked.entry : opened ? focusEntry : null}
      />
    </Box>
  );
}
