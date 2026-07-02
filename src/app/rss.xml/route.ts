// RSS 2.0 feed of the latest Nexzy News articles, for aggregators and
// syndication. Referenced from robots.txt and the page <head> is optional.
import { fetchPosts } from "@/lib/blog/api";

export const revalidate = 300;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  let items: Awaited<ReturnType<typeof fetchPosts>>["items"] = [];
  try {
    const res = await fetchPosts({ pageSize: 30 });
    items = res.items;
  } catch {
    items = [];
  }

  const entries = items
    .map((p) => {
      const link = `${SITE_URL}/blog/${p.slug}`;
      const desc = p.seoDescription || p.excerpt || "";
      const pubDate = p.publishedAt
        ? new Date(p.publishedAt).toUTCString()
        : new Date().toUTCString();
      return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${xmlEscape(p.beat)}</category>
      <description>${xmlEscape(desc)}</description>
    </item>`;
    })
    .join("\n");

  const now = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Nexzy News</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Gaming news across PC and every console — plus hardware, game adaptations, and deals.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
${entries}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
