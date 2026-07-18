// ============================================
// FILE: app/aasa/route.ts
// Apple App Site Association — enables iOS Universal Links so shared
// nexzyapp.com/blog/* links open the Nexzy app for installed users (and fall
// back to the web for everyone else). Served at the Apple-required path
// /.well-known/apple-app-site-association via a rewrite in next.config.ts
// (a rewrite, not a redirect — Apple rejects redirects on this file).
// ============================================
export const dynamic = "force-static";

const AASA = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: ["PZ9DJ9RV97.com.nexzy.app"],
        components: [{ "/": "/blog/*", comment: "Shared news articles" }],
      },
    ],
  },
};

export function GET(): Response {
  return new Response(JSON.stringify(AASA), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
