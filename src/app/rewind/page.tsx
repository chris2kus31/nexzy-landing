import type { Metadata } from "next";
import { Box } from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import RewindSeriesLanding from "@/components/rewind/RewindSeriesLanding";
import { fetchRewindDay, fetchRewindRecent } from "@/lib/blog/api";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Rewind — This Day in Gaming History | Nexzy",
  description:
    "Nexzy Rewind is a daily trip back through gaming history — the launches, consoles, and moments that mattered, on this day. Browse any date.",
  alternates: { canonical: "/rewind" },
};

export default async function RewindSeriesPage() {
  const now = new Date();
  const [todayHub, recent] = await Promise.all([
    fetchRewindDay(now.getMonth() + 1, now.getDate()),
    fetchRewindRecent(10),
  ]);

  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />
      <RewindSeriesLanding todayHub={todayHub} recent={recent} />
      <Footer />
    </Box>
  );
}
