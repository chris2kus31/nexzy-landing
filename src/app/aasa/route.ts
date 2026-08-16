// ============================================
// FILE: app/aasa/route.ts
// Apple App Site Association — enables iOS Universal Links so shared
// nexzyapp.com links open the Nexzy app for installed users (and fall back to
// the web for everyone else). Served at the Apple-required path
// /.well-known/apple-app-site-association via a rewrite in next.config.ts
// (a rewrite, not a redirect — Apple rejects redirects on this file).
//
// /blog/* is always on. /games/* is GATED behind GAMES_DEEPLINK_ENABLED:
// the server AASA is read by ALREADY-INSTALLED apps, so adding /games before
// the app build that ships app/games/[slug].tsx is live in the App Store would
// make installed OLD apps grab game links with no route to show. The mobile app
// (v1.1.9) DOES ship that route + a safe fallback — flip the env to true once
// that build is live in the store. Default OFF = identical to today.
// ============================================
// Dynamic so the env flag is read at request time (flip via env, no rebuild).
export const dynamic = "force-dynamic";

function buildAasa() {
  const components: { "/": string; comment: string }[] = [
    { "/": "/blog/*", comment: "Shared news articles" },
  ];
  // Game-hub Universal Links — only once the games-capable app build is live.
  if (process.env.GAMES_DEEPLINK_ENABLED === "true") {
    components.push({ "/": "/games/*", comment: "Game hubs" });
  }
  return {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: ["PZ9DJ9RV97.com.nexzy.app"],
          components,
        },
      ],
    },
  };
}

export function GET(): Response {
  return new Response(JSON.stringify(buildAasa()), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
