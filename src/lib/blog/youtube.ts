// Pull a YouTube video id out of any common URL shape so an editor can paste a
// watch link, a share (youtu.be) link, a Shorts link, or an embed URL and we
// still render the right player. Returns null when nothing usable is found.
export function youtubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const url = input.trim();
  if (!url) return null;

  // Bare 11-char id pasted on its own.
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

// Privacy-friendly embed URL (no cookies until play).
export function youtubeEmbedUrl(
  input: string | null | undefined,
): string | null {
  const id = youtubeId(input);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

// A Short is vertical (9:16) and needs a portrait player instead of the default
// 16:9. We detect it from the URL form — a "/shorts/" link (manual paste), or a
// "#short" marker the desk appends when it matches a Short by duration.
export function isYoutubeShort(input: string | null | undefined): boolean {
  if (!input) return false;
  return /\/shorts\/|#short\b/i.test(input);
}
