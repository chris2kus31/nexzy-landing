import { Box } from "@chakra-ui/react";
import Markdown from "@/components/blog/Markdown";
import AppCta from "@/components/blog/AppCta";
import { splitAfterFirstParagraph } from "@/lib/blog/format";

/**
 * Renders an article body and drops a compact install CTA in right after the
 * opening hook ("after the first paragraph"), so a reader sees the funnel high
 * on the page — not only if they scroll to the end. Server-rendered for SEO
 * (all body text stays in the HTML). On short/unsplittable bodies it just
 * renders the markdown whole. `location` is the attribution tag (content type)
 * passed through to the CTA → GA4 `app_download_click` + Android UTM medium.
 */
export default function ArticleBody({
  body,
  location,
  tone = "dark",
  cta = true,
}: {
  body: string;
  location: string;
  tone?: "dark" | "paper";
  cta?: boolean;
}) {
  const { intro, rest } = splitAfterFirstParagraph(body);
  // `cta={false}` (e.g. the Rewind retro-paper panel) renders the body whole with
  // no inline install CTA — the dark CTA card clashes with the cream paper.
  if (!rest || !cta) return <Markdown tone={tone}>{body}</Markdown>;
  return (
    <>
      <Markdown tone={tone}>{intro}</Markdown>
      <Box my={8}>
        <AppCta variant="inline" location={location} />
      </Box>
      <Markdown tone={tone}>{rest}</Markdown>
    </>
  );
}
