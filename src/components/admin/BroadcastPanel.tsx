"use client";

import { useEffect, useState } from "react";
import {
  Box,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
} from "@chakra-ui/react";
import {
  getNotificationAudience,
  sendNotificationTest,
  sendNotificationBroadcast,
  getPublished,
  type BlogPost,
  type AdminNotifType,
  type AdminNotifDest,
  type AdminNotifDestKind,
} from "@/lib/admin/client";

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  size: "sm" as const,
};
const primaryBtn = {
  bg: "nexzy.blue",
  color: "white",
  _hover: { bg: "nexzy.blue", opacity: 0.9 },
};
const outlineBtn = {
  variant: "outline" as const,
  color: "nexzy.gray.100",
  borderColor: "whiteAlpha.300",
  _hover: { bg: "whiteAlpha.100" },
};

// Native <select>/<input> styling (Chakra v3 Select is awkward to type here).
const nativeControl: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  color: "#EAF0FA",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 14,
  width: "100%",
  outline: "none",
};

type DestKind = "none" | AdminNotifDestKind;

const DEST_OPTIONS: { value: DestKind; label: string }[] = [
  { value: "none", label: "Just open the app" },
  { value: "newsArticle", label: "News article" },
  { value: "game", label: "Game" },
  { value: "coinStore", label: "Coin Store" },
  { value: "library", label: "Game Library" },
  { value: "wishlist", label: "Wishlist" },
  { value: "forum", label: "Forum" },
  { value: "games", label: "Games tab" },
  { value: "news", label: "News tab" },
  { value: "url", label: "External URL" },
];

/**
 * Owner-only push composer. Two kinds — System Announcements (gated on the
 * "System announcements" preference) and Promotions (gated on "Promotions &
 * offers") — each able to deep-link into the app (article / game / coin store /
 * library / wishlist / forum / tab / url). Always test to yourself first.
 */
export default function BroadcastPanel() {
  const [type, setType] = useState<AdminNotifType>("system-announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");

  const [destKind, setDestKind] = useState<DestKind>("none");
  const [slug, setSlug] = useState("");
  const [gameId, setGameId] = useState("");
  const [gameName, setGameName] = useState("");
  const [url, setUrl] = useState("");

  // News-article picker: load the published-articles list once and filter it
  // client-side by title, so you pick the real story instead of pasting a slug.
  const [articles, setArticles] = useState<BlogPost[] | null>(null);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articleQuery, setArticleQuery] = useState("");
  const [manualSlug, setManualSlug] = useState(false);

  const [audience, setAudience] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Audience depends on the type (each gates on a different preference).
  useEffect(() => {
    let alive = true;
    setAudience(null);
    getNotificationAudience(type)
      .then((r) => alive && setAudience(r.count))
      .catch(() => alive && setAudience(null));
    return () => {
      alive = false;
    };
  }, [type]);

  // Lazy-load published articles the first time the News-article dest is used.
  useEffect(() => {
    if (destKind !== "newsArticle" || articles || articlesLoading) return;
    setArticlesLoading(true);
    getPublished()
      .then((rows) => setArticles(rows))
      .catch(() => setArticles([]))
      .finally(() => setArticlesLoading(false));
  }, [destKind, articles, articlesLoading]);

  // Title-filtered results (published list is newest-first, capped server-side).
  const q = articleQuery.trim().toLowerCase();
  const filteredArticles = q
    ? (articles ?? [])
        .filter((a) => (a.title ?? "").toLowerCase().includes(q))
        .slice(0, 8)
    : [];
  // The currently-chosen article (for the confirmation chip), if any.
  const selectedArticle: Pick<BlogPost, "slug" | "title"> | null =
    slug && !manualSlug
      ? ((articles ?? []).find((a) => a.slug === slug) ?? {
          slug,
          title: null,
        })
      : null;

  const canSend = title.trim().length > 0 && body.trim().length > 0;
  const kindLabel = type === "system-announcement" ? "announcement" : "promotion";
  const prefLabel =
    type === "system-announcement" ? "System announcements" : "Promotions & offers";

  /** Build the destination object, or null if a required field is missing. */
  function buildDest(): { dest?: AdminNotifDest; error?: string } {
    switch (destKind) {
      case "none":
        return {};
      case "newsArticle":
        if (!slug.trim())
          return { error: "Pick a news article (or enter its slug)." };
        return { dest: { kind: "newsArticle", slug: slug.trim() } };
      case "game":
        if (!gameId.trim()) return { error: "Enter the game ID." };
        return {
          dest: {
            kind: "game",
            gameId: gameId.trim(),
            gameName: gameName.trim() || undefined,
          },
        };
      case "url":
        if (!url.trim()) return { error: "Enter the URL." };
        return { dest: { kind: "url", url: url.trim() } };
      default:
        return { dest: { kind: destKind } };
    }
  }

  async function sendTest() {
    if (!email.trim() || !canSend) {
      setMsg("Enter a title, message, and your app-account email.");
      return;
    }
    const { dest, error } = buildDest();
    if (error) {
      setMsg(error);
      return;
    }
    setBusy("test");
    setMsg(null);
    try {
      const r = await sendNotificationTest({
        email: email.trim(),
        title: title.trim(),
        body: body.trim(),
        dest,
      });
      setMsg(
        r.ok
          ? `Test sent to ${r.devices} device(s).`
          : `Couldn't send test: ${
              r.reason === "no_user"
                ? "no account with that email"
                : r.reason === "no_tokens"
                  ? "that account has no active device"
                  : r.reason
            }.`,
      );
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function sendAll() {
    if (!canSend) {
      setMsg("Enter a title and message first.");
      return;
    }
    const { dest, error } = buildDest();
    if (error) {
      setMsg(error);
      return;
    }
    if (
      !window.confirm(
        `Send this ${kindLabel} "${title.trim()}" to ~${
          audience ?? "?"
        } opted-in user(s)?`,
      )
    )
      return;
    setBusy("all");
    setMsg(null);
    try {
      const r = await sendNotificationBroadcast({
        type,
        title: title.trim(),
        body: body.trim(),
        dest,
      });
      setMsg(`Queued — sending to ~${r.recipients} opted-in user(s).`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Box maxW="640px">
      <Heading size="md" color="nexzy.white" mb={1}>
        Push notifications
      </Heading>
      <Text fontSize="sm" color="whiteAlpha.600" mb={4}>
        Compose a System Announcement or a Promotion, optionally deep-linking
        into the app. Each only reaches users who have that category enabled and
        an active device. Always send a test to yourself first.
      </Text>

      <VStack align="stretch" gap={3}>
        {/* Type */}
        <Box>
          <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
            Type
          </Text>
          <HStack gap={2}>
            <Button
              size="sm"
              flex={1}
              onClick={() => setType("system-announcement")}
              {...(type === "system-announcement" ? primaryBtn : outlineBtn)}
            >
              System announcement
            </Button>
            <Button
              size="sm"
              flex={1}
              onClick={() => setType("engagement")}
              {...(type === "engagement" ? primaryBtn : outlineBtn)}
            >
              Promotion
            </Button>
          </HStack>
          <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
            Gated on the &ldquo;{prefLabel}&rdquo; preference · ~
            {audience ?? "…"} opted-in user(s) with an active device.
          </Text>
        </Box>

        {/* Title */}
        <Box>
          <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
            Title
          </Text>
          <Input
            {...inputProps}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "system-announcement"
                ? "New this week on Nexzy"
                : "Don't miss this week's sale!"
            }
            maxLength={80}
          />
        </Box>

        {/* Message */}
        <Box>
          <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
            Message
          </Text>
          <Textarea
            {...inputProps}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              type === "system-announcement"
                ? "Read today's featured guide."
                : "Up to 40% off coin packs — this week only."
            }
            rows={3}
            maxLength={180}
          />
        </Box>

        {/* Destination */}
        <Box>
          <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
            Open on tap
          </Text>
          <select
            value={destKind}
            onChange={(e) => setDestKind(e.target.value as DestKind)}
            style={nativeControl}
          >
            {DEST_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ color: "#000" }}>
                {o.label}
              </option>
            ))}
          </select>

          {destKind === "newsArticle" && (
            <Box mt={2}>
              {manualSlug ? (
                <>
                  <Input
                    {...inputProps}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="Article slug (the last part of its /blog/ URL)"
                  />
                  <Text
                    fontSize="xs"
                    color="nexzy.lightBlue"
                    mt={1}
                    cursor="pointer"
                    onClick={() => setManualSlug(false)}
                  >
                    Pick from published articles instead
                  </Text>
                </>
              ) : selectedArticle ? (
                <HStack
                  justify="space-between"
                  bg="whiteAlpha.50"
                  borderWidth="1px"
                  borderColor="whiteAlpha.300"
                  borderRadius="6px"
                  px={3}
                  py={2}
                >
                  <VStack align="start" gap={0} flex={1} minW={0}>
                    <Text fontSize="sm" color="nexzy.white" lineClamp={1}>
                      {selectedArticle.title || `Selected article (${slug})`}
                    </Text>
                    <Text fontSize="xs" color="whiteAlpha.500">
                      Opens this article on tap
                    </Text>
                  </VStack>
                  <Button
                    size="xs"
                    {...outlineBtn}
                    onClick={() => {
                      setSlug("");
                      setArticleQuery("");
                    }}
                  >
                    Change
                  </Button>
                </HStack>
              ) : (
                <>
                  <Input
                    {...inputProps}
                    value={articleQuery}
                    onChange={(e) => setArticleQuery(e.target.value)}
                    placeholder={
                      articlesLoading
                        ? "Loading published articles…"
                        : "Search published articles by title…"
                    }
                  />
                  {q && (
                    <Box
                      mt={1}
                      maxH="220px"
                      overflowY="auto"
                      borderWidth="1px"
                      borderColor="whiteAlpha.200"
                      borderRadius="6px"
                    >
                      {filteredArticles.length === 0 ? (
                        <Text
                          fontSize="xs"
                          color="whiteAlpha.500"
                          px={3}
                          py={2}
                        >
                          {articlesLoading
                            ? "Loading…"
                            : `No published article matches “${articleQuery.trim()}”.`}
                        </Text>
                      ) : (
                        filteredArticles.map((a) => (
                          <Box
                            key={a.id}
                            px={3}
                            py={2}
                            cursor="pointer"
                            _hover={{ bg: "whiteAlpha.100" }}
                            onClick={() => {
                              setSlug(a.slug);
                              setArticleQuery("");
                            }}
                          >
                            <Text
                              fontSize="sm"
                              color="nexzy.white"
                              lineClamp={1}
                            >
                              {a.title || "(untitled)"}
                            </Text>
                            <Text fontSize="xs" color="whiteAlpha.500">
                              {[
                                a.publishedAt
                                  ? new Date(a.publishedAt).toLocaleDateString()
                                  : null,
                                a.beat,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </Text>
                          </Box>
                        ))
                      )}
                    </Box>
                  )}
                  <Text
                    fontSize="xs"
                    color="whiteAlpha.500"
                    mt={1}
                    cursor="pointer"
                    onClick={() => setManualSlug(true)}
                  >
                    or paste the article slug manually
                  </Text>
                </>
              )}
            </Box>
          )}
          {destKind === "game" && (
            <VStack align="stretch" gap={2} mt={2}>
              <Input
                {...inputProps}
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Game ID"
              />
              <Input
                {...inputProps}
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="Game name (optional — shows while it loads)"
              />
            </VStack>
          )}
          {destKind === "url" && (
            <Input
              {...inputProps}
              mt={2}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://nexzyapp.com/sale"
            />
          )}
        </Box>

        {/* Test */}
        <Box borderTopWidth="1px" borderColor="whiteAlpha.200" pt={3}>
          <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
            Send a test to your app account
          </Text>
          <HStack gap={2}>
            <Input
              {...inputProps}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-app-account@email.com"
            />
            <Button
              size="sm"
              {...outlineBtn}
              onClick={sendTest}
              loading={busy === "test"}
              loadingText="Sending"
            >
              Send test
            </Button>
          </HStack>
        </Box>

        <Button
          {...primaryBtn}
          onClick={sendAll}
          loading={busy === "all"}
          loadingText="Queuing"
          disabled={!canSend}
        >
          Send {kindLabel} to all opted-in (~{audience ?? "?"})
        </Button>

        {msg && (
          <Text fontSize="sm" color="nexzy.lightBlue">
            {msg}
          </Text>
        )}
      </VStack>
    </Box>
  );
}
