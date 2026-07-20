"use client";

import { useReportWebVitals } from "next/web-vitals";
import { track } from "@/lib/analytics";

/**
 * Reports Core Web Vitals (LCP, INP, CLS, FCP, TTFB) to GA4 as `web_vitals`
 * events — real-user field data for the metrics Google uses as ranking
 * signals. CLS is scaled ×1000 to keep integer precision in GA4. No-ops when
 * gtag isn't loaded (dev / admin), same as every other track() call.
 */
export default function WebVitals() {
  useReportWebVitals((metric) => {
    track("web_vitals", {
      metric_name: metric.name,
      metric_value: Math.round(
        metric.name === "CLS" ? metric.value * 1000 : metric.value,
      ),
      metric_rating: metric.rating,
      metric_id: metric.id,
    });
  });
  return null;
}
