"use client";

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
  if (!post || !form) return null;

  return (
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
        <Text {...labelProps}>YouTube video (optional)</Text>
        <Input
          value={form.youtubeUrl}
          onChange={(e) => set("youtubeUrl", e.target.value)}
          placeholder="Paste a YouTube link — watch, share, or Shorts"
          {...inputProps}
        />
        {!isPublished && (
          <YoutubeSearch
            defaultQuery={post?.title ?? undefined}
            onAttach={(url) => set("youtubeUrl", url)}
          />
        )}
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
              <Text color="nexzy.lightBlue" fontSize="xs" fontWeight="600">
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
