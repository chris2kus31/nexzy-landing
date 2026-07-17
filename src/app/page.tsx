// ============================================
// FILE: app/page.tsx
// Home page — a NEWSROOM first. Opens with the lead story + latest headlines,
// then the daily newsroom block (nostalgia + what's trending) and the guides
// rail. The app appears once, low on the page, as the "make it yours" band.
// Every content module is adaptive — it hides when there's nothing to show.
// ============================================
import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import HomeNewsroom from "@/components/landing/HomeNewsroom";
import HomeLibrary from "@/components/landing/HomeLibrary";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import {
  fetchPosts,
  fetchTrending,
  fetchLibraryLatest,
  fetchNostalgia,
} from "@/lib/blog/api";

// Cache the home page (with its content modules) — rebuilt in the background.
export const revalidate = 300;

export default async function HomePage() {
  const [news, hot, reads, library, nostalgia] = await Promise.all([
    fetchPosts({ pageSize: 7 }),
    fetchTrending(6, "hot"),
    fetchTrending(6, "reads"),
    fetchLibraryLatest(3),
    fetchNostalgia(),
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

        {/* Daily newsroom — nostalgia spotlight + what's trending */}
        <HomeNewsroom
          nostalgia={nostalgia}
          lead={lead}
          hot={hot}
          reads={reads}
        />

        {/* Guides, walkthroughs & lists rail */}
        <HomeLibrary items={library} />

        {/* The app — one "make it yours" band, low on the page */}
        <CTA />
      </main>
      <Footer />
    </>
  );
}
