"use client";

import { use } from "react";
import { Flex, Spinner, Text } from "@chakra-ui/react";
import AdminShell from "@/components/admin/AdminShell";
import { usePostEditor } from "@/components/admin/editor/usePostEditor";
import ArticleEditor from "@/components/admin/editor/ArticleEditor";
import GuideEditor from "@/components/admin/editor/GuideEditor";

/**
 * Post review/editor router. Guides + walkthroughs get their OWN editor
 * (GuideEditor); news + lists use ArticleEditor. Both share the same engine
 * (usePostEditor) and the shared review bar / right rail / editor report, so
 * generic behavior never drifts — but guide-only work lives entirely in
 * GuideEditor and can never affect the news editor, and vice versa.
 */
function EditorRouter({ id }: { id: string }) {
  const ed = usePostEditor(id);

  if (ed.error && !ed.post) {
    return (
      <Text color="red.300" fontSize="sm">
        {ed.error}
      </Text>
    );
  }
  if (!ed.post || !ed.form) {
    return (
      <Flex justify="center" py={12}>
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }

  const isGuide = ed.post.type === "guide" || ed.post.type === "walkthrough";
  return isGuide ? <GuideEditor ed={ed} /> : <ArticleEditor ed={ed} />;
}

export default function AdminPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AdminShell>
      <EditorRouter id={id} />
    </AdminShell>
  );
}
