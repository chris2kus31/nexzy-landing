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
        // IMPORTANT: keep /games OUT of iOS Universal Links until the app build
        // that ships app/games/[slug].tsx is live AND widely adopted. The server
        // AASA is read by ALREADY-INSTALLED apps; adding /games here before the
        // new build rolls out would make iOS open the OLD app (which has no
        // /games route) to a dead screen. Re-add when the new build is live:
        //   { "/": "/games/*", comment: "Game hubs" },
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
