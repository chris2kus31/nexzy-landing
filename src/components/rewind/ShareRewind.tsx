"use client";

import ShareMenu from "@/components/blog/ShareMenu";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

/** Share the Rewind series page — full share menu (same networks as articles). */
export default function ShareRewind() {
  return (
    <ShareMenu
      url={`${SITE_URL}/rewind`}
      title="Nexzy Rewind — This Day in Gaming"
      label="Share Rewinding"
    />
  );
}
