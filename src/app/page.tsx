// ============================================
// FILE: app/page.tsx
// Home page: app-primary hero, then a content cluster (newsroom, library,
// topics) that grows the traffic flywheel, then the app pitch + download.
// Every content module is adaptive — it hides itself when there's nothing to
// show, so the page never renders half-empty and fills out as we publish.
// ============================================
import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import HomeNewsroom from "@/components/landing/HomeNewsroom";
import HomeLibrary from "@/components/landing/HomeLibrary";
import HomeTopics from "@/components/landing/HomeTopics";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import {
  fetchPosts,
  fetchTrending,
  fetchLibraryLatest,
  fetchTags,
  fetchNostalgia,
} from "@/lib/blog/api";
import { MIN_TOPIC_ARTICLES } from "@/lib/blog/tags";

// Cache the home page (with its content modules) — rebuilt in the background.
export const revalidate = 300;

export default async function HomePage() {
  const [news, hot, reads, library, tags, nostalgia] = await Promise.all([
    fetchPosts({ pageSize: 6 }),
    fetchTrending(6, "hot"),
    fetchTrending(6, "reads"),
    fetchLibraryLatest(3),
    fetchTags(60),
    fetchNostalgia(),
  ]);

  const latest = news.items.slice(0, 3).map((p) => ({
    slug: p.slug,
    title: p.title,
    beat: p.beat,
    imageUrl: p.heroImageUrl ?? null,
  }));
  const lead = news.items[0] ?? null;
  const topicTags = tags
    .filter((t) => t.count >= MIN_TOPIC_ARTICLES)
    .slice(0, 8);

  return (
    <>
      <Navigation />
      <main>
        {/* App anchor — the latest-news strip lives inside the hero */}
        <Hero latest={latest} />

        {/* Content cluster (dark): news leads, library + topics follow */}
        <HomeNewsroom
          nostalgia={nostalgia}
          lead={lead}
          hot={hot}
          reads={reads}
        />
        <HomeLibrary items={library} />
        <HomeTopics tags={topicTags} />

        {/* App pitch (light) + download / newsletter */}
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
