// ============================================
// FILE: components/Clarity.tsx
// Microsoft Clarity — free heatmaps + session recordings.
// Loads only when NEXT_PUBLIC_CLARITY_PROJECT_ID is set, and never on /admin.
// ============================================
"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

export default function Clarity() {
  const pathname = usePathname();
  if (!CLARITY_ID) return null; // not configured yet — no-op
  if (pathname?.startsWith("/admin")) return null; // never record admin

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_ID}");
      `}
    </Script>
  );
}
