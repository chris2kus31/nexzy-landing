"use client";

import { useRef, useState } from "react";
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
import type { IconType } from "react-icons";
import {
  FiGrid,
  FiZap,
  FiInfo,
  FiAlertTriangle,
  FiList,
  FiYoutube,
  FiColumns,
  FiClock,
  FiEdit3,
  FiMessageSquare,
  FiPlus,
  FiAward,
  FiHash,
  FiCalendar,
  FiTool,
  FiEyeOff,
  FiHelpCircle,
  FiBookOpen,
  FiShare2,
  FiSliders,
  FiImage,
  FiX,
} from "react-icons/fi";
import Markdown from "@/components/blog/Markdown";
import { regeneratePost } from "@/lib/admin/client";
import { labelProps, inputProps } from "./shared";
import type { PostEditor } from "./usePostEditor";
import ReviewActionBar from "./ReviewActionBar";
import ArticlePreviewModal from "./ArticlePreviewModal";
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
// Article blocks the editor can drop in at the caret (syntax parsed in
// lib/blog/md-blocks.ts, rendered by components/blog/ArticleBlocks.tsx).
// Plain markdown, so the AI desk writes the same thing. Inserted locally; the
// normal Save persists it.
const nowCT = () =>
  new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) + " CT";
const BODY_BLOCKS: {
  label: string;
  hint: string;
  icon: IconType;
  md: () => string;
}[] = [
  {
    label: "Takeaways",
    hint: "The short version, 3 bullets",
    icon: FiList,
    md: () => "> [!KEY]\n> - First point\n> - Second point\n> - Third point",
  },
  {
    label: "The details",
    hint: "Fact tiles: date, price, platforms",
    icon: FiGrid,
    md: () =>
      "> [!FACTS] The details\n> - Release date: \n> - Platforms: \n> - Price: \n> - Developer: ",
  },
  {
    label: "Table",
    hint: "Columns and rows",
    icon: FiColumns,
    md: () =>
      "| Item | Detail | Detail |\n|---|---|---|\n| Row one |  |  |\n| Row two |  |  |",
  },
  {
    label: "Update",
    hint: "Timestamped update (now, CT)",
    icon: FiClock,
    md: () => `> [!UPDATE] ${nowCT()}\n> What changed.`,
  },
  {
    label: "Correction",
    hint: "What was wrong, what is right",
    icon: FiEdit3,
    md: () =>
      `> [!CORRECTION] ${nowCT()}\n> An earlier version of this story said X. It is Y.`,
  },
  {
    label: "Pull quote",
    hint: "Big quote with who said it",
    icon: FiMessageSquare,
    md: () => "> [!QUOTE] Name, Role at Studio\n> The quote goes here.",
  },
  {
    label: "Pro tip",
    hint: "Gold tip box, optional title",
    icon: FiZap,
    md: () => "> [!TIP] Short title\n> One or two sentences.",
  },
  {
    label: "Good to know",
    hint: "Blue note box",
    icon: FiInfo,
    md: () => "> [!NOTE]\n> One or two sentences.",
  },
  {
    label: "Heads up",
    hint: "Red warning box",
    icon: FiAlertTriangle,
    md: () => "> [!WARNING]\n> What to watch out for.",
  },
  {
    label: "Pros and cons",
    hint: "Side by side on desktop",
    icon: FiPlus,
    md: () =>
      "> [!PROS]\n> - First\n> - Second\n\n> [!CONS]\n> - First\n> - Second",
  },
  {
    label: "Verdict",
    hint: "Score ring + summary",
    icon: FiAward,
    md: () => "> [!VERDICT] 8.5/10 Great\n> One-paragraph verdict.",
  },
  {
    label: "Steps",
    hint: "Numbered how-to",
    icon: FiHash,
    md: () =>
      "> [!STEPS] How to do it\n> 1. First step\n> 2. Second step\n> 3. Third step",
  },
  {
    label: "Timeline",
    hint: "Dated events, top to bottom",
    icon: FiCalendar,
    md: () =>
      "> [!TIMELINE]\n> - **Jun 2026**: What happened\n> - **Nov 19**: What happened",
  },
  {
    label: "Patch notes",
    hint: "Tagged lines: NEW FIX BUFF NERF",
    icon: FiTool,
    md: () =>
      "> [!PATCH] Update 1.04\n> ### Gameplay\n> - [NEW] Added ...\n> - [BUFF] ...\n> - [NERF] ...\n> ### Fixes\n> - [FIX] Fixed ...\n> - [KNOWN] Still looking into ...",
  },
  {
    label: "Spoiler block",
    hint: "Collapsed until tapped",
    icon: FiEyeOff,
    md: () => "> [!SPOILER] Ending explained\n> The hidden text.",
  },
  {
    label: "FAQ",
    hint: "Tap-to-open questions",
    icon: FiHelpCircle,
    md: () =>
      "> [!FAQ]\n> ### First question?\n> The answer.\n>\n> ### Second question?\n> The answer.",
  },
  {
    label: "Read next",
    hint: "Card to another Nexzy page",
    icon: FiBookOpen,
    md: () =>
      "> [!READ] [Article title](/blog/slug)\n> One line on why it is worth reading.",
  },
  {
    label: "Video",
    hint: "YouTube, Short, Streamable, TikTok",
    icon: FiYoutube,
    md: () => "https://www.youtube.com/watch?v=PASTE_ID\nOptional caption",
  },
  {
    label: "Social post",
    hint: "X, Bluesky, Reddit, Instagram, Threads",
    icon: FiShare2,
    md: () => "https://x.com/handle/status/PASTE_ID",
  },
  {
    label: "Image compare",
    hint: "Drag slider between 2 shots",
    icon: FiSliders,
    md: () =>
      "> [!COMPARE] PS5 | PS5 Pro\n> ![PS5](IMAGE_URL)\n> ![PS5 Pro](IMAGE_URL)",
  },
  {
    label: "Gallery",
    hint: "2 or 3 images in a row",
    icon: FiImage,
    md: () => "![Caption](IMAGE_URL)\n![Caption](IMAGE_URL)",
  },
];

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
    bodyRef,
    insertBodyImageFile,
    wrapBodySelection,
  } = ed;
  const isPublished = ed.isPublished;
  const imgInputRef = useRef<HTMLInputElement>(null);
  // Drop a block at the caret as its own paragraph (blank lines around it).
  const insertBlock = (md: string) => {
    if (!form) return;
    const body = form.bodyMarkdown ?? "";
    const el = bodyRef.current;
    const at = el ? el.selectionStart : body.length;
    const before = body.slice(0, at).replace(/\s+$/, "");
    const after = body.slice(at).replace(/^\s+/, "");
    set("bodyMarkdown", [before, md, after].filter(Boolean).join("\n\n"));
  };
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showBlocks, setShowBlocks] = useState(false);
  if (!post || !form) return null;

  return (
    <>
      <ReviewActionBar ed={ed} />

      <Flex justify="flex-end" mb={3}>
        <Button
          size="sm"
          variant="outline"
          color="nexzy.lightBlue"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={() => setShowFullPreview(true)}
        >
          👁 Preview article
        </Button>
      </Flex>

      {showFullPreview && (
        <ArticlePreviewModal
          ed={ed}
          onClose={() => setShowFullPreview(false)}
        />
      )}

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
                      loading={
                        busy === "Uploading image" || busy === "Image inserted"
                      }
                      _hover={{ bg: "whiteAlpha.100" }}
                      onClick={() => imgInputRef.current?.click()}
                      title="Upload an image and drop it into the body at your cursor"
                    >
                      🖼 Insert image
                    </Button>
                  )}
                  {!isPublished && (
                    <Button
                      size="xs"
                      variant="ghost"
                      color="nexzy.lightBlue"
                      _hover={{ bg: "whiteAlpha.100" }}
                      onClick={() => wrapBodySelection("||", "||")}
                      title="Select text in the body, then tap to hide it behind a click-to-reveal spoiler"
                    >
                      🙈 Spoiler
                    </Button>
                  )}
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
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) insertBodyImageFile(f);
                    }}
                  />
                </HStack>
              </Flex>
              {!isPublished && !preview && (
                <Box mb={2}>
                  <Button
                    size="xs"
                    variant="outline"
                    color="gray.200"
                    borderColor="whiteAlpha.300"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() => setShowBlocks((v) => !v)}
                  >
                    {showBlocks ? <FiX /> : <FiPlus />} Add block
                  </Button>
                  {showBlocks && (
                    <Grid
                      mt={2}
                      p={2}
                      gap={1.5}
                      templateColumns="repeat(auto-fill, minmax(180px, 1fr))"
                      bg="whiteAlpha.50"
                      borderWidth="1px"
                      borderColor="whiteAlpha.200"
                      borderRadius="md"
                    >
                      {BODY_BLOCKS.map((b) => (
                        <Flex
                          key={b.label}
                          as="button"
                          align="flex-start"
                          gap={2}
                          p={2}
                          textAlign="left"
                          borderRadius="md"
                          _hover={{ bg: "whiteAlpha.100" }}
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            insertBlock(b.md());
                            setShowBlocks(false);
                          }}
                        >
                          <Box color="nexzy.yellow" mt="3px" flex="0 0 auto">
                            <b.icon size={14} />
                          </Box>
                          <Box minW={0}>
                            <Text
                              fontSize="sm"
                              fontWeight="600"
                              color="gray.100"
                              lineHeight="1.3"
                            >
                              {b.label}
                            </Text>
                            <Text
                              fontSize="xs"
                              color="gray.400"
                              lineHeight="1.3"
                            >
                              {b.hint}
                            </Text>
                          </Box>
                        </Flex>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}
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
                  ref={bodyRef}
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
