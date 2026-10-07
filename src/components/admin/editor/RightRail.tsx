"use client";

import { useRef, useState } from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  Input,
  Textarea,
  Button,
  Image,
} from "@chakra-ui/react";
import PostGamesEditor from "@/components/admin/PostGamesEditor";
import YoutubeSearch from "@/components/admin/YoutubeSearch";
import {
  getPost,
  regeneratePost,
  regenerateImage,
  setPostAuthor,
  uploadBodyImage,
  updatePost,
} from "@/lib/admin/client";
import { isYoutubeShort } from "@/lib/blog/youtube";
import { parseVideoUrl, mediaPoster } from "@/lib/blog/media";
import { prepareImageDataUrl } from "@/lib/admin/imagePrep";
import { labelProps, inputProps } from "./shared";
import type { PostEditor } from "./usePostEditor";
import ReviewVerdictEditor from "./ReviewVerdictEditor";
import CollageBuilder from "./CollageBuilder";
import ArticleImages from "./ArticleImages";

/**
 * The shared right rail: byline, linked games, hero image + alt/credit, video,
 * sources, SEO, and FAQ. These are the generic building blocks EVERY content
 * type needs, so both the article editor and the guide editor reuse them —
 * fix once, fixed everywhere. Anything guide-specific lives in the guide editor,
 * not here.
 */
export default function RightRail({ ed }: { ed: PostEditor }) {
  const {
    post,
    form,
    media,
    setMedia,
    screenshots,
    saveScreenshots,
    facts,
    setFacts,
    set,
    run,
    busy,
    authorSel,
    setAuthorSel,
    bylines,
    fileRef,
    onPickImage,
    suggestAltText,
    isPublished,
    id,
  } = ed;
  const [vidInput, setVidInput] = useState("");
  const [shotInput, setShotInput] = useState("");
  const shotFileRef = useRef<HTMLInputElement>(null);
  // Inline status for the screenshot gallery so an upload/save is never silent.
  const [shotStatus, setShotStatus] = useState<{
    kind: "working" | "ok" | "error";
    text: string;
  } | null>(null);
  const [freshShots, setFreshShots] = useState<string[]>([]);
  if (!post || !form) return null;

  const flashOk = (text: string, urls: string[] = []) => {
    setShotStatus({ kind: "ok", text });
    setFreshShots(urls);
    window.setTimeout(() => {
      setShotStatus((s) => (s?.kind === "ok" ? null : s));
      setFreshShots([]);
    }, 5000);
  };

  // Save a new screenshot list and report the outcome inline.
  const saveShotsWithStatus = async (
    next: string[],
    okText: string,
    added: string[] = [],
  ) => {
    setShotStatus({ kind: "working", text: "Saving…" });
    const ok = await saveScreenshots(next);
    if (ok) flashOk(okText, added);
    else
      setShotStatus({
        kind: "error",
        text: "Couldn't save the screenshots. Try again.",
      });
    return ok;
  };

  const addShot = async (url: string) => {
    const u = url.trim();
    if (!u) return;
    if (screenshots.includes(u)) {
      setShotStatus({
        kind: "error",
        text: "That image is already in the list.",
      });
      return;
    }
    if (screenshots.length >= 12) {
      setShotStatus({
        kind: "error",
        text: "12 screenshots max. Remove one first.",
      });
      return;
    }
    await saveShotsWithStatus(
      [...screenshots, u],
      "Screenshot added and saved",
      [u],
    );
  };
  // Append a reused game screenshot into the article IMAGE gallery (dedup by URL).
  // Additive: the normal upload/paste-image flows in ArticleImages are untouched.
  const addGalleryImage = (url: string, meta?: { alt?: string }) => {
    const u = url.trim();
    if (!u) return;
    const imgs = ed.images ?? [];
    if (imgs.some((im) => im.url === u)) return;
    // Default the alt to an article-relevant value (the linked game) so a reused
    // screenshot ships SEO-meaningful, not blank. Editable in the gallery.
    ed.saveImages([
      ...imgs,
      { url: u, alt: meta?.alt ?? "", order: imgs.length },
    ]);
  };
  // Set the hero from an existing (already-hosted) URL — e.g. a game screenshot.
  // Uses the same PATCH the editor already uses; `run` refreshes post state so
  // the hero thumbnail updates live. No re-upload.
  const setHeroFromUrl = (url: string) =>
    run("Hero image set", () => updatePost(id, { heroImageUrl: url }));
  const addShotFromInput = () => {
    addShot(shotInput);
    setShotInput("");
  };
  const removeShot = (idx: number) =>
    saveShotsWithStatus(
      screenshots.filter((_, i) => i !== idx),
      "Screenshot removed",
    );
  const moveShot = (idx: number, dir: number) => {
    const j = idx + dir;
    if (j < 0 || j >= screenshots.length) return;
    const next = [...screenshots];
    [next[idx], next[j]] = [next[j], next[idx]];
    saveShotsWithStatus(next, "Order saved");
  };
  // Upload one or more files: downscale in the browser (so big PNGs never 413),
  // upload each, then save the list once. Every step reports inline.
  const onPickShot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const room = 12 - screenshots.length;
    if (room <= 0) {
      setShotStatus({
        kind: "error",
        text: "12 screenshots max. Remove one first.",
      });
      return;
    }
    const picked = files.slice(0, room);
    const skipped: string[] = [];
    if (files.length > room)
      skipped.push(`${files.length - room} over the 12 limit`);
    const uploaded: string[] = [];
    for (let i = 0; i < picked.length; i++) {
      const f = picked[i];
      if (f.size > 20 * 1024 * 1024) {
        skipped.push(`${f.name} is over 20 MB`);
        continue;
      }
      setShotStatus({
        kind: "working",
        text:
          picked.length > 1
            ? `Uploading ${i + 1} of ${picked.length}…`
            : "Uploading…",
      });
      try {
        const dataUrl = await prepareImageDataUrl(f);
        const { url } = await uploadBodyImage(id, dataUrl);
        if (url && !screenshots.includes(url) && !uploaded.includes(url))
          uploaded.push(url);
        else if (!url) skipped.push(`${f.name} failed to upload`);
      } catch (err) {
        skipped.push(
          `${f.name}: ${(err as Error)?.message || "upload failed"}`,
        );
      }
    }
    if (!uploaded.length) {
      setShotStatus({
        kind: "error",
        text: `Nothing was added. ${skipped.join(" · ")}`,
      });
      return;
    }
    const ok = await saveShotsWithStatus(
      [...screenshots, ...uploaded],
      `${uploaded.length} screenshot${uploaded.length === 1 ? "" : "s"} uploaded and saved`,
      uploaded,
    );
    if (ok && skipped.length)
      setShotStatus({
        kind: "error",
        text: `${uploaded.length} added. Skipped: ${skipped.join(" · ")}`,
      });
  };

  const addVideo = (url: string) => {
    // Accept YouTube or Streamable. YouTube keeps its ytimg thumbnail; Streamable
    // has no no-API thumb, so we leave it null (the player shows a play facade).
    const parsed = parseVideoUrl(url);
    if (!parsed) return;
    if (media.some((m) => m.videoId === parsed.videoId)) return;
    setMedia([
      ...media,
      {
        type: parsed.type,
        url,
        videoId: parsed.videoId,
        thumbnailUrl:
          parsed.type === "youtube"
            ? `https://i.ytimg.com/vi/${parsed.videoId}/hqdefault.jpg`
            : null,
        featured: media.length === 0,
        source: "manual",
      },
    ]);
  };
  const addFromInput = () => {
    addVideo(vidInput.trim());
    setVidInput("");
  };
  const removeVideo = (idx: number) => {
    let next = media.filter((_, i) => i !== idx);
    if (next.length && !next.some((m) => m.featured)) {
      next = next.map((m, i) => ({ ...m, featured: i === 0 }));
    }
    setMedia(next);
  };
  const starVideo = (idx: number) =>
    setMedia(media.map((m, i) => ({ ...m, featured: i === idx })));
  const moveVideo = (idx: number, dir: number) => {
    const j = idx + dir;
    if (j < 0 || j >= media.length) return;
    const next = [...media];
    [next[idx], next[j]] = [next[j], next[idx]];
    setMedia(next);
  };

  return (
    <VStack align="stretch" gap={4}>
      {post.type === "review" && <ReviewVerdictEditor ed={ed} />}
      <Box
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        p={3}
      >
        <Text {...labelProps}>Author / byline</Text>
        <HStack gap={1} wrap="wrap" mb={2}>
          {bylines.map((a) => {
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
          “Set byline” relabels only. “Rewrite in this voice” regenerates the
          draft in that author’s tone (drafts only).
        </Text>
      </Box>

      <Box>
        <PostGamesEditor
          postId={id}
          onReuseVideo={addVideo}
          onReuseImage={addGalleryImage}
          onSetHero={setHeroFromUrl}
          onInsertBody={(url, meta) =>
            ed.insertIntoBody(`![${meta?.alt ?? ""}](${url})`)
          }
        />
      </Box>

      <CollageBuilder ed={ed} />

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
        {ed.heroTooSmall && (
          <Button
            size="xs"
            mt={2}
            w="100%"
            bg="orange.500"
            color="white"
            _hover={{ bg: "orange.600" }}
            loading={busy === "Image uploaded"}
            onClick={ed.forceUploadHero}
          >
            Use it anyway (will be upscaled)
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
          style={{ display: "none" }}
          onChange={onPickImage}
        />
        <Box mt={3}>
          <Text {...labelProps}>Image credit</Text>
          <Input
            value={form.imageCredit}
            onChange={(e) => set("imageCredit", e.target.value)}
            placeholder="e.g. AI illustration, or a source/photographer"
            {...inputProps}
          />
        </Box>
      </Box>

      <Box>
        <Text {...labelProps}>Image alt</Text>
        <HStack gap={2} align="flex-start">
          <Input
            value={form.imageAlt}
            onChange={(e) => set("imageAlt", e.target.value)}
            {...inputProps}
          />
          <Button
            size="sm"
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            loading={busy === "Suggesting alt"}
            onClick={suggestAltText}
            flexShrink={0}
          >
            ✨ Suggest
          </Button>
        </HStack>
        <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
          Describes the actual image (vision) for accessibility + image SEO.
          Edit, then Save.
        </Text>
      </Box>

      <Box>
        <Text {...labelProps}>Videos</Text>
        <HStack gap={2}>
          <Input
            value={vidInput}
            onChange={(e) => setVidInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFromInput();
              }
            }}
            placeholder="Paste a YouTube or Streamable link"
            {...inputProps}
          />
          <Button
            size="sm"
            onClick={addFromInput}
            disabled={!vidInput.trim()}
            flexShrink={0}
          >
            Add
          </Button>
        </HStack>
        {!isPublished && (
          <YoutubeSearch
            defaultQuery={post?.title ?? undefined}
            onAttach={(url) => addVideo(url)}
          />
        )}
        {media.length > 0 && (
          <VStack align="stretch" gap={2} mt={2}>
            {media.map((m, i) => {
              const short = m.type !== "streamable" && isYoutubeShort(m.url);
              const poster = mediaPoster({ ...m, quality: "mq" });
              return (
                <HStack
                  key={m.videoId}
                  gap={2}
                  p={2}
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor={m.featured ? "yellow.400" : "whiteAlpha.200"}
                  borderRadius="md"
                >
                  <Box
                    position="relative"
                    w={short ? "40px" : "72px"}
                    h="40px"
                    flexShrink={0}
                    borderRadius="sm"
                    overflow="hidden"
                    bg="black"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {poster ? (
                      <img
                        src={poster}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <Text fontSize="9px" color="whiteAlpha.700">
                        ▶
                      </Text>
                    )}
                  </Box>
                  <Box flex="1" minW={0}>
                    <Text fontSize="xs" color="nexzy.white" lineClamp={1}>
                      {m.title || m.url}
                    </Text>
                    <Text fontSize="10px" color="nexzy.gray.100">
                      {m.featured
                        ? "★ Lead video"
                        : m.type === "streamable"
                          ? "Streamable"
                          : short
                            ? "Short"
                            : "Video"}
                      {m.source === "auto-finder" ? " · auto-found" : ""}
                    </Text>
                  </Box>
                  <Button
                    size="xs"
                    variant="ghost"
                    title="Make the lead (big) video"
                    onClick={() => starVideo(i)}
                    color={m.featured ? "yellow.400" : "nexzy.gray.100"}
                  >
                    ★
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    title="Move up"
                    onClick={() => moveVideo(i, -1)}
                    disabled={i === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    title="Move down"
                    onClick={() => moveVideo(i, 1)}
                    disabled={i === media.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    title="Remove"
                    color="red.300"
                    onClick={() => removeVideo(i)}
                  >
                    ✕
                  </Button>
                </HStack>
              );
            })}
          </VStack>
        )}
        <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
          Add multiple videos and star one as the lead (plays big on the
          article); the rest show as thumbnails. Save to apply.
        </Text>
      </Box>

      {/* Article image gallery — its own thing (not the rewind screenshot
          gallery below, not the videos above). Shown only for the article types
          whose public pages render the gallery: news, guides, reviews. Rewind
          (its own screenshots), walkthroughs and lists use other render shapes. */}
      {!["rewind", "walkthrough", "list"].includes(post.type ?? "") && (
        <ArticleImages ed={ed} />
      )}

      {post.type === "rewind" && (
        <Box>
          <Text {...labelProps}>Screenshots</Text>
          <HStack gap={2}>
            <Input
              value={shotInput}
              onChange={(e) => setShotInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addShotFromInput();
                }
              }}
              placeholder="Paste an image URL"
              {...inputProps}
            />
            <Button
              size="sm"
              onClick={addShotFromInput}
              disabled={!shotInput.trim()}
              flexShrink={0}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="outline"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() => shotFileRef.current?.click()}
              loading={shotStatus?.kind === "working"}
              loadingText={shotStatus?.text}
              flexShrink={0}
            >
              ↑ Upload
            </Button>
          </HStack>
          <input
            ref={shotFileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            multiple
            style={{ display: "none" }}
            onChange={onPickShot}
          />
          {shotStatus && (
            <Text
              mt={2}
              fontSize="xs"
              fontWeight="600"
              color={
                shotStatus.kind === "ok"
                  ? "green.300"
                  : shotStatus.kind === "error"
                    ? "red.300"
                    : "nexzy.lightBlue"
              }
              role="status"
              aria-live="polite"
            >
              {shotStatus.kind === "ok" ? "✓ " : ""}
              {shotStatus.text}
            </Text>
          )}
          {screenshots.length > 0 && (
            <Box
              mt={2}
              display="grid"
              gridTemplateColumns="repeat(3, 1fr)"
              gap={2}
            >
              {screenshots.map((src, i) => (
                <Box
                  key={src}
                  position="relative"
                  borderRadius="md"
                  overflow="hidden"
                  border="1px solid"
                  borderColor={
                    freshShots.includes(src) ? "green.400" : "whiteAlpha.200"
                  }
                  borderWidth={freshShots.includes(src) ? "2px" : "1px"}
                  bg="black"
                >
                  <Image src={src} alt="" w="100%" h="64px" objectFit="cover" />
                  {freshShots.includes(src) && (
                    <Text
                      position="absolute"
                      bottom={1}
                      left={1}
                      fontSize="9px"
                      fontWeight="700"
                      bg="green.500"
                      color="white"
                      px={1.5}
                      borderRadius="sm"
                    >
                      NEW
                    </Text>
                  )}
                  <HStack
                    gap={0}
                    position="absolute"
                    top={0}
                    right={0}
                    bg="blackAlpha.700"
                  >
                    <Button
                      size="xs"
                      variant="ghost"
                      title="Move left"
                      onClick={() => moveShot(i, -1)}
                      disabled={i === 0}
                      minW="auto"
                      px={1}
                      color="white"
                    >
                      ←
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      title="Move right"
                      onClick={() => moveShot(i, 1)}
                      disabled={i === screenshots.length - 1}
                      minW="auto"
                      px={1}
                      color="white"
                    >
                      →
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      title="Remove"
                      onClick={() => removeShot(i)}
                      minW="auto"
                      px={1}
                      color="red.300"
                    >
                      ✕
                    </Button>
                  </HStack>
                </Box>
              ))}
            </Box>
          )}
          <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
            Shown on the Rewind episode page (up to 12). Saved on add/remove. If
            empty, the linked game&rsquo;s screenshots are used automatically.
          </Text>
        </Box>
      )}

      {post.type === "rewind" && (
        <Box>
          <Text {...labelProps}>Game facts (Rewind spec sheet)</Text>
          <HStack gap={2} mb={2}>
            <Box flex={1}>
              <Text color="nexzy.gray.100" fontSize="10px" mb={1}>
                Publisher
              </Text>
              <Input
                value={facts.publisher ?? ""}
                onChange={(e) =>
                  setFacts({ ...facts, publisher: e.target.value })
                }
                {...inputProps}
              />
            </Box>
            <Box flex={1}>
              <Text color="nexzy.gray.100" fontSize="10px" mb={1}>
                Developer
              </Text>
              <Input
                value={facts.developer ?? ""}
                onChange={(e) =>
                  setFacts({ ...facts, developer: e.target.value })
                }
                {...inputProps}
              />
            </Box>
          </HStack>
          <HStack gap={2} mb={2}>
            <Box flex={1}>
              <Text color="nexzy.gray.100" fontSize="10px" mb={1}>
                Players
              </Text>
              <Input
                value={facts.players ?? ""}
                onChange={(e) =>
                  setFacts({ ...facts, players: e.target.value })
                }
                {...inputProps}
              />
            </Box>
            <Box flex={1}>
              <Text color="nexzy.gray.100" fontSize="10px" mb={1}>
                Genre
              </Text>
              <Input
                value={facts.genre ?? ""}
                onChange={(e) => setFacts({ ...facts, genre: e.target.value })}
                {...inputProps}
              />
            </Box>
          </HStack>
          <Text color="nexzy.gray.100" fontSize="10px" mb={1}>
            Features (one per line)
          </Text>
          <Textarea
            value={(facts.features ?? []).join("\n")}
            onChange={(e) =>
              setFacts({ ...facts, features: e.target.value.split("\n") })
            }
            rows={4}
            mb={2}
            {...inputProps}
          />
          <Text color="nexzy.gray.100" fontSize="10px" mb={1}>
            &ldquo;Nexzy Says!&rdquo; historical note
          </Text>
          <Textarea
            value={facts.historicalNote ?? ""}
            onChange={(e) =>
              setFacts({ ...facts, historicalNote: e.target.value })
            }
            rows={2}
            {...inputProps}
          />
          <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
            The writer fills these; edit and click Save to apply. Blank fields
            fall back to the linked game or a placeholder.
          </Text>
        </Box>
      )}

      {post.sources && post.sources.length > 0 && (
        <Box>
          <Text {...labelProps}>Sources</Text>
          <VStack align="stretch" gap={1}>
            {post.sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer">
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
        <Text
          fontSize="xs"
          mt={1}
          color={form.seoTitle.length > 60 ? "red.400" : "gray.500"}
        >
          {form.seoTitle.length}/60 — the page title in Google (a site name is
          appended).
        </Text>
        <Text {...labelProps} mt={3}>
          SEO description
        </Text>
        <Textarea
          value={form.seoDescription}
          onChange={(e) => set("seoDescription", e.target.value)}
          rows={3}
          {...inputProps}
        />
        <Text
          fontSize="xs"
          mt={1}
          color={form.seoDescription.length > 160 ? "red.400" : "gray.500"}
        >
          {form.seoDescription.length}/160 — the grey snippet under the title in
          search results.
        </Text>
      </Box>

      <Box>
        <Text {...labelProps}>
          FAQ (one per line — &quot;Question :: Answer&quot;)
        </Text>
        <Textarea
          value={form.faq}
          onChange={(e) => set("faq", e.target.value)}
          rows={5}
          placeholder="Is Malenia optional? :: No — she guards a Great Rune you need."
          {...inputProps}
        />
        <Text fontSize="xs" mt={1} color="gray.500">
          Renders an FAQ block + FAQPage schema on guides (needs 2+ to emit
          schema). Leave empty to omit.
        </Text>
      </Box>
    </VStack>
  );
}
