import type { Metadata } from "next";
import { Box } from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import RewindSeriesLanding from "@/components/rewind/RewindSeriesLanding";
import { fetchRewindDay, fetchRewindRecent } from "@/lib/blog/api";

export const revalidate = 300;

const REWIND_TITLE = "Rewind — This Day in Gaming History | Nexzy";
const REWIND_DESC =
  "Nexzy Rewind is a daily trip back through gaming history — the launches, consoles, and moments that mattered, on this day. Browse any date.";

export const metadata: Metadata = {
  title: REWIND_TITLE,
  description: REWIND_DESC,
  alternates: { canonical: "/rewind" },
  openGraph: {
    title: REWIND_TITLE,
    description: REWIND_DESC,
    type: "website",
    url: "/rewind",
  },
  twitter: {
    card: "summary_large_image",
    title: REWIND_TITLE,
    description: REWIND_DESC,
  },
};

// "Today" in the newsroom timezone (ET) — matches the API's today() so the
// landing's featured day isn't a UTC day ahead of the US audience.
function todayInNewsroomTz(): { month: number; day: number } {
  const tz = process.env.NEWSROOM_TZ || "America/New_York";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  return {
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

export default async function RewindSeriesPage() {
  const { month, day } = todayInNewsroomTz();
  const [todayHub, recent] = await Promise.all([
    fetchRewindDay(month, day),
    fetchRewindRecent(10),
  ]);

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: REWIND_TITLE,
    description: REWIND_DESC,
    url: `${SITE_URL}/rewind`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: (recent || [])
        .filter((r) => r.slug)
        .map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/rewind/${r.slug}`,
          name: r.title,
        })),
    },
  };

  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />
      <RewindSeriesLanding todayHub={todayHub} recent={recent} />
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
    </Box>
  );
}
