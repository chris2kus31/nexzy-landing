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
 *
 * The inline CTA is only injected on longer pieces (>= INLINE_CTA_MIN_WORDS).
 * Short/brief news already ends with the "make it yours" band + the newsletter,
 * so a second in-body app CTA on a 250-word post just reads as salesy — exactly
 * the ad-maze feel Nexzy positions against. Features (~450+ words) have the room
 * for a high CTA and an end band, spaced far apart.
 */
const INLINE_CTA_MIN_WORDS = 400;

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
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  // `cta={false}` (e.g. the Rewind retro-paper panel) renders the body whole with
  // no inline install CTA. Short bodies also skip it (see INLINE_CTA_MIN_WORDS).
  if (!rest || !cta || wordCount < INLINE_CTA_MIN_WORDS)
    return <Markdown tone={tone}>{body}</Markdown>;
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
