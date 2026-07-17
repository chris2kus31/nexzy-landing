import type { Metadata } from "next";
import NextLink from "next/link";
import {
  Box,
  Container,
  Heading,
  Text,
  Link,
  Stack,
  HStack,
  SimpleGrid,
  Separator,
} from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/storeUrls";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const metadata: Metadata = {
  title: "Press & Media Kit — Nexzy",
  description:
    "Everything you need to write about Nexzy: boilerplate, fast facts, brand assets, and press contact.",
  alternates: { canonical: "/press" },
  openGraph: { title: "Press & Media Kit — Nexzy", type: "website" },
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

const ASSETS = [
  { label: "Primary logo (PNG)", href: "/NexzyLogo.png" },
  { label: "AI mark (PNG)", href: "/NexzyAI.png" },
  { label: "App icon 512px (PNG)", href: "/android-chrome-512x512.png" },
];

export default function PressPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Press & Media Kit — Nexzy",
    url: `${SITE_URL}/press`,
    publisher: { "@id": `${SITE_URL}/#organization` },
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
          <NextLink href="/">← Back home</NextLink>
        </Link>

        <Heading
          as="h1"
          size={{ base: "2xl", md: "4xl" }}
          color="white"
          mb={4}
          lineHeight="1.15"
        >
          Press &amp; media kit
        </Heading>
        <Text color="gray.300" fontSize="lg" mb={8} lineHeight="1.6">
          Writing about Nexzy? Everything you need is here. Grab the
          boilerplate, the facts, and the logos, and reach out any time.
        </Text>

        <Stack gap={8}>
          <Section title="Boilerplate">
            <Text color="gray.400" fontSize="sm">
              One line:
            </Text>
            <Text
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="md"
              p={3}
              color="gray.200"
            >
              Nexzy is a gaming companion app and newsroom that covers game
              news, guides, and deals, kept short and to the point, with an
              in-app AI assistant, for players of every age.
            </Text>
            <Text color="gray.400" fontSize="sm" mt={2}>
              One paragraph:
            </Text>
            <Text
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="md"
              p={3}
              color="gray.200"
            >
              Nexzy was built for players who are tired of ad-mazes, ten-minute
              videos, and endless articles that never get to the point. It
              delivers gaming news, guides, and deals short and straight, and
              the Nexzy app puts that same no-nonsense experience in your pocket
              with an AI assistant that actually helps. From first-timers to
              veterans, everyone is welcome.
            </Text>
          </Section>

          <Section title="Fast facts">
            <Stack gap={1.5} as="ul" pl={0} listStyleType="none">
              <Text>
                <Text as="span" color="white" fontWeight="600">
                  Founded:
                </Text>{" "}
                June 2026
              </Text>
              <Text>
                <Text as="span" color="white" fontWeight="600">
                  Founder &amp; Editor-in-Chief:
                </Text>{" "}
                Chris M.
              </Text>
              <Text>
                <Text as="span" color="white" fontWeight="600">
                  What it is:
                </Text>{" "}
                Gaming news, guides, walkthroughs, and deals, plus an AI-powered
                companion app.
              </Text>
              <Text>
                <Text as="span" color="white" fontWeight="600">
                  Platforms:
                </Text>{" "}
                <Link
                  href={APP_STORE_URL}
                  color="nexzy.lightBlue"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  iOS (App Store)
                </Link>{" "}
                and{" "}
                <Link
                  href={GOOGLE_PLAY_URL}
                  color="nexzy.lightBlue"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Android (Google Play)
                </Link>
              </Text>
              <Text>
                <Text as="span" color="white" fontWeight="600">
                  Website:
                </Text>{" "}
                <Link href={SITE_URL} color="nexzy.lightBlue">
                  nexzyapp.com
                </Link>
              </Text>
            </Stack>
          </Section>

          <Section title="Brand assets">
            <Text>
              Logos for editorial use. Please don&apos;t alter, recolor, or
              stretch them.
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
              {ASSETS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  download
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="md"
                  p={3}
                  textAlign="center"
                  color="nexzy.lightBlue"
                  fontSize="sm"
                  fontWeight="600"
                  _hover={{ bg: "whiteAlpha.100" }}
                >
                  ↓ {a.label}
                </Link>
              ))}
            </SimpleGrid>
          </Section>

          <Section title="The story">
            <Text>
              Why Nexzy exists, in the founder&apos;s words, is on our{" "}
              <Link asChild color="nexzy.lightBlue" display="inline">
                <NextLink href="/about">About page</NextLink>
              </Link>
              . For how our newsroom works, see our{" "}
              <Link asChild color="nexzy.lightBlue" display="inline">
                <NextLink href="/editorial-standards">
                  editorial standards
                </NextLink>
              </Link>
              .
            </Text>
          </Section>

          <Section title="Press contact">
            <Text>
              For interviews, assets, or questions, email{" "}
              <Link href="mailto:support@nexzyapp.com" color="nexzy.lightBlue">
                support@nexzyapp.com
              </Link>
              . We&apos;re happy to help.
            </Text>
          </Section>
        </Stack>

        <Separator borderColor="whiteAlpha.200" my={10} />
        <HStack
          color="gray.500"
          fontSize="sm"
          justify="space-between"
          wrap="wrap"
        >
          <Text>Nexzy · Founded June 2026</Text>
          <Text>support@nexzyapp.com</Text>
        </HStack>
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Box>
  );
}
