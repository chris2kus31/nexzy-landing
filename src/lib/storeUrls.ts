/** Public App Store listing (Nexzy on Apple). */
export const APP_STORE_URL = "https://apps.apple.com/app/nexzy/id6744055635";

/**
 * Google Play listing URL uses the Android application ID.
 * Verify in Play Console → Grow → Store presence → Main store listing (or app URL on the listing page).
 */
export const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.nexzy.app";

/**
 * Google Play install-referrer URL. Google Play captures the `referrer` query
 * param and exposes it via the Install Referrer API, so an Android install can
 * be attributed back to where on the site the user tapped (utm_medium =
 * location). Apple does NOT honor arbitrary referrers on App Store links, so
 * APP_STORE_URL stays plain — iOS attribution needs Apple's campaign token /
 * Search Ads.
 */
export function googlePlayUrl(location: string): string {
  const referrer = `utm_source=website&utm_medium=${location}&utm_campaign=site_download`;
  return `${GOOGLE_PLAY_URL}&referrer=${encodeURIComponent(referrer)}`;
}
