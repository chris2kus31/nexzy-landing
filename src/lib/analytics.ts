// Lightweight analytics helper. Fires a custom event to Google Analytics (GA4)
// and, if present, Microsoft Clarity — so one call covers both. Safe no-op on
// the server or when neither tag is loaded (ad-blockers, admin routes, etc.).

type Params = Record<string, string | number | boolean | undefined>;

export function track(event: string, params: Params = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  };
  try {
    w.gtag?.("event", event, params);
    // Clarity custom events take a single string tag.
    w.clarity?.("event", event);
  } catch {
    // analytics must never break the UI
  }
}

/** Convenience: an app-store download click (the key conversion). */
export function trackDownload(
  store: "ios" | "android",
  location: string,
): void {
  track("app_download_click", { store, location });
}
