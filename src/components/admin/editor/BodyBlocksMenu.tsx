"use client";

// ============================================
// FILE: components/admin/editor/BodyBlocksMenu.tsx
// "Add block" panel above an article/guide body textarea. Each tile drops a
// starter template at the caret (its own paragraph). The syntax is parsed in
// lib/blog/md-blocks.ts and rendered by components/blog/ArticleBlocks.tsx, so
// the editor Preview and the live page match. Cheat sheet: Project doc
// build/NEXZY_ARTICLE_BLOCKS.md.
//
// Video: a link alone on its own line. Full videos render 16:9, Shorts and
// TikToks portrait. Add #short (portrait) or #wide (16:9) to the end of any
// video link to force the shape, e.g. a vertical Streamable clip.
// ============================================
import { useState, type RefObject } from "react";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import {
  FiGrid,
  FiZap,
  FiInfo,
  FiAlertTriangle,
  FiList,
  FiYoutube,
  FiSmartphone,
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
    hint: "Board: buffs vs nerfs, fixes",
    icon: FiTool,
    md: () =>
      "> [!PATCH] Game Update 1.04\n> - Date: \n> - Platforms: \n> - Size: \n> - Impact: Medium\n> - Who: Solo players, Ranked\n>\n> ### Weapons\n> - [BUFF] Name: 40 -> 44 | short detail\n> - [NERF] Name: 2.1s -> 2.6s\n> ### World\n> - [NEW] Name | short detail\n> - [FIX] What was fixed\n> - [KNOWN] Known issue",
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
    label: "Video (16:9)",
    hint: "YouTube, Streamable. Caption on line 2",
    icon: FiYoutube,
    md: () => "https://www.youtube.com/watch?v=PASTE_ID\nOptional caption",
  },
  {
    label: "Short (9:16)",
    hint: "YouTube Short, TikTok, vertical clip",
    icon: FiSmartphone,
    md: () => "https://www.youtube.com/shorts/PASTE_ID\nOptional caption",
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

export default function BodyBlocksMenu({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Insert at the caret as its own paragraph (blank lines around it); appends
  // at the end if the body was never focused.
  const insert = (md: string) => {
    const el = textareaRef.current;
    const at = el ? el.selectionStart : value.length;
    const before = value.slice(0, at).replace(/\s+$/, "");
    const after = value.slice(at).replace(/^\s+/, "");
    onChange([before, md, after].filter(Boolean).join("\n\n"));
    setOpen(false);
  };
  return (
    <Box mb={2}>
      <Button
        size="xs"
        variant="outline"
        color="gray.200"
        borderColor="whiteAlpha.300"
        _hover={{ bg: "whiteAlpha.100" }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <FiX /> : <FiPlus />} Add block
      </Button>
      {open && (
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
                insert(b.md());
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
                <Text fontSize="xs" color="gray.400" lineHeight="1.3">
                  {b.hint}
                </Text>
              </Box>
            </Flex>
          ))}
        </Grid>
      )}
    </Box>
  );
}
