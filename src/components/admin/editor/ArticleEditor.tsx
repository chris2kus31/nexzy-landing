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

/**
 * The editor for NEWS + LISTS (type 'article' / 'list'). Owns its own left
 * column (title / excerpt / body / tags) and reuses the shared review bar,
 * right rail, and editor report. Guides/walkthroughs use GuideEditor instead —
 * so guide-only changes never touch this file (and vice versa).
 */
export default function ArticleEditor({ ed }: { ed: PostEditor }) {
  const { post, form, set, run, busy, preview, setPreview, notice, error, id } =
    ed;
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
