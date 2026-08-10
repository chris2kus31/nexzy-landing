// Client-safe auth config (NEXT_PUBLIC_* only). These identify the SAME Google
// project and Apple team as the mobile app, so a web sign-in lands on the same
// nexzy-api account.
export const GOOGLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

export const APPLE_SERVICES_ID =
  process.env.NEXT_PUBLIC_APPLE_SERVICES_ID || "";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

// Must exactly match a Return URL registered on the Apple Services ID.
export const APPLE_REDIRECT_URI =
  process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ||
  `${SITE_URL}/auth/apple/callback`;

/** A stable per-browser device id (nexzy-api requires one on every login). */
export function getWebDeviceId(): string {
  if (typeof window === "undefined") return "web";
  try {
    const key = "nexzy_web_device";
    let id = localStorage.getItem(key);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "web";
  }
}
