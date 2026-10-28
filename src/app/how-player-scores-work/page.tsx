// Public rules for the Nexzy Players score (Phase 2). Mirrors nexzy-api
// src/game-reviews/game-reviews.constants.ts (SCORE_RULES, CRITERIA_WEIGHTS).
// Keep in lockstep. Anti-bot thresholds are deliberately described, not
// published: exact numbers would tell a bot how to stay under them.
import type { Metadata } from "next";
import NextLink from "next/link";
import { Box, Container, Heading, Link, Separator, Stack, Text } from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import { jsonLdString } from "@/lib/seo/jsonld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const PATH = "/how-player-scores-work";

export const metadata: Metadata = {
  title: "How Nexzy Player Scores Work",
  description:
    "How the Nexzy Players score is calculated: who can rate, the five things players rate, when a score shows, and how we keep it fair against bots and review bombs.",
  alternates: { canonical: PATH },
  openGraph: { title: "How Nexzy Player Scores Work", type: "article" },
};

const CRITERIA: Array<[string, string, string]> = [
  ["Fun", "35%", "How fun it is to actually play"],
  ["Performance", "20%", "Frame rate, bugs, load times"],
  ["Value", "15%", "Worth what you paid"],
  ["Look and sound", "15%", "Visuals, audio, style"],
  ["Story", "15%", "Skippable: if a game has no story, its share moves to Fun"],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box as="section">
      <Heading as="h2" size="lg" color="white" mb={3}>
        {title}
      </Heading>
      <Stack gap={3} color="gray.300" fontSize="md" lineHeight="1.7">
        {children}
      </Stack>
    </Box>
  );
}

export default function HowPlayerScoresWorkPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "How Nexzy Player Scores Work",
    url: `${SITE_URL}${PATH}`,
    publisher: { "@type": "Organization", name: "Nexzy", url: SITE_URL },
  };

  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />
      <Container maxW="3xl" py={{ base: 10, md: 16 }}>
        <Link asChild color="nexzy.lightBlue" fontSize="sm" mb={6} display="inline-block">
          <NextLink href="/games">Back to games</NextLink>
        </Link>

        <Heading as="h1" fontFamily="title" size={{ base: "2xl", md: "4xl" }} color="white" mb={4} lineHeight="1.15">
          How Nexzy player scores work
        </Heading>
        <Text color="gray.300" fontSize="lg" mb={8} lineHeight="1.6">
          The Nexzy Players score is what real players think of a game, out of 10. Players rate
          five things, the score shows once 10 people have rated, and ratings that look automated or
          coordinated don&apos;t count until a person has checked them. The critics score next to it
          comes from published reviews.
        </Text>

        <Stack gap={8}>
          <Section title="Who can rate a game?">
            <Text>
              Anyone with a Nexzy account and a verified email (the same account as the Nexzy app).
              You get one rating per game and can edit or remove it any time. Ratings open when the game
              launches.
            </Text>
          </Section>

          <Section title="What do players rate?">
            <Text>Each rating is five quick scores from 1 to 5, weighted like this:</Text>
            <Box as="table" w="100%" fontSize="sm" style={{ borderCollapse: "collapse" }}>
              <tbody>
                {CRITERIA.map(([name, weight, what]) => (
                  <tr key={name} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={{ padding: "10px 8px 10px 0", color: "#fff", fontWeight: 600 }}>{name}</td>
                    <td style={{ padding: "10px 8px", color: "#FFD700", fontWeight: 700 }}>{weight}</td>
                    <td style={{ padding: "10px 0 10px 8px" }}>{what}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
            <Text>
              Those combine into one score on a 1 to 10 scale. A 1 on everything is a 1, a 3 on
              everything is 5.5, and a 5 on everything is a 10. Players also say which platform they
              played on and roughly how many hours.
            </Text>
          </Section>

          <Section title="How is the game's score calculated?">
            <Text>
              The score shows once 10 players have rated. Until then you&apos;ll see how many more
              ratings it needs.
            </Text>
            <Text>
              It starts from a neutral 7.0, counted as if 10 players had given that, so a handful of
              early ratings can&apos;t swing it to a 10 or a 1. As more people rate, their ratings
              take over completely.
            </Text>
            <Text>
              Once a game has 40 or more ratings, the highest 5% and lowest 5% are left out, so the
              most extreme takes in either direction don&apos;t pull the average.
            </Text>
            <Text>Accounts less than 7 days old count at half weight.</Text>
          </Section>

          <Section title="What do the badges mean?">
            <Text>
              <strong>Players recommend</strong>: the Players score is 8.0 or higher with at least 20
              ratings.
            </Text>
            <Text>
              <strong>Critics and players disagree</strong>: the two scores are 1.5 points or more
              apart.
            </Text>
            <Text>
              <strong>Day One reviewer</strong>: the rating came in during the first 72 hours after
              launch.
            </Text>
            <Text>
              <strong>Settled</strong>: 7 days after launch, once there are at least 25 ratings, we lock
              in that day&apos;s score as the launch verdict. That&apos;s what score predictions are
              checked against. The live score keeps updating after that.
            </Text>
          </Section>

          <Section title="Where does the critics score come from?">
            <Text>
              It&apos;s the average of published critic reviews collected by IGDB, shown out of 10. It
              isn&apos;t a Nexzy rating, and we show how many reviews it&apos;s based on.
            </Text>
          </Section>

          <Section title="How do you stop bots and review bombs?">
            <Text>
              Ratings that look automated, rushed or coordinated are held for a person on our team to
              check. A held rating stays visible but doesn&apos;t count toward the score until
              it&apos;s cleared.
            </Text>
            <Text>
              If a game suddenly gets far more ratings than usual, its score pauses while we look into
              it. The page says when a score is paused, and the score stays where it was until
              we&apos;re done.
            </Text>
            <Text>
              Written text is checked automatically. If yours is hidden, your rating still counts.
              Moderators can remove ratings that break our{" "}
              <Link asChild color="nexzy.lightBlue">
                <NextLink href="/guidelines">community guidelines</NextLink>
              </Link>
              .
            </Text>
            <Text>
              Nexzy team accounts can leave ratings, but they are labeled and never count toward any
              score.
            </Text>
          </Section>

          <Section title="Your ratings and your data">
            <Text>
              You can remove your rating whenever you like. Deleting your Nexzy account deletes all of
              your ratings and written reviews with it. Questions? Email{" "}
              <Link href="mailto:support@nexzyapp.com" color="nexzy.lightBlue">
                support@nexzyapp.com
              </Link>
              .
            </Text>
          </Section>
        </Stack>

        <Separator borderColor="whiteAlpha.200" my={10} />
        <Text color="gray.500" fontSize="sm">
          These rules apply on the website and in the app, and may be updated as we learn. Changes
          to how scores are calculated are noted here.
        </Text>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
    </Box>
  );
}
