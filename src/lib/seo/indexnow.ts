// IndexNow: instantly notify Bing (and other participating engines) that a URL
// changed, so it's crawled in hours instead of days. Best-effort — never throws.
//
// Requires INDEXNOW_KEY (any 8–128 hex-ish string). The key is also served at
// /indexnow-key.txt so engines can verify ownership.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://landing.nexzyapp.com";

export function indexNowKey(): string | undefined {
  return process.env.INDEXNOW_KEY || undefined;
}

/** Submit one or more URLs to IndexNow. Returns the HTTP status, or 0 on skip/error. */
export async function pingIndexNow(urls: string[]): Promise<number> {
  const key = indexNowKey();
  if (!key || urls.length === 0) return 0;

  const host = new URL(SITE_URL).host;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${SITE_URL}/indexnow-key.txt`,
        urlList: urls,
      }),
    });
    return res.status;
  } catch {
    return 0;
  }
}
