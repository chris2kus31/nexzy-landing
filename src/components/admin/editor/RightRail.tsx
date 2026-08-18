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
} from "@/lib/admin/client";
import { isYoutubeShort } from "@/lib/blog/youtube";
import { parseVideoUrl, mediaPoster } from "@/lib/blog/media";
import { prepareImageDataUrl } from "@/lib/admin/imagePrep";
import { labelProps, inputProps } from "./shared";
import type { PostEditor } from "./usePostEditor";
import ReviewVerdictEditor from "./ReviewVerdictEditor";
import CollageBuilder from "./CollageBuilder";

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
  if (!post || !form) return null;

  const addShot = (url: string) => {
    const u = url.trim();
    if (!u || screenshots.includes(u)) return;
    saveScreenshots([...screenshots, u].slice(0, 12));
  };
  const addShotFromInput = () => {
    addShot(shotInput);
    setShotInput("");
  };
  const removeShot = (idx: number) =>
    saveScreenshots(screenshots.filter((_, i) => i !== idx));
  const moveShot = (idx: number, dir: number) => {
    const j = idx + dir;
    if (j < 0 || j >= screenshots.length) return;
    const next = [...screenshots];
    [next[idx], next[j]] = [next[j], next[idx]];
    saveScreenshots(next);
  };
  const onPickShot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return;
    // Browser-side downscale/re-encode so big PNGs never 413 on the proxy.
    prepareImageDataUrl(file)
      .then(async (dataUrl) => {
        const { url } = await uploadBodyImage(id, dataUrl);
        if (url) addShot(url);
      })
      .catch(() => {
        /* surfaced via the editor's error state on next save */
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
        <PostGamesEditor postId={id} />
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
              loading={busy === "Screenshots saved"}
              flexShrink={0}
            >
              ↑ Upload
            </Button>
          </HStack>
          <input
            ref={shotFileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            style={{ display: "none" }}
            onChange={onPickShot}
          />
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
                  borderColor="whiteAlpha.200"
                  bg="black"
                >
                  <Image src={src} alt="" w="100%" h="64px" objectFit="cover" />
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
