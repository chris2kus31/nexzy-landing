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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const metadata: Metadata = {
  title: "How We Use AI — Nexzy News",
  description:
    "Nexzy News is an AI-assisted newsroom with human editorial oversight. Here's how our stories are researched, written, fact-checked, and reviewed before publishing.",
  alternates: { canonical: "/how-we-use-ai" },
  openGraph: {
    title: "How We Use AI — Nexzy News",
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

export default function HowWeUseAIPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "How We Use AI — Nexzy News",
    url: `${SITE_URL}/how-we-use-ai`,
    publisher: { "@type": "Organization", name: "Nexzy" },
  };

  return (
    <Box>
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
          How we use AI
        </Heading>
        <Text color="gray.300" fontSize="lg" mb={8} lineHeight="1.6">
          Nexzy News is an AI-assisted newsroom with human editorial oversight.
          We believe in being upfront about how our stories are made — so here
          is exactly how it works, and where the lines are.
        </Text>

        <Stack gap={8}>
          <Section title="What AI does">
            <Text>
              Our reporting pipeline uses AI agents to speed up the parts of
              news production that are mechanical: scanning reputable gaming
              outlets for what&apos;s happening, gathering the facts and their
              sources, drafting a first version of an article, and generating an
              illustrative header image. Think of it as a research assistant and
              a first-draft writer working around the clock.
            </Text>
          </Section>

          <Section title="What humans do">
            <Text>
              Every article is reviewed by a human editor before it is
              published. Nothing goes live automatically. An editor checks the
              facts, the framing, and the sources, and can revise, hold, or
              reject any story. Our editor-in-chief also commissions specific
              stories for the AI staff to research and write when something
              newsworthy breaks.
            </Text>
          </Section>

          <Section title="Facts and sourcing">
            <Text>
              We report — we don&apos;t editorialize. Stories are built from
              current, cited coverage by established gaming publications, and a
              separate fact-checking step verifies each claim against those
              sources before an article can advance. Every article links to the
              sources it drew from, so you can always trace a fact back to its
              origin.
            </Text>
          </Section>

          <Section title="Images">
            <Text>
              Header images are AI-generated illustrations created to match the
              subject of the story, and are labeled as generated with AI. They
              are editorial artwork, not photographs of real events, and should
              not be read as documentary images.
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
