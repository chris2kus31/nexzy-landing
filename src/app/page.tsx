// ============================================
// FILE: app/page.tsx
// Main landing page that USES our components!
// ============================================
import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { fetchPosts } from "@/lib/blog/api";

// Cache the home page (with its hero headlines) — rebuilt in the background.
export const revalidate = 300;

export default async function HomePage() {
  const { items } = await fetchPosts({ pageSize: 3 });
  const latest = items.slice(0, 3).map((p) => ({
    slug: p.slug,
    title: p.title,
    beat: p.beat,
    imageUrl: p.heroImageUrl ?? null,
  }));

  return (
    <>
      <Navigation />
      <main>
        {/* Latest news now lives IN the hero, so no separate news section here. */}
        <Hero latest={latest} />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
