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
  title: "About Nexzy News",
  description:
    "Nexzy News is a gaming newsroom covering PC and console games, hardware, adaptations, and deals — AI-assisted, human-edited, and published by Nexzy.",
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
    publishingPrinciples: `${SITE_URL}/how-we-use-ai`,
    ethicsPolicy: `${SITE_URL}/how-we-use-ai`,
    parentOrganization: {
      "@type": "Organization",
      name: "Nexzy",
      url: SITE_URL,
    },
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
              Nexzy News is an AI-assisted newsroom with human editorial
              oversight. AI agents handle the legwork — scanning reputable
              outlets, gathering sourced facts, and drafting stories — and a
              human editor reviews, fact-checks, and approves everything before
              it publishes. Nothing goes live automatically. For the full
              breakdown, see{" "}
              <Link asChild color="nexzy.lightBlue" display="inline">
                <NextLink href="/how-we-use-ai">How we use AI</NextLink>
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
