"use client";

import { useState } from "react";
import { Box, HStack, Text, Button, Input } from "@chakra-ui/react";
import { setReviewRating } from "@/lib/admin/client";
import { verdictTierFor } from "@/lib/blog/verdict";
import { labelProps } from "./shared";
import type { PostEditor } from "./usePostEditor";

/**
 * Review-only rail block: shows the writer's verdict tier for the current score
 * and lets you nudge the 1–10 rating before publishing. The tier is derived
 * from the number using the same mapping the public page uses, so what you see
 * here is what ships.
 */
export default function ReviewVerdictEditor({ ed }: { ed: PostEditor }) {
  const { post, id, run, busy } = ed;
  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
  const current = clamp(
    ((post?.editorReport as { review?: { rating?: number } } | null)?.review
      ?.rating ?? 5) as number,
  );
  const [rating, setRating] = useState<number>(current);
  const tier = verdictTierFor(post?.author ?? null, rating);
  const dirty = rating !== current;

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="teal.400/40"
      borderRadius="lg"
      p={3}
    >
      <Text {...labelProps}>Verdict — {post?.author || "reviewer"}</Text>
      <Text
        color="teal.300"
        fontFamily="title"
        fontSize="lg"
        fontWeight="800"
        lineHeight="1.1"
        mb={2}
      >
        {tier}
      </Text>
      <HStack gap={2} mb={2}>
        <Button
          size="xs"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={() => setRating((r) => clamp(r - 1))}
          disabled={rating <= 1}
        >
          −
        </Button>
        <Input
          size="xs"
          w="56px"
          textAlign="center"
          type="number"
          value={rating}
          onChange={(e) => setRating(clamp(Number(e.target.value) || 1))}
          color="white"
          borderColor="whiteAlpha.300"
        />
        <Text color="gray.500" fontSize="sm">
          / 10
        </Text>
        <Button
          size="xs"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={() => setRating((r) => clamp(r + 1))}
          disabled={rating >= 10}
        >
          +
        </Button>
      </HStack>
      <Button
        size="xs"
        bg="teal.500"
        color="white"
        _hover={{ bg: "teal.600" }}
        loading={busy === "Rating updated"}
        disabled={!dirty}
        onClick={() => run("Rating updated", () => setReviewRating(id, rating))}
      >
        Save rating
      </Button>
    </Box>
  );
}
