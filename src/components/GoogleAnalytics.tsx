// ============================================
// FILE: components/GoogleAnalytics.tsx
// Google Analytics 4 with your Measurement ID.
// Admin is excluded via GA's official kill-switch (window['ga-disable-<ID>']),
// which survives SPA navigation — returning null alone does NOT, because gtag
// stays resident and Enhanced Measurement keeps firing page_views on client
// navigation. The flag suppresses the auto page_view AND every custom event.
// ============================================
"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useIsProdHost } from "@/lib/useProdHost";

const GA_MEASUREMENT_ID = "G-4CMMLEF6XB"; // Your actual GA4 ID
const DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const isProdHost = useIsProdHost();

  // Toggle GA's kill-switch on EVERY render — including the render triggered by
  // navigating into /admin — so gtag (which stays loaded across SPA routes)
  // suppresses all hits there: the automatic history page_view and any custom
  // event. Set in the render body (earliest hook we have, before gtag's history
  // listener fires) and re-affirmed in an effect. Belt-and-suspenders with the
  // GA4 internal-traffic IP filter.
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, boolean>)[DISABLE_KEY] = isAdmin;
  }
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as unknown as Record<string, boolean>)[DISABLE_KEY] = isAdmin;
    // Microsoft Clarity stays resident too — stop recording on admin.
    const clarity = (
      window as unknown as { clarity?: (...args: unknown[]) => void }
    ).clarity;
    if (isAdmin && typeof clarity === "function") clarity("stop");
  }, [isAdmin]);

  // Only load in production, on the real domain (not Netlify previews), and
  // never load the tag on a direct /admin entry.
  if (process.env.NODE_ENV !== "production") return null;
  if (!isProdHost) return null;
  if (isAdmin) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          // Respect the kill-switch from the very first hit (e.g. a hard load
          // that resolves under /admin before React hydrates).
          window['${DISABLE_KEY}'] = location.pathname.indexOf('/admin') === 0;
          gtag('js', new Date());
          // fbclid fallback: Facebook's in-app browser strips the referrer, so
          // FB clicks without a UTM would land as "Direct". If we see fbclid and
          // no utm_source, attribute the session to Facebook / organic social.
          var _q = new URLSearchParams(window.location.search);
          if (_q.get('fbclid') && !_q.get('utm_source')) {
            gtag('config', '${GA_MEASUREMENT_ID}', {
              campaign_source: 'facebook',
              campaign_medium: 'social',
              campaign_name: 'fb_organic'
            });
          } else {
            gtag('config', '${GA_MEASUREMENT_ID}');
          }
        `}
      </Script>
    </>
  );
}
