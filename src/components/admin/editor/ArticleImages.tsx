"use client";

import { useRef, useState } from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  Input,
  Button,
  Image,
} from "@chakra-ui/react";
import { uploadBodyImage, type ArticleImage } from "@/lib/admin/client";
import { prepareImageDataUrl } from "@/lib/admin/imagePrep";
import { labelProps, inputProps } from "./shared";
import type { PostEditor } from "./usePostEditor";

const MAX_IMAGES = 20;

/**
 * The article IMAGE gallery panel — its OWN thing, wholly separate from the
 * Rewind screenshot gallery and the video (`media`) gallery. Add images by
 * upload (reuses the existing AVIF body-image endpoint) or by URL, give each an
 * alt / caption / credit, remove, and reorder. Persists the whole list via
 * `ed.saveImages`. Rendered for the article types whose public pages show the
 * gallery — news, guides, reviews. Not rewind (its own screenshots), and not
 * walkthroughs/lists (different render shapes); RightRail gates those out.
 */
export default function ArticleImages({ ed }: { ed: PostEditor }) {
  const { images, saveImages, id, busy } = ed;
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const add = (img: ArticleImage) => {
    if (!img.url || images.some((x) => x.url === img.url)) return;
    if (images.length >= MAX_IMAGES) return;
    saveImages([...images, img]);
  };
  const addFromUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    add({ url: u });
    setUrlInput("");
  };
  const remove = (idx: number) =>
    saveImages(images.filter((_, i) => i !== idx));
  const move = (idx: number, dir: number) => {
    const j = idx + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[idx], next[j]] = [next[j], next[idx]];
    saveImages(next);
  };
  // Commit an edited text field (alt / caption / credit) for one image on blur.
  const setField = (
    idx: number,
    key: "alt" | "caption" | "credit",
    value: string,
  ) => {
    const v = value.trim() || null;
    if ((images[idx]?.[key] ?? null) === v) return; // no-op if unchanged
    saveImages(images.map((im, i) => (i === idx ? { ...im, [key]: v } : im)));
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return;
    setUploading(true);
    prepareImageDataUrl(file)
      .then((dataUrl) => uploadBodyImage(id, dataUrl))
      .then(({ url }) => add({ url }))
      .catch(() => {})
      .finally(() => setUploading(false));
  };

  return (
    <Box mt={6} pt={6} borderTop="1px solid" borderColor="whiteAlpha.200">
      <Text {...labelProps}>Image gallery ({images.length})</Text>
      <Text fontSize="xs" color="nexzy.gray.100" mb={3} lineHeight="1.5">
        A photo strip shown on the article — separate from the hero image and
        any videos. Upload or paste image URLs, then add alt text (accessibility
        + image SEO). Max {MAX_IMAGES}.
      </Text>

      <HStack gap={2} mb={2}>
        <Button
          size="sm"
          onClick={() => fileRef.current?.click()}
          loading={uploading}
          disabled={images.length >= MAX_IMAGES}
        >
          ↑ Upload image
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPick}
        />
      </HStack>
      <HStack gap={2} mb={4}>
        <Input
          {...inputProps}
          size="sm"
          placeholder="…or paste an image URL"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addFromUrl();
          }}
        />
        <Button
          size="sm"
          onClick={addFromUrl}
          disabled={images.length >= MAX_IMAGES}
        >
          Add
        </Button>
      </HStack>

      {images.length === 0 ? (
        <Text fontSize="xs" color="nexzy.gray.100">
          No images yet.
        </Text>
      ) : (
        <VStack gap={3} align="stretch">
          {images.map((im, i) => (
            <Box
              key={`${im.url}-${i}`}
              p={2}
              bg="whiteAlpha.50"
              borderRadius="md"
            >
              <HStack gap={3} align="start">
                <Image
                  src={im.url}
                  alt={im.alt ?? ""}
                  w="72px"
                  h="72px"
                  objectFit="cover"
                  borderRadius="sm"
                  flexShrink={0}
                />
                <VStack gap={1} align="stretch" flex="1" minW={0}>
                  <Input
                    {...inputProps}
                    size="sm"
                    placeholder="Alt text (accessibility + SEO)"
                    defaultValue={im.alt ?? ""}
                    onBlur={(e) => setField(i, "alt", e.target.value)}
                  />
                  <Input
                    {...inputProps}
                    size="sm"
                    placeholder="Caption (optional)"
                    defaultValue={im.caption ?? ""}
                    onBlur={(e) => setField(i, "caption", e.target.value)}
                  />
                  <Input
                    {...inputProps}
                    size="sm"
                    placeholder="Credit (optional)"
                    defaultValue={im.credit ?? ""}
                    onBlur={(e) => setField(i, "credit", e.target.value)}
                  />
                </VStack>
                <VStack gap={1} flexShrink={0}>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || busy === "Images saved"}
                  >
                    ↑
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => move(i, 1)}
                    disabled={
                      i === images.length - 1 || busy === "Images saved"
                    }
                  >
                    ↓
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="#FF8A8A"
                    onClick={() => remove(i)}
                  >
                    ✕
                  </Button>
                </VStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}
