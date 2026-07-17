import type { Metadata } from "next";
import NextLink from "next/link";
import {
  Box,
  Container,
  Heading,
  Text,
  Link,
  Stack,
  Separator,
} from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const metadata: Metadata = {
  title: { absolute: "About Nexzy News" },
  description:
    "Nexzy News is a gaming newsroom covering PC and console games, hardware, adaptations, and deals — written and edited by real people, and published by Nexzy.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About Nexzy News", type: "website" },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Heading as="h2" size="lg" color="white" mb={3}>
        {title}
      </Heading>
      <Stack gap={3} color="gray.300" fontSize="md" lineHeight="1.7">
        {children}
      </Stack>
    </Box>
  );
}

export default function AboutPage() {
  // NewsMediaOrganization: identifies the publisher, its editor, and its
  // editorial standards — the trust signals Google News and AI engines look for.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "@id": `${SITE_URL}/#newsroom`,
    name: "Nexzy News",
    url: `${SITE_URL}/blog`,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/android-chrome-512x512.png`,
      width: 512,
      height: 512,
    },
    email: "support@nexzyapp.com",
    founder: { "@type": "Person", name: "Chris M." },
    publishingPrinciples: `${SITE_URL}/editorial-standards`,
    ethicsPolicy: `${SITE_URL}/editorial-standards`,
    foundingDate: "2026-06",
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />
      <Container maxW="3xl" py={{ base: 10, md: 16 }}>
        <Link
          asChild
          color="nexzy.lightBlue"
          fontSize="sm"
          mb={6}
          display="inline-block"
        >
          <NextLink href="/blog">← Back to News</NextLink>
        </Link>

        <Heading
          as="h1"
          fontFamily="title"
          size={{ base: "2xl", md: "4xl" }}
          color="white"
          mb={4}
          lineHeight="1.15"
        >
          About Nexzy News
        </Heading>
        <Text color="gray.300" fontSize="lg" mb={8} lineHeight="1.6">
          Nexzy News is a gaming newsroom covering the stories players actually
          care about — across PC and every console, plus hardware,
          game-to-screen adaptations, and the best deals. It&apos;s the newsroom
          behind Nexzy, the AI-powered gaming companion app.
        </Text>

        <Stack gap={8}>
          <Section title="Why Nexzy exists">
            <Text>
              Let me paint you a picture. You want one gaming tip. Just one. You
              click a news site and it detonates in your face: seventeen ads, an
              autoplaying video, a newsletter popup, a cookie banner, and buried
              somewhere under all of it, allegedly, the actual article. So you
              bail to YouTube, sit through twelve minutes of &ldquo;hey guys
              don&apos;t forget to smash that like button,&rdquo; and the big
              tip at the end turns out to be &ldquo;just get good.&rdquo; Cool.
              Thanks. Very helpful.
            </Text>
            <Text>
              That is the entire reason Nexzy exists. We got tired of it too. We
              cover the latest gaming news short, straight, and to the point. No
              ad-maze, no filler, no ten-minute runway before the runway. Just
              tell me the thing, so that is what we do.
            </Text>
            <Text>
              The Nexzy app takes that same no-nonsense experience and puts it
              in your pocket, with an AI assistant that actually helps instead
              of wasting your afternoon. Whether you are a kid stuck on your
              first boss or a veteran who remembers blowing into cartridges, you
              are welcome here. One clean gamer experience, minus the nonsense.
            </Text>
          </Section>

          <Section title="What we cover">
            <Text>
              Breaking game news, announcements and release dates, console and
              PC hardware, movie and TV adaptations of games, and money-saving
              deals — reported straight, with a bit of personality. If it
              matters to players, it belongs here.
            </Text>
          </Section>

          <Section title="How we work">
            <Text>
              Nexzy&apos;s news and guides are written and edited by real people
              who play these games. Our writers research each story from cited
              sources, and an editor fact-checks and approves everything before
              it publishes — nothing goes live automatically. For the full
              breakdown, see our{" "}
              <Link asChild color="nexzy.lightBlue" display="inline">
                <NextLink href="/editorial-standards">
                  editorial standards
                </NextLink>
              </Link>
              .
            </Text>
          </Section>

          <Section title="Who runs it">
            <Text>
              Nexzy News is published by Nexzy and led by{" "}
              <Text as="span" color="white" fontWeight="600">
                Chris M., Editor-in-Chief
              </Text>
              , who sets editorial direction, commissions coverage, and is
              responsible for what gets published.
            </Text>
          </Section>

          <Section title="Standards & corrections">
            <Text>
              We report facts and cite our sources — every article links to the
              coverage it draws from. We aim to get it right and to fix it fast
              when we don&apos;t. Spotted an error, or want to reach the
              newsroom? Email{" "}
              <Link href="mailto:support@nexzyapp.com" color="nexzy.lightBlue">
                support@nexzyapp.com
              </Link>
              .
            </Text>
          </Section>
        </Stack>

        <Separator borderColor="whiteAlpha.200" my={10} />
        <Text color="gray.500" fontSize="sm">
          Nexzy News · Published by Nexzy · Contact support@nexzyapp.com
        </Text>
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Box>
  );
}
