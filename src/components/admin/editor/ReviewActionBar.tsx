"use client";

import { useRouter } from "next/navigation";
import { Button, Flex, HStack } from "@chakra-ui/react";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  approvePost,
  rejectPost,
  sendBackPost,
  unpublishPost,
  setFeatured,
} from "@/lib/admin/client";
import type { PostEditor } from "./usePostEditor";

/**
 * The review action bar (back, status, save, approve/publish, feature,
 * unpublish, send-back, reject). Shared verbatim by the article + guide
 * editors — the same review controls apply to every content type.
 */
export default function ReviewActionBar({ ed }: { ed: PostEditor }) {
  const router = useRouter();
  const { post, run, save, busy, isPublished, id } = ed;
  if (!post) return null;

  return (
    <Flex align="center" justify="space-between" mb={5} gap={4} wrap="wrap">
      <HStack gap={3}>
        <Button
          size="sm"
          variant="ghost"
          color="nexzy.gray.100"
          onClick={() => router.back()}
          _hover={{ bg: "whiteAlpha.100" }}
        >
          ← Queue
        </Button>
        <StatusBadge status={post.status} />
      </HStack>
      <HStack gap={2} wrap="wrap">
        <Button
          size="sm"
          onClick={save}
          loading={busy === "Saved"}
          bg="whiteAlpha.200"
          color="nexzy.white"
          _hover={{ bg: "whiteAlpha.300" }}
        >
          Save edits
        </Button>
        {!isPublished && (
          <Button
            size="sm"
            onClick={() => run("Published", () => approvePost(id))}
            loading={busy === "Published"}
            bg="green.500"
            color="white"
            _hover={{ bg: "green.600" }}
          >
            Approve & publish
          </Button>
        )}
        {isPublished && (
          <Button
            size="sm"
            onClick={() =>
              run(post.featured ? "Unfeatured" : "Featured", () =>
                setFeatured(id, !post.featured),
              )
            }
            loading={busy === "Featured" || busy === "Unfeatured"}
            variant={post.featured ? "solid" : "outline"}
            bg={post.featured ? "orange.400" : "transparent"}
            color={post.featured ? "nexzy.navy" : "orange.300"}
            borderColor="orange.400/50"
            _hover={{ bg: post.featured ? "orange.300" : "whiteAlpha.100" }}
          >
            {post.featured ? "★ Featured" : "☆ Feature"}
          </Button>
        )}
        {isPublished && (
          <Button
            size="sm"
            onClick={() => run("Unpublished", () => unpublishPost(id))}
            loading={busy === "Unpublished"}
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
          >
            Unpublish
          </Button>
        )}
        {!isPublished && (
          <Button
            size="sm"
            onClick={() => {
              const reason =
                window.prompt(
                  "What should the writer fix? (guides the AI rewrite)",
                ) || undefined;
              run("Sent back — rewriting", () => sendBackPost(id, reason));
            }}
            loading={busy === "Sent back — rewriting"}
            variant="outline"
            color="orange.300"
            borderColor="orange.400/40"
            _hover={{ bg: "whiteAlpha.100" }}
          >
            Send back
          </Button>
        )}
        {!isPublished && (
          <Button
            size="sm"
            onClick={() => {
              const reason = window.prompt("Reason (optional):") || undefined;
              run("Rejected", () => rejectPost(id, reason));
            }}
            loading={busy === "Rejected"}
            variant="outline"
            color="red.300"
            borderColor="red.400/40"
            _hover={{ bg: "whiteAlpha.100" }}
          >
            Reject
          </Button>
        )}
      </HStack>
    </Flex>
  );
}
