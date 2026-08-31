"use client";

import {
  Box,
  Flex,
  Grid,
  GridItem,
  HStack,
  VStack,
  Text,
  Input,
  Textarea,
  Button,
} from "@chakra-ui/react";
import Markdown from "@/components/blog/Markdown";
import { regeneratePost } from "@/lib/admin/client";
import { labelProps, inputProps } from "./shared";
import type { PostEditor } from "./usePostEditor";
import ReviewActionBar from "./ReviewActionBar";
import RightRail from "./RightRail";
import EditorReport from "./EditorReport";
import PollEditor from "./PollEditor";
import DealEditor from "./DealEditor";
import PatchEditor from "./PatchEditor";
import HardwareEditor from "./HardwareEditor";
import EssentialsEditor from "./EssentialsEditor";

/**
 * The editor for NEWS + LISTS (type 'article' / 'list'). Owns its own left
 * column (title / excerpt / body / tags) and reuses the shared review bar,
 * right rail, and editor report. Guides/walkthroughs use GuideEditor instead —
 * so guide-only changes never touch this file (and vice versa).
 */
export default function ArticleEditor({ ed }: { ed: PostEditor }) {
  const {
    post,
    form,
    set,
    run,
    busy,
    preview,
    setPreview,
    notice,
    error,
    id,
    poll,
    setPoll,
    formatData,
    setFormatData,
  } = ed;
  const isPublished = ed.isPublished;
  if (!post || !form) return null;

  return (
    <>
      <ReviewActionBar ed={ed} />

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
              <Text {...labelProps}>Short version (answer-first)</Text>
              <Textarea
                value={form.answerCapsule}
                onChange={(e) => set("answerCapsule", e.target.value)}
                rows={2}
                placeholder="1-2 sentences shown in a box at the very top — the direct answer / most important fact."
                {...inputProps}
              />
            </Box>
            <Box>
              <Text {...labelProps}>Your take (original value)</Text>
              <Textarea
                value={form.authorTake}
                onChange={(e) => set("authorTake", e.target.value)}
                rows={3}
                placeholder="Your genuine take / verdict — the angle a reader can't get from IGN. Renders as a bylined 'take' block. Leave empty for commodity pieces."
                {...inputProps}
              />
            </Box>
            <Box>
              <Text {...labelProps}>Search index</Text>
              <Flex gap={2}>
                {[
                  { v: "", label: "Auto (beat)" },
                  { v: "true", label: "Index" },
                  { v: "false", label: "Noindex" },
                ].map((opt) => (
                  <Button
                    key={opt.v || "auto"}
                    size="xs"
                    variant={form.indexable === opt.v ? "solid" : "outline"}
                    bg={form.indexable === opt.v ? "nexzy.blue" : undefined}
                    color={
                      form.indexable === opt.v ? "white" : "whiteAlpha.800"
                    }
                    borderColor="whiteAlpha.300"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() => set("indexable", opt.v)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </Flex>
              <Text fontSize="xs" color="whiteAlpha.600" mt={1}>
                Auto = beat default (deals / patch → noindex). Override to force
                index or noindex. Noindex still publishes for social + app.
              </Text>
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
                <HStack gap={2}>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="nexzy.lightBlue"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() => setPreview((p) => !p)}
                  >
                    {preview ? "Edit" : "Preview"}
                  </Button>
                  {!isPublished && (
                    <Button
                      size="xs"
                      variant="ghost"
                      color="nexzy.lightBlue"
                      loading={busy === "Body regenerated"}
                      _hover={{ bg: "whiteAlpha.100" }}
                      onClick={() =>
                        run("Body regenerated", () =>
                          regeneratePost(id, "body"),
                        )
                      }
                    >
                      ↻ Regenerate
                    </Button>
                  )}
                </HStack>
              </Flex>
              {preview ? (
                <Box
                  flex="1"
                  minH="420px"
                  overflowY="auto"
                  bg="whiteAlpha.50"
                  borderWidth="1px"
                  borderColor="whiteAlpha.300"
                  borderRadius="md"
                  p={4}
                  color="gray.200"
                >
                  <Markdown>{form.bodyMarkdown || "_(empty)_"}</Markdown>
                </Box>
              ) : (
                <Textarea
                  value={form.bodyMarkdown}
                  onChange={(e) => set("bodyMarkdown", e.target.value)}
                  flex="1"
                  minH="420px"
                  fontFamily="mono"
                  fontSize="sm"
                  {...inputProps}
                />
              )}
            </Box>
            <Box>
              <Text {...labelProps}>Tags (comma separated)</Text>
              <Input
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                {...inputProps}
              />
            </Box>
            {post.beat === "deals" && (
              <DealEditor value={formatData} onChange={setFormatData} />
            )}
            {post.beat === "patch_notes" && (
              <PatchEditor value={formatData} onChange={setFormatData} />
            )}
            {post.beat === "console_hardware" && (
              <HardwareEditor value={formatData} onChange={setFormatData} />
            )}
            {post.beat === "game_movies_tv" && (
              <EssentialsEditor value={formatData} onChange={setFormatData} />
            )}
            <PollEditor poll={poll} setPoll={setPoll} />
          </VStack>
        </GridItem>

        <GridItem minW={0}>
          <RightRail ed={ed} />
        </GridItem>
      </Grid>

      {post.editorReport && (
        <Box mt={6}>
          <EditorReport report={post.editorReport} wide />
        </Box>
      )}
    </>
  );
}
