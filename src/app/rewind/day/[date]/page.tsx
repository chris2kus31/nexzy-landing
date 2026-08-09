import { permanentRedirect } from "next/navigation";

/**
 * Legacy route: /rewind/day/[date] → /rewind/on-this-day/[date] (301/308).
 * Kept so old links + indexed URLs resolve to the new SEO-friendly path.
 */
export default async function LegacyRewindDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  permanentRedirect(`/rewind/on-this-day/${date}`);
}
