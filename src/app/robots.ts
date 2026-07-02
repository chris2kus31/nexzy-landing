// ============================================
// FILE: app/robots.ts
// Generates /robots.txt and points crawlers to the sitemap.
// ============================================
import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

// AI answer-engine crawlers. Nexzy's model is reach → traffic → installs, so we
// ALLOW these: being crawled is what makes Nexzy eligible to be cited inside AI
// answers (ChatGPT Search, Perplexity, Gemini, Google AI Overviews, Copilot).
const AI_CRAWLERS = [
  "GPTBot", // OpenAI / ChatGPT
  "OAI-SearchBot", // ChatGPT Search
  "ChatGPT-User", // ChatGPT browsing
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot", // Anthropic
  "Claude-Web",
  "Google-Extended", // Gemini / AI Overviews
  "Applebot-Extended",
  "CCBot", // Common Crawl (feeds many models)
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Explicitly welcome AI crawlers (same access as everyone else).
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
    host: SITE_URL,
  };
}
