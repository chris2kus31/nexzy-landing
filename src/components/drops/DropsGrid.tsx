"use client";
// Live / Dropping soon / Past drops, plus From players (player drops Nexzy
// put on the website) when there are any, switched in place (the cards are
// all in the server HTML for search engines; tabs only hide and show).
import { useState } from "react";
import { Box, Flex, SimpleGrid, Text, chakra } from "@chakra-ui/react";
import DropCard from "@/components/drops/DropCard";
import { D } from "@/components/drops/tokens";
import type { DropsPage } from "@/lib/trends/types";

type Tab = "live" | "soon" | "past" | "players";
const ALL_TABS: Array<[Tab, string]> = [
  ["live", "Live"],
  ["soon", "Dropping soon"],
  ["past", "Past drops"],
  ["players", "From players"],
];
const EMPTY: Record<Tab, string> = {
  live: "No drops are live right now. The next one is on its way.",
  soon: "Nothing scheduled yet. Check back soon.",
  past: "No past drops yet.",
  players: "",
};

export default function DropsGrid({ page }: { page: DropsPage }) {
  const [tab, setTab] = useState<Tab>("live");
  const lists: Record<Tab, DropsPage["live"]> = {
    live: page.live,
    soon: page.soon,
    past: page.past,
    players: page.players ?? [],
  };
  const TABS = ALL_TABS.filter(
    ([k]) => k !== "players" || lists.players.length,
  );
  return (
    <Box>
      <Flex gap={2} wrap="wrap" role="tablist" aria-label="Drops">
        {TABS.map(([k, label]) => {
          const on = tab === k;
          const n = lists[k].length;
          return (
            <chakra.button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`drops-${k}`}
              onClick={() => setTab(k)}
              px={3.5}
              py={2}
              borderRadius="full"
              fontSize="sm"
              fontWeight={on ? "800" : "600"}
              bg={on ? D.white : "transparent"}
              color={on ? D.base : D.dim}
              border="1px solid"
              borderColor={on ? D.white : D.line}
              _focusVisible={{
                outline: `2px solid ${D.yellow}`,
                outlineOffset: "2px",
              }}
            >
              {label}
              {n > 0 && k !== "live" ? ` ${n}` : ""}
            </chakra.button>
          );
        })}
      </Flex>
      {TABS.map(([k]) => (
        <Box
          key={k}
          id={`drops-${k}`}
          role="tabpanel"
          hidden={tab !== k}
          mt={6}
        >
          {lists[k].length === 0 ? (
            <Text color={D.muted}>{EMPTY[k]}</Text>
          ) : (
            <SimpleGrid
              columns={{ base: 1, sm: 2, lg: 3 }}
              gap={{ base: 4, md: 8 }}
            >
              {lists[k].map((d) => (
                <DropCard key={d.slug} drop={d} />
              ))}
            </SimpleGrid>
          )}
        </Box>
      ))}
    </Box>
  );
}
