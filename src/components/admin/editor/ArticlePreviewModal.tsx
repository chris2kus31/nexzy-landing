"use client";

import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Image,
  Badge,
  Button,
} from "@chakra-ui/react";
import type { PublicPost, ArticleMedia } from "@/lib/blog/api";
import { beatLabel, beatPalette } from "@/lib/blog/beats";
import AnswerCapsule from "@/components/blog/AnswerCapsule";
import ArticleBody from "@/components/blog/ArticleBody";
import MediaGallery from "@/components/blog/MediaGallery";
import DealBlock from "@/components/blog/DealBlock";
import PatchBlock from "@/components/blog/PatchBlock";
import HardwareSpecBlock from "@/components/blog/HardwareSpecBlock";
import EssentialsBlock from "@/components/blog/EssentialsBlock";
import type { PostEditor } from "./usePostEditor";

/**
 * A full-article PREVIEW rendered from the editor's LIVE (unsaved) state — the
 * same components the public page uses, so what you see is what will publish,
 * without actually publishing. Deliberately reuses AnswerCapsule / ArticleBody /
 * MediaGallery / the four beat blocks for fidelity; the surrounding chrome
 * (related posts, newsletter, comments) is omitted since it isn't editable here.
 *
 * The hero is rendered at the real 16:9 / object-fit cover so you can see how a
 * given image will actually crop before you commit it.
 */
export default function ArticlePreviewModal({
  ed,
  onClose,
}: {
  ed: PostEditor;
  onClose: () => void;
}) {
  const { post, form, formatData, images, media, poll } = ed;
  if (!post || !form) return null;

  // Admin format/media types are structurally the public ones — cast once so the
  // preview can reuse the real render components.
  const fd = (formatData ?? {}) as unknown as NonNullable<
    PublicPost["formatData"]
  >;
  const previewMedia = media as unknown as ArticleMedia[];
  const beat = post.beat ?? "";
  const words = (form.bodyMarkdown || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  const pollOptions = poll.options.map((o) => o.trim()).filter(Boolean);
  const showPoll = poll.question.trim() && pollOptions.length >= 2;

  return (
    <Box
      position="fixed"
      inset="0"
      zIndex={2500}
      bg="blackAlpha.800"
      overflowY="auto"
      p={{ base: 2, md: 6 }}
      onClick={onClose}
    >
      <Box
        maxW="820px"
        mx="auto"
        bg="nexzy.navy"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        onClick={(e) => e.stopPropagation()}
        overflow="hidden"
      >
        {/* Preview toolbar (not part of the article) */}
        <Flex
          align="center"
          justify="space-between"
          px={{ base: 4, md: 6 }}
          py={3}
          borderBottomWidth="1px"
          borderColor="whiteAlpha.200"
          bg="whiteAlpha.50"
          position="sticky"
          top="0"
          zIndex={1}
        >
          <Text
            fontSize="xs"
            fontWeight="700"
            letterSpacing="wide"
            textTransform="uppercase"
            color="nexzy.gold"
          >
            Preview — not published
          </Text>
          <Button size="xs" variant="outline" onClick={onClose}>
            Close
          </Button>
        </Flex>

        <Container maxW="3xl" px={{ base: 4, md: 6 }} py={{ base: 5, md: 8 }}>
          {/* Beat badge + meta */}
          <Flex align="center" gap={3} mb={3} wrap="wrap">
            {beat && (
              <Badge colorPalette={beatPalette(beat)} variant="solid">
                {beatLabel(beat)}
              </Badge>
            )}
            <Text fontSize="sm" color="gray.400">
              {minutes} min read
            </Text>
          </Flex>

          {/* Title */}
          <Heading
            as="h1"
            fontFamily="title"
            fontSize={{ base: "3xl", md: "4xl" }}
            color="white"
            lineHeight="1.15"
            mb={3}
          >
            {form.title || "(untitled)"}
          </Heading>

          {form.excerpt && (
            <Text color="gray.300" fontSize="lg" mb={4}>
              {form.excerpt}
            </Text>
          )}

          <AnswerCapsule text={form.answerCapsule} />

          <Text fontSize="sm" color="gray.400" mt={4} mb={6}>
            By {post.author || "Nexzy Editorial"}
          </Text>

          {/* Hero — real 16:9 + cover crop */}
          {post.heroImageUrl && (
            <Box mb={2}>
              <Box
                aspectRatio={16 / 9}
                borderRadius="2xl"
                overflow="hidden"
                bg="blackAlpha.400"
              >
                <Image
                  src={post.heroImageUrl}
                  alt={form.imageAlt || form.title}
                  w="full"
                  h="full"
                  objectFit="cover"
                />
              </Box>
              {form.imageCredit && (
                <Text fontSize="xs" color="gray.500" mt={2} fontStyle="italic">
                  {form.imageCredit}
                </Text>
              )}
            </Box>
          )}

          {previewMedia.length > 0 && (
            <MediaGallery media={previewMedia} title={form.title} />
          )}

          {/* Beat core modules */}
          {beat === "deals" && <DealBlock deal={fd.deal} />}
          {beat === "patch_notes" && <PatchBlock patch={fd.patch} />}
          {beat === "console_hardware" && (
            <HardwareSpecBlock spec={fd.hardwareSpec} whoFor={fd.whoFor} />
          )}
          {beat === "game_movies_tv" && (
            <EssentialsBlock essentials={fd.essentials} />
          )}

          {/* Body (with inline images) */}
          {form.bodyMarkdown ? (
            <ArticleBody body={form.bodyMarkdown} location="preview" />
          ) : (
            <Text color="gray.500" fontStyle="italic">
              (no body yet)
            </Text>
          )}

          {/* Image gallery */}
          {images.length > 0 && (
            <Box
              mt={8}
              display="grid"
              gridTemplateColumns={{ base: "1fr", sm: "1fr 1fr" }}
              gap={3}
            >
              {images.map((im, i) => (
                <Box key={i}>
                  <Image
                    src={im.url}
                    alt={im.alt || ""}
                    w="full"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="whiteAlpha.200"
                  />
                  {im.caption && (
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {im.caption}
                    </Text>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Poll (static preview — voting is inert here) */}
          {showPoll && (
            <Box
              mt={8}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="xl"
              p={5}
            >
              <Text fontWeight="700" color="white" mb={3}>
                {poll.question}
              </Text>
              <Flex direction="column" gap={2}>
                {pollOptions.map((o, i) => (
                  <Box
                    key={i}
                    borderWidth="1px"
                    borderColor="whiteAlpha.300"
                    borderRadius="lg"
                    px={4}
                    py={2.5}
                    color="gray.200"
                    fontSize="sm"
                  >
                    {o}
                  </Box>
                ))}
              </Flex>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
}
