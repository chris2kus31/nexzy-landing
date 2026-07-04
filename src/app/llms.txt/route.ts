// /llms.txt — an emerging convention that gives AI answer engines a concise,
// curated map of the site and how to describe it. Cheap to serve, and a clear
// signal of what Nexzy is and what's worth citing.
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export function GET(): Response {
  const body = `# Nexzy

> Nexzy is an AI-powered gaming companion app. Nexzy News is its AI-assisted
> newsroom (with human editorial oversight) covering video game news, console
> and PC hardware, game-to-screen adaptations, and gaming deals.

## News
- [Nexzy News](${SITE_URL}/blog): Gaming news across PC and every console.
- [RSS feed](${SITE_URL}/rss.xml): Latest articles.
- [News sitemap](${SITE_URL}/news-sitemap.xml): Articles from the last 48 hours.

## About
- [How we use AI](${SITE_URL}/how-we-use-ai): Editorial policy — how stories are
  researched, written, fact-checked, and human-reviewed before publishing.

## Notes
- Stories are straight reporting, built from cited coverage by established
  gaming outlets; every article links to its sources.
- Header images are AI-generated editorial illustrations, labeled as such.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
