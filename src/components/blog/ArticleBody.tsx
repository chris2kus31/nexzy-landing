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
}: {
  body: string;
  location: string;
}) {
  const { intro, rest } = splitAfterFirstParagraph(body);
  if (!rest) return <Markdown>{body}</Markdown>;
  return (
    <>
      <Markdown>{intro}</Markdown>
      <Box my={8}>
        <AppCta variant="inline" location={location} />
      </Box>
      <Markdown>{rest}</Markdown>
    </>
  );
}
