// ============================================
// FILE: app/follow/page.tsx
// The pre-launch /follow page retired on launch day (Oct 21, 2026); its content
// now lives at /app. next.config.ts sends a 308 for /follow at the edge; this
// page is the fallback so any request that reaches it still lands on /app.
// Old links (bios, the Apple nomination, emails) keep working.
// ============================================
import { permanentRedirect } from "next/navigation";

export default function FollowPage() {
  permanentRedirect("/app");
}
