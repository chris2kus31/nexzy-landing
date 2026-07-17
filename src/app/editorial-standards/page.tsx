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
  title: "Editorial Standards",
  description:
    "How Nexzy's news and guides are made: written by real gaming writers, researched from cited sources, fact-checked, edited, and human-reviewed before anything publishes.",
  alternates: { canonical: "/editorial-standards" },
  openGraph: {
    title: "Editorial Standards — Nexzy",
    type: "article",
  },
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

export default function EditorialStandardsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Editorial Standards — Nexzy",
    url: `${SITE_URL}/editorial-standards`,
    publisher: { "@type": "Organization", name: "Nexzy" },
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
          Editorial standards
        </Heading>
        <Text color="gray.300" fontSize="lg" mb={8} lineHeight="1.6">
          Nexzy&apos;s news and guides are written and edited by real people who
          play these games. Here is how our work is made, and the standards it
          has to meet before it reaches you.
        </Text>

        <Stack gap={8}>
          <Section title="Who writes Nexzy">
            <Text>
              Every story and guide is written by a member of our editorial team
              — real writers with real time in these games, each covering the
              genres they know best. Bylines are people, not placeholders: the
              writer named on a piece is the person accountable for it.
            </Text>
          </Section>

          <Section title="How a piece is made">
            <Text>
              Nothing publishes automatically. Every article and guide is
              researched, written, fact-checked, edited, and reviewed by a
              person before it goes live. An editor checks the facts, the
              framing, and the sources, and can revise, hold, or reject any
              piece. There is always someone behind the wheel.
            </Text>
          </Section>

          <Section title="Facts and sourcing">
            <Text>
              We report — we don&apos;t editorialize. News is built from
              current, cited coverage by established gaming publications, and
              each claim is verified against those sources before a story can
              advance. Guides are grounded in real, hands-on strategy; where
              something varies by platform or is community-reported rather than
              confirmed, we say so plainly. Articles link to the sources they
              drew from, so you can always trace a fact back to its origin.
            </Text>
          </Section>

          <Section title="Images">
            <Text>
              Our header images are editorial artwork — illustrations chosen to
              match the subject of a piece, not documentary photos of real
              events. Some are original illustrations; where an image is created
              with AI tools, we label it as such on the image. They should never
              be read as photographs.
            </Text>
          </Section>

          <Section title="Corrections">
            <Text>
              We aim to get it right, and to fix it fast when we don&apos;t. If
              you spot an error, email us at{" "}
              <Link href="mailto:support@nexzyapp.com" color="nexzy.lightBlue">
                support@nexzyapp.com
              </Link>{" "}
              and we&apos;ll review and correct the record.
            </Text>
          </Section>
        </Stack>

        <Separator borderColor="whiteAlpha.200" my={10} />
        <Text color="gray.500" fontSize="sm">
          Nexzy Editorial · This page describes our standing editorial policy
          and may be updated as our process evolves.
        </Text>
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Box>
  );
}
