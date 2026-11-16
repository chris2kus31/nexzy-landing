"use client";
// "Remind me" for a drop that hasn't started: downloads a calendar event
// (.ics) for the start time with the drop's link. No account, no backend.
import { Button } from "@chakra-ui/react";
import { track } from "@/lib/analytics";
import { D } from "@/components/drops/tokens";
import { SITE_URL, dropPath } from "@/lib/trends/types";

const icsDate = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const icsText = (s: string) =>
  s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export default function RemindButton({
  slug,
  hashtag,
  title,
  startsAt,
  size = "md",
}: {
  slug: string;
  hashtag: string;
  title: string;
  startsAt: string;
  size?: "sm" | "md";
}) {
  function download() {
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const url = `${SITE_URL}${dropPath(slug)}`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Nexzy//Drops//EN",
      "BEGIN:VEVENT",
      `UID:drop-${slug}@nexzyapp.com`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsText(`#${hashtag} drops on Nexzy`)}`,
      `DESCRIPTION:${icsText(`${title}. Make your build: ${url}`)}`,
      `URL:${url}`,
      "BEGIN:VALARM",
      "TRIGGER:PT0M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(`#${hashtag} is live`)}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nexzy-${slug}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    track("drop_remind", { drop: slug });
  }
  return (
    <Button
      onClick={download}
      size={size}
      borderRadius="10px"
      variant="outline"
      borderWidth="1.5px"
      borderColor="#6E8BFF"
      color={D.blueSoft}
      bg="transparent"
      fontWeight="800"
      _hover={{ bg: "rgba(59,107,255,0.12)" }}
    >
      Remind me
    </Button>
  );
}
