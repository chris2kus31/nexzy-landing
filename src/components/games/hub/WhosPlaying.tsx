"use client";

// Who's playing (Phase 2 step 4): players who tapped "I'm in" or rated the
// game, newest first, 12 at a time, with Follow. Names are for signed-in
// readers only (public profiles, never team accounts); signed-out readers see
// the count and a sign-in prompt. Hidden until someone is in.
import { useCallback, useEffect, useState } from "react";
import { Box, HStack, Heading, SimpleGrid, Text, chakra } from "@chakra-ui/react";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInModal from "@/components/auth/SignInModal";
import { track } from "@/lib/analytics";
import type { HubPlayer, HubPlayersPage } from "@/lib/hubs/social";
import { PersonAvatar } from "./HubThread";

const C = {
  panel: "#1a1f3a",
  card: "#11152b",
  line: "rgba(255,255,255,0.12)",
  muted: "#9aa3bf",
  text: "#EDF2F7",
  gold: "#FFD700",
  ink: "#0b0e1d",
};

export default function WhosPlaying({ slug, gameName }: { slug: string; gameName: string }) {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<HubPlayersPage | null>(null);
  const [items, setItems] = useState<HubPlayer[]>([]);
  const [signIn, setSignIn] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/hubs/${slug}/players`, { cache: "no-store" }).catch(() => null);
    if (!r || !r.ok) return;
    const d = (await r.json()) as HubPlayersPage;
    setPage(d);
    setItems(d.items ?? []);
  }, [slug]);

  useEffect(() => {
    if (loading) return;
    void load();
  }, [load, loading, user]);

  const more = useCallback(async () => {
    if (!page?.nextCursor) return;
    const r = await fetch(
      `/api/hubs/${slug}/players?cursor=${encodeURIComponent(page.nextCursor)}`,
      { cache: "no-store" },
    ).catch(() => null);
    if (!r || !r.ok) return;
    const d = (await r.json()) as HubPlayersPage;
    setItems((prev) => [...prev, ...(d.items ?? []).filter((x) => !prev.some((p) => p.id === x.id))]);
    setPage(d);
  }, [page, slug]);

  const toggleFollow = useCallback(
    async (p: HubPlayer) => {
      setBusyId(p.id);
      setError(null);
      const next = !p.following;
      setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, following: next } : x)));
      try {
        const r = await fetch(`/api/users/${p.id}/follow`, { method: next ? "POST" : "DELETE" });
        if (!r.ok) throw new Error(String(r.status));
        if (next) track("hub_follow", { slug });
      } catch {
        setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, following: !next } : x)));
        setError("That didn't go through. Try again.");
      } finally {
        setBusyId(null);
      }
    },
    [slug],
  );

  if (!page || page.count === 0) return null;
  const signedIn = page.items !== null;

  return (
    <Box
      as="section"
      id="whos-playing"
      aria-labelledby="whos-playing-h"
      bg={C.panel}
      borderRadius="18px"
      p={{ base: 5, md: 6 }}
      scrollMarginTop="80px"
    >
      <HStack justify="space-between" align="baseline" flexWrap="wrap" gap={2} mb={4}>
        <Heading as="h2" id="whos-playing-h" fontFamily="heading" fontSize={{ base: "xl", md: "2xl" }} color="white">
          Who&apos;s playing {gameName}
        </Heading>
        <Text fontSize="sm" color={C.muted}>
          {page.count.toLocaleString("en-US")} {page.count === 1 ? "player" : "players"} in
        </Text>
      </HStack>

      {!signedIn ? (
        <Box>
          <Text color={C.text} mb={3}>
            See who else is playing and follow them on Nexzy.
          </Text>
          <chakra.button
            type="button"
            onClick={() => setSignIn(true)}
            bg={C.gold}
            color={C.ink}
            fontWeight="700"
            borderRadius="10px"
            px={5}
            py={3}
            cursor="pointer"
          >
            Sign in to see who&apos;s playing
          </chakra.button>
        </Box>
      ) : items.length === 0 ? (
        <Text fontSize="sm" color={C.muted}>
          The players who are in keep their profiles private.
        </Text>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={3}>
            {items.map((p) => (
              <HStack key={p.id} bg={C.card} borderRadius="12px" p={3} gap={3} border="1px solid" borderColor={C.line}>
                <PersonAvatar p={p} size={36} />
                <Box minW={0} flex="1">
                  <Text fontSize="sm" fontWeight="600" color={C.text} lineClamp={1}>
                    @{p.username}
                  </Text>
                  <Text fontSize="xs" color={C.muted}>
                    {[p.dayOne ? "Day One" : null, p.rated ? "Rated it" : null].filter(Boolean).join(" · ")}
                  </Text>
                </Box>
                {p.isMe ? (
                  <Text fontSize="xs" color={C.muted} flexShrink={0}>
                    You
                  </Text>
                ) : (
                  <chakra.button
                    type="button"
                    onClick={() => void toggleFollow(p)}
                    disabled={busyId === p.id}
                    aria-pressed={p.following}
                    bg={p.following ? "transparent" : C.gold}
                    color={p.following ? C.text : C.ink}
                    border="1px solid"
                    borderColor={p.following ? C.line : C.gold}
                    fontWeight="700"
                    fontSize="xs"
                    borderRadius="8px"
                    px={3}
                    py={1}
                    flexShrink={0}
                    cursor="pointer"
                    _disabled={{ opacity: 0.6 }}
                  >
                    {p.following ? "Following" : "Follow"}
                  </chakra.button>
                )}
              </HStack>
            ))}
          </SimpleGrid>
          {page.nextCursor && (
            <chakra.button
              type="button"
              onClick={() => void more()}
              mt={3}
              bg="transparent"
              color={C.text}
              border="1px solid"
              borderColor={C.line}
              borderRadius="10px"
              px={4}
              py={2}
              fontSize="sm"
              cursor="pointer"
              _hover={{ borderColor: C.gold }}
            >
              More players
            </chakra.button>
          )}
          {error && (
            <Text fontSize="sm" color="red.300" mt={2} role="alert">
              {error}
            </Text>
          )}
        </>
      )}

      <SignInModal
        open={signIn}
        onClose={() => setSignIn(false)}
        onSignedIn={() => {
          setSignIn(false);
          void load();
        }}
        title={`Who's playing ${gameName}`}
        subtitle="Sign in to see who's in and follow them. Same account as the Nexzy app."
      />
    </Box>
  );
}
