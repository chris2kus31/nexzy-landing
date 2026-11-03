// Room invite page (Phase 3 Step 4): where a link shared from the app's
// Invite button lands. With the app installed (and 1.1.11 live, see
// ROOM_INVITES_DEEPLINK_ENABLED in app/aasa) the OS opens the app instead and
// this page never loads. Otherwise: a preview card and the store buttons.
// Never indexed; the invite code is the only key.
import type { Metadata } from "next";
import NextLink from "next/link";
import {
  Box,
  Container,
  HStack,
  Heading,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import AppCta from "@/components/blog/AppCta";
import { fmtRoomTime, kindLabel } from "@/lib/rooms/public";
import { fetchRoomInvite } from "@/lib/rooms/invite.server";

type Params = { params: Promise<{ code: string }> };

const NOINDEX = { index: false, follow: false } as const;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const r = await fetchRoomInvite(code);
  if (r.state !== "ok") {
    return { title: "Room invite", robots: NOINDEX };
  }
  const room = r.room;
  const title = `Join "${room.title}" on Nexzy`;
  const description = `A ${kindLabel(room.kind)} room for ${room.game.name}, hosted by @${room.host.username}. ${
    room.status === "live"
      ? "Live now."
      : `Starts ${fmtRoomTime(room.startsAt)}.`
  } Open it in the Nexzy app.`;
  return {
    title,
    description,
    robots: NOINDEX,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Container maxW="2xl" py={{ base: 8, md: 14 }}>
      <Box
        bg="#1a1f3a"
        borderRadius="18px"
        p={{ base: 5, md: 8 }}
        border="1px solid"
        borderColor="rgba(255,215,0,0.35)"
      >
        {children}
      </Box>
      <Box mt={8}>
        <AppCta
          variant="band"
          location="room_invite"
          heading="Rooms live in the Nexzy app"
          subtext="Get the app, then open this link again to jump straight in."
        />
      </Box>
    </Container>
  );
}

export default async function RoomInvitePage({ params }: Params) {
  const { code } = await params;
  const r = await fetchRoomInvite(code);

  if (r.state !== "ok") {
    const copy =
      r.state === "off"
        ? {
            h: "Rooms are coming soon",
            p: "Squad Rooms open in the Nexzy app soon. Get the app now and this invite will work once they do.",
          }
        : r.state === "gone"
          ? {
              h: "This invite isn't valid anymore",
              p: "The room may have ended, or the host made a new link. Ask them for a fresh one.",
            }
          : { h: "We couldn't load this invite", p: "Try again in a minute." };
    return (
      <Shell>
        <Heading
          as="h1"
          fontFamily="title"
          fontSize={{ base: "2xl", md: "3xl" }}
          color="white"
        >
          {copy.h}
        </Heading>
        <Text color="#9aa3bf" mt={3}>
          {copy.p}
        </Text>
      </Shell>
    );
  }

  const room = r.room;
  const live = room.status === "live";
  const ended = room.status === "ended" || room.status === "cancelled";
  const full = room.memberCount >= room.maxSize;

  return (
    <Shell>
      <Text
        fontSize="sm"
        color="#9aa3bf"
        letterSpacing="0.08em"
        textTransform="uppercase"
      >
        {`You're invited · ${kindLabel(room.kind)} room`}
      </Text>
      <Heading
        as="h1"
        fontFamily="title"
        fontSize={{ base: "2xl", md: "4xl" }}
        color="white"
        lineHeight="1.15"
        mt={2}
      >
        {room.title}
      </Heading>
      <Stack gap={1} mt={3}>
        <Link asChild color="#FFD700" fontWeight="600">
          <NextLink href={`/games/${room.game.slug}`}>
            {room.game.name}
          </NextLink>
        </Link>
        <Text color="#EDF2F7">Hosted by @{room.host.username}</Text>
        <HStack gap={3} wrap="wrap">
          <Text
            color={live ? "#7EE2A0" : "#9aa3bf"}
            fontWeight={live ? "700" : "400"}
          >
            {ended
              ? "This room has ended"
              : live
                ? "Live now"
                : `Starts ${fmtRoomTime(room.startsAt)}`}
          </Text>
          <Text color="#9aa3bf">
            {room.memberCount}/{room.maxSize} in
            {full && !ended ? " (full)" : ""}
          </Text>
        </HStack>
      </Stack>
      <Text color="#9aa3bf" fontSize="sm" mt={5}>
        {ended
          ? "Check the game's hub for rooms that are still open."
          : "Open this link on your phone with the Nexzy app installed and it takes you straight into the room."}
      </Text>
    </Shell>
  );
}
