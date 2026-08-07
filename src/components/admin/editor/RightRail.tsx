"use client";

import { useState } from "react";
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
} from "@/lib/admin/client";
import { youtubeId, isYoutubeShort } from "@/lib/blog/youtube";
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
  if (!post || !form) return null;

  const addVideo = (url: string) => {
    const vid = youtubeId(url);
    if (!vid || media.some((m) => m.videoId === vid)) return;
    setMedia([
      ...media,
      {
        type: "youtube",
        url,
        videoId: vid,
        thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
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
            placeholder="Paste a YouTube link — watch, share, or Shorts"
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
              const short = isYoutubeShort(m.url);
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
                  >
                    <img
                      src={
                        m.thumbnailUrl ||
                        `https://i.ytimg.com/vi/${m.videoId}/mqdefault.jpg`
                      }
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </Box>
                  <Box flex="1" minW={0}>
                    <Text fontSize="xs" color="nexzy.white" lineClamp={1}>
                      {m.title || m.url}
                    </Text>
                    <Text fontSize="10px" color="nexzy.gray.100">
                      {m.featured ? "★ Lead video" : short ? "Short" : "Video"}
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
