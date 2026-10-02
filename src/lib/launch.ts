// ============================================
// FILE: lib/launch.ts
// Single source of truth for the Nexzy 1.1.10 launch campaign dates and links.
// All times are fixed instants (UTC) for the US Central launch schedule.
// ============================================

/** Wed Oct 21, 2026, 9:00 AM CDT: both stores release. */
export const LAUNCH_AT = Date.parse("2026-10-21T14:00:00Z");

/** Wed Oct 7, 2026, 9:30 AM CDT: the App Store In-App Event card goes public. */
export const IOS_EVENT_PUBLISH_AT = Date.parse("2026-10-07T14:30:00Z");

/** Fri Nov 20, 2026, 11:59 PM CST: end of the launch campaign (popup off). */
export const CAMPAIGN_END_AT = Date.parse("2026-11-21T05:59:00Z");

/** App Store In-App Event page ("Notify me"). */
export const IOS_EVENT_URL =
  "https://apps.apple.com/us/app/id6744055635?eventid=6817727328";

/** Smart store link: App Store on iPhone, Play on Android, /#download on desktop. */
export function getAppUrl(src: string): string {
  return `/get?src=${encodeURIComponent(src)}`;
}

export const FOLLOW_URL = "https://www.nexzyapp.com/follow";

export function isLive(now: number = Date.now()): boolean {
  return now >= LAUNCH_AT;
}
