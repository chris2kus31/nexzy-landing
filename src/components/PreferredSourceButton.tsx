// ============================================
// FILE: components/PreferredSourceButton.tsx
// "Add Nexzy as a preferred source on Google" button.
//
// When a reader taps this, it opens Google's source-preferences tool with
// nexzyapp.com pre-loaded. Once they select us, Google surfaces more of our
// content for them across Top Stories, Discover, AI Overviews, and AI Mode,
// each marked with a "preferred" badge — and readers are ~2x more likely to
// click a preferred source. It's a publisher-only lever (Nexzy IS a newsroom),
// and it reinforces the Discover/flywheel we're building.
//
// NOTE: the tool only lets a reader select us once nexzyapp.com is *eligible*
// (i.e. appears in google.com/preferences/source). That tracks with indexing —
// as the site gets crawled/indexed, it becomes selectable. Ship it now; it goes
// live for readers as eligibility lands.
//
// Placement (matches how gaming publishers do it — e.g. Focus Gaming News):
//   1) article byline area (Top-Stories context, highest intent)
//   2) sitewide footer (returning readers)
//
// Pure presentational anchor (server component). Outbound clicks are captured
// by GA4 enhanced measurement — no extra JS needed. Official Google spec:
// https://developers.google.com/search/docs/appearance/preferred-sources
// ============================================
import { Link } from "@chakra-ui/react";
import { FcGoogle } from "react-icons/fc";

// Google's documented deeplink format: ?q=<your site>. Bare host matches
// Google's own example (q=example.com); the tool resolves it to the domain.
const PREFERRED_SOURCE_URL =
  "https://www.google.com/preferences/source?q=nexzyapp.com";

export default function PreferredSourceButton({
  label = "Add Nexzy as a preferred source on Google",
}: {
  /** Override the button copy (e.g. a shorter label in tight spots). */
  label?: string;
}) {
  return (
    <Link
      href={PREFERRED_SOURCE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Add Nexzy as a preferred source on Google"
      display="inline-flex"
      alignItems="center"
      gap={2}
      px={3}
      py={2}
      borderRadius="full"
      border="1px solid"
      borderColor="whiteAlpha.300"
      bg="whiteAlpha.50"
      color="gray.200"
      fontSize="sm"
      fontWeight="600"
      lineHeight="1"
      _hover={{
        borderColor: "nexzy.lightBlue",
        bg: "whiteAlpha.100",
        color: "white",
        textDecoration: "none",
      }}
      transition="all 0.2s"
    >
      <FcGoogle size={16} aria-hidden />
      {label}
    </Link>
  );
}
