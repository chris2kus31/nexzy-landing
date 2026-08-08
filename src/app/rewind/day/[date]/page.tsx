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
  return {
    title: `This Day in Gaming: ${label}`,
    description: `Everything that happened in gaming on ${label} — across four decades.`,
    alternates: { canonical: `/rewind/day/${date}` },
  };
}

export default async function RewindDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const parsed = parseDateSlug(date);
  if (!parsed) notFound();
  const hub = await fetchRewindDay(parsed.month, parsed.day);
  if (!hub) notFound();

  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />
      <DayHubView hub={hub} />
      <Footer />
    </Box>
  );
}
