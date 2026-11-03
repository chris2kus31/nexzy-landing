"use client";

// Hub Rooms showcase (Phase 3 Step 4). Live and upcoming PUBLIC Squad Rooms for
// this game, with a way into the app. Rooms are app-only: the website never
// opens one. Renders nothing while rooms are off for this game (or for
// signed-out readers during the staff-only soft launch).
// Performance: one same-origin GET, publicly cached 30s at the CDN, so a busy
// hub is one API call per 30s, not one per visitor. No polling.
import { useEffect, useState } from "react";
import {
  Box,
  HStack,
  Heading,
  SimpleGrid,
  Text,
  chakra,
} from "@chakra-ui/react";
import { track } from "@/lib/analytics";
import { fmtRoomTime, kindLabel, type HubRoomsList } from "@/lib/rooms/public";

const C = {
  panel: "#1a1f3a",
  card: "#11152b",
  line: "rgba(255,255,255,0.12)",
  muted: "#9aa3bf",
  text: "#EDF2F7",
  gold: "#FFD700",
  live: "#7EE2A0",
  ink: "#0b0e1d",
};

const SHOW = 6;

export default function HubRooms({
  slug,
  gameName,
}: {
  slug: string;
  gameName: string;
}) {
  const [data, setData] = useState<HubRoomsList | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/hubs/${slug}/rooms`)
      .then((r) => (r.ok ? (r.json() as Promise<HubRoomsList>) : null))
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [slug]);

  if (!data?.enabled) return null;
  const rooms = data.rooms.slice(0, SHOW);
  const getApp = `/get?src=hub_rooms`;

  return (
    <Box
      as="section"
      aria-labelledby="hub-rooms"
      bg={C.panel}
      borderRadius="18px"
      p={{ base: 5, md: 6 }}
      border="1px solid"
      borderColor={C.line}
    >
      <HStack
        justify="space-between"
        align="baseline"
        wrap="wrap"
        gap={2}
        mb={1}
      >
        <Heading
          as="h2"
          id="hub-rooms"
          fontSize={{ base: "xl", md: "2xl" }}
          color="white"
        >
          {gameName} rooms
        </Heading>
        <Text fontSize="sm" color={C.muted}>
          {data.live} live · {data.upcoming} coming up
        </Text>
      </HStack>
      <Text fontSize="sm" color={C.muted} mb={4}>
        Play along, hunt collectibles together, or hang out with a crew. Rooms
        live in the Nexzy app.
      </Text>

      {rooms.length === 0 ? (
        <Text fontSize="sm" color={C.text}>
          No rooms yet. Start one in the Nexzy app.
        </Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          {rooms.map((r) => {
            const live = r.status === "live";
            return (
              <Box
                key={r.id}
                bg={C.card}
                borderRadius="12px"
                p={4}
                border="1px solid"
                borderColor={live ? "rgba(126,226,160,0.35)" : C.line}
              >
                <HStack gap={2} mb={1} wrap="wrap">
                  <Text
                    fontSize="xs"
                    fontWeight="700"
                    color={live ? C.live : C.gold}
                    textTransform="uppercase"
                    letterSpacing="0.06em"
                  >
                    {live ? "Live now" : fmtRoomTime(r.startsAt)}
                  </Text>
                  <Text fontSize="xs" color={C.muted}>
                    {kindLabel(r.kind, data.profile?.kinds)}
                    {r.isOfficial ? " · Official" : ""}
                  </Text>
                </HStack>
                <Text fontWeight="700" color="white" lineClamp={2}>
                  {r.title}
                </Text>
                <Text fontSize="sm" color={C.muted} mt={1}>
                  {r.memberCount}/{r.maxSize} in · hosted by @{r.host.username}
                </Text>
              </Box>
            );
          })}
        </SimpleGrid>
      )}

      <HStack mt={4} gap={3} wrap="wrap">
        <chakra.a
          href={getApp}
          onClick={() => track("hub_rooms_get_app", { slug })}
          bg={C.gold}
          color={C.ink}
          fontWeight="700"
          fontSize="sm"
          px={4}
          py={2}
          borderRadius="999px"
        >
          {rooms.length ? "Join in the Nexzy app" : "Get the Nexzy app"}
        </chakra.a>
        {data.rooms.length > SHOW && (
          <Text fontSize="sm" color={C.muted}>
            {data.rooms.length - SHOW} more in the app
          </Text>
        )}
      </HStack>
    </Box>
  );
}
