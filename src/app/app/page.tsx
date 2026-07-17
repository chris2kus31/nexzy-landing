// ============================================
// FILE: app/app/page.tsx
// The dedicated APP page. The newsroom home only nudges toward the app; this is
// the deep pitch — what Nexzy the app is, everything it does, and how to get it.
// This is also where the app-feature SEO keywords live (they were pulled off the
// newsroom homepage). ISR-cached; mostly static so it's fully crawlable.
// ============================================
import type { Metadata } from "next";
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  VStack,
} from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import AppHero from "@/components/landing/AppHero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const revalidate = 3600;

// The app page owns the app-feature keywords (assistant, library, deals) that we
// deliberately took off the newsroom homepage title.
export const metadata: Metadata = {
  title: "Nexzy App — AI Gaming Assistant, Game Library & Deal Tracker",
  description:
    "Nexzy is your AI gaming companion: Ask Nexzy to beat any game, keep your whole library across Steam, PlayStation & Xbox in one place, track wishlist price drops, and earn rewards — free on iOS & Android.",
  keywords:
    "AI gaming assistant, game library tracker, cross-platform game library, wishlist price tracker, game deal alerts, what to play next, gaming rewards, Ask Nexzy, gaming companion app",
  alternates: { canonical: "/app" },
  openGraph: {
    title: "Get the Nexzy app — your AI gaming companion",
    description:
      "Beat any game with Ask Nexzy, sync your library, track deals, and earn rewards. Free on iOS & Android.",
    url: `${SITE_URL}/app`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Get the Nexzy app — your AI gaming companion",
    description:
      "Beat any game with Ask Nexzy, sync your library, and catch every deal. Free on iOS & Android.",
  },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is Nexzy free?",
    a: "Yes. Nexzy is free to download on iOS and Android — read the newsroom, track your library, and use the core features at no cost. Optional coins unlock extra AI help when you want it.",
  },
  {
    q: "What is Ask Nexzy?",
    a: "Ask Nexzy is your AI gaming assistant. Get step-by-step help to get unstuck in any game, and it gets more personal the more it learns the games you actually play.",
  },
  {
    q: "Which platforms and stores does Nexzy work with?",
    a: "Add the games you play and track deals and wishlist price drops across Steam, Epic, PlayStation, and Xbox — your whole library in one place.",
  },
  {
    q: "Does Nexzy have mods or cheats?",
    a: "No. Nexzy is about guides, walkthroughs, news, and legit help — not mods or cheats.",
  },
  {
    q: "What devices does the app run on?",
    a: "Nexzy runs on iPhone via the App Store and on Android via Google Play.",
  },
  {
    q: "How is the app different from the Nexzy website?",
    a: "The website is the newsroom — news, guides, and walkthroughs anyone can read. The app makes it yours: your library, updates tuned to the games you play, and Ask Nexzy in your pocket.",
  },
];

export default function AppPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <Navigation />
      <main>
        <AppHero />
        <Features />
        <HowItWorks />

        {/* FAQ — visible copy matches the FAQPage JSON-LD below (AEO/GEO). */}
        <Box as="section" py={{ base: 16, md: 24 }} bg="nexzy.navy">
          <Container maxW="container.md" px={{ base: 5, md: 6 }}>
            <Stack gap={4} textAlign="center" mb={{ base: 8, md: 12 }}>
              <Text
                fontSize="xs"
                fontWeight="800"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="nexzy.blue"
              >
                Questions
              </Text>
              <Heading as="h2" size={{ base: "xl", md: "2xl" }} color="white">
                Frequently asked
              </Heading>
            </Stack>
            <VStack align="stretch" gap={4}>
              {FAQ.map((f) => (
                <Box
                  key={f.q}
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor="nexzy.blue/20"
                  borderRadius="xl"
                  p={{ base: 5, md: 6 }}
                >
                  <Heading as="h3" size="md" color="white" mb={2}>
                    {f.q}
                  </Heading>
                  <Text color="gray.300" fontSize="sm" lineHeight="1.7">
                    {f.a}
                  </Text>
                </Box>
              ))}
            </VStack>
          </Container>
        </Box>

        <CTA />
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </>
  );
}
