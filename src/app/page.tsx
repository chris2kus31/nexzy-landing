// ============================================
// FILE: app/page.tsx
// Home page: app-primary hero, then a content cluster (newsroom + library)
// that grows the traffic flywheel, then the app pitch + download. Every content
// module is adaptive — it hides itself when there's nothing to show, so the
// page never renders half-empty and fills out as we publish.
// ============================================
import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import HomeNewsroom from "@/components/landing/HomeNewsroom";
import HomeLibrary from "@/components/landing/HomeLibrary";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
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
    fetchPosts({ pageSize: 6 }),
    fetchTrending(6, "hot"),
    fetchTrending(6, "reads"),
    fetchLibraryLatest(3),
    fetchNostalgia(),
  ]);

  const latest = news.items.slice(0, 3).map((p) => ({
    slug: p.slug,
    title: p.title,
    beat: p.beat,
    imageUrl: p.heroImageUrl ?? null,
  }));
  const lead = news.items[0] ?? null;

  return (
    <>
      <Navigation />
      <main>
        {/* App anchor — the latest-news strip lives inside the hero */}
        <Hero latest={latest} />

        {/* Content cluster (dark): nostalgia-led newsroom, then the library */}
        <HomeNewsroom
          nostalgia={nostalgia}
          lead={lead}
          hot={hot}
          reads={reads}
        />
        <HomeLibrary items={library} />

        {/* App pitch (light) + download / newsletter */}
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
