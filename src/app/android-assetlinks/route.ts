// ============================================
// FILE: app/android-assetlinks/route.ts
// Android App Links (Digital Asset Links) — verifies the Nexzy app owns
// nexzyapp.com so shared /blog/* links open the app. Served at the Google-
// required path /.well-known/assetlinks.json via a rewrite in next.config.ts.
//
// ⚠️ Set ANDROID_SHA256_FINGERPRINT in the landing env to the app's signing
// cert SHA-256 (colon-separated hex — Play Console → App integrity → App
// signing, or `keytool -list -v`). Until it's set, Android verification will
// NOT pass (iOS Universal Links are unaffected).
// ============================================
export const dynamic = "force-dynamic";

export function GET(): Response {
  // Comma-separate to list multiple keys (e.g. your Play app-signing key AND
  // your EAS/upload key while testing) — both often need to be present.
  const fingerprints = (
    process.env.ANDROID_SHA256_FINGERPRINT || "REPLACE_WITH_ANDROID_SHA256"
  )
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.nexzy.app",
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
