import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box } from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import DayHubView from "@/components/rewind/DayHubView";
import { fetchRewindDay } from "@/lib/blog/api";
import { parseDateSlug, monthName } from "@/lib/rewind/era";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  const parsed = parseDateSlug(date);
  if (!parsed) return { title: "Rewind — Nexzy" };
  const label = `${monthName(parsed.month)} ${parsed.day}`;
  const title = `${label} in Gaming History — On This Day | Nexzy Rewind`;
  const description = `Every game launch and moment that happened on ${label}, across four decades of gaming history.`;
  return {
    title,
    description,
    alternates: { canonical: `/rewind/on-this-day/${date}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/rewind/on-this-day/${date}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function RewindOnThisDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const parsed = parseDateSlug(date);
  if (!parsed) notFound();
  const hub = await fetchRewindDay(parsed.month, parsed.day);
  // Don't render (or index) an empty "on this day" page — thin content.
  if (!hub || (hub.timeline?.length ?? 0) === 0) notFound();

  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />
      <DayHubView hub={hub} />
      <Footer />
    </Box>
  );
}
