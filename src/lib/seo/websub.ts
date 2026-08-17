// WebSub (PubSubHubbub) publish ping — tells Google's hub that our RSS feed
// has fresh content, the moment we publish. Google still operates this hub and
// confirms support; it's a free freshness/discovery signal (complements
// IndexNow, which Google does NOT consume). Best-effort: failures are ignored.

const HUB = "https://pubsubhubbub.appspot.com/";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export async function pingWebSub(): Promise<number | null> {
  try {
    const body = new URLSearchParams({
      "hub.mode": "publish",
      "hub.url": `${SITE_URL}/rss.xml`,
    });
    const res = await fetch(HUB, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      // Don't let a slow hub hold up the publish webhook.
      signal: AbortSignal.timeout(4000),
    });
    return res.status; // 204 = accepted
  } catch {
    return null;
  }
}
