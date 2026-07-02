// Google News sitemap: articles published in the last 48 hours, with
// <news:news> tags. Google News crawls this to surface fresh articles in the
// News tab / Top Stories. Referenced from robots.txt.
import { fetchPosts } from "@/lib/blog/api";

export const revalidate = 300;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const PUBLICATION = "Nexzy News";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;

  let items: Awaited<ReturnType<typeof fetchPosts>>["items"] = [];
  try {
    // Grab the newest page; filter to the 48h Google News window.
    const res = await fetchPosts({ pageSize: 50 });
    items = res.items.filter(
      (p) => p.publishedAt && new Date(p.publishedAt).getTime() >= cutoff,
    );
  } catch {
    items = [];
  }

  const urls = items
    .map((p) => {
      const loc = `${SITE_URL}/blog/${p.slug}`;
      const pubDate = new Date(p.publishedAt as string).toISOString();
      return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(PUBLICATION)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${xmlEscape(p.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
