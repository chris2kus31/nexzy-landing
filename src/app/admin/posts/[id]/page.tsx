"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  HStack,
  VStack,
  Heading,
  Text,
  Input,
  Textarea,
  Button,
  Badge,
  Image,
  Spinner,
} from "@chakra-ui/react";
import AdminShell from "@/components/admin/AdminShell";
import StatusBadge from "@/components/admin/StatusBadge";
import PostGamesEditor from "@/components/admin/PostGamesEditor";
import SectionEditor from "@/components/admin/SectionEditor";
import {
  getPost,
  updatePost,
  approvePost,
  rejectPost,
  sendBackPost,
  unpublishPost,
  regenerateImage,
  regeneratePost,
  uploadArticleImage,
  setFeatured,
  setPostAuthor,
  type BlogPost,
} from "@/lib/admin/client";
import { youtubeId, isYoutubeShort } from "@/lib/blog/youtube";

/** Byline options for the author override. */
const BYLINES = ["Chuy", "Eli", "Nexzy Editorial"];

interface FormState {
  title: string;
  seoTitle: string;
  excerpt: string;
  seoDescription: string;
  bodyMarkdown: string;
  imageAlt: string;
  youtubeUrl: string;
  tags: string;
}

function toForm(p: BlogPost): FormState {
  return {
    title: p.title || "",
    seoTitle: p.seoTitle || "",
    excerpt: p.excerpt || "",
    seoDescription: p.seoDescription || "",
    bodyMarkdown: p.bodyMarkdown || "",
    imageAlt: p.imageAlt || "",
    youtubeUrl: p.youtubeUrl || "",
    tags: (p.tags || []).join(", "),
  };
}

const labelProps = {
  fontSize: "xs",
  fontWeight: "600",
  color: "nexzy.gray.100",
  mb: 1,
  textTransform: "uppercase" as const,
  letterSpacing: "wide",
};

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  w: "full",
  maxW: "full",
};

function EditorReport({
  report,
  wide = false,
}: {
  report: Record<string, unknown> | null;
  wide?: boolean;
}) {
  if (!report) return null;
  const verdict = String(report.verdict ?? "—");
  const factCheck = Array.isArray(report.factCheck)
    ? (report.factCheck as { claim: string; supported: boolean }[])
    : [];
  const issues = Array.isArray(report.issues)
    ? (report.issues as string[])
    : [];
  const revisionLog = Array.isArray(report.revisionLog)
    ? (report.revisionLog as { before: string; after: string; why: string }[])
    : [];
  const autoRevised = !!report.autoRevised;

  // Guide Editor extras (guides only). Absent on news articles.
  const isGuideEditor = report.agent === "guide-editor";
  const suspectClaims = Array.isArray(report.suspectClaims)
    ? (report.suspectClaims as string[])
    : [];
  const gScores: [string, unknown][] = [
    ["Originality", report.originalityScore],
    ["Usefulness", report.usefulnessScore],
    ["Slop (lower=better)", report.slopScore],
  ].filter(([, v]) => v != null) as [string, unknown][];
  const gameInDb =
    typeof report.gameInDb === "boolean" ? (report.gameInDb as boolean) : null;

  // Verdict → color: pass/publish = green, reject/fail = red, revise = amber.
  const v = verdict.toLowerCase();
  const verdictPalette =
    v.includes("pass") ||
    v.includes("publish") ||
    v.includes("approve") ||
    v === "ok"
      ? "green"
      : v.includes("reject") || v.includes("fail")
        ? "red"
        : v === "—"
          ? "gray"
          : "orange";

  // Score chips: guides show Originality/Usefulness/Slop; news shows Style.
  const scoreChips: [string, unknown][] = isGuideEditor
    ? gScores
    : report.styleScore != null
      ? [["Style", report.styleScore]]
      : [];

  // Tone a score value: higher is better, except "slop" where lower is better.
  const scoreTone = (label: string, val: unknown): string => {
    const n = Number(val);
    if (!Number.isFinite(n)) return "gray";
    const lowerBetter = label.toLowerCase().includes("slop");
    const good = lowerBetter ? n <= 20 : n >= 80;
    const bad = lowerBetter ? n >= 50 : n <= 50;
    return good ? "green" : bad ? "red" : "yellow";
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={4}
    >
      {/* Header: title + verdict badge */}
      <HStack justify="space-between" align="center" mb={4}>
        <Heading size="sm" color="nexzy.white">
          Editor report
        </Heading>
        <Badge
          colorPalette={verdictPalette}
          variant="solid"
          textTransform="capitalize"
          px={2.5}
          py={1}
          borderRadius="md"
          fontSize="xs"
        >
          {verdict}
        </Badge>
      </HStack>

      {/* Score chips + games-DB status */}
      {(scoreChips.length > 0 || gameInDb !== null) && (
        <Flex gap={2} mb={4} flexWrap="wrap">
          {scoreChips.map(([label, val]) => {
            const tone = scoreTone(label, val);
            return (
              <Box
                key={label}
                bg={`${tone}.400/10`}
                border="1px solid"
                borderColor={`${tone}.400/25`}
                borderRadius="md"
                px={3}
                py={1.5}
                minW="88px"
              >
                <Text
                  fontSize="10px"
                  color="nexzy.gray.100"
                  textTransform="uppercase"
                  letterSpacing="wide"
                  lineHeight="1.2"
                >
                  {label}
                </Text>
                <Text fontSize="lg" fontWeight="700" color={`${tone}.300`}>
                  {String(val)}
                </Text>
              </Box>
            );
          })}
          {gameInDb !== null && (
            <Flex
              align="center"
              bg={gameInDb ? "green.400/10" : "orange.400/10"}
              border="1px solid"
              borderColor={gameInDb ? "green.400/25" : "orange.400/25"}
              borderRadius="md"
              px={3}
              py={1.5}
            >
              <Text
                fontSize="xs"
                fontWeight="600"
                color={gameInDb ? "green.300" : "orange.300"}
              >
                {gameInDb ? "Game in Nexzy DB ✓" : "Game NOT in DB"}
              </Text>
            </Flex>
          )}
        </Flex>
      )}

      {/* Fact check (news) */}
      {factCheck.length > 0 && (
        <VStack align="stretch" gap={1.5} mb={3}>
          {factCheck.map((f, i) => (
            <Text
              key={i}
              fontSize="xs"
              color={f.supported ? "green.300" : "red.300"}
              lineHeight="1.4"
            >
              {f.supported ? "✓" : "✕"} {f.claim}
            </Text>
          ))}
        </VStack>
      )}

      {/* Flags: suspect specifics + editor notes (side-by-side when wide) */}
      {(suspectClaims.length > 0 || issues.length > 0) && (
        <Box
          display="grid"
          gridTemplateColumns={
            wide && suspectClaims.length > 0 && issues.length > 0
              ? { base: "1fr", lg: "1fr 1fr" }
              : "1fr"
          }
          gap={3}
          mb={3}
        >
          {suspectClaims.length > 0 && (
            <Box
              bg="red.400/8"
              border="1px solid"
              borderColor="red.400/25"
              borderRadius="md"
              p={3}
            >
              <Text fontSize="xs" color="red.200" fontWeight="700" mb={1.5}>
                ⚠ Suspect specifics — verify before publishing
              </Text>
              <VStack align="stretch" gap={1}>
                {suspectClaims.map((c, i) => (
                  <Text key={i} fontSize="xs" color="red.300" lineHeight="1.4">
                    • {c}
                  </Text>
                ))}
              </VStack>
            </Box>
          )}
          {issues.length > 0 && (
            <Box
              bg="orange.400/8"
              border="1px solid"
              borderColor="orange.400/25"
              borderRadius="md"
              p={3}
            >
              <Text fontSize="xs" color="orange.200" fontWeight="700" mb={1.5}>
                Editor notes
              </Text>
              <VStack align="stretch" gap={1}>
                {issues.map((it, i) => (
                  <Text
                    key={i}
                    fontSize="xs"
                    color="orange.300"
                    lineHeight="1.4"
                  >
                    • {it}
                  </Text>
                ))}
              </VStack>
            </Box>
          )}
        </Box>
      )}

      {/* Auto-revised diff log */}
      {(autoRevised || revisionLog.length > 0) && (
        <Box mt={4} pt={3} borderTop="1px solid" borderColor="whiteAlpha.200">
          <Text
            fontSize="xs"
            fontWeight="700"
            color="nexzy.lightBlue"
            mb={2.5}
            textTransform="uppercase"
            letterSpacing="wide"
          >
            ✎ Auto-revised — what the editor changed
          </Text>
          {revisionLog.length === 0 ? (
            <Text fontSize="xs" color="nexzy.gray.100">
              This draft was auto-revised to clear the editor's flags before
              reaching you.
            </Text>
          ) : (
            <Box
              display="grid"
              gridTemplateColumns={
                wide ? { base: "1fr", xl: "1fr 1fr" } : "1fr"
              }
              gap={2.5}
            >
              {revisionLog.map((r, i) => (
                <Box
                  key={i}
                  bg="whiteAlpha.50"
                  borderRadius="md"
                  p={2.5}
                  borderLeft="2px solid"
                  borderColor="nexzy.lightBlue"
                >
                  <HStack align="start" gap={2} mb={1}>
                    <Text
                      fontSize="9px"
                      fontWeight="700"
                      color="red.300"
                      textTransform="uppercase"
                      mt="2px"
                      minW="38px"
                    >
                      Before
                    </Text>
                    <Text fontSize="xs" color="red.200" lineHeight="1.45">
                      {r.before}
                    </Text>
                  </HStack>
                  <HStack align="start" gap={2} mb={1}>
                    <Text
                      fontSize="9px"
                      fontWeight="700"
                      color="green.300"
                      textTransform="uppercase"
                      mt="2px"
                      minW="38px"
                    >
                      After
                    </Text>
                    <Text fontSize="xs" color="green.200" lineHeight="1.45">
                      {r.after}
                    </Text>
                  </HStack>
                  <HStack align="start" gap={2}>
                    <Text
                      fontSize="9px"
                      fontWeight="700"
                      color="whiteAlpha.600"
                      textTransform="uppercase"
                      mt="2px"
                      minW="38px"
                    >
                      Why
                    </Text>
                    <Text
                      fontSize="xs"
                      color="nexzy.gray.100"
                      lineHeight="1.45"
                    >
                      {r.why}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function EditorContent({ id }: { id: string }) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [notice, setNotice] = useState("");
  const [authorSel, setAuthorSel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    getPost(id)
      .then((p) => {
        setPost(p);
        setForm(toForm(p));
        setAuthorSel(p.author || "Nexzy Editorial");
      })
      .catch((e) => setError(e?.message || "Failed to load."));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k: keyof FormState, v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const run = async (label: string, fn: () => Promise<BlogPost>) => {
    setBusy(label);
    setNotice("");
    setError("");
    try {
      const updated = await fn();
      setPost(updated);
      setForm(toForm(updated));
      setAuthorSel(updated.author || "Nexzy Editorial");
      setNotice(`${label} ✓`);
    } catch (e) {
      setError((e as Error)?.message || `${label} failed.`);
    } finally {
      setBusy("");
    }
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Image is too large (max 10 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      run("Image uploaded", () => uploadArticleImage(id, dataUrl));
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  };

  const save = () =>
    run("Saved", () =>
      updatePost(id, {
        title: form!.title,
        seoTitle: form!.seoTitle,
        excerpt: form!.excerpt,
        seoDescription: form!.seoDescription,
        bodyMarkdown: form!.bodyMarkdown,
        imageAlt: form!.imageAlt,
        youtubeUrl: form!.youtubeUrl.trim(),
        tags: form!.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    );

  if (error && !post) {
    return (
      <Text color="red.300" fontSize="sm">
        {error}
      </Text>
    );
  }
  if (!post || !form) {
    return (
      <Flex justify="center" py={12}>
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }

  const isPublished = post.status === "published";

  return (
    <>
      <Flex align="center" justify="space-between" mb={5} gap={4} wrap="wrap">
        <HStack gap={3}>
          <Button
            size="sm"
            variant="ghost"
            color="nexzy.gray.100"
            onClick={() => router.push("/admin")}
            _hover={{ bg: "whiteAlpha.100" }}
          >
            ← Queue
          </Button>
          <StatusBadge status={post.status} />
        </HStack>
        <HStack gap={2} wrap="wrap">
          <Button
            size="sm"
            onClick={save}
            loading={busy === "Saved"}
            bg="whiteAlpha.200"
            color="nexzy.white"
            _hover={{ bg: "whiteAlpha.300" }}
          >
            Save edits
          </Button>
          {!isPublished && (
            <Button
              size="sm"
              onClick={() => run("Published", () => approvePost(id))}
              loading={busy === "Published"}
              bg="green.500"
              color="white"
              _hover={{ bg: "green.600" }}
            >
              Approve & publish
            </Button>
          )}
          {isPublished && (
            <Button
              size="sm"
              onClick={() =>
                run(post.featured ? "Unfeatured" : "Featured", () =>
                  setFeatured(id, !post.featured),
                )
              }
              loading={busy === "Featured" || busy === "Unfeatured"}
              variant={post.featured ? "solid" : "outline"}
              bg={post.featured ? "orange.400" : "transparent"}
              color={post.featured ? "nexzy.navy" : "orange.300"}
              borderColor="orange.400/50"
              _hover={{ bg: post.featured ? "orange.300" : "whiteAlpha.100" }}
            >
              {post.featured ? "★ Featured" : "☆ Feature"}
            </Button>
          )}
          {isPublished && (
            <Button
              size="sm"
              onClick={() => run("Unpublished", () => unpublishPost(id))}
              loading={busy === "Unpublished"}
              variant="outline"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
            >
              Unpublish
            </Button>
          )}
          {!isPublished && (
            <Button
              size="sm"
              onClick={() => {
                const reason =
                  window.prompt(
                    "What should the writer fix? (guides the AI rewrite)",
                  ) || undefined;
                run("Sent back — rewriting", () => sendBackPost(id, reason));
              }}
              loading={busy === "Sent back — rewriting"}
              variant="outline"
              color="orange.300"
              borderColor="orange.400/40"
              _hover={{ bg: "whiteAlpha.100" }}
            >
              Send back
            </Button>
          )}
          {!isPublished && (
            <Button
              size="sm"
              onClick={() => {
                const reason = window.prompt("Reason (optional):") || undefined;
                run("Rejected", () => rejectPost(id, reason));
              }}
              loading={busy === "Rejected"}
              variant="outline"
              color="red.300"
              borderColor="red.400/40"
              _hover={{ bg: "whiteAlpha.100" }}
            >
              Reject
            </Button>
          )}
        </HStack>
      </Flex>

      {notice && (
        <Text color="green.300" fontSize="sm" mb={3}>
          {notice}
        </Text>
      )}
      {error && (
        <Text color="red.300" fontSize="sm" mb={3}>
          {error}
        </Text>
      )}

      <Grid
        templateColumns={{
          base: "minmax(0, 1fr)",
          lg: "minmax(0, 2fr) minmax(0, 1fr)",
        }}
        gap={6}
      >
        <GridItem minW={0}>
          <VStack align="stretch" gap={4} h="full">
            <Box>
              <Text {...labelProps}>Title</Text>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                {...inputProps}
              />
            </Box>
            <Box>
              <Flex align="center" justify="space-between" mb={1}>
                <Text {...labelProps} mb={0}>
                  Excerpt
                </Text>
                {!isPublished && (
                  <Button
                    size="xs"
                    variant="ghost"
                    color="nexzy.lightBlue"
                    loading={busy === "Excerpt regenerated"}
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() =>
                      run("Excerpt regenerated", () =>
                        regeneratePost(id, "excerpt"),
                      )
                    }
                  >
                    ↻ Regenerate
                  </Button>
                )}
              </Flex>
              <Textarea
                value={form.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                rows={2}
                {...inputProps}
              />
            </Box>
            <Box flex="1" display="flex" flexDirection="column" minH={0}>
              <Flex align="center" justify="space-between" mb={1}>
                <Text {...labelProps} mb={0}>
                  Body (markdown)
                </Text>
                {!isPublished && (
                  <Button
                    size="xs"
                    variant="ghost"
                    color="nexzy.lightBlue"
                    loading={busy === "Body regenerated"}
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() =>
                      run("Body regenerated", () => regeneratePost(id, "body"))
                    }
                  >
                    ↻ Regenerate
                  </Button>
                )}
              </Flex>
              <Textarea
                value={form.bodyMarkdown}
                onChange={(e) => set("bodyMarkdown", e.target.value)}
                flex="1"
                minH="420px"
                fontFamily="mono"
                fontSize="sm"
                {...inputProps}
              />
            </Box>
            {post.type === "guide" && !isPublished && (
              <SectionEditor
                postId={id}
                body={form.bodyMarkdown}
                onDone={load}
              />
            )}
            <Box>
              <Text {...labelProps}>Tags (comma separated)</Text>
              <Input
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                {...inputProps}
              />
            </Box>
          </VStack>
        </GridItem>

        <GridItem minW={0}>
          <VStack align="stretch" gap={4}>
            <Box
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              p={3}
            >
              <Text {...labelProps}>Author / byline</Text>
              <HStack gap={1} wrap="wrap" mb={2}>
                {BYLINES.map((a) => {
                  const active = authorSel === a;
                  return (
                    <Button
                      key={a}
                      size="xs"
                      onClick={() => setAuthorSel(a)}
                      bg={active ? "nexzy.blue" : "transparent"}
                      color={active ? "white" : "nexzy.gray.100"}
                      borderWidth="1px"
                      borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
                      _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
                    >
                      {a}
                    </Button>
                  );
                })}
              </HStack>
              <HStack gap={2} wrap="wrap">
                <Button
                  size="xs"
                  variant="outline"
                  color="nexzy.white"
                  borderColor="whiteAlpha.300"
                  _hover={{ bg: "whiteAlpha.100" }}
                  loading={busy === "Byline updated"}
                  disabled={authorSel === (post.author || "Nexzy Editorial")}
                  onClick={() =>
                    run("Byline updated", () => setPostAuthor(id, authorSel))
                  }
                >
                  Set byline
                </Button>
                {!isPublished && authorSel !== "Nexzy Editorial" && (
                  <Button
                    size="xs"
                    variant="ghost"
                    color="nexzy.lightBlue"
                    _hover={{ bg: "whiteAlpha.100" }}
                    loading={busy === "Rewritten in voice"}
                    onClick={() =>
                      run("Rewritten in voice", () =>
                        regeneratePost(id, "all", authorSel),
                      )
                    }
                  >
                    ↻ Rewrite in this voice
                  </Button>
                )}
              </HStack>
              <Text color="nexzy.gray.100" fontSize="10px" mt={2}>
                “Set byline” relabels only. “Rewrite in this voice” regenerates
                the draft in that author’s tone (drafts only).
              </Text>
            </Box>

            <Box>
              <PostGamesEditor postId={id} />
            </Box>

            <Box>
              <Text {...labelProps}>Hero image</Text>
              {post.heroImageUrl ? (
                <Image
                  src={post.heroImageUrl}
                  alt={post.imageAlt || ""}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  w="full"
                />
              ) : (
                <Box
                  bg="whiteAlpha.50"
                  border="1px dashed"
                  borderColor="whiteAlpha.300"
                  borderRadius="lg"
                  p={6}
                  textAlign="center"
                >
                  <Text color="nexzy.gray.100" fontSize="sm">
                    No image yet
                  </Text>
                </Box>
              )}
              <HStack mt={2} gap={2}>
                <Button
                  size="xs"
                  flex={1}
                  variant="outline"
                  color="nexzy.white"
                  borderColor="whiteAlpha.300"
                  _hover={{ bg: "whiteAlpha.100" }}
                  loading={busy === "Image uploaded"}
                  onClick={() => fileRef.current?.click()}
                >
                  ↑ Upload image
                </Button>
                {/* Guides are upload-only (no AI hero) — hide Regenerate for them. */}
                {post.type !== "guide" && (
                  <Button
                    size="xs"
                    flex={1}
                    variant="outline"
                    color="nexzy.white"
                    borderColor="whiteAlpha.300"
                    _hover={{ bg: "whiteAlpha.100" }}
                    loading={busy === "Image re-queued"}
                    onClick={() =>
                      run("Image re-queued", async () => {
                        await regenerateImage(id);
                        return getPost(id);
                      })
                    }
                  >
                    ↻ Regenerate
                  </Button>
                )}
              </HStack>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                style={{ display: "none" }}
                onChange={onPickImage}
              />
              <Text color="nexzy.gray.100" fontSize="xs" mt={2}>
                {post.imageCredit}
              </Text>
            </Box>

            <Box>
              <Text {...labelProps}>Image alt</Text>
              <Input
                value={form.imageAlt}
                onChange={(e) => set("imageAlt", e.target.value)}
                {...inputProps}
              />
            </Box>

            <Box>
              <Text {...labelProps}>YouTube video (optional)</Text>
              <Input
                value={form.youtubeUrl}
                onChange={(e) => set("youtubeUrl", e.target.value)}
                placeholder="Paste a YouTube link — watch, share, or Shorts"
                {...inputProps}
              />
              {(() => {
                const vid = youtubeId(form.youtubeUrl);
                if (!vid) return null;
                const short = isYoutubeShort(form.youtubeUrl);
                return (
                  <a
                    href={
                      form.youtubeUrl.includes("/shorts/")
                        ? `https://www.youtube.com/shorts/${vid}`
                        : `https://www.youtube.com/watch?v=${vid}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <Box
                      position="relative"
                      w={short ? "48px" : "120px"}
                      h="68px"
                      flexShrink={0}
                      borderRadius="md"
                      overflow="hidden"
                      bg="black"
                    >
                      <img
                        src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`}
                        alt="Matched video"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </Box>
                    <Text
                      color="nexzy.lightBlue"
                      fontSize="xs"
                      fontWeight="600"
                    >
                      🎬 {short ? "Short — portrait player" : "Preview video"}
                    </Text>
                  </a>
                );
              })()}
              <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
                Embeds a player under the article. Leave blank for none.
              </Text>
            </Box>

            {post.sources && post.sources.length > 0 && (
              <Box>
                <Text {...labelProps}>Sources</Text>
                <VStack align="stretch" gap={1}>
                  {post.sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Text fontSize="xs" color="nexzy.lightBlue" lineClamp={1}>
                        {s.name}: {s.url}
                      </Text>
                    </a>
                  ))}
                </VStack>
              </Box>
            )}

            <Box>
              <Text {...labelProps}>SEO title</Text>
              <Input
                value={form.seoTitle}
                onChange={(e) => set("seoTitle", e.target.value)}
                {...inputProps}
              />
              <Text {...labelProps} mt={3}>
                SEO description
              </Text>
              <Textarea
                value={form.seoDescription}
                onChange={(e) => set("seoDescription", e.target.value)}
                rows={3}
                {...inputProps}
              />
            </Box>
          </VStack>
        </GridItem>
      </Grid>

      {/* Editor report — full width below the form to use the space + give the
          scores, flags, and diff log room to breathe (two-column when wide). */}
      {post.editorReport && (
        <Box mt={6}>
          <EditorReport report={post.editorReport} wide />
        </Box>
      )}
    </>
  );
}

export default function AdminPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AdminShell>
      <EditorContent id={id} />
    </AdminShell>
  );
}
