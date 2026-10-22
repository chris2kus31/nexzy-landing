// ============================================
// FILE: app/app/page.tsx
// The dedicated APP page, rebuilt for the 1.1.10 launch ("Follow the games you
// love. And the gamers who get them."). Same body as the old /follow pre-launch
// page (which now 308-redirects here), in its live state: store buttons, no
// countdown. The FAQ below doubles as FAQPage JSON-LD for answer engines.
// Fully static: the screenshot folder is read once at build time.
// ============================================
import type { Metadata } from "next";
import { readdirSync } from "node:fs";
import path from "node:path";
import { Box, Container, Heading, Text, Stack, VStack } from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import FollowLaunch from "@/components/landing/FollowLaunch";
import { jsonLdString } from "@/lib/seo/jsonld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const dynamic = "force-static";

const IMG_RE = /\.(png|jpe?g|webp|avif)$/i;

/** Map of screenshot name (no extension, lowercase) -> public URL. */
function readShots(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const f of readdirSync(
      path.join(process.cwd(), "public", "follow", "shots"),
    )) {
      if (!IMG_RE.test(f)) continue;
      out[f.replace(IMG_RE, "").toLowerCase()] =
        `/follow/shots/${encodeURIComponent(f)}`;
    }
  } catch {
    // folder missing: sections fall back gracefully
  }
  return out;
}

const TITLE = "Nexzy App: Follow the Games You Love | Free Gaming Feed";
const DESCRIPTION =
  "Nexzy is a free gaming app for iPhone and Android. Follow any game and get its news, trailers and updates in one feed, keep your library and wishlist, and meet gamers who play what you play.";
const SHARE_TITLE = "The new Nexzy: follow the games you love";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords:
    "gaming app, gaming feed, follow games, game news app, game trailers, game library app, wishlist, gaming community app, gaming social app",
  alternates: { canonical: "/app" },
  openGraph: {
    title: SHARE_TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/app`,
    type: "website",
    images: [{ url: "/follow/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: DESCRIPTION,
    images: ["/follow/og.jpg"],
  },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is Nexzy free?",
    a: "Yes. Nexzy is free to download on iPhone and Android.",
  },
  {
    q: "What does following a game do?",
    a: "Follow a game and its news, trailers and updates land in your feed, next to posts from players who play it. Follow a few and your feed is built from your games.",
  },
  {
    q: "Can I keep a game library and wishlist?",
    a: "Yes. Add a game to your library or wishlist in one tap from its page, and it shows on your Gamer Card.",
  },
  {
    q: "Can I post and meet other gamers?",
    a: "Yes. Post screenshots, GIFs and polls, tag the game so the right players see it, reply, and follow gamers who share your taste.",
  },
  {
    q: "What devices does the app run on?",
    a: "Nexzy runs on iPhone via the App Store and on Android via Google Play.",
  },
  {
    q: "How is the app different from the Nexzy website?",
    a: "The website is the newsroom: news, guides and walkthroughs anyone can read. The app is your feed: the games you follow, their news and trailers, and the gamers who play them.",
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
        <FollowLaunch shots={readShots()} />

        {/* FAQ: visible copy matches the FAQPage JSON-LD below (AEO/GEO). */}
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
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(faqLd) }}
      />
    </>
  );
}
