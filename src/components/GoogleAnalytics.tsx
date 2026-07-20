// ============================================
// FILE: components/GoogleAnalytics.tsx
// Google Analytics 4 with your Measurement ID.
// Skipped entirely on /admin routes so editor/admin activity is never counted.
// ============================================
"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const GA_MEASUREMENT_ID = "G-4CMMLEF6XB"; // Your actual GA4 ID

export default function GoogleAnalytics() {
  const pathname = usePathname();

  // Don't load or fire GA anywhere under /admin (login, queue, editor, etc.).
  // Only load analytics in production — keeps local dev (next dev) out of the prod GA/Clarity property.
  if (process.env.NODE_ENV !== "production") return null;
  if (pathname?.startsWith("/admin")) return null;

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
