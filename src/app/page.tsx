// ============================================
// FILE: app/page.tsx
// Home page — a NEWSROOM first. Opens with the lead story + latest headlines,
// then the daily newsroom block (nostalgia + what's trending) and the guides
// rail. The app appears once, low on the page, as the "make it yours" band.
// Every content module is adaptive — it hides when there's nothing to show.
// ============================================
import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import TrendingBar from "@/components/landing/TrendingBar";
import HomeRewindFeature from "@/components/landing/HomeRewindFeature";
import HomeLibrary from "@/components/landing/HomeLibrary";
import HomeVideos from "@/components/landing/HomeVideos";
import CrawlHighway from "@/components/landing/CrawlHighway";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import {
  fetchPosts,
  fetchTrending,
  fetchLibraryLatest,
  fetchVideosLatest,
  fetchRewindToday,
  fetchGamesPage,
} from "@/lib/blog/api";

// Cache the home page (with its content modules) — rebuilt in the background.
export const revalidate = 300;

export default async function HomePage() {
  const [news, hot, reads, library, videos, rewindToday, gamesPage] =
    await Promise.all([
      fetchPosts({ pageSize: 7 }),
      fetchTrending(6, "hot"),
      fetchTrending(6, "reads"),
      fetchLibraryLatest(6),
      fetchVideosLatest(9),
      fetchRewindToday(),
      fetchGamesPage(1, 40),
    ]);

  // The lead story anchors the masthead; the next few are the headline list.
  const lead = news.items[0] ?? null;
  const headlines = news.items.slice(1, 6);

  return (
    <>
      <Navigation />
      <main>
        {/* Newsroom masthead — lead story + latest headlines */}
        <Hero lead={lead} headlines={headlines} />

        {/* Trending — horizontal popularity bar below the hero */}
        <TrendingBar hot={hot} reads={reads} excludeSlug={lead?.slug} />

        {/* Today in gaming history — the flagship Rewind feature */}
        <HomeRewindFeature episode={rewindToday} />

        {/* Videos & Shorts */}
        <HomeVideos items={videos} />

        {/* Guides, walkthroughs & lists rail */}
        <HomeLibrary items={library} />

        {/* Explore Nexzy — crawl highway: fans link equity out to game hubs +
            section hubs (the homepage is the most-crawled page on the site) */}
        <CrawlHighway games={gamesPage.items} />

        {/* The app — one "make it yours" band, low on the page */}
        <CTA />
      </main>
      <Footer />
    </>
  );
}
